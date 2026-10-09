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
// 2. Gemini AI Prompt Testing API
// -------------------------------------------------------------
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
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (typeof temperature === 'number') {
      config.temperature = temperature;
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    const duration = Date.now() - startTime;
    const outputText = response.text || '';

    res.json({
      success: true,
      output: outputText,
      durationMs: duration,
      model: 'gemini-3.8-flash',
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
