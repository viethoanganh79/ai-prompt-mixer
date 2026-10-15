import React, { useState, useMemo } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  FileCode,
  Link as LinkIcon,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  Info,
  Shield,
  Flame,
  Clock,
  Eye,
  EyeOff,
  Settings,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { PromptBlock, PromptPreset, ProSecurityOptions, ShortenLinkResponse } from '../types';
import {
  SharedPayload,
  buildShareUrl,
  createBlockSharePayload,
  createPresetSharePayload,
  createBundleSharePayload,
} from '../utils/shareUtils';
import { extractVariablesFromText } from '../utils/variableParser';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { createShortLink } from '../utils/shortenerClient';

export type ShareTarget =
  | { type: 'block'; block: PromptBlock }
  | { type: 'preset'; preset: PromptPreset }
  | { type: 'bundle'; blocks: PromptBlock[]; presets: PromptPreset[]; title?: string };

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ShareTarget | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onOpenProModal?: () => void;
  onOpenSettings?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  target,
  onShowToast,
  onOpenProModal,
  onOpenSettings,
}) => {
  const { user, isPro, cloudSettings, getIdToken } = useAuth();
  const { t, isVietnamese } = useLanguage();

  // Mode: 'compressed' | 'shortlink' | 'json'
  const [activeTab, setActiveTab] = useState<'compressed' | 'shortlink' | 'json'>('compressed');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedShortUrl, setCopiedShortUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Pro Security state for shortlinks
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maxViews, setMaxViews] = useState<number | null>(null); // null = unlimit, 1 = burn
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null); // null = never, 1, 24, 168

  // Shortener API state
  const [isGeneratingShortLink, setIsGeneratingShortLink] = useState(false);
  const [shortLinkResult, setShortLinkResult] = useState<ShortenLinkResponse | null>(null);
  const [shortLinkError, setShortLinkError] = useState<string | null>(null);

  // Xây dựng payload dựa theo đối tượng chia sẻ
  const payload: SharedPayload | null = useMemo(() => {
    if (!target) return null;
    if (target.type === 'block') {
      return createBlockSharePayload(target.block);
    }
    if (target.type === 'preset') {
      return createPresetSharePayload(target.preset);
    }
    if (target.type === 'bundle') {
      return createBundleSharePayload(target.blocks, target.presets, target.title);
    }
    return null;
  }, [target]);

  // Xây dựng URL chia sẻ nén (Offline)
  const compressedShareUrl = useMemo(() => {
    if (!payload) return '';
    try {
      return buildShareUrl(payload);
    } catch (e) {
      console.error('Error building share URL:', e);
      return '';
    }
  }, [payload]);

  const jsonString = useMemo(() => {
    if (!payload) return '';
    return JSON.stringify(payload, null, 2);
  }, [payload]);

  if (!isOpen || !target || !payload) return null;

  const handleCopyCompressedUrl = async () => {
    if (!compressedShareUrl) return;
    try {
      await navigator.clipboard.writeText(compressedShareUrl);
      setCopiedUrl(true);
      onShowToast(
        'success',
        isVietnamese ? 'Đã sao chép link nén!' : 'Copied compressed link!',
        isVietnamese
          ? 'Liên kết chứa toàn bộ dữ liệu offline. Người nhận có thể mở trực tiếp mà không cần server.'
          : 'Link contains all offline data. Recipients can open it directly without a server.'
      );
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      onShowToast(
        'error',
        isVietnamese ? 'Không thể sao chép vào bộ nhớ tạm' : 'Failed to copy to clipboard'
      );
    }
  };

  const handleCopyShortUrl = async () => {
    if (!shortLinkResult?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortLinkResult.shortUrl);
      setCopiedShortUrl(true);
      onShowToast(
        'success',
        isVietnamese ? 'Đã sao chép link rút gọn!' : 'Copied short link!',
        shortLinkResult.shortUrl
      );
      setTimeout(() => setCopiedShortUrl(false), 2500);
    } catch {
      onShowToast('error', isVietnamese ? 'Không thể sao chép' : 'Failed to copy');
    }
  };

  const handleGenerateShortLink = async () => {
    if (!cloudSettings.shortener.customEndpoint) {
      onShowToast(
        'info',
        isVietnamese
          ? 'Vui lòng cấu hình URL Endpoint trong Cài đặt trước khi tạo link ngắn'
          : 'Please configure URL Endpoint in Settings before creating shortlinks'
      );
      return;
    }

    setIsGeneratingShortLink(true);
    setShortLinkError(null);

    try {
      const token = await getIdToken();
      const options: ProSecurityOptions = {
        customAlias: isPro ? customAlias : undefined,
        password: isPro && password ? password : undefined,
        maxViews: isPro ? maxViews : null,
        expiresInHours: isPro ? expiresInHours : null,
      };

      const result = await createShortLink(
        payload,
        options,
        cloudSettings.shortener,
        user,
        token
      );

      setShortLinkResult(result);
      onShowToast(
        'success',
        isVietnamese ? 'Tạo liên kết rút gọn thành công!' : 'Shortlink created successfully!',
        result.shortUrl
      );
    } catch (err: any) {
      setShortLinkError(
        err?.message ||
          (isVietnamese ? 'Lỗi khi tạo liên kết rút gọn' : 'Error creating shortlink')
      );
      onShowToast(
        'error',
        isVietnamese ? 'Lỗi tạo shortlink' : 'Shortlink creation failed',
        err?.message
      );
    } finally {
      setIsGeneratingShortLink(false);
    }
  };

  const handleCopyJson = async () => {
    if (!jsonString) return;
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      onShowToast('success', isVietnamese ? 'Đã sao chép mã JSON!' : 'Copied JSON code!');
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      onShowToast('error', isVietnamese ? 'Không thể sao chép' : 'Failed to copy');
    }
  };

  const handleDownloadJson = () => {
    if (!jsonString) return;
    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename =
        target.type === 'block'
          ? `block_${target.block.title.toLowerCase().replace(/\s+/g, '_')}.json`
          : target.type === 'preset'
          ? `preset_${target.preset.name.toLowerCase().replace(/\s+/g, '_')}.json`
          : `prompt_library_bundle_${Date.now()}.json`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('success', isVietnamese ? 'Đã tải xuống tệp JSON!' : 'Downloaded JSON file!');
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi khi tải tệp tin' : 'Error downloading file');
    }
  };

  const urlCharCount = compressedShareUrl.length;
  const isUrlLong = urlCharCount > 2000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>
                  {isVietnamese
                    ? `Chia sẻ ${target.type === 'block' ? 'Block Prompt' : target.type === 'preset' ? 'Preset' : 'Thư viện'}`
                    : `Share ${target.type === 'block' ? 'Prompt Block' : target.type === 'preset' ? 'Preset' : 'Library'}`}
                </span>
                {isPro && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white uppercase tracking-wider">
                    PRO
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {target.type === 'block'
                  ? `"${target.block.title}"`
                  : target.type === 'preset'
                  ? `"${target.preset.name}"`
                  : (isVietnamese ? `Toàn bộ ${target.blocks.length} blocks & ${target.presets.length} presets` : `All ${target.blocks.length} blocks & ${target.presets.length} presets`)}
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

        {/* Tab Selection */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('compressed')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'compressed'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Link Nén Offline' : 'Offline LZ URL'}</span>
            </button>

            <button
              onClick={() => setActiveTab('shortlink')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'shortlink'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isVietnamese ? 'Rút gọn Link (Shortlink)' : 'Shortlink'}</span>
              {isPro && (
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  PRO
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'JSON & Tệp tin' : 'JSON & File Export'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: COMPRESSED OFFLINE URL */}
          {activeTab === 'compressed' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isVietnamese
                      ? 'Hoạt động 100% Offline (Không phụ thuộc máy chủ)'
                      : '100% Offline (Zero Server Dependency)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isVietnamese
                    ? 'Dữ liệu được nén trực tiếp vào URL hash. Bất kỳ ai mở link này đều có thể nhập dữ liệu ngay lập tức.'
                    : 'Data is compressed directly into the URL hash. Anyone opening this link can import it instantly.'}
                </p>
              </div>

              {/* URL Display Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{isVietnamese ? 'Liên kết URL chia sẻ' : 'Shareable URL Link'}</span>
                  <span className={`font-mono text-[11px] ${isUrlLong ? 'text-amber-600 font-semibold' : ''}`}>
                    {urlCharCount} {isVietnamese ? 'ký tự' : 'characters'}{' '}
                    {isUrlLong &&
                      (isVietnamese
                        ? '(Dài, khuyên dùng Link Rút Gọn cho app chat)'
                        : '(Long, Shortlink recommended for messaging apps)')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={compressedShareUrl}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyCompressedUrl}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                      copiedUrl
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>
                      {copiedUrl
                        ? isVietnamese
                          ? 'Đã chép'
                          : 'Copied'
                        : isVietnamese
                        ? 'Sao chép'
                        : 'Copy'}
                    </span>
                  </button>
                </div>
              </div>

              {isUrlLong && (
                <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>
                      {isVietnamese
                        ? 'URL dài hơn 2,000 ký tự có thể bị ứng dụng chat (Zalo, Messenger) cắt ngắn làm hỏng dữ liệu.'
                        : 'URLs exceeding 2,000 characters may get truncated by some chat apps, corrupting the payload.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('shortlink')}
                      className="font-bold underline text-amber-900 dark:text-amber-200 hover:text-indigo-600 cursor-pointer"
                    >
                      {isVietnamese
                        ? 'Chuyển sang tab Rút gọn link (Shortlink) →'
                        : 'Switch to Shortlink tab →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHORTLINK WITH PRO SECURITY */}
          {activeTab === 'shortlink' && (
            <div className="space-y-4">
              {!cloudSettings.shortener.customEndpoint ? (
                /* No API configured warning */
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                  <Settings className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isVietnamese
                      ? 'Chưa cấu hình API Service rút gọn link'
                      : 'Shortener API Service Not Configured'}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {isVietnamese
                      ? 'Để tạo shortlink gọn gàng, vui lòng cấu hình URL Endpoint của backend service mà bạn tự dựng.'
                      : 'To generate clean shortlinks, please configure your backend service URL Endpoint in Settings.'}
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Cấu hình Service ngay' : 'Configure Service'}</span>
                    </button>
                  )}
                </div>
              ) : (
                /* API configured: Generator & Pro controls */
                <div className="space-y-3.5">
                  {/* Service status indicator */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Service: <code className="font-mono">{cloudSettings.shortener.customEndpoint}</code></span>
                    </div>
                    {onOpenSettings && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSettings();
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {isVietnamese ? 'Đổi' : 'Change'}
                      </button>
                    )}
                  </div>

                  {/* Pro Security Suite Card */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    isPro
                      ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {isVietnamese ? 'Tùy chọn Bảo mật Nâng cao' : 'Advanced Pro Security Suite'}
                        </span>
                        {!isPro && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                            PRO FEATURE
                          </span>
                        )}
                      </div>

                      {!isPro && onOpenProModal && (
                        <button
                          type="button"
                          onClick={onOpenProModal}
                          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isVietnamese ? 'Mở khóa Pro' : 'Unlock Pro'}</span>
                        </button>
                      )}
                    </div>

                    <div className={`space-y-3 ${!isPro ? 'opacity-60 pointer-events-none' : ''}`}>
                      {/* 1. Custom Vanity Alias */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>{isVietnamese ? 'Custom Alias / Đuôi link riêng:' : 'Custom Vanity Slug:'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {isVietnamese ? 'Chỉ ký tự chữ, số và dấu gạch nối' : 'Letters, numbers, and hyphens only'}
                          </span>
                        </label>
                        <div className="flex items-center">
                          <span className="px-2.5 py-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg font-mono">
                            /s/
                          </span>
                          <input
                            type="text"
                            disabled={!isPro}
                            value={customAlias}
                            onChange={(e) => setCustomAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                            placeholder="my-prompt-slug"
                            className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-r-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 2. Password Protection */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{isVietnamese ? 'Mật khẩu bảo vệ (Tùy chọn):' : 'Password Protection (Optional):'}</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            disabled={!isPro}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isVietnamese ? 'Để trống nếu muốn công khai' : 'Leave empty for public access'}
                            className="w-full px-2.5 py-1.5 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* 3. Max Views / Burn after reading */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-500" />
                          <span>{isVietnamese ? 'Giới hạn lượt mở:' : 'Max Views / Burn:'}</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 text-xs">
                          {[
                            { label: isVietnamese ? 'Vô hạn' : 'Unlimited', val: null },
                            { label: isVietnamese ? '1 lần (Tự hủy)' : '1 (Self-destruct)', val: 1 },
                            { label: isVietnamese ? '5 lần' : '5 times', val: 5 },
                            { label: isVietnamese ? '20 lần' : '20 times', val: 20 },
                          ].map((opt, i) => (
                            <button
                              key={i}
                              type="button"
                              disabled={!isPro}
                              onClick={() => setMaxViews(opt.val)}
                              className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                maxViews === opt.val
                                  ? 'bg-rose-500 text-white border-rose-500'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Custom Expiration TTL */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{isVietnamese ? 'Thời gian hết hạn:' : 'Expiration Time:'}</span>
                        </label>
                        <div className="grid grid-cols-5 gap-1.5 text-xs">
                          {[
                            { label: isVietnamese ? 'Vĩnh viễn' : 'Never', val: null },
                            { label: isVietnamese ? '1 giờ' : '1 hr', val: 1 },
                            { label: isVietnamese ? '24 giờ' : '24 hrs', val: 24 },
                            { label: isVietnamese ? '7 ngày' : '7 days', val: 168 },
                            { label: isVietnamese ? '30 ngày' : '30 days', val: 720 },
                          ].map((opt, i) => (
                            <button
                              key={i}
                              type="button"
                              disabled={!isPro}
                              onClick={() => setExpiresInHours(opt.val)}
                              className={`py-1 px-1 rounded-lg text-[11px] font-semibold border transition-all text-center cursor-pointer ${
                                expiresInHours === opt.val
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateShortLink}
                    disabled={isGeneratingShortLink}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingShortLink ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>
                      {isGeneratingShortLink
                        ? isVietnamese
                          ? 'Đang tạo liên kết rút gọn...'
                          : 'Generating shortlink...'
                        : isVietnamese
                        ? 'Tạo Liên kết Rút gọn'
                        : 'Generate Shortlink'}
                    </span>
                  </button>

                  {/* Result Box */}
                  {shortLinkResult && (
                    <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>
                            {isVietnamese
                              ? 'Liên kết rút gọn đã sẵn sàng!'
                              : 'Shortlink is ready!'}
                          </span>
                        </span>
                        {shortLinkResult.authorBadge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white uppercase">
                            {shortLinkResult.authorBadge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shortLinkResult.shortUrl}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-mono font-bold border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-200 select-all focus:outline-none"
                        />
                        <button
                          onClick={handleCopyShortUrl}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            copiedShortUrl
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {copiedShortUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>
                            {copiedShortUrl
                              ? isVietnamese
                                ? 'Đã chép'
                                : 'Copied'
                              : isVietnamese
                              ? 'Chép'
                              : 'Copy'}
                          </span>
                        </button>
                      </div>

                      {/* Active Security Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                        {shortLinkResult.isBurnAfterReading && (
                          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                            <Flame className="w-3 h-3" />{' '}
                            {isVietnamese ? 'Tự hủy sau 1 lần mở' : 'Self-destruct after 1 view'}
                          </span>
                        )}
                        {shortLinkResult.hasPassword && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" />{' '}
                            {isVietnamese ? 'Đã đặt mật khẩu' : 'Password protected'}
                          </span>
                        )}
                        {shortLinkResult.expiresAt && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />{' '}
                            {isVietnamese ? 'Hết hạn:' : 'Expires:'}{' '}
                            {new Date(shortLinkResult.expiresAt).toLocaleDateString(
                              isVietnamese ? 'vi-VN' : 'en-US'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {shortLinkError && (
                    <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300">
                      {shortLinkError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JSON CODE & FILE DOWNLOAD */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{isVietnamese ? 'Mã dữ liệu JSON thô' : 'Raw JSON Schema Payload'}</span>
                <button
                  onClick={handleDownloadJson}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tải tệp .json' : 'Download .json'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={8}
                value={jsonString}
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 select-all focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copiedJson
                      ? isVietnamese
                        ? 'Đã chép JSON'
                        : 'Copied JSON'
                      : isVietnamese
                      ? 'Sao chép JSON'
                      : 'Copy JSON'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {isVietnamese ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
