import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Table,
  FileCode,
  X,
  HardDrive,
  Share2,
  Link,
  Settings,
  Sparkles,
  Cloud,
  Check,
  Shield,
  Key,
  Globe,
  Languages,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DEFAULT_BLOCKS, DEFAULT_PRESETS } from '../db/defaultData';
import { testShortenerConnection } from '../utils/shortenerClient';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShareBundle?: () => void;
  onOpenImport?: () => void;
  onOpenProModal?: () => void;
  onOpenZeroKnowledgeSync?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onOpenShareBundle,
  onOpenImport,
  onOpenProModal,
  onOpenZeroKnowledgeSync,
  onShowToast,
}) => {
  const {
    blocks,
    presets,
    logs,
    exportJsonBackup,
    exportSqlDump,
    importBackupData,
    resetDatabaseToDefaults,
    switchLibraryLanguage,
  } = usePromptMixer();

  const { language, setLanguage, t, isVietnamese, isEnglish } = useLanguage();

  const {
    user,
    isPro,
    cloudSettings,
    updateCloudSettings,
    syncWithBackend,
    getIdToken,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'database' | 'shortener'>('general');
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [switchingLibrary, setSwitchingLibrary] = useState(false);

  // Shortener & Backend settings state
  const [shortenerEndpoint, setShortenerEndpoint] = useState(
    cloudSettings.shortener.customEndpoint || ''
  );
  const [shortenerApiKey, setShortenerApiKey] = useState(
    cloudSettings.shortener.apiKey || ''
  );
  const [backendSyncEndpoint, setBackendSyncEndpoint] = useState(
    cloudSettings.backendSyncEndpoint || ''
  );
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    try {
      const json = await exportJsonBackup();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_prompt_mixer_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('success', isVietnamese ? 'Đã xuất file sao lưu JSON!' : 'Exported JSON backup file!');
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi xuất file' : 'Export failed');
    }
  };

  const handleExportSql = async () => {
    try {
      const sql = await exportSqlDump();
      const blob = new Blob([sql], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_prompt_mixer_dump_${Date.now()}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('success', isVietnamese ? 'Đã xuất SQLite SQL Dump (.sql)!' : 'Exported SQLite SQL Dump (.sql)!');
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi xuất SQL script' : 'SQL export failed');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const res = await importBackupData(text);
      onShowToast(
        'success',
        isVietnamese ? 'Nhập dữ liệu thành công!' : 'Data imported successfully!',
        isVietnamese
          ? `Đã nạp ${res.blocksCount} blocks và ${res.presetsCount} presets vào cơ sở dữ liệu.`
          : `Loaded ${res.blocksCount} blocks and ${res.presetsCount} presets into local database.`
      );
    } catch (err: any) {
      onShowToast('error', isVietnamese ? 'Lỗi nhập dữ liệu' : 'Import failed', err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    const confirmMsg = t('settingsModal.restoreConfirm');
    if (confirm(confirmMsg)) {
      setResetting(true);
      await resetDatabaseToDefaults(language);
      setResetting(false);
      onShowToast('info', t('settingsModal.restoreSuccess'));
    }
  };

  const handleSelectLanguage = async (newLang: 'vi' | 'en') => {
    if (newLang === language) return;
    setLanguage(newLang);
    setSwitchingLibrary(true);
    try {
      await switchLibraryLanguage(newLang);
      onShowToast(
        'success',
        newLang === 'en' ? 'Language switched to English!' : 'Đã chuyển sang Tiếng Việt!',
        newLang === 'en'
          ? 'Interface and default prompt library updated to English.'
          : 'Giao diện và các mẫu prompt đã được chuyển sang Tiếng Việt.'
      );
    } catch (err: any) {
      console.error('Failed to switch library language:', err);
    } finally {
      setSwitchingLibrary(false);
    }
  };

  const handleManualSwitchLibrary = async (targetLang: 'vi' | 'en') => {
    setSwitchingLibrary(true);
    try {
      await switchLibraryLanguage(targetLang);
      onShowToast('success', t('settingsModal.switchPromptsSuccess'));
    } catch (err: any) {
      onShowToast('error', 'Error', err?.message);
    } finally {
      setSwitchingLibrary(false);
    }
  };

  const handleSaveApiSettings = async () => {
    try {
      await updateCloudSettings({
        shortener: {
          ...cloudSettings.shortener,
          customEndpoint: shortenerEndpoint.trim(),
          apiKey: shortenerApiKey.trim(),
        },
        backendSyncEndpoint: backendSyncEndpoint.trim(),
      });
      onShowToast('success', t('settingsModal.savedSuccess'));
    } catch (err: any) {
      onShowToast('error', isVietnamese ? 'Lỗi lưu cấu hình' : 'Save error', err?.message);
    }
  };

  const handleTestConnection = async () => {
    if (!shortenerEndpoint.trim()) {
      onShowToast('info', isVietnamese ? 'Vui lòng nhập URL Endpoint của Service' : 'Please enter service endpoint URL');
      return;
    }

    setIsTestingConnection(true);
    try {
      const token = await getIdToken();
      const res = await testShortenerConnection(
        {
          customEndpoint: shortenerEndpoint.trim(),
          apiKey: shortenerApiKey.trim(),
        },
        token
      );

      if (res.ok) {
        onShowToast('success', isVietnamese ? 'Kết nối thành công!' : 'Connection successful!', res.message);
      } else {
        onShowToast('error', isVietnamese ? 'Kiểm tra thất bại' : 'Test failed', res.message);
      }
    } catch (err: any) {
      onShowToast('error', isVietnamese ? 'Lỗi kết nối' : 'Connection error', err?.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSyncBackend = async () => {
    if (!backendSyncEndpoint.trim()) {
      onShowToast('info', isVietnamese ? 'Vui lòng nhập URL Backend lưu trữ cài đặt' : 'Please enter backend URL');
      return;
    }

    setIsSyncingBackend(true);
    try {
      await handleSaveApiSettings();
      const res = await syncWithBackend();
      if (res.ok) {
        onShowToast('success', isVietnamese ? 'Đồng bộ đám mây thành công!' : 'Cloud sync successful!', res.message);
      } else {
        onShowToast('error', isVietnamese ? 'Lỗi đồng bộ' : 'Sync error', res.message);
      }
    } catch (err: any) {
      onShowToast('error', isVietnamese ? 'Lỗi' : 'Error', err?.message);
    } finally {
      setIsSyncingBackend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {t('settingsModal.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('settingsModal.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick Header Language Switch */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleSelectLanguage('vi')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  isVietnamese
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Tiếng Việt"
              >
                🇻🇳 VI
              </button>
              <button
                onClick={() => handleSelectLanguage('en')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  isEnglish
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-4 sm:px-6 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t('settingsModal.tabGeneral')}</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'database'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{t('settingsModal.tabDatabase')}</span>
            </button>

            <button
              onClick={() => setActiveTab('shortener')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'shortener'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('settingsModal.tabApi')}</span>
              {isPro && (
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500 text-white">
                  PRO
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'general' && (
            /* --- TAB 1: GENERAL & BILINGUAL LANGUAGE --- */
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-indigo-600" />
                  <span>{t('settingsModal.languageHeading')}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('settingsModal.languageDesc')}
                </p>
              </div>

              {/* Language Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Vietnamese Card */}
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('vi')}
                  disabled={switchingLibrary}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isVietnamese
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇻🇳</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {t('settingsModal.langVi')}
                        </div>
                        <div className="text-[11px] text-slate-500">Vietnamese</div>
                      </div>
                    </div>
                    {isVietnamese && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5">
                    {t('settingsModal.langViDesc')}
                  </p>
                </button>

                {/* English Card */}
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('en')}
                  disabled={switchingLibrary}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isEnglish
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇬🇧</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {t('settingsModal.langEn')}
                        </div>
                        <div className="text-[11px] text-slate-500">English</div>
                      </div>
                    </div>
                    {isEnglish && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5">
                    {t('settingsModal.langEnDesc')}
                  </p>
                </button>
              </div>

              {/* Template Library Sync Notice */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isVietnamese ? 'Đồng bộ thư viện mẫu prompt' : 'Sync Prompt Template Library'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVietnamese
                      ? 'Chuyển toàn bộ 18 khối prompt và 5 công thức mặc định sang ngôn ngữ bạn đã chọn.'
                      : 'Switch all 18 default blocks and 5 preset recipes to your selected language.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleManualSwitchLibrary(language)}
                  disabled={switchingLibrary}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {switchingLibrary ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {switchingLibrary
                      ? t('common.loading')
                      : isVietnamese
                      ? 'Cập nhật mẫu Tiếng Việt'
                      : 'Update English Templates'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            /* --- TAB 2: LOCAL DATABASE & BACKUP --- */
            <div className="space-y-4">
              {/* Database Tables Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-mono font-medium">TABLE blocks</span>
                    <Table className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {blocks.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t('settingsModal.tableBlocks')}</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-mono font-medium">TABLE presets</span>
                    <Table className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {presets.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t('settingsModal.tablePresets')}</div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-mono font-medium">TABLE logs</span>
                    <Table className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {logs.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t('settingsModal.tableLogs')}</div>
                </div>
              </div>

              {/* Export & Import Actions */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('settingsModal.dbHeading')}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleExportSql}
                    className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-900 dark:text-blue-200 flex items-center gap-2.5 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-left">
                      <div>{t('settingsModal.exportSql')}</div>
                      <div className="text-[10px] opacity-70 font-normal">DDL & SQLite INSERT</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left">
                      <div>{t('settingsModal.exportJson')}</div>
                      <div className="text-[10px] opacity-70 font-normal">JSON Backup Format</div>
                    </div>
                  </button>
                </div>

                {/* Import File Input */}
                <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {t('settingsModal.importBackup')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isVietnamese ? 'Chọn file backup JSON đã xuất trước đó' : 'Upload previous JSON backup file'}
                    </span>
                  </div>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{importing ? t('common.loading') : t('common.import')}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Share & Import via URL */}
                {(onOpenShareBundle || onOpenImport) && (
                  <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-indigo-600" />
                        {isVietnamese ? 'Chia sẻ & Nhập qua URL Nén' : 'Share & Import via Compressed URL'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isVietnamese
                          ? 'Phân phối nhanh kèm phát hiện xung đột và giải quyết trùng lặp'
                          : 'Instant sharing with conflict detection and resolution'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenShareBundle && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenShareBundle();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{t('common.export')}</span>
                        </button>
                      )}
                      {onOpenImport && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenImport();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t('common.import')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Zero-Knowledge Multi-Device Sync Card */}
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{t('nav.zeroKnowledgeSync')}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500 text-white font-bold">
                          PRO
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isVietnamese
                          ? 'Mã hóa AES-256-GCM với Passkey, an toàn tuyệt đối khi đồng bộ đa thiết bị'
                          : 'AES-256-GCM encryption with client-side Passkey for private multi-device sync'}
                      </div>
                    </div>
                  </div>
                  {onOpenZeroKnowledgeSync && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenZeroKnowledgeSync();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                    >
                      {t('common.sync')}
                    </button>
                  )}
                </div>
              </div>

              {/* Reset button */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {isVietnamese
                    ? `Khôi phục ${blocks.length} blocks & ${presets.length} presets chuẩn`
                    : `Restore standard template library`}
                </span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('settingsModal.restoreDefaults')}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shortener' && (
            /* --- TAB 3: SHORTENER SERVICE & BACKEND SYNC --- */
            <div className="space-y-4">
              {/* Account Status Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {user?.displayName?.[0] || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{user ? user.displayName || user.email : (isVietnamese ? 'Chưa đăng nhập Google' : 'Not signed in')}</span>
                      {isPro && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {user ? user.email : (isVietnamese ? 'Tùy chọn đăng nhập để kích hoạt Pro và đồng bộ' : 'Sign in to activate Pro features & cloud sync')}
                    </div>
                  </div>
                </div>

                {!isPro && onOpenProModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenProModal();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('nav.upgradePro')}</span>
                  </button>
                )}
              </div>

              {/* 1. Custom URL Shortener API Configuration */}
              <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t('settingsModal.apiHeading')}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">REST API</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {t('settingsModal.endpointUrl')}:
                  </label>
                  <input
                    type="url"
                    value={shortenerEndpoint}
                    onChange={(e) => setShortenerEndpoint(e.target.value)}
                    placeholder="https://shortener.yourdomain.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <p className="text-[10px] text-slate-400">
                    Frontend sends <code>POST /api/v1/links</code> to this endpoint with secure payload.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span>{t('settingsModal.apiKey')}:</span>
                  </label>
                  <input
                    type="password"
                    value={shortenerApiKey}
                    onChange={(e) => setShortenerApiKey(e.target.value)}
                    placeholder="sk_live_xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !shortenerEndpoint.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTestingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{isTestingConnection ? t('common.loading') : t('settingsModal.testConnection')}</span>
                  </button>

                  <button
                    onClick={handleSaveApiSettings}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {t('settingsModal.saveSettings')}
                  </button>
                </div>
              </div>

              {/* 2. Backend Cloud Settings Sync */}
              <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-sky-600" />
                    <span>{isVietnamese ? 'Backend Lưu trữ Cài đặt Người dùng' : 'Backend User Cloud Settings Sync'}</span>
                  </div>
                  {cloudSettings.lastSyncedAt && (
                    <span className="text-[10px] text-slate-400">
                      {isVietnamese ? 'Đã đồng bộ:' : 'Synced:'} {new Date(cloudSettings.lastSyncedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {isVietnamese ? 'URL Backend Server của bạn:' : 'Your Backend Server URL:'}
                  </label>
                  <input
                    type="url"
                    value={backendSyncEndpoint}
                    onChange={(e) => setBackendSyncEndpoint(e.target.value)}
                    placeholder="https://api.yourdomain.com"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <p className="text-[10px] text-slate-400">
                    {isVietnamese
                      ? 'Đồng bộ UserCloudSettings qua POST /api/v1/user/settings kèm Google Bearer Token.'
                      : 'Syncs UserCloudSettings via POST /api/v1/user/settings with Google Bearer Token.'}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSyncBackend}
                    disabled={isSyncingBackend || !backendSyncEndpoint.trim()}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSyncingBackend ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                    <span>{isSyncingBackend ? t('common.loading') : t('settingsModal.syncCloud')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
