import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { UserLog, LogAttachment } from '../types';

interface PromptOutputPanelProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const PromptOutputPanel: React.FC<PromptOutputPanelProps> = ({ onShowToast }) => {
  const {
    compiledPrompt,
    isTestingAi,
    testPromptWithGemini,
    aiTestResult,
    clearAiTestResult,
    logPromptAction,
    addLogAttachment,
    removeLogAttachment,
    updateLogAiOutput,
    logs,
  } = usePromptMixer();

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'ai'>('prompt');

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

  // Stats calculation
  const stats = useMemo(() => {
    if (!compiledPrompt) {
      return { chars: 0, words: 0, tokens: 0 };
    }
    const chars = compiledPrompt.length;
    const words = compiledPrompt.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(chars / 4);
    return { chars, words, tokens };
  }, [compiledPrompt]);

  const handleCopyPrompt = async () => {
    if (!compiledPrompt) return;
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setCopiedPrompt(true);
      const createdLog = await logPromptAction('copied');
      if (createdLog) {
        setRecentCopiedLogId(createdLog.id);
        setShowAttachSection(true);
      }
      onShowToast('success', 'Đã sao chép prompt và ghi nhận lịch sử!', 'Bạn có thể đính kèm file kết quả từ AI.');
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      onShowToast('error', 'Lỗi khi sao chép');
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
        onShowToast('success', 'Đã đính kèm tệp output AI!', `"${file.name}"`);
      };
      reader.readAsText(file);
    } catch {
      onShowToast('error', 'Lỗi khi đọc file đính kèm');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, name: string) => {
    if (!recentCopiedLogId) return;
    await removeLogAttachment(recentCopiedLogId, attachmentId);
    onShowToast('info', 'Đã xóa tệp đính kèm', `"${name}"`);
  };

  const handleSavePastedResponse = async () => {
    if (!recentCopiedLogId || !pastedAiResponse.trim()) return;
    await updateLogAiOutput(recentCopiedLogId, pastedAiResponse.trim());
    setPastedAiResponse('');
    setIsPasteTextOpen(false);
    onShowToast('success', 'Đã lưu phản hồi text của AI vào lịch sử');
  };

  const handleDeleteAiText = async () => {
    if (!recentCopiedLogId) return;
    await updateLogAiOutput(recentCopiedLogId, undefined);
    onShowToast('info', 'Đã xóa phản hồi text của AI');
  };

  const handleCopyAiOutput = async () => {
    if (!aiTestResult?.output) return;
    try {
      await navigator.clipboard.writeText(aiTestResult.output);
      setCopiedAi(true);
      onShowToast('success', 'Đã sao chép kết quả phản hồi của AI!');
      setTimeout(() => setCopiedAi(false), 2000);
    } catch {
      onShowToast('error', 'Lỗi khi sao chép');
    }
  };

  const handleDownload = () => {
    if (!compiledPrompt) return;
    const blob = new Blob([compiledPrompt], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mixed-prompt-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    logPromptAction('exported');
    onShowToast('success', 'Đã tải xuống file Prompt (.md)');
  };

  const handleRunAi = async () => {
    if (!compiledPrompt) {
      onShowToast('info', 'Canvas trống', 'Vui lòng thêm các block trước khi chạy thử nghiệm.');
      return;
    }
    setActiveTab('ai');
    onShowToast('info', 'Đang gửi prompt tới Gemini 3.8 Flash...');
    const res = await testPromptWithGemini();
    if (res.success) {
      onShowToast('success', 'Kiểm tra thành công!', `Thời gian xử lý: ${res.durationMs}ms`);
    } else {
      onShowToast('error', 'Lỗi kiểm tra AI', res.error);
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
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'prompt'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Prompt Đã Trộn
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-500" />
            <span>AI Playground</span>
            {aiTestResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">{stats.words}</strong> từ
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">{stats.chars}</strong> ký tự
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
            <Zap className="w-3.5 h-3.5" />
            ~<strong className="font-mono">{stats.tokens}</strong> tokens
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            disabled={!compiledPrompt}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title="Tải xuống tệp .md"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'prompt' ? (
          /* Prompt Output View */
          <div className="h-full flex flex-col">
            {compiledPrompt ? (
              <div className="relative flex-1">
                <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text overflow-y-auto">
                  {compiledPrompt}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <FileText className="w-10 h-10 mb-3 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Chưa có câu lệnh nào được trộn
                </p>
                <p className="text-xs mt-1 text-slate-500 max-w-xs leading-relaxed">
                  Thêm ít nhất một block từ thư viện hoặc tải Preset có sẵn để xem kết quả trực tiếp.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* AI Testing Playground */
          <div className="h-full flex flex-col">
            {isTestingAi ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner animate-bounce">
                  <Bot className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Đang chạy thử nghiệm với Gemini 3.8 Flash...
                </h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Đang gửi cấu trúc prompt đã trộn qua API máy chủ và nhận phản hồi thực tế.
                </p>
              </div>
            ) : aiTestResult ? (
              <div className="h-full flex flex-col space-y-3">
                {/* Result Meta Banner */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold">gemini-3.8-flash</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-mono font-medium opacity-90">
                      <Clock className="w-3.5 h-3.5" />
                      {aiTestResult.durationMs}ms
                    </span>
                    <button
                      onClick={clearAiTestResult}
                      className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 p-1 rounded"
                      title="Xóa kết quả thử nghiệm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Output Content */}
                <div className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed whitespace-pre-wrap overflow-y-auto">
                  {aiTestResult.output}
                </div>

                {/* Action button */}
                <button
                  onClick={handleCopyAiOutput}
                  className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {copiedAi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAi ? 'Đã sao chép phản hồi!' : 'Sao chép phản hồi của AI'}</span>
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Bot className="w-10 h-10 mb-3 opacity-40 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Sân chơi kiểm tra Prompt với Gemini AI
                </p>
                <p className="text-xs mt-1 max-w-xs text-slate-500 leading-relaxed">
                  Nhấn nút "Test AI" để xem trực tiếp mô hình AI phản hồi như thế nào với prompt mà bạn vừa phối trộn.
                </p>
                <button
                  onClick={handleRunAi}
                  disabled={!compiledPrompt}
                  className="mt-4 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-40 transition-all shadow-md shadow-indigo-500/20"
                >
                  <Play className="w-4 h-4" />
                  Chạy thử nghiệm ngay
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Interactive AI Output Attachment Panel right after prompt copied */}
        {showAttachSection && currentCopiedLog && (
          <div className="mb-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-slate-800/90 shadow-sm animate-in fade-in space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Đã ghi lịch sử! Đính kèm Output từ AI:
                </span>
              </div>
              <button
                onClick={() => setShowAttachSection(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
                title="Đóng bảng đính kèm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Buttons: File Attach + Paste Text */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.md,.json,.csv,.py,.js,.ts,.html,.log,text/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Đính kèm file output (.txt, .md, .json...)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPasteTextOpen(!isPasteTextOpen)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isPasteTextOpen ? 'Thu gọn' : 'Dán text phản hồi AI'}</span>
              </button>
            </div>

            {/* Inline Paste Text Box */}
            {isPasteTextOpen && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <textarea
                  rows={3}
                  value={pastedAiResponse}
                  onChange={(e) => setPastedAiResponse(e.target.value)}
                  placeholder="Dán câu trả lời bạn nhận được từ ChatGPT, Claude, Gemini vào đây để lưu trữ kèm bản ghi..."
                  className="w-full p-2.5 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasteTextOpen(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePastedResponse}
                    disabled={!pastedAiResponse.trim()}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white disabled:opacity-40"
                  >
                    Lưu phản hồi
                  </button>
                </div>
              </div>
            )}

            {/* Display Attached Files List with delete buttons */}
            {currentCopiedLog.attachments && currentCopiedLog.attachments.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Tệp đính kèm ({currentCopiedLog.attachments.length}):
                </span>
                <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                  {currentCopiedLog.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({formatFileSize(att.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id, att.name)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors"
                        title="Xóa tệp đính kèm này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display Attached AI Text if already saved */}
            {currentCopiedLog.aiResponse && (
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Phản hồi text đã lưu
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteAiText}
                    className="text-slate-400 hover:text-rose-600 text-[11px]"
                  >
                    Xóa
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
          disabled={!compiledPrompt}
          className={`w-full py-3 rounded-xl text-sm font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
            copiedPrompt
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-indigo-500/25 disabled:opacity-40 disabled:pointer-events-none'
          }`}
        >
          {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copiedPrompt ? 'ĐÃ SAO CHÉP PROMPT!' : 'SAO CHÉP TOÀN BỘ PROMPT'}</span>
        </button>
      </div>
    </section>
  );
};
