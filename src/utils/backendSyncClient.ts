import { UserCloudSettings } from '../types';
import { normalizeEndpoint } from './shortenerClient';

/**
 * Đồng bộ cài đặt người dùng lên Backend lưu trữ riêng
 */
export async function syncSettingsToBackend(
  backendUrl: string,
  settings: UserCloudSettings,
  idToken?: string | null
): Promise<{ ok: boolean; message: string }> {
  if (!backendUrl) {
    return { ok: false, message: 'Chưa cấu hình URL Backend lưu trữ cài đặt.' };
  }

  const endpoint = normalizeEndpoint(backendUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${endpoint}/api/v1/user/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { ok: true, message: 'Đồng bộ cài đặt lên Backend thành công!' };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        message: err.message || `Lỗi máy chủ HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Không thể kết nối đến Backend lưu trữ cài đặt.',
    };
  }
}

/**
 * Tải cài đặt người dùng từ Backend lưu trữ riêng
 */
export async function fetchSettingsFromBackend(
  backendUrl: string,
  idToken?: string | null
): Promise<{ ok: boolean; settings?: UserCloudSettings; message: string }> {
  if (!backendUrl) {
    return { ok: false, message: 'Chưa cấu hình URL Backend lưu trữ cài đặt.' };
  }

  const endpoint = normalizeEndpoint(backendUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${endpoint}/api/v1/user/settings`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const settings = (await res.json()) as UserCloudSettings;
      return { ok: true, settings, message: 'Tải cài đặt từ đám mây thành công!' };
    } else {
      return {
        ok: false,
        message: `Máy chủ trả về HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Không thể kết nối đến máy chủ cài đặt.',
    };
  }
}
