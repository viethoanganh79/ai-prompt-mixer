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
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { DEFAULT_BLOCKS, DEFAULT_PRESETS } from '../db/defaultData';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const {
    blocks,
    presets,
    logs,
    exportJsonBackup,
    exportSqlDump,
    importBackupData,
    resetDatabaseToDefaults,
  } = usePromptMixer();

  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      onShowToast('success', 'Đã xuất file sao lưu JSON!');
    } catch {
      onShowToast('error', 'Lỗi xuất file');
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
      onShowToast('success', 'Đã xuất SQLite SQL Dump (.sql)!');
    } catch {
      onShowToast('error', 'Lỗi xuất SQL script');
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
        'Nhập dữ liệu thành công!',
        `Đã nạp ${res.blocksCount} blocks và ${res.presetsCount} presets vào cơ sở dữ liệu.`
      );
    } catch (err: any) {
      onShowToast('error', 'Lỗi nhập dữ liệu', err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    if (confirm('Khôi phục sẽ đưa thư viện blocks và presets về trạng thái mẫu ban đầu. Bạn có muốn tiếp tục?')) {
      setResetting(true);
      await resetDatabaseToDefaults();
      setResetting(false);
      onShowToast('info', 'Đã khôi phục dữ liệu mẫu ban đầu');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Quản lý SQLite & Local Database
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Lưu trữ client-side chuẩn quan hệ (SQLite/IndexedDB engine), tốc độ 0ms
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Database Tables Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono font-medium">TABLE blocks</span>
                <Table className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {blocks.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Prompt blocks</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono font-medium">TABLE presets</span>
                <Table className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {presets.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Công thức lưu</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-mono font-medium">TABLE logs</span>
                <Table className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {logs.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Lịch sử chạy</div>
            </div>
          </div>

          {/* Export & Import Actions */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-500" />
              Sao lưu & Xuất / Nhập Dữ liệu:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportSql}
                className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-900 dark:text-blue-200 flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs"
              >
                <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left">
                  <div>Xuất SQLite Dump (.sql)</div>
                  <div className="text-xs opacity-70 font-normal">Chứa DDL & SQL INSERT</div>
                </div>
              </button>

              <button
                onClick={handleExportJson}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-left">
                  <div>Xuất Sao lưu JSON (.json)</div>
                  <div className="text-xs opacity-70 font-normal">Dùng để chuyển thiết bị</div>
                </div>
              </button>
            </div>

            {/* Import Input */}
            <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Khôi phục từ file JSON
                </span>
                <span className="text-xs text-slate-500">
                  Chọn file backup JSON đã xuất trước đó
                </span>
              </div>
              <label className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs">
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Đang nạp...' : 'Chọn file'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Khôi phục {DEFAULT_BLOCKS.length} blocks & {DEFAULT_PRESETS.length} presets tiêu chuẩn ban đầu
            </span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Khôi phục mẫu mặc định
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
