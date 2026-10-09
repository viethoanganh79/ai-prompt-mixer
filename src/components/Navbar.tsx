import React, { useState } from 'react';
import {
  Wand2,
  Cloud,
  Database,
  History,
  Sun,
  Moon,
  Bookmark,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';

interface NavbarProps {
  onOpenSync: () => void;
  onOpenDatabase: () => void;
  onOpenPresets: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSync,
  onOpenDatabase,
  onOpenPresets,
  onOpenHistory,
}) => {
  const {
    presets,
    activePresetId,
    loadPreset,
    isDarkMode,
    toggleDarkMode,
    syncConfig,
    logs,
  } = usePromptMixer();

  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const activePreset = presets.find((p) => p.id === activePresetId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
            <Wand2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                AI Prompt Mixer
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Preset Selector */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs"
            >
              <Bookmark className="w-4 h-4 text-indigo-500" />
              <span className="max-w-[170px] truncate">
                {activePreset ? activePreset.name : 'Chọn Preset mẫu...'}
              </span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>

            {presetDropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl py-2 z-50 animate-in fade-in"
                onClick={() => setPresetDropdownOpen(false)}
              >
                <div className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Presets đã lưu ({presets.length})</span>
                  <button
                    onClick={onOpenPresets}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline capitalize"
                  >
                    Quản lý
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadPreset(p.id)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm flex flex-col gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        activePresetId === p.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                          {p.category}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{p.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenPresets}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Mở Quản lý Presets"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Right Tool Buttons */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status Button */}
          <button
            onClick={onOpenSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-colors shadow-xs ${
              syncConfig.status === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : syncConfig.status === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Cài đặt Đồng bộ Google Sheet"
          >
            <Cloud className={`w-4 h-4 ${syncConfig.status === 'syncing' ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">
              {syncConfig.status === 'success'
                ? 'Sheet Synced'
                : syncConfig.status === 'syncing'
                ? 'Syncing...'
                : syncConfig.status === 'error'
                ? 'Sync Error'
                : 'Google Sheet'}
            </span>
          </button>

          {/* Local SQLite / IndexedDB button */}
          <button
            onClick={onOpenDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Quản lý SQLite & Local Database"
          >
            <Database className="w-4 h-4 text-blue-500" />
            <span className="hidden lg:inline">SQLite DB</span>
          </button>

          {/* History Drawer Button */}
          <button
            onClick={onOpenHistory}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Lịch sử Prompt đã tạo"
          >
            <History className="w-4 h-4" />
            {logs.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
