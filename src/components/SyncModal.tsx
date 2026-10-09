import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Code2,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import {
  parseGoogleSheetUrl,
  generateCsvForBlocks,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from '../services/googleSheetsSync';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const {
    syncConfig,
    updateSyncConfig,
    syncPullFromSheet,
    syncPushToSheet,
    blocks,
  } = usePromptMixer();

  const [urlInput, setUrlInput] = useState(syncConfig.sheetUrl || '');
  const [webhookInput, setWebhookInput] = useState(syncConfig.webhookUrl || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const parsed = parseGoogleSheetUrl(urlInput);

  const handleSaveAndTest = async () => {
    if (!urlInput.trim()) {
      onShowToast('error', 'Chưa nhập link', 'Vui lòng dán link chia sẻ Google Sheet.');
      return;
    }

    const check = parseGoogleSheetUrl(urlInput);
    if (!check.isValid) {
      setTestResult({
        status: 'error',
        message: check.error || 'Link Google Sheet không hợp lệ.',
      });
      return;
    }

    setTestingConnection(true);
    setTestResult({ status: 'idle' });

    await updateSyncConfig({
      sheetUrl: urlInput.trim(),
      sheetId: check.sheetId || '',
      gid: check.gid || '0',
      webhookUrl: webhookInput.trim(),
    });

    // Test pulling from sheet
    const pullResult = await syncPullFromSheet();
    setTestingConnection(false);

    if (pullResult.success) {
      setTestResult({
        status: 'success',
        message: `Kết nối thành công! Đã nạp ${pullResult.count} blocks từ Google Sheet về thư viện cục bộ.`,
      });
      onShowToast('success', 'Đồng bộ Google Sheet thành công!', `Đã nạp ${pullResult.count} blocks.`);
    } else {
      setTestResult({
        status: 'error',
        message:
          pullResult.error ||
          'Không thể đọc dữ liệu. Đảm bảo bạn đã bật "Bất kỳ ai có đường liên kết đều có thể xem".',
      });
      onShowToast('error', 'Lỗi đồng bộ', pullResult.error);
    }
  };

  const handlePushToSheet = async () => {
    if (!webhookInput.trim()) {
      onShowToast(
        'info',
        'Cần Webhook URL',
        'Vui lòng cấu hình Google Apps Script Webhook bên dưới để đẩy dữ liệu trực tiếp 2 chiều.'
      );
      setShowScriptGuide(true);
      return;
    }

    setTestingConnection(true);
    const res = await syncPushToSheet();
    setTestingConnection(false);

    if (res.success) {
      onShowToast('success', 'Đã đẩy dữ liệu lên Google Sheet!', res.message);
    } else {
      onShowToast('error', 'Lỗi đẩy dữ liệu', res.message);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCsvForBlocks(blocks);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_prompt_mixer_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Đã tải file mẫu Google Sheet (.csv)');
  };

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    onShowToast('success', 'Đã sao chép mã Google Apps Script!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Cloud Sync: Google Sheets Hub
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Đồng bộ hóa 2 chiều kho prompt blocks với Google Sheet cá nhân hoặc nhóm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Sheet Share Link Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Đường liên kết chia sẻ Google Sheet (Public Share Link):</span>
              {parsed.isValid && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  ID: {parsed.sheetId?.substring(0, 12)}...
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit?usp=sharing"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 Lưu ý: Trên Google Sheet của bạn, chọn nút <strong>Chia sẻ (Share)</strong> và đặt quyền thành:{' '}
              <span className="underline font-medium text-indigo-600 dark:text-indigo-400">
                "Bất kỳ ai có đường liên kết đều có thể xem"
              </span>{' '}
              hoặc chọn <em>Tệp &gt; Chia sẻ &gt; Xuất bản lên web (Publish to web)</em>.
            </p>
          </div>

          {/* Connection Test & Status Alert */}
          {testResult.status !== 'idle' && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm leading-relaxed ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{testResult.message}</div>
            </div>
          )}

          {/* Quick Sync Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSaveAndTest}
              disabled={testingConnection || !urlInput}
              className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-900 dark:text-indigo-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-xs"
            >
              {testingConnection ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <RefreshCw className="w-4 h-4 text-indigo-600" />
              )}
              <span>Kiểm tra & Kéo Prompt về Máy</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Tải File Mẫu Chuẩn (.csv)</span>
            </button>
          </div>

          {/* Advanced: 2-Way Live Push with Google Apps Script */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-violet-500" />
                  Đồng bộ Đẩy 2 Chiều (Google Apps Script Webhook)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tùy chọn: Đẩy các block bạn tạo hoặc chỉnh sửa từ app ngược trở lại Google Sheet
                </p>
              </div>

              <button
                onClick={() => setShowScriptGuide(!showScriptGuide)}
                className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                {showScriptGuide ? 'Ẩn mã Apps Script' : 'Xem mã Apps Script'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handlePushToSheet}
                disabled={testingConnection || !webhookInput}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Đẩy lên Sheet</span>
              </button>
            </div>

            {/* Apps Script Guide Container */}
            {showScriptGuide && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Mã Google Apps Script (Copy & Paste vào Sheet trong 1 phút):
                  </span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedScript ? 'Đã sao chép' : 'Sao chép mã'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono max-h-52 overflow-y-auto leading-relaxed">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {syncConfig.lastSyncTime ? (
              <span>Lần đồng bộ gần nhất: {new Date(syncConfig.lastSyncTime).toLocaleTimeString()}</span>
            ) : (
              <span>Chưa đồng bộ lần nào</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
