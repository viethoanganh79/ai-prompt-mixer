import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gemini AI SDK on the server side
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// 1. Google Sheets Proxy API: Avoids browser CORS and handles redirects
// -------------------------------------------------------------
app.post('/api/sheets/fetch', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'Google Sheet URL is required' });
      return;
    }

    // Determine download URL
    let targetUrl = url.trim();

    // If it's a standard docs.google.com/spreadsheets/d/{id}/edit URL, convert to CSV export
    const standardMatch = targetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (standardMatch && !targetUrl.includes('export?format=csv') && !targetUrl.includes('/pub?output=csv')) {
      const sheetId = standardMatch[1];
      // Check for gid in url
      const gidMatch = targetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Prompt-Mixer/1.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: `Failed to fetch Google Sheet: HTTP ${response.status} ${response.statusText}. Ensure the sheet has "Anyone with the link can view" permission or is published to the web.`,
      });
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    const textData = await response.text();

    // Check if Google returned an HTML login page instead of CSV
    if (textData.includes('<!DOCTYPE html') && textData.includes('accounts.google.com')) {
      res.status(403).json({
        success: false,
        error: 'The Google Sheet is private. Please set sharing to "Anyone with the link can view" or use File > Share > Publish to web.',
      });
      return;
    }

    res.json({
      success: true,
      data: textData,
      contentType,
      resolvedUrl: targetUrl,
    });
  } catch (error: any) {
    console.error('Error fetching sheet:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while fetching sheet',
    });
  }
});

// Google Apps Script Webhook Push Proxy
app.post('/api/sheets/push-webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      res.status(400).json({ success: false, error: 'Webhook URL is required' });
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const resultText = await response.text();
    res.json({
      success: response.ok,
      status: response.status,
      response: resultText,
    });
  } catch (error: any) {
    console.error('Error pushing to webhook:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error communicating with Google Apps Script Webhook',
    });
  }
});

// -------------------------------------------------------------
// 1.1 Zero-Knowledge Encrypted Vault API (Custom Backend Endpoint)
// -------------------------------------------------------------
const memoryVaultStore: Record<string, any> = {};

app.get('/api/v1/user/sync-vault/meta', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  // Can use token or default key
  const userKey = authHeader ? authHeader.replace('Bearer ', '').slice(0, 32) : 'default_pro_vault';
  const data = memoryVaultStore[userKey];
  if (!data) {
    res.status(404).json({ exists: false, message: 'Vault not found' });
    return;
  }
  res.json({
    exists: true,
    summary: data.summary,
    updatedAt: data.updatedAt,
    package: data,
  });
});

app.get('/api/v1/user/sync-vault', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const userKey = authHeader ? authHeader.replace('Bearer ', '').slice(0, 32) : 'default_pro_vault';
  const data = memoryVaultStore[userKey];
  if (!data) {
    res.status(404).json({ error: 'No encrypted vault data found' });
    return;
  }
  res.json(data);
});

app.post('/api/v1/user/sync-vault', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const userKey = authHeader ? authHeader.replace('Bearer ', '').slice(0, 32) : 'default_pro_vault';
  const payload = req.body;
  if (!payload || !payload.ciphertext || !payload.salt || !payload.iv) {
    res.status(400).json({ error: 'Invalid encrypted vault package' });
    return;
  }
  memoryVaultStore[userKey] = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  res.json({ success: true, message: 'Encrypted vault stored successfully' });
});

// Helper: Robust Gemini execution with model alias mapping, retries, and graceful fallback
async function generateGeminiWithFallback(
  client: GoogleGenAI,
  requestedModel: string | undefined,
  prompt: string,
  config: any
): Promise<{ output: string; model: string }> {
  let primaryModel = requestedModel?.trim();
  // Map deprecated / legacy / typo model names to modern official models
  if (
    !primaryModel ||
    primaryModel === 'gemini-2.5-flash' ||
    primaryModel === 'gemini-3.6-flash' ||
    primaryModel === 'gemini-default'
  ) {
    primaryModel = 'gemini-3.8-flash';
  }

  // Ordered fallback candidate list (ensures high availability during preview spikes)
  const candidates = [
    primaryModel,
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastErr: any = null;

  for (const modelToTry of candidates) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: modelToTry,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        return {
          output: response.text || '',
          model: modelToTry,
        };
      } catch (err: any) {
        lastErr = err;
        const msg = (err?.message || '').toLowerCase();
        // If model not found or deprecated, immediately skip to next candidate
        if (
          msg.includes('404') ||
          msg.includes('not_found') ||
          msg.includes('no longer available') ||
          msg.includes('not found')
        ) {
          break;
        }
        // If 503 (demand spike) or 429, wait briefly before retrying
        if (attempt < 2 && (msg.includes('503') || msg.includes('demand') || msg.includes('429'))) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  }

  throw lastErr || new Error('Không thể kết nối đến mô hình Gemini. Vui lòng thử lại sau.');
}

