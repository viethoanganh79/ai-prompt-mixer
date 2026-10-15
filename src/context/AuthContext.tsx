import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { AuthUser, UserCloudSettings } from '../types';
import { localDb } from '../db/indexedDbEngine';
import { syncSettingsToBackend, fetchSettingsFromBackend } from '../utils/backendSyncClient';

const DEFAULT_SETTINGS: UserCloudSettings = {
  userId: 'guest',
  email: '',
  isPro: false,
  shortener: {
    customEndpoint: '',
    apiKey: '',
    defaultDomain: '',
    isVerified: false,
  },
  securityPreferences: {
    defaultMaxViews: null,
    defaultExpiresInHours: null,
    alwaysRequirePassword: false,
  },
  backendSyncEndpoint: '',
  updatedAt: new Date().toISOString(),
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isPro: boolean;
  cloudSettings: UserCloudSettings;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setProStatus: (isPro: boolean, plan?: 'monthly' | 'yearly' | 'lifetime', expiresAt?: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateCloudSettings: (partial: Partial<UserCloudSettings>) => Promise<void>;
  syncWithBackend: () => Promise<{ ok: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudSettings, setCloudSettings] = useState<UserCloudSettings>(DEFAULT_SETTINGS);

  // 1. Tải cài đặt lưu trong IndexedDB khi khởi động
  useEffect(() => {
    const loadCachedSettings = async () => {
      try {
        const cached = await localDb.getSetting<UserCloudSettings>('user_cloud_settings', DEFAULT_SETTINGS);
        if (cached) {
          setCloudSettings(cached);
        }
      } catch (err) {
        console.error('Error loading settings from IndexedDB:', err);
      }
    };
    loadCachedSettings();
  }, []);

  // 2. Lắng nghe trạng thái đăng nhập Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Kiểm tra xem user này đã có Pro lưu trong cache IndexedDB chưa
        const proKey = `pro_status_${fbUser.uid}`;
        const cachedPro = await localDb.getSetting<{ isPro: boolean; plan?: string; expiresAt?: string }>(
          proKey,
          { isPro: false }
        );

        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          isPro: cachedPro.isPro,
          proPlan: cachedPro.plan,
          proExpiresAt: cachedPro.expiresAt,
        });

        // Cập nhật email và userId vào cloudSettings
        setCloudSettings((prev) => ({
          ...prev,
          userId: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || prev.displayName,
          photoURL: fbUser.photoURL || prev.photoURL,
          isPro: cachedPro.isPro,
        }));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Đăng nhập bằng Google
  const loginWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Đăng xuất
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-Out Error:', err);
    }
  }, []);

  // 5. Lấy JWT ID Token của Google để gọi backend
  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  // 6. Kích hoạt / Cập nhật trạng thái Pro User
  const setProStatus = useCallback(
    async (isPro: boolean, plan?: 'monthly' | 'yearly' | 'lifetime', expiresAt?: string) => {
      if (!user) {
        throw new Error('Vui lòng đăng nhập Google trước khi kích hoạt gói Pro.');
      }

      const proKey = `pro_status_${user.uid}`;
      await localDb.setSetting(proKey, { isPro, plan, expiresAt });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              isPro,
              proPlan: plan,
              proExpiresAt: expiresAt,
            }
          : null
      );

      setCloudSettings((prev) => {
        const next = {
          ...prev,
          isPro,
          proPlan: plan,
          proExpiresAt: expiresAt,
          updatedAt: new Date().toISOString(),
        };
        localDb.setSetting('user_cloud_settings', next);
        return next;
      });
    },
    [user]
  );

  // 7. Cập nhật cài đặt đám mây và lưu vào IndexedDB
  const updateCloudSettings = useCallback(
    async (partial: Partial<UserCloudSettings>) => {
      setCloudSettings((prev) => {
        const next = {
          ...prev,
          ...partial,
          updatedAt: new Date().toISOString(),
        };
        localDb.setSetting('user_cloud_settings', next);
        return next;
      });
    },
    []
  );

  // 8. Đồng bộ cài đặt với backend riêng của người dùng
  const syncWithBackend = useCallback(async () => {
    if (!cloudSettings.backendSyncEndpoint) {
      return { ok: false, message: 'Chưa cấu hình URL Endpoint Backend trong Cài đặt.' };
    }

    const token = await getIdToken();
    const result = await syncSettingsToBackend(cloudSettings.backendSyncEndpoint, cloudSettings, token);

    if (result.ok) {
      const now = new Date().toISOString();
      updateCloudSettings({ lastSyncedAt: now });
    }

    return result;
  }, [cloudSettings, getIdToken, updateCloudSettings]);

  const value: AuthContextType = {
    user,
    loading,
    isPro: Boolean(user?.isPro),
    cloudSettings,
    loginWithGoogle,
    logout,
    setProStatus,
    getIdToken,
    updateCloudSettings,
    syncWithBackend,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
