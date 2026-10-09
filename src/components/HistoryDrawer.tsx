import React, { useState } from 'react';
import {
  History,
  Copy,
  Check,
  Trash2,
  X,
  Bot,
  Clock,
  Paperclip,
  Download,
  Plus,
  Eye,
  FileText,
  Upload,
  Edit2,
  Save,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { UserLog, LogAttachment } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onShowToast }) => {
  const {
    logs,
    clearHistory,
    deleteLog,
    deleteLogs,
    updateLogAiOutput,
    addLogAttachment,
    removeLogAttachment,
  } = usePromptMixer();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAiId, setCopiedAiId] = useState<string | null>(null);
  const [editingAiLogId, setEditingAiLogId] = useState<string | null>(null);
  const [editingAiText, setEditingAiText] = useState<string>('');
  const [previewAttachment, setPreviewAttachment] = useState<LogAttachment | null>(null);
  const [filterAction, setFilterAction] = useState<'all' | 'copied' | 'tested'>('all');

  // Inline confirmation states (replaces window.confirm)
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction === 'all') return true;
    return log.action === filterAction;
  });

  const handleCopyPrompt = async (log: UserLog) => {
    try {
      await navigator.clipboard.writeText(log.promptText);
      setCopiedId(log.id);
      onShowToast('success', 'Đã sao chép prompt từ lịch sử!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onShowToast('error', 'Lỗi sao chép');
    }
  };

  const handleCopyAi = async (log: UserLog) => {
    if (!log.aiResponse) return;
    try {
      await navigator.clipboard.writeText(log.aiResponse);
      setCopiedAiId(log.id);
      onShowToast('success', 'Đã sao chép phản hồi AI!');
      setTimeout(() => setCopiedAiId(null), 2000);
    } catch {
      onShowToast('error', 'Lỗi sao chép');
    }
  };

  const handleConfirmDeleteSingle = async (logId: string) => {
    await deleteLog(logId);
    setConfirmDeleteLogId(null);
    setSelectedLogIds((prev) => prev.filter((id) => id !== logId));
    onShowToast('info', 'Đã xóa bản ghi lịch sử');
  };

  const handleConfirmClearAll = async () => {
    await clearHistory();
    setShowClearAllConfirm(false);
    setSelectedLogIds([]);
    onShowToast('info', 'Đã xóa toàn bộ lịch sử prompt');
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedLogIds.length === 0) return;
    await deleteLogs(selectedLogIds);
    onShowToast('info', `Đã xóa ${selectedLogIds.length} bản ghi lịch sử`);
    setSelectedLogIds([]);
    setConfirmBatchDelete(false);
  };

  const toggleSelectLog = (logId: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map((l) => l.id));
    }
  };

  const handleStartEditAi = (log: UserLog) => {
    setEditingAiLogId(log.id);
    setEditingAiText(log.aiResponse || '');
  };

  const handleSaveAi = async (logId: string) => {
    const textToSave = editingAiText.trim() ? editingAiText.trim() : undefined;
    await updateLogAiOutput(logId, textToSave);
    setEditingAiLogId(null);
    onShowToast('success', 'Đã lưu phản hồi AI cho bản ghi');
  };

  const handleRemoveAiOutput = async (logId: string) => {
    await updateLogAiOutput(logId, undefined);
    onShowToast('info', 'Đã xóa phản hồi AI của bản ghi');
  };

  const handleFileUpload = async (logId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        await addLogAttachment(logId, attachment);
        onShowToast('success', 'Đã đính kèm tệp output AI!', `"${file.name}"`);
      };
      reader.readAsText(file);
    } catch {
      onShowToast('error', 'Lỗi khi đọc file đính kèm');
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadAttachment = (attachment: LogAttachment) => {
    const blob = new Blob([attachment.content], { type: attachment.type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Đã tải xuống tệp đính kèm');
  };

  const handleRemoveAttachment = async (logId: string, attachmentId: string, name: string) => {
    await removeLogAttachment(logId, attachmentId);
    onShowToast('info', 'Đã xóa tệp đính kèm', `"${name}"`);
    if (previewAttachment?.id === attachmentId) {
      setPreviewAttachment(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Lịch sử Prompt ({logs.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ghi lại lịch sử sao chép & quản lý tệp output AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {logs.length > 0 && (
              <button
                onClick={() => setShowClearAllConfirm(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition-colors"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Xóa hết</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clear All Confirmation Banner */}
        {showClearAllConfirm && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Xác nhận xóa sạch {logs.length} bản ghi lịch sử? Không thể hoàn tác.</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleConfirmClearAll}
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Xóa tất cả
              </button>
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="px-2 py-1 rounded-md text-xs text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Action Filter Pills & Bulk Select Controls */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Lọc:</span>
            <button
              onClick={() => setFilterAction('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterAction === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tất cả ({logs.length})
            </button>
            <button
              onClick={() => setFilterAction('copied')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterAction === 'copied'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Đã chép ({logs.filter((l) => l.action === 'copied').length})
            </button>
            <button
              onClick={() => setFilterAction('tested')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                filterAction === 'tested'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Đã test ({logs.filter((l) => l.action === 'tested').length})
            </button>
          </div>

          {filteredLogs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1"
            >
              {selectedLogIds.length === filteredLogs.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>
                {selectedLogIds.length === filteredLogs.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
              </span>
            </button>
          )}
        </div>

        {/* Batch Selection Action Bar */}
        {selectedLogIds.length > 0 && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200">
              Đã chọn <strong>{selectedLogIds.length}</strong> bản ghi
            </span>

            <div className="flex items-center gap-2">
              {confirmBatchDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleConfirmBatchDelete}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Xác nhận xóa {selectedLogIds.length} mục
                  </button>
                  <button
                    onClick={() => setConfirmBatchDelete(false)}
                    className="px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBatchDelete(true)}
                  className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa mục đã chọn</span>
                </button>
              )}

              <button
                onClick={() => setSelectedLogIds([])}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 p-1"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* List of Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Không tìm thấy bản ghi lịch sử nào
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Khi bạn sao chép hoặc chạy thử nghiệm prompt, các bản ghi sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isCopied = copiedId === log.id;
              const isCopiedAi = copiedAiId === log.id;
              const isEditingAi = editingAiLogId === log.id;
              const hasAttachments = log.attachments && log.attachments.length > 0;
              const isSelected = selectedLogIds.includes(log.id);
              const isConfirmDelete = confirmDeleteLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border space-y-3 shadow-xs transition-colors ${
                    isSelected
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSelectLog(log.id)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide ${
                          log.action === 'tested'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {log.action}
                      </span>

                      {/* Delete Single Log with Inline Confirmation */}
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 animate-in fade-in">
                          <span className="text-[10px] font-bold text-rose-600">Xóa?</span>
                          <button
                            onClick={() => handleConfirmDeleteSingle(log.id)}
                            className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => setConfirmDeleteLogId(null)}
                            className="px-1 py-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[10px]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteLogId(log.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {log.presetName && (
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Preset: {log.presetName}
                    </div>
                  )}

                  {/* Prompt Text Preview */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 line-clamp-3 leading-relaxed">
                    {log.promptText}
                  </div>

                  {/* AI Response Section */}
                  <div className="space-y-2">
                    {isEditingAi ? (
                      /* Inline editing AI output */
                      <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 space-y-2">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-purple-600" />
                          <span>Chỉnh sửa / Dán kết quả AI:</span>
                        </label>
                        <textarea
                          rows={4}
                          value={editingAiText}
                          onChange={(e) => setEditingAiText(e.target.value)}
                          placeholder="Dán câu trả lời nhận được từ ChatGPT, Claude, Gemini..."
                          className="w-full p-2.5 text-xs font-sans rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingAiLogId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:underline"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleSaveAi(log.id)}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu kết quả</span>
                          </button>
                        </div>
                      </div>
                    ) : log.aiResponse ? (
                      /* Render existing AI response */
                      <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Kết quả AI {log.durationMs ? `(${log.durationMs}ms)` : ''}</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-xs">
                            <button
                              onClick={() => handleCopyAi(log)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center gap-1"
                              title="Sao chép câu trả lời của AI"
                            >
                              {isCopiedAi ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{isCopiedAi ? 'Đã chép' : 'Chép AI'}</span>
                            </button>
                            <button
                              onClick={() => handleStartEditAi(log)}
                              className="p-1 rounded text-purple-600 hover:text-purple-800 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                              title="Sửa nội dung phản hồi AI"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveAiOutput(log.id)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Xóa phản hồi AI"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {log.aiResponse}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Attached Output Files List */}
                  {hasAttachments && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-indigo-500" />
                        Tệp kết quả đính kèm ({log.attachments!.length}):
                      </span>
                      <div className="space-y-1">
                        {log.attachments!.map((att) => (
                          <div
                            key={att.id}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                {att.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({formatFileSize(att.size)})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                                title="Xem nội dung tệp"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadAttachment(att)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                                title="Tải xuống"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveAttachment(log.id, att.id, att.name)}
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600"
                                title="Xóa tệp đính kèm này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Toolbar for Log Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {log.wordCount} từ
                      </span>
                      <span>•</span>
                      <span>~{log.estimatedTokens} tokens</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Attach AI text button if empty */}
                      {!log.aiResponse && !isEditingAi && (
                        <button
                          onClick={() => handleStartEditAi(log)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Dán kết quả AI</span>
                        </button>
                      )}

                      {/* Upload file attachment button */}
                      <label className="cursor-pointer px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors">
                        <Upload className="w-3 h-3 text-indigo-500" />
                        <span>Đính kèm tệp</span>
                        <input
                          type="file"
                          accept=".txt,.md,.json,.csv,.log,.html,.py,.js,.ts"
                          onChange={(e) => handleFileUpload(log.id, e)}
                          className="hidden"
                        />
                      </label>

                      {/* Copy Prompt Button */}
                      <button
                        onClick={() => handleCopyPrompt(log)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Attachment Content Preview Modal */}
        {previewAttachment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {previewAttachment.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {previewAttachment.content}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Dung lượng: {formatFileSize(previewAttachment.size)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadAttachment(previewAttachment)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </button>
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};