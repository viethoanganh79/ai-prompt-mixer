import LZString from 'lz-string';
import { PromptBlock, PromptPreset } from '../types';

export type ShareType = 'block' | 'preset' | 'bundle';

export interface SharedPayload {
  v: 1;
  type: ShareType;
  exportedAt: string;
  sourceApp?: string;
  meta?: {
    title?: string;
    description?: string;
    author?: string;
    itemCount?: number;
  };
  data:
    | { block: PromptBlock }
    | { preset: PromptPreset }
    | { blocks: PromptBlock[]; presets: PromptPreset[] };
}

/**
 * Nén dữ liệu payload thành chuỗi URI-encoded an toàn dùng cho query/hash URL
 */
export function compressPayload(payload: SharedPayload): string {
  const jsonStr = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(jsonStr);
}

/**
 * Giải nén và phân tích chuỗi dữ liệu chia sẻ
 */
export function decompressPayload(raw: string): SharedPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. Thử giải nén với LZString (chuẩn nén URL)
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(trimmed);
    if (decompressed) {
      const parsed = JSON.parse(decompressed);
      if (isValidPayload(parsed)) return parsed;
    }
  } catch {
    // Tiếp tục thử cách giải mã khác
  }

  // 2. Thử nếu là JSON thông thường hoặc JSON đã qua decodeURIComponent
  try {
    let candidate = trimmed;
    if (candidate.startsWith('%7B') || candidate.startsWith('%7b')) {
      candidate = decodeURIComponent(candidate);
    }
    const parsed = JSON.parse(candidate);
    if (isValidPayload(parsed)) return parsed;

    // Nếu người dùng dán trực tiếp object PromptBlock
    if (parsed.id && parsed.content && parsed.category) {
      return {
        v: 1,
        type: 'block',
        exportedAt: new Date().toISOString(),
        meta: { title: parsed.title },
        data: { block: parsed as PromptBlock },
      };
    }

    // Nếu người dùng dán trực tiếp object PromptPreset
    if (parsed.id && parsed.name && Array.isArray(parsed.canvasItems)) {
      return {
        v: 1,
        type: 'preset',
        exportedAt: new Date().toISOString(),
        meta: { title: parsed.name },
        data: { preset: parsed as PromptPreset },
      };
    }

    // Nếu người dùng dán file backup json gồm blocks và presets
    if (Array.isArray(parsed.blocks) || Array.isArray(parsed.presets)) {
      return {
        v: 1,
        type: 'bundle',
        exportedAt: new Date().toISOString(),
        meta: {
          title: 'Thư viện Prompt Mixer',
          itemCount: (parsed.blocks?.length || 0) + (parsed.presets?.length || 0),
        },
        data: {
          blocks: parsed.blocks || [],
          presets: parsed.presets || [],
        },
      };
    }
  } catch {
    // Không phải JSON
  }

  return null;
}

/**
 * Kiểm tra cấu trúc hợp lệ của SharedPayload
 */
function isValidPayload(obj: any): obj is SharedPayload {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    ['block', 'preset', 'bundle'].includes(obj.type) &&
    obj.data &&
    typeof obj.data === 'object'
  );
}

/**
 * Tạo URL chia sẻ trực tiếp dạng Fragment (#share=...)
 * Dùng fragment giúp đường dẫn không bị giới hạn độ dài server và không gửi payload lên backend.
 */
export function buildShareUrl(payload: SharedPayload): string {
  const compressed = compressPayload(payload);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#share=${compressed}`;
}

/**
 * Tạo payload chia sẻ cho một Block lẻ
 */
export function createBlockSharePayload(block: PromptBlock, author?: string): SharedPayload {
  return {
    v: 1,
    type: 'block',
    exportedAt: new Date().toISOString(),
    sourceApp: 'AI Prompt Mixer',
    meta: {
      title: block.title,
      description: block.description,
      author,
      itemCount: 1,
    },
    data: {
      block,
    },
  };
}

/**
 * Tạo payload chia sẻ cho một Preset lẻ
 */
export function createPresetSharePayload(preset: PromptPreset, author?: string): SharedPayload {
  return {
    v: 1,
    type: 'preset',
    exportedAt: new Date().toISOString(),
    sourceApp: 'AI Prompt Mixer',
    meta: {
      title: preset.name,
      description: preset.description,
      author,
      itemCount: preset.canvasItems?.length || 1,
    },
    data: {
      preset,
    },
  };
}

/**
 * Tạo payload chia sẻ cho toàn bộ thư viện (hoặc danh sách chọn lọc)
 */
export function createBundleSharePayload(
  blocks: PromptBlock[],
  presets: PromptPreset[],
  title = 'Bộ sưu tập Prompt Mixer'
): SharedPayload {
  return {
    v: 1,
    type: 'bundle',
    exportedAt: new Date().toISOString(),
    sourceApp: 'AI Prompt Mixer',
    meta: {
      title,
      itemCount: blocks.length + presets.length,
    },
    data: {
      blocks,
      presets,
    },
  };
}

/**
 * Trích xuất payload từ URL hiện tại nếu có tham số #share=... hoặc ?share=...
 */
export function extractShareFromCurrentUrl(): SharedPayload | null {
  if (typeof window === 'undefined') return null;

  // 1. Kiểm tra hash (#share=...)
  const hash = window.location.hash;
  if (hash.includes('share=')) {
    const raw = hash.replace(/^#.*?share=/, '');
    if (raw) {
      const payload = decompressPayload(raw);
      if (payload) return payload;
    }
  }

  // 2. Kiểm tra search params (?share=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const searchShare = params.get('share');
    if (searchShare) {
      const payload = decompressPayload(searchShare);
      if (payload) return payload;
    }
  } catch {
    // Bỏ qua nếu URL parsing lỗi
  }

  return null;
}

/**
 * Xóa chuỗi share khỏi thanh địa chỉ duyệt web mà không gây tải lại trang
 */
export function clearShareParamFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('share');
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
  } catch {
    window.history.replaceState(null, '', window.location.pathname);
  }
}
