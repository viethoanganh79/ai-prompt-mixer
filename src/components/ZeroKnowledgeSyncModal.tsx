import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Cloud,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Key,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Info,
  Server,
  ArrowRight,
  ShieldAlert,
  Edit2,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePromptMixer } from '../context/PromptMixerContext';
import {
  fetchCloudVaultMetadata,
  pushZeroKnowledgeSync,
  pullZeroKnowledgeSync,
  CloudVaultMetadata,
} from '../services/zeroKnowledgeSyncService';
import {
  getOrCreateDeviceInfo,
  saveCustomDeviceName,
} from '../utils/cryptoZeroKnowledge';
import { CloudSyncMergeMode } from '../types';

interface ZeroKnowledgeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProModal?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ZeroKnowledgeSyncModal: React.FC<ZeroKnowledgeSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenProModal,
  onShowToast,
}) => {
  const { user, isPro, cloudSettings, getIdToken, loginWithGoogle } = useAuth();
  const { blocks, presets, refreshLibraryFromDb } = usePromptMixer();

  // Passkey State (held only in component / session state - Zero Knowledge)
  const [passkey, setPasskey] = useState<string>(() => {
    return sessionStorage.getItem('zk_session_passkey') || '';
  });
  const [rememberInSession, setRememberInSession] = useState(true);
  const [showPasskey, setShowPasskey] = useState(false);

  // Cloud metadata state
  const [cloudMeta, setCloudMeta] = useState<CloudVaultMetadata>({
    exists: false,
    summary: null,
    updatedAt: null,
  });
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Syncing action state
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [mergeMode, setMergeMode] = useState<CloudSyncMergeMode>('smart_merge');

  // Device Info State
  const [deviceInfo, setDeviceInfo] = useState(getOrCreateDeviceInfo());
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [customDeviceNameInput, setCustomDeviceNameInput] = useState(deviceInfo.deviceName);

  // Load cloud metadata when opened
  const loadMetadata = useCallback(async () => {
    if (!user) return;
    setIsLoadingMeta(true);
    try {
      const token = await getIdToken();
      const meta = await fetchCloudVaultMetadata(
        user.uid,
        cloudSettings.backendSyncEndpoint,
        token
      );
      setCloudMeta(meta);
    } catch (err) {
      console.error('Error fetching cloud meta:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  }, [user, cloudSettings.backendSyncEndpoint, getIdToken]);

  useEffect(() => {
    if (isOpen && user) {
      loadMetadata();
      setDeviceInfo(getOrCreateDeviceInfo());
      setCustomDeviceNameInput(getOrCreateDeviceInfo().deviceName);
    }
  }, [isOpen, user, loadMetadata]);

  // Update session storage when passkey changes
  const handlePasskeyChange = (val: string) => {
    setPasskey(val);
    if (rememberInSession) {
      if (val) {
        sessionStorage.setItem('zk_session_passkey', val);
      } else {
        sessionStorage.removeItem('zk_session_passkey');
      }
    }
  };

  const handleClearPasskeySession = () => {
    setPasskey('');
    sessionStorage.removeItem('zk_session_passkey');
    onShowToast('info', 'Đã xóa Passkey khỏi bộ nhớ RAM phiên làm việc.');
  };

  const handleSaveDeviceName = () => {
    if (customDeviceNameInput.trim()) {
      saveCustomDeviceName(customDeviceNameInput.trim());
      setDeviceInfo(getOrCreateDeviceInfo());
      setIsEditingDeviceName(false);
      onShowToast('success', 'Đã lưu tên thiết bị.');
    }
  };

  // Push to Cloud
  const handlePush = async () => {
    if (!user) {
      onShowToast('error', 'Chưa đăng nhập', 'Vui lòng đăng nhập Google trước.');
      return;
    }
    if (!isPro) {
      onShowToast('error', 'Yêu cầu gói Pro', 'Tính năng này chỉ dành cho tài khoản Pro.');
      return;
    }
    if (!passkey || passkey.trim().length < 6) {
      onShowToast(
        'error',
        'Passkey không hợp lệ',
        'Vui lòng nhập Passkey ít nhất 6 ký tự để mã hóa dữ liệu an toàn.'
      );
      return;
    }

    setIsPushing(true);
    try {
      const token = await getIdToken();
      const res = await pushZeroKnowledgeSync(
        user.uid,
        passkey,
        { blocks, presets },
        cloudSettings.backendSyncEndpoint,
        token
      );

      if (res.success) {
        onShowToast('success', 'Đồng bộ thành công!', res.message);
        await loadMetadata();
      } else {
        onShowToast('error', 'Đồng bộ thất bại', res.message);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi đồng bộ', err.message);
    } finally {
      setIsPushing(false);
    }
  };

  // Pull from Cloud
  const handlePull = async () => {
    if (!user) {
      onShowToast('error', 'Chưa đăng nhập', 'Vui lòng đăng nhập Google trước.');
      return;
    }
    if (!isPro) {
      onShowToast('error', 'Yêu cầu gói Pro', 'Tính năng này chỉ dành cho tài khoản Pro.');
      return;
    }
    if (!passkey) {
      onShowToast(
        'error',
        'Thiếu Passkey',
        'Vui lòng nhập Passkey bí mật của bạn để giải mã gói dữ liệu từ đám mây.'
      );
      return;
    }

    setIsPulling(true);
    try {
      const token = await getIdToken();
      const res = await pullZeroKnowledgeSync(
        user.uid,
        passkey,
        mergeMode,
        cloudSettings.backendSyncEndpoint,
        token
      );

      if (res.success) {
        onShowToast('success', 'Khôi phục thành công!', res.message);
        // Refresh local memory state in context
        await refreshLibraryFromDb();
        await loadMetadata();
      } else {
        onShowToast('error', 'Giải mã thất bại', res.message);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi giải mã', err.message);
    } finally {
      setIsPulling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Đồng bộ Đa thiết bị (Zero-Knowledge)
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 uppercase tracking-wider font-mono">
                  AES-256-GCM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bảo mật tuyệt đối: Dữ liệu được mã hóa trước khi lên đám mây, máy chủ không biết passkey
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Gating Case 1: Chưa đăng nhập Google */}
          {!user && (
            <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/30 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Đăng nhập Google để kích hoạt Đồng bộ Đám mây
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Tài khoản Google dùng để định danh kho dữ liệu cá nhân của bạn. Dữ liệu prompt thực tế sẽ được bảo vệ bởi Passkey riêng biệt.
                </p>
              </div>
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <span>Đăng nhập với Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Gating Case 2: Đã đăng nhập nhưng chưa phải Pro */}
          {user && !isPro && (
            <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/20 space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    Tính năng dành riêng cho gói Pro Creator
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-white">
                      PRO ONLY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Đồng bộ thời gian thực toàn bộ Prompt Blocks, Presets và lịch sử qua máy tính để bàn, laptop và thiết bị di động với chuẩn mã hóa Zero-Knowledge cấp quân sự (AES-GCM-256).
                  </p>
                </div>
              </div>

              {onOpenProModal && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenProModal();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nâng cấp Pro Creator ngay</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Core UI: Pro User Active */}
          {user && isPro && (
            <>
              {/* Zero-Knowledge Security Guarantee Card */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    Cơ chế Bảo mật Zero-Knowledge là gì?
                  </div>
                  <p className="text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Dữ liệu prompt, tiêu đề và biến số của bạn được <strong>mã hóa bằng AES-256-GCM tại trình duyệt</strong> với khóa dẫn xuất từ Passkey (PBKDF2 SHA-256). Máy chủ đám mây chỉ lưu chuỗi nhị phân mã hóa và <strong>không có khả năng đọc được nội dung</strong> của bạn.
                  </p>
                </div>
              </div>

              {/* Grid 2 Cột: Đám mây vs Thiết bị Cục bộ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cloud Vault Status */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Bản sao lưu Đám mây (Vault)
                      </span>
                    </div>
                    <button
                      onClick={loadMetadata}
                      disabled={isLoadingMeta}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      title="Làm mới trạng thái đám mây"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isLoadingMeta ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Đang kiểm tra đám mây...
                    </div>
                  ) : cloudMeta.exists && cloudMeta.summary ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Số lượng blocks:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {cloudMeta.summary.blocksCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Số lượng presets:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {cloudMeta.summary.presetsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Thiết bị đẩy gần nhất:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-200 max-w-[130px] truncate" title={cloudMeta.summary.deviceName}>
                          {cloudMeta.summary.deviceName || 'Không rõ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Thời gian:</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {cloudMeta.updatedAt ? new Date(cloudMeta.updatedAt).toLocaleString('vi-VN') : 'Mới cập nhật'}
                        </span>
                      </div>
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kho mã hóa đã sẵn sàng</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-1">
                      <div className="text-xs text-slate-400">Chưa có bản sao lưu nào trên Đám mây.</div>
                      <div className="text-[11px] text-slate-500">
                        Hãy nhập Passkey bên dưới và nhấn "Đẩy lên Đám mây".
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Device Status */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Thiết bị hiện tại (Cục bộ)
                      </span>
                    </div>
                    {!isEditingDeviceName ? (
                      <button
                        onClick={() => setIsEditingDeviceName(true)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Đổi tên</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveDeviceName}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Lưu</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Tên thiết bị:</span>
                      {isEditingDeviceName ? (
                        <input
                          type="text"
                          value={customDeviceNameInput}
                          onChange={(e) => setCustomDeviceNameInput(e.target.value)}
                          className="px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 w-36"
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                          {deviceInfo.deviceName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Số blocks trên máy:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {blocks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Số presets trên máy:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {presets.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Lưu trữ:</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        IndexedDB (Offline-first)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passkey Input Card */}
              <div className="p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span>Passkey Bí Mật (Khóa Mã Hóa / Giải Mã)</span>
                  </label>
                  {passkey && (
                    <button
                      onClick={handleClearPasskeySession}
                      className="text-[11px] text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Xóa passkey khỏi bộ nhớ RAM ngay lập tức"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Khóa kho / Xóa khỏi RAM</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPasskey ? 'text' : 'password'}
                    value={passkey}
                    onChange={(e) => handlePasskeyChange(e.target.value)}
                    placeholder="Nhập Passkey bảo mật (tối thiểu 6 ký tự)..."
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberInSession}
                      onChange={(e) => {
                        setRememberInSession(e.target.checked);
                        if (!e.target.checked) {
                          sessionStorage.removeItem('zk_session_passkey');
                        } else if (passkey) {
                          sessionStorage.setItem('zk_session_passkey', passkey);
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Ghi nhớ trong phiên làm việc này (tự hủy khi đóng tab)</span>
                  </label>

                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Không thể khôi phục nếu quên Passkey</span>
                  </div>
                </div>
              </div>

              {/* Mode Lựa chọn khi Kéo về máy (Smart Merge vs Overwrite) */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Chính sách khi Tải về Thiết bị này (Pull):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMergeMode('smart_merge')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mergeMode === 'smart_merge'
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Hợp nhất thông minh</span>
                      {mergeMode === 'smart_merge' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Giữ bản mới nhất theo thời gian, không xóa mất block trên máy này
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMergeMode('overwrite')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mergeMode === 'overwrite'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>Ghi đè hoàn toàn</span>
                      {mergeMode === 'overwrite' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Xóa sạch dữ liệu trên máy này và thay bằng bản sao lưu đám mây
                    </div>
                  </button>
                </div>
              </div>

              {/* Endpoint Status */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                <Server className="w-3 h-3 text-slate-400" />
                <span>
                  Lưu trữ tại: <strong>Firebase Cloud Vault</strong>
                  {cloudSettings.backendSyncEndpoint
                    ? ` & Custom Backend (${cloudSettings.backendSyncEndpoint})`
                    : ''}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {user && isPro && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              {/* Button: Pull from Cloud */}
              <button
                onClick={handlePull}
                disabled={isPulling || isPushing || !cloudMeta.exists || !passkey}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  !cloudMeta.exists || !passkey
                    ? 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-60'
                    : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 shadow-xs'
                }`}
                title={!cloudMeta.exists ? 'Chưa có bản sao lưu trên đám mây' : 'Tải và giải mã về máy'}
              >
                <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                <span>{isPulling ? 'Đang giải mã...' : 'Kéo về Máy này'}</span>
              </button>

              {/* Button: Push to Cloud */}
              <button
                onClick={handlePush}
                disabled={isPushing || isPulling || !passkey || passkey.trim().length < 6}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  !passkey || passkey.trim().length < 6
                    ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-pulse' : ''}`} />
                <span>{isPushing ? 'Đang mã hóa & đẩy...' : 'Đẩy lên Đám mây'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
