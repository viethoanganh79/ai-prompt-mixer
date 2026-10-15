import React, { useState } from 'react';
import {
  X,
  Bot,
  Key,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { AIModelProvider, CustomAIConfig } from '../types';

interface AIPlaygroundConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProModal?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const PROVIDERS: {
  id: AIModelProvider;
  name: { vi: string; en: string };
  badge: { vi: string; en: string };
  desc: { vi: string; en: string };
  defaultModel: string;
  sampleModels: string[];
  placeholderKey: string;
  requiresUrl?: boolean;
  defaultUrl?: string;
}[] = [
  {
    id: 'built-in',
    name: { vi: 'Gemini (Mặc định Server)', en: 'Gemini (Built-in Server)' },
    badge: { vi: 'Miễn phí', en: 'Free' },
    desc: {
      vi: 'Sử dụng Gemini 3.8 Flash thông qua máy chủ proxy tích hợp sẵn, không cần nhập API key.',
      en: 'Uses Gemini 3.8 Flash via built-in proxy server, no individual API key required.',
    },
    defaultModel: 'gemini-3.8-flash',
    sampleModels: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'],
    placeholderKey: '',
  },
  {
    id: 'gemini',
    name: { vi: 'Google Gemini (Key Riêng)', en: 'Google Gemini (Custom Key)' },
    badge: { vi: 'Google AI', en: 'Google AI' },
    desc: {
      vi: 'Kết nối qua Gemini API Key cá nhân của bạn với quota không giới hạn.',
      en: 'Connect directly with your personal Google Gemini API key with unlimited personal quota.',
    },
    defaultModel: 'gemini-3.8-flash',
    sampleModels: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-4-argon'],
    placeholderKey: 'AIzaSy...',
  },
  {
    id: 'openai',
    name: { vi: 'OpenAI', en: 'OpenAI' },
    badge: { vi: 'GPT-4o', en: 'GPT-4o' },
    desc: {
      vi: 'Mô hình hàng đầu từ OpenAI (GPT-4o, GPT-4o-mini, o1-mini).',
      en: 'Industry-leading models from OpenAI (GPT-4o, GPT-4o-mini, o1-mini).',
    },
    defaultModel: 'gpt-4o',
    sampleModels: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'gpt-4-turbo'],
    placeholderKey: 'sk-proj-...',
  },
  {
    id: 'anthropic',
    name: { vi: 'Anthropic Claude', en: 'Anthropic Claude' },
    badge: { vi: 'Claude 3.5', en: 'Claude 3.5' },
    desc: {
      vi: 'Mô hình lập trình và phân tích ngữ cảnh dài hàng đầu hiện nay.',
      en: 'Premier long-context analysis and code generation models.',
    },
    defaultModel: 'claude-3-5-sonnet-20241022',
    sampleModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    placeholderKey: 'sk-ant-api03-...',
  },
  {
    id: 'openrouter',
    name: { vi: 'OpenRouter', en: 'OpenRouter' },
    badge: { vi: 'Multi-LLM', en: 'Multi-LLM' },
    desc: {
      vi: 'Truy cập hàng trăm mô hình mã nguồn mở và thương mại qua một API duy nhất.',
      en: 'Access hundreds of open-source and proprietary models through a unified API.',
    },
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    sampleModels: [
      'meta-llama/llama-3.3-70b-instruct',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-exp:free',
    ],
    placeholderKey: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    name: { vi: 'Groq Cloud', en: 'Groq Cloud' },
    badge: { vi: 'Tốc độ cực cao', en: 'Ultra Fast' },
    desc: {
      vi: 'Tốc độ sinh văn bản 500+ tokens/s với Llama 3.3 và Mixtral.',
      en: 'Ultra-fast inference speed of 500+ tokens/s with Llama 3.3 & Mixtral.',
    },
    defaultModel: 'llama-3.3-70b-versatile',
    sampleModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    placeholderKey: 'gsk_...',
  },
  {
    id: 'custom',
    name: { vi: 'Custom Endpoint', en: 'Custom Endpoint' },
    badge: { vi: 'Tương thích OpenAI', en: 'OpenAI-Compatible' },
    desc: {
      vi: 'Dành cho DeepSeek API, Ollama Local, vLLM, LM Studio hoặc máy chủ riêng.',
      en: 'For DeepSeek API, local Ollama, vLLM, LM Studio, or private LLM servers.',
    },
    defaultModel: 'deepseek-chat',
    sampleModels: ['deepseek-chat', 'deepseek-reasoner', 'llama3', 'mistral-large'],
    placeholderKey: 'Bearer Token...',
    requiresUrl: true,
    defaultUrl: 'https://api.deepseek.com/v1',
  },
];