// -------------------------------------------------------------
// 2. Universal AI Testing API (Multi-provider & Custom API Keys)
// -------------------------------------------------------------
app.post('/api/ai/test', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      prompt,
      systemInstruction,
      temperature,
      provider = 'built-in',
      apiKey,
      endpointUrl,
      model,
      maxTokens,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    // 1. Google Gemini (Built-in Server Key or Custom User Key)
    if (provider === 'built-in' || provider === 'gemini') {
      const activeKey = provider === 'gemini' && apiKey ? apiKey : process.env.GEMINI_API_KEY;
      if (!activeKey) {
        res.status(400).json({
          success: false,
          error:
            provider === 'gemini'
              ? 'Vui lòng nhập Gemini API Key cá nhân.'
              : 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const client = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (typeof temperature === 'number') config.temperature = temperature;
      if (typeof maxTokens === 'number') config.maxOutputTokens = maxTokens;

      const result = await generateGeminiWithFallback(client, model, prompt, config);

      const durationMs = Date.now() - startTime;
      res.json({
        success: true,
        output: result.output,
        durationMs,
        model: result.model,
        provider,
      });
      return;
    }

    // 2. OpenAI-compatible Providers (OpenAI, OpenRouter, Groq, Custom Endpoint)
    if (
      provider === 'openai' ||
      provider === 'openrouter' ||
      provider === 'groq' ||
      provider === 'custom'
    ) {
      if (!apiKey && provider !== 'custom') {
        res.status(400).json({
          success: false,
          error: `Vui lòng nhập API Key cho ${provider.toUpperCase()}.`,
        });
        return;
      }

      let targetUrl = 'https://api.openai.com/v1/chat/completions';
      let defaultModel = 'gpt-4o';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      if (provider === 'openrouter') {
        targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
        defaultModel = 'meta-llama/llama-3.3-70b-instruct';
        headers['HTTP-Referer'] = 'https://aistudio.google.com';
        headers['X-Title'] = 'AI Prompt Mixer';
      } else if (provider === 'groq') {
        targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
        defaultModel = 'llama-3.3-70b-versatile';
      } else if (provider === 'custom') {
        if (!endpointUrl) {
          res.status(400).json({
            success: false,
            error: 'Vui lòng nhập Endpoint URL cho Custom Model.',
          });
          return;
        }
        targetUrl = endpointUrl.endsWith('/chat/completions')
          ? endpointUrl
          : `${endpointUrl.replace(/\/+$/, '')}/chat/completions`;
        defaultModel = model || 'custom-model';
      }

      const targetModel = model || defaultModel;
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const payload: any = {
        model: targetModel,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      };
      if (typeof maxTokens === 'number') payload.max_tokens = maxTokens;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg =
          data?.error?.message ||
          data?.message ||
          `Lỗi máy chủ HTTP ${response.status}: ${response.statusText}`;
        res.status(response.status).json({ success: false, error: errMsg });
        return;
      }

      const outputText = data?.choices?.[0]?.message?.content || '';
      const durationMs = Date.now() - startTime;
      res.json({
        success: true,
        output: outputText,
        durationMs,
        model: targetModel,
        provider,
      });
      return;
    }

    // 3. Anthropic Claude
    if (provider === 'anthropic') {
      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp Anthropic API Key.',
        });
        return;
      }

      const targetUrl = endpointUrl
        ? endpointUrl.endsWith('/messages')
          ? endpointUrl
          : `${endpointUrl.replace(/\/+$/, '')}/v1/messages`
        : 'https://api.anthropic.com/v1/messages';

      const targetModel = model || 'claude-3-5-sonnet-20241022';
      const payload: any = {
        model: targetModel,
        max_tokens: typeof maxTokens === 'number' ? maxTokens : 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      };
      if (systemInstruction) payload.system = systemInstruction;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg =
          data?.error?.message ||
          data?.message ||
          `Lỗi Anthropic API HTTP ${response.status}: ${response.statusText}`;
        res.status(response.status).json({ success: false, error: errMsg });
        return;
      }

      const outputText = Array.isArray(data?.content)
        ? data.content.map((c: any) => c.text || '').join('\n')
        : '';

      const durationMs = Date.now() - startTime;
      res.json({
        success: true,
        output: outputText,
        durationMs,
        model: targetModel,
        provider,
      });
      return;
    }

    res
      .status(400)
      .json({ success: false, error: `Provider "${provider}" không được hỗ trợ.` });
  } catch (error: any) {
    console.error('Error in /api/ai/test:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Lỗi khi gọi model AI.',
    });
  }
});

// Backward compatibility for /api/gemini/test
app.post('/api/gemini/test', async (req: Request, res: Response) => {
  try {
    const { prompt, systemInstruction, temperature } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const startTime = Date.now();
    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (typeof temperature === 'number') config.temperature = temperature;

    const result = await generateGeminiWithFallback(aiClient, 'gemini-3.8-flash', prompt, config);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      output: result.output,
      durationMs: duration,
      model: result.model,
    });
  } catch (error: any) {
    console.error('Error testing prompt with Gemini:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Gemini API call failed',
    });
  }
});

// -------------------------------------------------------------
// 3. Vite Middleware Setup (Dev) / Static Hosting (Prod)
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Prompt Mixer] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
