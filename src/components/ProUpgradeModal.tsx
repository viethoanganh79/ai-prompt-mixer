import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  Shield,
  Flame,
  Clock,
  Link,
  Cloud,
  X,
  LogOut,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { user, isPro, loginWithGoogle, setProStatus } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      onShowToast('success', 'Đăng nhập Google thành công!');
    } catch (err: any) {
      onShowToast('error', 'Lỗi đăng nhập Google', err?.message || 'Không thể đăng nhập');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleActivatePro = async () => {
    if (!user) {
      onShowToast('info', 'Vui lòng đăng nhập Google trước khi kích hoạt Pro');
      return;
    }

    setIsActivating(true);
    try {
      // Giả lập kích hoạt hoặc xác thực license
      let expiresAt: string | undefined = undefined;
      if (selectedPlan === 'monthly') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        expiresAt = d.toISOString();
      } else if (selectedPlan === 'yearly') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        expiresAt = d.toISOString();
      }

      await setProStatus(true, selectedPlan, expiresAt);
      onShowToast(
        'success',
        'Kích hoạt Pro thành công!',
        'Chào mừng bạn đến với gói Pro Creator. Tất cả tính năng nâng cao đã được mở khóa!'
      );
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Lỗi kích hoạt Pro', err?.message || 'Không thể kích hoạt');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await setProStatus(false);
      onShowToast('info', 'Đã chuyển về tài khoản tiêu chuẩn');
    } catch (err: any) {
      onShowToast('error', 'Lỗi', err?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-amber-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Nâng cấp Pro Creator</span>
                {isPro && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                    Đã kích hoạt
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mở khóa dịch vụ rút gọn link, mật khẩu bảo mật và đồng bộ đám mây
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Step 1: Google Account Status */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Bước 1: Xác thực Tài khoản Google (Tiên quyết)
            </div>

            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{user.displayName || 'Người dùng Google'}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Đã đăng nhập
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Sẵn sàng</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Đăng nhập tài khoản Google để gắn kết bản quyền Pro và đồng bộ cài đặt.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>{isLoggingIn ? 'Đang kết nối...' : 'Đăng nhập với Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pro Benefits List */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đặc quyền gói Pro Creator
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 bg-white dark:bg-slate-900">
                <Link className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Custom Vanity Slug</strong>
                  <p className="text-slate-500 text-[11px]">Tự đặt đuôi link riêng theo thương hiệu cá nhân</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 bg-white dark:bg-slate-900">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Mật khẩu bảo vệ</strong>
                  <p className="text-slate-500 text-[11px]">Khóa prompt bằng mã PIN hoặc mật khẩu an toàn</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 bg-white dark:bg-slate-900">
                <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Tự hủy (Burn-After-Reading)</strong>
                  <p className="text-slate-500 text-[11px]">Giới hạn 1 hoặc N lần mở rồi tự động xóa link</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 bg-white dark:bg-slate-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Thời hạn tùy biến & Vĩnh viễn</strong>
                  <p className="text-slate-500 text-[11px]">Linh hoạt thời hạn 1h, 24h, 7 ngày hoặc không bao giờ hết hạn</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2 bg-white dark:bg-slate-900 sm:col-span-2">
                <Cloud className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">Đồng bộ Backend Riêng</strong>
                  <p className="text-slate-500 text-[11px]">Tự động lưu và đồng bộ cài đặt với backend server của bạn</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Chọn gói đăng ký
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">1 Tháng</div>
                <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">49.000đ</div>
                <div className="text-[10px] text-slate-400 mt-0.5">/ tháng</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('yearly')}
                className={`p-3 rounded-xl border text-center transition-all relative cursor-pointer ${
                  selectedPlan === 'yearly'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white uppercase">
                  Tiết kiệm 40%
                </span>
                <div className="text-xs font-bold">1 Năm</div>
                <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">349.000đ</div>
                <div className="text-[10px] text-slate-400 mt-0.5">/ năm</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('lifetime')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedPlan === 'lifetime'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">Trọn đời</div>
                <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">799.000đ</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Một lần duy nhất</div>
              </button>
            </div>
          </div>

          {/* Optional License / API Key Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Hoặc kích hoạt bằng Mã bản quyền / License Token (Nếu có)</span>
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="PRO-XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div>
            {isPro ? (
              <button
                type="button"
                onClick={handleDeactivate}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Hủy kích hoạt Pro</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {!user ? 'Cần đăng nhập Google' : 'Sẵn sàng kích hoạt'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {!isPro ? (
              <button
                onClick={handleActivatePro}
                disabled={isActivating || !user}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isActivating ? 'Đang kích hoạt...' : 'Kích hoạt Gói Pro Ngay'}</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Đang sử dụng Pro</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