export const AIPlaygroundConfigModal: React.FC<AIPlaygroundConfigModalProps> = ({
  isOpen,
  onClose,
  onOpenProModal,
  onShowToast,
}) => {
  const { aiConfig, updateAiConfig } = usePromptMixer();
  const { isPro } = useAuth();
  const { t, isVietnamese } = useLanguage();

  const [provider, setProvider] = useState<AIModelProvider>(aiConfig.provider || 'built-in');
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [endpointUrl, setEndpointUrl] = useState(aiConfig.endpointUrl || '');
  const [model, setModel] = useState(aiConfig.model || 'gemini-3.8-flash');
  const [temperature, setTemperature] = useState(aiConfig.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(aiConfig.maxTokens);
  const [systemInstruction, setSystemInstruction] = useState(aiConfig.systemInstruction || '');

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);

  if (!isOpen) return null;

  const currentProviderDef = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  const handleSelectProvider = (newProv: AIModelProvider) => {
    setProvider(newProv);
    const def = PROVIDERS.find((p) => p.id === newProv);
    if (def) {
      setModel(def.defaultModel);
      if (def.defaultUrl && !endpointUrl) {
        setEndpointUrl(def.defaultUrl);
      }
    }
  };

  const handleTestPing = async () => {
    const provName = currentProviderDef.name[isVietnamese ? 'vi' : 'en'];
    if (provider !== 'built-in' && !apiKey && provider !== 'custom') {
      onShowToast(
        'error',
        isVietnamese ? 'Chưa nhập API Key' : 'API Key missing',
        isVietnamese ? `Vui lòng nhập API Key cho ${provName}.` : `Please enter an API Key for ${provName}.`
      );
      return;
    }

    setIsTestingPing(true);
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Say exactly: "Connection Verified OK!"',
          provider,
          apiKey,
          endpointUrl,
          model,
          temperature: 0.1,
          maxTokens: 50,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onShowToast(
          'success',
          isVietnamese ? 'Kết nối thành công!' : 'Connection Succeeded!',
          isVietnamese
            ? `Model ${data.model} phản hồi trong ${data.durationMs}ms.`
            : `Model ${data.model} responded in ${data.durationMs}ms.`
        );
      } else {
        onShowToast(
          'error',
          isVietnamese ? 'Kiểm tra kết nối thất bại' : 'Connection check failed',
          data.error
        );
      }
    } catch (err: any) {
      onShowToast(
        'error',
        isVietnamese ? 'Lỗi kết nối' : 'Connection error',
        err?.message || (isVietnamese ? 'Không thể gọi API.' : 'Failed to call API.')
      );
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSave = async () => {
    if (!isPro && provider !== 'built-in') {
      onShowToast(
        'error',
        isVietnamese ? 'Tính năng Pro' : 'Pro Feature',
        isVietnamese
          ? 'Chỉ Pro User mới có thể sử dụng Model bên ngoài.'
          : 'External models require a Pro Creator account.'
      );
      return;
    }

    await updateAiConfig({
      provider,
      apiKey: apiKey.trim(),
      endpointUrl: endpointUrl.trim(),
      model: model.trim(),
      temperature,
      maxTokens: maxTokens ? Number(maxTokens) : undefined,
      systemInstruction: systemInstruction.trim(),
    });

    onShowToast(
      'success',
      isVietnamese ? 'Đã lưu cấu hình AI Playground!' : 'AI Playground Configuration Saved!',
      isVietnamese ? `Mô hình hoạt động: ${model}` : `Active model: ${model}`
    );
    onClose();
  };

  const handleResetToDefault = async () => {
    setProvider('built-in');
    setApiKey('');
    setEndpointUrl('');
    setModel('gemini-3.8-flash');
    setTemperature(0.7);
    setMaxTokens(undefined);
    setSystemInstruction('');

    await updateAiConfig({
      provider: 'built-in',
      apiKey: '',
      endpointUrl: '',
      model: 'gemini-3.8-flash',
      temperature: 0.7,
      maxTokens: undefined,
      systemInstruction: '',
    });

    onShowToast(
      'info',
      isVietnamese
        ? 'Đã khôi phục về model Gemini mặc định của server.'
        : 'Restored default built-in server Gemini model.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isVietnamese ? 'Cấu hình AI Playground (Model Bên ngoài)' : 'AI Playground Configuration (Custom Models)'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider font-mono">
                  PRO ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVietnamese
                  ? 'Nhập API Key cá nhân để thử nghiệm với OpenAI, Claude, Groq, OpenRouter hoặc Custom Endpoint'
                  : 'Enter personal API keys to test with OpenAI, Claude, Groq, OpenRouter, or Custom Endpoints'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Pro Check Banner */}
          {!isPro && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    {isVietnamese
                      ? 'Nâng cấp Pro Creator để kích hoạt Model bên ngoài'
                      : 'Upgrade to Pro Creator to unlock external custom models'}
                  </div>
                  <div className="text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                    {isVietnamese
                      ? 'Tài khoản miễn phí sử dụng model mặc định (Gemini 3.8 Flash). Với gói Pro, bạn có thể tự do nhập API Key để kết nối trực tiếp với OpenAI, Claude, DeepSeek và mọi nhà cung cấp.'
                      : 'Free tier includes built-in Gemini 3.8 Flash. With Pro, connect directly to OpenAI, Claude, DeepSeek, and custom API endpoints.'}
                  </div>
                </div>
              </div>
              {onOpenProModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenProModal();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold whitespace-nowrap shadow-xs cursor-pointer"
                >
                  {isVietnamese ? 'Nâng Pro' : 'Get Pro'}
                </button>
              )}
            </div>
          )}

          {/* Provider Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isVietnamese ? 'Chọn Nhà cung cấp Mô hình AI (Provider)' : 'Select AI Model Provider'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map((p) => {
                const isSelected = provider === p.id;
                const isLocked = !isPro && p.id !== 'built-in';
                const pName = p.name[isVietnamese ? 'vi' : 'en'];
                const pBadge = p.badge[isVietnamese ? 'vi' : 'en'];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isLocked && onOpenProModal) {
                        onShowToast('info', 'Pro Feature', isVietnamese ? 'Nâng cấp Pro để mở khóa provider này.' : 'Upgrade to Pro to unlock this provider.');
                        return;
                      }
                      handleSelectProvider(p.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    } ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {pName}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1">
                      {pBadge}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {currentProviderDef.desc[isVietnamese ? 'vi' : 'en']}
            </p>
          </div>

          {/* Configuration Form (if provider !== 'built-in') */}
          {provider !== 'built-in' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
              {/* API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isVietnamese ? 'API Key cá nhân của bạn' : 'Your Personal API Key'}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {isVietnamese ? 'Bảo mật: Truyền qua server proxy' : 'Secure: Proxied via server'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={currentProviderDef.placeholderKey}
                    disabled={!isPro}
                    className="w-full px-3.5 py-2 pr-10 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Endpoint Base URL (if custom or required) */}
              {(currentProviderDef.requiresUrl || provider === 'custom' || provider === 'openrouter') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>API Endpoint URL (Base URL)</span>
                  </label>
                  <input
                    type="url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder={currentProviderDef.defaultUrl || 'https://api.openai.com/v1'}
                    disabled={!isPro}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    {isVietnamese ? 'Ví dụ' : 'E.g.'} DeepSeek: <code>https://api.deepseek.com/v1</code> | Ollama: <code>http://localhost:11434/v1</code>
                  </span>
                </div>
              )}

              {/* Model Name & Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>{isVietnamese ? 'Tên Model (Model Identifier)' : 'Model Identifier'}</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {isVietnamese ? 'Có thể gõ trực tiếp tên model bất kỳ' : 'Type or select any model'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022"
                    disabled={!isPro}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Model Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentProviderDef.sampleModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        model === m
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Parameters: Temperature & Max Tokens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Temperature ({temperature})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {temperature <= 0.3
                        ? (isVietnamese ? 'Chính xác' : 'Precise')
                        : temperature <= 0.7
                        ? (isVietnamese ? 'Cân bằng' : 'Balanced')
                        : (isVietnamese ? 'Sáng tạo' : 'Creative')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isVietnamese ? 'Max Output Tokens (Tùy chọn)' : 'Max Output Tokens (Optional)'}
                  </span>
                  <input
                    type="number"
                    value={maxTokens || ''}
                    onChange={(e) => setMaxTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder={isVietnamese ? 'Mặc định (VD: 4096)' : 'Default (e.g. 4096)'}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* System Instruction Override */}
              <div className="space-y-1 pt-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isVietnamese ? 'System Instruction Mặc định (Tùy chọn)' : 'Default System Instruction (Optional)'}
                </span>
                <textarea
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  placeholder={isVietnamese ? 'System prompt áp dụng cho mọi lần thử nghiệm...' : 'System instruction applied to every test run...'}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Dùng Gemini Mặc định' : 'Reset to Default Gemini'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {provider !== 'built-in' && (
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTestingPing || !isPro}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTestingPing ? 'animate-spin' : ''}`} />
                <span>{isTestingPing ? (isVietnamese ? 'Đang ping...' : 'Pinging...') : (isVietnamese ? 'Kiểm tra Ping' : 'Test Ping')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-4.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isVietnamese ? 'Lưu Cấu Hình' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
