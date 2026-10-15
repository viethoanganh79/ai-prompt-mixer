import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Play,
  Download,
  Bot,
  Clock,
  Zap,
  FileText,
  X,
  Paperclip,
  Upload,
  Trash2,
  CheckCircle2,
  Plus,
  Sliders,
  Sparkles,
  Code2,
  Cpu,
  Layers,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { UserLog, LogAttachment } from '../types';
import { AIPlaygroundConfigModal } from './AIPlaygroundConfigModal';

interface PromptOutputPanelProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onOpenProModal?: () => void;
}

export const PromptOutputPanel: React.FC<PromptOutputPanelProps> = ({
  onShowToast,
  onOpenProModal,
}) => {
  const {
    compiledPrompt,
    promptFormat,
    setPromptFormat,
    isTestingAi,
    aiConfig,
    testPromptWithAI,
    aiTestResult,
    clearAiTestResult,
    logPromptAction,
    addLogAttachment,
    removeLogAttachment,
    updateLogAiOutput,
    logs,
  } = usePromptMixer();

  const { isPro } = useAuth();
  const { t, isVietnamese } = useLanguage();

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'ai'>('prompt');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Track the most recently copied log to attach AI files/response immediately
  const [recentCopiedLogId, setRecentCopiedLogId] = useState<string | null>(null);
  const [showAttachSection, setShowAttachSection] = useState(false);
  const [isPasteTextOpen, setIsPasteTextOpen] = useState(false);
  const [pastedAiResponse, setPastedAiResponse] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive the active copied log from global logs state
  const currentCopiedLog = useMemo(() => {
    if (!recentCopiedLogId) return null;
    return logs.find((l) => l.id === recentCopiedLogId) || null;
  }, [logs, recentCopiedLogId]);

  // Editable prompt state allowing quick manual adjustments directly in the textarea
  const [editablePrompt, setEditablePrompt] = useState(compiledPrompt);
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Auto-sync with compiled canvas blocks unless user is actively editing
  useEffect(() => {
    setEditablePrompt(compiledPrompt);
    setIsCustomEdited(false);
  }, [compiledPrompt]);

  // Stats calculation based on editable prompt
  const stats = useMemo(() => {
    const text = editablePrompt || '';
    if (!text) {
      return { chars: 0, words: 0, tokens: 0 };
    }
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(chars / 4);
    return { chars, words, tokens };
  }, [editablePrompt]);

  const handleCopyPrompt = async () => {
    if (!editablePrompt) return;
    try {
      await navigator.clipboard.writeText(editablePrompt);
      setCopiedPrompt(true);
      const createdLog = await logPromptAction('copied', editablePrompt);
      if (createdLog) {
        setRecentCopiedLogId(createdLog.id);
        setShowAttachSection(true);
      }
      onShowToast(
        'success',
        isVietnamese
          ? `Đã sao chép prompt dạng ${promptFormat.toUpperCase()}!`
          : `Copied prompt in ${promptFormat.toUpperCase()} format!`,
        isVietnamese ? 'Bạn có thể đính kèm file kết quả từ AI.' : 'You can attach AI output files below.'
      );
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi khi sao chép' : 'Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!editablePrompt) return;
    const isXml = promptFormat === 'xml';
    const blob = new Blob([editablePrompt], {
      type: isXml ? 'application/xml;charset=utf-8' : 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mixed-prompt-${Date.now()}.${isXml ? 'xml' : 'md'}`;
    link.click();
    URL.revokeObjectURL(url);
    logPromptAction('exported', editablePrompt);
    onShowToast(
      'success',
      isVietnamese
        ? `Đã tải xuống file Prompt (.${isXml ? 'xml' : 'md'})`
        : `Downloaded Prompt file (.${isXml ? 'xml' : 'md'})`
    );
  };

  const activeModelLabel = useMemo(() => {
    if (isPro && aiConfig.provider !== 'built-in') {
      return `${aiConfig.model} (${aiConfig.provider})`;
    }
    return isVietnamese ? 'Gemini 3.8 Flash (Mặc định)' : 'Gemini 3.8 Flash (Default)';
  }, [isPro, aiConfig, isVietnamese]);

  const handleRunAi = async () => {
    if (!editablePrompt.trim()) {
      onShowToast(
        'info',
        isVietnamese ? 'Canvas trống' : 'Canvas is empty',
        isVietnamese
          ? 'Vui lòng thêm các block hoặc nhập prompt trước khi chạy thử nghiệm.'
          : 'Please add blocks or type a prompt before running tests.'
      );
      return;
    }
    setActiveTab('ai');
    onShowToast(
      'info',
      isVietnamese ? `Đang gửi prompt tới ${activeModelLabel}...` : `Sending prompt to ${activeModelLabel}...`
    );

    const res = await testPromptWithAI(editablePrompt);
    if (res.success) {
      onShowToast(
        'success',
        isVietnamese ? 'Kiểm tra thành công!' : 'AI Test Succeeded!',
        isVietnamese
          ? `Phản hồi từ ${res.model || activeModelLabel} (${res.durationMs}ms)`
          : `Response from ${res.model || activeModelLabel} (${res.durationMs}ms)`
      );
    } else {
      onShowToast('error', isVietnamese ? 'Lỗi kiểm tra AI' : 'AI Test Error', res.error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recentCopiedLogId) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = (event.target?.result as string) || '';
        const attachment: LogAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: file.type || 'text/plain',
          content,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };

        await addLogAttachment(recentCopiedLogId, attachment);
        onShowToast(
          'success',
          isVietnamese ? 'Đã đính kèm tệp output AI!' : 'Attached AI output file!',
          `"${file.name}"`
        );
      };
      reader.readAsText(file);
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi khi đọc file đính kèm' : 'Failed to read attached file');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, name: string) => {
    if (!recentCopiedLogId) return;
    await removeLogAttachment(recentCopiedLogId, attachmentId);
    onShowToast('info', isVietnamese ? 'Đã xóa tệp đính kèm' : 'Removed attached file', `"${name}"`);
  };

  const handleSavePastedResponse = async () => {
    if (!recentCopiedLogId || !pastedAiResponse.trim()) return;
    await updateLogAiOutput(recentCopiedLogId, pastedAiResponse.trim());
    setPastedAiResponse('');
    setIsPasteTextOpen(false);
    onShowToast(
      'success',
      isVietnamese ? 'Đã lưu phản hồi text của AI vào lịch sử' : 'Saved AI text response to history'
    );
  };

  const handleDeleteAiText = async () => {
    if (!recentCopiedLogId) return;
    await updateLogAiOutput(recentCopiedLogId, undefined);
    onShowToast('info', isVietnamese ? 'Đã xóa phản hồi text của AI' : 'Deleted AI text response');
  };

  const handleCopyAiOutput = async () => {
    if (!aiTestResult?.output) return;
    try {
      await navigator.clipboard.writeText(aiTestResult.output);
      setCopiedAi(true);
      onShowToast('success', isVietnamese ? 'Đã sao chép kết quả phản hồi của AI!' : 'Copied AI response!');
      setTimeout(() => setCopiedAi(false), 2000);
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi khi sao chép' : 'Failed to copy');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className="w-full lg:w-[480px] xl:w-[540px] flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Header & Tab Switch */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'prompt'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('output.mergedPromptTab')}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('output.aiPlaygroundTab')}</span>
            {aiTestResult && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Action Button: AI Run (if on Prompt tab) or Model Config (if on AI tab) */}
        {activeTab === 'prompt' ? (
          <button
            onClick={handleRunAi}
            disabled={!editablePrompt.trim() || isTestingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
            title={isVietnamese ? 'Gửi sang AI Playground để thử nghiệm' : 'Send to AI Playground for testing'}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{t('output.testWithAi')}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (!isPro && onOpenProModal) {
                onOpenProModal();
              } else {
                setIsConfigModalOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isPro && aiConfig.provider !== 'built-in'
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
            title={isVietnamese ? 'Cấu hình Model & API Key bên ngoài (OpenAI, Claude, v.v.)' : 'Configure Custom Model & API Keys'}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('output.modelConfig')}</span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500 text-white">
              PRO
            </span>
          </button>
        )}
      </div>

      {/* Metrics Bar + Format Switcher */}
      <div className="px-3.5 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">{stats.words}</strong> {t('output.words')}
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">{stats.chars}</strong> {t('output.chars')}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
            <Zap className="w-3 h-3" />
            ~<strong className="font-mono">{stats.tokens}</strong> {t('output.tokens')}
          </span>
        </div>

        {/* Format Switcher */}
        {activeTab === 'prompt' && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setPromptFormat('markdown');
                  onShowToast(
                    'info',
                    isVietnamese ? 'Chuyển sang định dạng Markdown' : 'Switched to Markdown format',
                    isVietnamese ? 'Định dạng Markdown tiêu chuẩn phân đoạn bằng tiêu đề ###.' : 'Standard Markdown partitioned by ### headers.'
                  );
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  promptFormat === 'markdown'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={t('output.formatMarkdown')}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>MD</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptFormat('xml');
                  onShowToast(
                    'info',
                    isVietnamese ? 'Chuyển sang định dạng XML' : 'Switched to XML format',
                    isVietnamese ? 'Đóng gói các block vào thẻ XML phân cấp ngữ nghĩa (<prompt>, <role>, <instructions>...).' : 'Encapsulated into semantic hierarchical XML tags.'
                  );
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  promptFormat === 'xml'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={t('output.formatXml')}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>XML</span>
              </button>
            </div>

            <button
              onClick={handleDownload}
              disabled={!editablePrompt.trim()}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              title={`${t('output.downloadPrompt')} .${promptFormat === 'xml' ? 'xml' : 'md'}`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col min-h-0">
        {activeTab === 'prompt' ? (
          /* Prompt Output View with Editable Textarea for Quick Adjustments */
          <div className="h-full flex-1 flex flex-col space-y-2 min-h-0">
            {/* Quick Edit Bar & Actions */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('output.quickEditLabel')}</span>
                {isCustomEdited && editablePrompt !== compiledPrompt && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                    {t('output.manuallyEdited')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCustomEdited && editablePrompt !== compiledPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditablePrompt(compiledPrompt);
                      setIsCustomEdited(false);
                      onShowToast('info', isVietnamese ? 'Đã khôi phục nội dung prompt theo Canvas' : 'Restored prompt from Canvas');
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    title={t('output.restoreCanvas')}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('output.restoreCanvas')}</span>
                  </button>
                )}
                {editablePrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditablePrompt('');
                      setIsCustomEdited(true);
                      onShowToast('info', isVietnamese ? 'Đã xóa trắng ô nhập' : 'Cleared prompt input');
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title={t('output.clearTextarea')}
                  >
                    {t('output.clearTextarea')}
                  </button>
                )}
              </div>
            </div>

            {/* Basic, Highly Responsive Input Textarea */}
            <div className="relative flex-1 flex flex-col min-h-0">
              <textarea
                value={editablePrompt}
                onChange={(e) => {
                  setEditablePrompt(e.target.value);
                  setIsCustomEdited(true);
                }}
                placeholder={t('output.placeholder')}
                className="w-full h-full flex-1 p-3.5 sm:p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 resize-none select-text transition-all"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          /* AI Testing Playground */
          <div className="h-full flex flex-col space-y-3">
            {/* Active Model Indicator Header */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('output.model')}:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate font-mono">
                  {isPro && aiConfig.provider !== 'built-in' ? aiConfig.model : 'gemini-3.8-flash'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  {isPro && aiConfig.provider !== 'built-in' ? aiConfig.provider.toUpperCase() : 'BUILT-IN'}
                </span>
              </div>
              <button
                onClick={() => {
                  if (!isPro && onOpenProModal) {
                    onOpenProModal();
                  } else {
                    setIsConfigModalOpen(true);
                  }
                }}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Sliders className="w-3 h-3" />
                <span>{t('output.changeModel')}</span>
              </button>
            </div>

            {/* AI Execution States */}
            {isTestingAi ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner animate-bounce">
                  <Bot className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {t('output.runningAiTest')} {activeModelLabel}...
                </h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  {t('output.runningAiSub')}
                </p>
              </div>
            ) : aiTestResult ? (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                {/* Result Meta Banner */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold font-mono truncate">{aiTestResult.model || 'AI Model'}</span>
                    {aiTestResult.provider && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {aiTestResult.provider}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="flex items-center gap-1 font-mono font-medium opacity-90">
                      <Clock className="w-3.5 h-3.5" />
                      {aiTestResult.durationMs}ms
                    </span>
                    <button
                      onClick={clearAiTestResult}
                      className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 p-1 rounded cursor-pointer"
                      title={isVietnamese ? 'Xóa kết quả thử nghiệm' : 'Clear AI test results'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Output Content */}
                <div className="flex-1 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed whitespace-pre-wrap overflow-y-auto">
                  {aiTestResult.output}
                </div>

                {/* Action button */}
                <button
                  onClick={handleCopyAiOutput}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  {copiedAi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAi ? t('output.copiedAiResponse') : t('output.copyAiResponse')}</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Bot className="w-10 h-10 mb-3 opacity-40 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('output.aiPlaygroundTitle')}
                </p>
                <p className="text-xs mt-1 max-w-xs text-slate-500 leading-relaxed">
                  {t('output.aiPlaygroundDesc')}
                </p>
                <button
                  onClick={handleRunAi}
                  disabled={!compiledPrompt}
                  className="mt-4 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-40 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {t('output.runTestNow')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Interactive AI Output Attachment Panel right after prompt copied */}
        {showAttachSection && currentCopiedLog && (
          <div className="mb-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-slate-800/90 shadow-xs animate-in fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('output.attachAiOutputTitle')}
                </span>
              </div>
              <button
                onClick={() => setShowAttachSection(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions: Upload File or Paste Text */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.json,.md,.csv,.js,.ts,.py,.html,.css"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('output.attachFile')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPasteTextOpen(!isPasteTextOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('output.pasteAiResponse')}</span>
              </button>
            </div>

            {/* Paste Text Collapsible Input */}
            {isPasteTextOpen && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <textarea
                  value={pastedAiResponse}
                  onChange={(e) => setPastedAiResponse(e.target.value)}
                  placeholder={t('output.pastePlaceholder')}
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasteTextOpen(false);
                      setPastedAiResponse('');
                    }}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePastedResponse}
                    disabled={!pastedAiResponse.trim()}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {t('output.saveToHistory')}
                  </button>
                </div>
              </div>
            )}

            {/* List of current attachments */}
            {currentCopiedLog.attachments && currentCopiedLog.attachments.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-indigo-100 dark:border-slate-700">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('output.attachedFilesCount')}:
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {currentCopiedLog.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(att.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id, att.name)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show pasted AI response preview if already saved */}
            {currentCopiedLog.aiResponse && (
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>{t('output.savedAiResponse')}:</span>
                  <button
                    onClick={handleDeleteAiText}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="line-clamp-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  {currentCopiedLog.aiResponse}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleCopyPrompt}
          disabled={!editablePrompt.trim()}
          className={`w-full py-3 rounded-xl text-sm font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            copiedPrompt
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-indigo-500/25 disabled:opacity-40 disabled:pointer-events-none'
          }`}
        >
          {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>
            {copiedPrompt
              ? (isVietnamese ? `ĐÃ SAO CHÉP PROMPT (${promptFormat.toUpperCase()})!` : `COPIED PROMPT (${promptFormat.toUpperCase()})!`)
              : (isVietnamese ? `SAO CHÉP PROMPT (${promptFormat.toUpperCase()})` : `COPY PROMPT (${promptFormat.toUpperCase()})`)}
          </span>
        </button>
      </div>

      {/* External AI Playground Model Configuration Modal */}
      <AIPlaygroundConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onOpenProModal={onOpenProModal}
        onShowToast={onShowToast}
      />
    </section>
  );
};
