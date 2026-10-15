import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  Download,
  LogOut,
  User,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  onOpenSync: () => void;
  onOpenDatabase: () => void;
  onOpenPresets: () => void;
  onOpenHistory: () => void;
  onOpenShareBundle: () => void;
  onOpenImport: () => void;
  onOpenProModal?: () => void;
  onOpenZeroKnowledgeSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSync,
  onOpenDatabase,
  onOpenPresets,
  onOpenHistory,
  onOpenShareBundle,
  onOpenImport,
  onOpenProModal,
  onOpenZeroKnowledgeSync,
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

  const { user, isPro, loginWithGoogle, logout } = useAuth();
  const { t, isVietnamese, language } = useLanguage();

  // Dropdown states
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const presetRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const activePreset = presets.find((p) => p.id === activePresetId);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (presetRef.current && !presetRef.current.contains(target)) {
        setPresetDropdownOpen(false);
      }
      if (syncRef.current && !syncRef.current.contains(target)) {
        setSyncDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
        {/* 1. Left: Brand / Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base lg:text-lg bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent">
                Prompt Mixer
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-mono">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden lg:block">
              {t('nav.brandSubtitle')}
            </p>
          </div>
        </div>

        {/* 2. Center: Presets Quick Switcher & Manager */}
        <div className="hidden md:flex items-center" ref={presetRef}>
          <div className="relative">
            <button
              onClick={() => {
                setPresetDropdownOpen(!presetDropdownOpen);
                setSyncDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="max-w-[130px] lg:max-w-[160px] truncate">
                {activePreset ? activePreset.name : (isVietnamese ? 'Chọn Preset mẫu...' : 'Select Preset...')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {presetDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('nav.presets')}</span>
                  <span className="font-mono text-[10px]">{presets.length} {isVietnamese ? 'mẫu' : 'presets'}</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        loadPreset(preset.id);
                        setPresetDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        preset.id === activePresetId
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <span className="truncate pr-2">{preset.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {preset.canvasItems.length} blocks
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setPresetDropdownOpen(false);
                      onOpenPresets();
                    }}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Quản lý & Lưu Preset mới...' : 'Manage & Save New Presets...'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Right: Grouped Controls (Transfer, Sync, Account & Utilities) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nhóm A: Trao đổi dữ liệu (Chia sẻ & Nhập) */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800/90 p-0.5 shadow-2xs">
            <button
              onClick={onOpenShareBundle}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer"
              title={isVietnamese ? 'Chia sẻ Thư viện Prompt qua liên kết URL nén' : 'Share Prompt Library via Compressed URL'}
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{isVietnamese ? 'Chia sẻ' : 'Share'}</span>
            </button>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all cursor-pointer"
              title={isVietnamese ? 'Nhập Prompt hoặc Thư viện từ Link / Mã nén / JSON' : 'Import Prompt or Library from Link / LZ String / JSON'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">{isVietnamese ? 'Nhập' : 'Import'}</span>
            </button>
          </div>

          {/* Nhóm B: Đồng bộ & Lưu trữ (Unified Sync Dropdown) */}
          <div className="relative" ref={syncRef}>
            <button
              onClick={() => {
                setSyncDropdownOpen(!syncDropdownOpen);
                setPresetDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
                isPro
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={isVietnamese ? 'Lưu trữ & Đồng bộ: Đa thiết bị E2E, Google Sheet & Database' : 'Storage & Sync: E2E multi-device, Google Sheets & Database'}
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">{t('common.sync')}</span>
              {/* Sync status indicator dot */}
              {syncConfig.status === 'success' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected" />
              )}
              {syncConfig.status === 'error' && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Sync Error" />
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {syncDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isVietnamese ? 'Lưu trữ & Đồng bộ Dữ liệu' : 'Storage & Cloud Sync'}
                </div>

                {/* 1. Zero-Knowledge Multi-Device Sync */}
                <button
                  onClick={() => {
                    setSyncDropdownOpen(false);
                    onOpenZeroKnowledgeSync();
                  }}
                  className="w-full px-3 py-2.5 text-left hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{t('nav.zeroKnowledgeSync')}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                        PRO
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {isVietnamese ? 'Mã hóa Zero-Knowledge AES-256-GCM với Passkey cá nhân' : 'Zero-Knowledge AES-256-GCM encryption with Passkey'}
                    </p>
                  </div>
                </button>

                {/* 2. Google Sheet Two-way Sync */}
                <button
                  onClick={() => {
                    setSyncDropdownOpen(false);
                    onOpenSync();
                  }}
                  className="w-full px-3 py-2.5 text-left hover:bg-blue-50/60 dark:hover:bg-blue-950/30 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0 mt-0.5">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{t('nav.syncSheet')}</span>
                      {syncConfig.status === 'success' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {isVietnamese ? 'Đồng bộ 2 chiều với Google Sheets qua Apps Script Webhook' : 'Two-way sync with Google Sheets via Apps Script Webhook'}
                    </p>
                  </div>
                </button>

                {/* 3. SQLite & Local Database */}
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSyncDropdownOpen(false);
                      onOpenDatabase();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0 mt-0.5">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t('nav.settingsAndData')}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {isVietnamese ? 'Ngôn ngữ hiển thị, sao lưu JSON/SQL & API' : 'Language options, JSON/SQL backups & API config'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nhóm C: Pro Upgrade / Badge */}
          {onOpenProModal && !isPro && (
            <button
              onClick={onOpenProModal}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer"
              title={t('nav.upgradePro')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('nav.upgradePro')}</span>
            </button>
          )}

          {/* Nhóm D: Lịch sử & Giao diện */}
          <div className="flex items-center">
            {/* History Drawer Button */}
            <button
              onClick={onOpenHistory}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('nav.history')}
            >
              <History className="w-4 h-4" />
              {logs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('nav.toggleTheme')}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>

          {/* Nhóm E: Tài khoản & Hồ sơ người dùng */}
          <div className="relative" ref={userRef}>
            {user ? (
              <>
                <button
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setPresetDropdownOpen(false);
                    setSyncDropdownOpen(false);
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-full transition-all cursor-pointer ${
                    isPro ? 'ring-2 ring-amber-400/80 ring-offset-1 dark:ring-offset-slate-900' : ''
                  }`}
                  title={user.displayName || user.email || 'Tài khoản'}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user.displayName || (isVietnamese ? 'Người dùng' : 'User')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </div>
                      {isPro ? (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Pro Creator</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-slate-400">{isVietnamese ? 'Gói Miễn phí' : 'Free Plan'}</div>
                      )}
                    </div>

                    <div className="pt-1.5 space-y-0.5">
                      {onOpenProModal && !isPro && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenProModal();
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t('nav.upgradePro')}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenZeroKnowledgeSync();
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t('nav.zeroKnowledgeSync')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenDatabase();
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('nav.settingsAndData')}</span>
                      </button>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{t('nav.signOut')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                title={t('nav.signIn')}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">{isLoggingIn ? '...' : t('nav.signIn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
