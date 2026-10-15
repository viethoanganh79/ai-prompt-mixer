import { SharedPayload } from './shareUtils';
import {
  ShortenerServiceConfig,
  ProSecurityOptions,
  ShortenLinkResponse,
  AuthUser,
} from '../types';

/**
 * Tính mã băm SHA-256 của nội dung để chống lưu trùng rác (Deduplication)
 */
export async function calculatePayloadChecksum(payload: SharedPayload): Promise<string> {
  try {
    const jsonStr = JSON.stringify(payload);
    const msgBuffer = new TextEncoder().encode(jsonStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `hash-${Date.now()}`;
  }
}

/**
 * Chuẩn hóa base endpoint (loại bỏ dấu gạch chéo cuối nếu có)
 */
export function normalizeEndpoint(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Gọi API kiểm tra kết nối và trạng thái Pro/Verified của Service
 */
export async function testShortenerConnection(
  config: ShortenerServiceConfig,
  idToken?: string | null
): Promise<{ ok: boolean; message: string; isPro?: boolean; serviceName?: string }> {
  if (!config.customEndpoint) {
    return { ok: false, message: 'Vui lòng nhập URL Endpoint của Service' };
  }

  const endpoint = normalizeEndpoint(config.customEndpoint);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  } else if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['x-api-key'] = config.apiKey;
  }

  try {
    // Thử gọi /api/v1/verify hoặc /health hoặc ping
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${endpoint}/api/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ping: true, timestamp: new Date().toISOString() }),
      signal: controller.signal,
    }).catch(async () => {
      // Fallback thử GET /health hoặc /api/health
      return fetch(`${endpoint}/health`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        message: 'Kết nối thành công tới dịch vụ rút gọn link!',
        isPro: data.isPro !== undefined ? Boolean(data.isPro) : Boolean(config.apiKey),
        serviceName: data.serviceName || 'Custom URL Shortener',
      };
    } else {
      return {
        ok: false,
        message: `Máy chủ phản hồi mã lỗi HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Hết thời gian chờ phản hồi từ máy chủ (Timeout sau 6s)' };
    }
    return {
      ok: false,
      message: err.message || 'Không thể kết nối đến máy chủ. Kiểm tra lại URL hoặc cấu hình CORS.',
    };
  }
}

/**
 * Tạo link rút gọn thông qua API Service của người dùng
 */
export async function createShortLink(
  payload: SharedPayload,
  options: ProSecurityOptions,
  config: ShortenerServiceConfig,
  user?: AuthUser | null,
  idToken?: string | null
): Promise<ShortenLinkResponse> {
  if (!config.customEndpoint) {
    throw new Error('Chưa cấu hình Endpoint dịch vụ rút gọn. Hãy cấu hình trong Cài đặt.');
  }

  const endpoint = normalizeEndpoint(config.customEndpoint);
  const checksum = await calculatePayloadChecksum(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  } else if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['x-api-key'] = config.apiKey;
  }

  const requestBody = {
    payload,
    title: payload.meta?.title || 'Chia sẻ Prompt Mixer',
    type: payload.type,
    checksum,
    customAlias: options.customAlias?.trim() || undefined,
    security: {
      password: options.password?.trim() || undefined,
      maxViews: options.maxViews ?? null,
      expiresInHours: options.expiresInHours ?? null,
    },
    creator: user
      ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isPro: user.isPro,
        }
      : undefined,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${endpoint}/api/v1/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const msg = errorJson?.message || errorJson?.error || `Lỗi máy chủ HTTP ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const slug = data.slug || data.id;
    const shortUrl = data.shortUrl || `${endpoint}/s/${slug}`;

    return {
      shortUrl,
      slug,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt || null,
      maxViews: options.maxViews,
      hasPassword: Boolean(options.password),
      isBurnAfterReading: options.maxViews === 1,
      authorBadge: data.authorBadge || (user?.isPro ? 'Pro Verified' : undefined),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Yêu cầu tạo link bị timeout sau 10s. Kiểm tra đường truyền của bạn.');
    }
    throw err;
  }
}
