import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PromptBlock,
  PromptPreset,
  EncryptedSyncPackage,
  DecryptedPromptPayload,
  ZeroKnowledgeSyncSummary,
  CloudSyncMergeMode,
} from '../types';
import {
  encryptPromptPayload,
  decryptPromptPayload,
  getOrCreateDeviceInfo,
} from '../utils/cryptoZeroKnowledge';
import { localDb } from '../db/indexedDbEngine';
import { normalizeEndpoint } from '../utils/shortenerClient';

export interface CloudVaultMetadata {
  exists: boolean;
  summary: ZeroKnowledgeSyncSummary | null;
  updatedAt: string | null;
  rawPackage?: EncryptedSyncPackage;
}

export interface SyncOperationResult {
  success: boolean;
  message: string;
  summary?: ZeroKnowledgeSyncSummary;
  mergeStats?: {
    blocksAdded: number;
    blocksUpdated: number;
    presetsAdded: number;
    presetsUpdated: number;
  };
}

/**
 * 1. Lấy thông tin tóm lược của gói dữ liệu đã mã hóa trên đám mây (không cần passkey)
 */
export async function fetchCloudVaultMetadata(
  userId: string,
  customBackendUrl?: string,
  idToken?: string | null
): Promise<CloudVaultMetadata> {
  if (!userId) {
    return { exists: false, summary: null, updatedAt: null };
  }

  // A. Thử kiểm tra từ Custom Backend nếu người dùng cấu hình
  if (customBackendUrl) {
    try {
      const endpoint = normalizeEndpoint(customBackendUrl);
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch(`${endpoint}/api/v1/user/sync-vault/meta`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          exists: true,
          summary: data.summary,
          updatedAt: data.updatedAt || data.summary?.timestamp,
          rawPackage: data.package,
        };
      }
    } catch (e) {
      console.warn('Custom backend meta fetch failed, falling back to Firestore:', e);
    }
  }

  // B. Đọc từ Firebase Firestore
  try {
    const vaultDocRef = doc(db, 'users', userId, 'sync', 'vault');
    const snap = await getDoc(vaultDocRef);

    if (!snap.exists()) {
      return { exists: false, summary: null, updatedAt: null };
    }

    const data = snap.data() as EncryptedSyncPackage & { updatedAt?: any };
    return {
      exists: true,
      summary: data.summary || null,
      updatedAt:
        data.updatedAt?.toDate?.()?.toISOString() ||
        data.summary?.timestamp ||
        new Date().toISOString(),
      rawPackage: data,
    };
  } catch (err: any) {
    console.error('Error fetching Firestore vault meta:', err);
    return { exists: false, summary: null, updatedAt: null };
  }
}

/**
 * 2. Đẩy dữ liệu lên đám mây với cơ chế Mã hóa Zero-Knowledge (AES-256-GCM)
 */
export async function pushZeroKnowledgeSync(
  userId: string,
  passkey: string,
  libraryData: {
    blocks: PromptBlock[];
    presets: PromptPreset[];
  },
  customBackendUrl?: string,
  idToken?: string | null
): Promise<SyncOperationResult> {
  if (!userId) {
    return { success: false, message: 'Vui lòng đăng nhập Google để đồng bộ dữ liệu.' };
  }

  if (!passkey || passkey.trim().length < 6) {
    return { success: false, message: 'Passkey phải có ít nhất 6 ký tự.' };
  }

  try {
    const deviceInfo = getOrCreateDeviceInfo();

    const payload: DecryptedPromptPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      blocks: libraryData.blocks,
      presets: libraryData.presets,
    };

    // Mã hóa trực tiếp tại client
    const encryptedPackage = await encryptPromptPayload(payload, passkey, deviceInfo);

    // Lưu lên Firestore
    const vaultDocRef = doc(db, 'users', userId, 'sync', 'vault');
    await setDoc(vaultDocRef, {
      ...encryptedPackage,
      updatedAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });

    // Nếu có Custom Backend, đẩy đồng thời lên Custom Backend
    if (customBackendUrl) {
      try {
        const endpoint = normalizeEndpoint(customBackendUrl);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

        await fetch(`${endpoint}/api/v1/user/sync-vault`, {
          method: 'POST',
          headers,
          body: JSON.stringify(encryptedPackage),
        });
      } catch (err) {
        console.warn('Push to custom backend failed (Firestore succeeded):', err);
      }
    }

    // Cập nhật timestamp đồng bộ cục bộ
    const now = new Date().toISOString();
    await localDb.setSetting(`last_zk_sync_${userId}`, {
      syncedAt: now,
      summary: encryptedPackage.summary,
    });

    return {
      success: true,
      message: `Đã mã hóa và đồng bộ thành công ${payload.blocks.length} blocks & ${payload.presets.length} presets lên đám mây!`,
      summary: encryptedPackage.summary,
    };
  } catch (err: any) {
    console.error('Push Zero-Knowledge Sync Error:', err);
    return {
      success: false,
      message: err.message || 'Lỗi trong quá trình mã hóa hoặc lưu trữ lên đám mây.',
    };
  }
}

/**
 * 3. Tải từ đám mây và Giải mã Zero-Knowledge về thiết bị
 */
export async function pullZeroKnowledgeSync(
  userId: string,
  passkey: string,
  mergeMode: CloudSyncMergeMode = 'smart_merge',
  customBackendUrl?: string,
  idToken?: string | null
): Promise<SyncOperationResult> {
  if (!userId) {
    return { success: false, message: 'Vui lòng đăng nhập Google trước.' };
  }

  if (!passkey) {
    return { success: false, message: 'Vui lòng nhập Passkey để giải mã dữ liệu.' };
  }

  try {
    // 1. Tải gói đã mã hóa
    let rawPackage: EncryptedSyncPackage | null = null;

    if (customBackendUrl) {
      try {
        const endpoint = normalizeEndpoint(customBackendUrl);
        const headers: Record<string, string> = {};
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

        const res = await fetch(`${endpoint}/api/v1/user/sync-vault`, {
          method: 'GET',
          headers,
        });
        if (res.ok) {
          rawPackage = (await res.json()) as EncryptedSyncPackage;
        }
      } catch (e) {
        console.warn('Pull from custom backend failed, trying Firestore:', e);
      }
    }

    if (!rawPackage) {
      const vaultDocRef = doc(db, 'users', userId, 'sync', 'vault');
      const snap = await getDoc(vaultDocRef);

      if (!snap.exists()) {
        return {
          success: false,
          message: 'Chưa có bản sao lưu đám mây nào cho tài khoản này.',
        };
      }

      rawPackage = snap.data() as EncryptedSyncPackage;
    }

    // 2. Giải mã client-side với passkey
    const decryptResult = await decryptPromptPayload(rawPackage, passkey);
    if (!decryptResult.ok) {
      return {
        success: false,
        message: decryptResult.error,
      };
    }

    const remotePayload = decryptResult.payload;

    // 3. Áp dụng vào cơ sở dữ liệu IndexedDB
    let blocksAdded = 0;
    let blocksUpdated = 0;
    let presetsAdded = 0;
    let presetsUpdated = 0;

    const currentBlocks = await localDb.getAllBlocks();
    const currentPresets = await localDb.getAllPresets();

    if (mergeMode === 'overwrite') {
      // Ghi đè toàn bộ: xóa sạch các block & preset cũ và nạp mới
      for (const b of currentBlocks) {
        await localDb.deleteBlock(b.id);
      }
      for (const p of currentPresets) {
        await localDb.deletePreset(p.id);
      }
      for (const b of remotePayload.blocks) {
        await localDb.saveBlock(b);
        blocksAdded++;
      }
      for (const p of remotePayload.presets) {
        await localDb.savePreset(p);
        presetsAdded++;
      }
    } else {
      // Smart Merge: So sánh theo ID và updatedAt
      const localBlockMap = new Map(currentBlocks.map((b) => [b.id, b]));
      for (const remoteBlock of remotePayload.blocks) {
        const local = localBlockMap.get(remoteBlock.id);
        if (!local) {
          await localDb.saveBlock(remoteBlock);
          blocksAdded++;
        } else {
          // So sánh timestamp
          const remoteTime = new Date(remoteBlock.updatedAt || 0).getTime();
          const localTime = new Date(local.updatedAt || 0).getTime();
          if (remoteTime > localTime) {
            await localDb.saveBlock(remoteBlock);
            blocksUpdated++;
          }
        }
      }

      const localPresetMap = new Map(currentPresets.map((p) => [p.id, p]));
      for (const remotePreset of remotePayload.presets) {
        const local = localPresetMap.get(remotePreset.id);
        if (!local) {
          await localDb.savePreset(remotePreset);
          presetsAdded++;
        } else {
          const remoteTime = new Date(remotePreset.updatedAt || 0).getTime();
          const localTime = new Date(local.updatedAt || 0).getTime();
          if (remoteTime > localTime) {
            await localDb.savePreset(remotePreset);
            presetsUpdated++;
          }
        }
      }
    }

    // Cập nhật timestamp đồng bộ cục bộ
    const now = new Date().toISOString();
    await localDb.setSetting(`last_zk_sync_${userId}`, {
      syncedAt: now,
      summary: rawPackage.summary,
    });

    return {
      success: true,
      message:
        mergeMode === 'overwrite'
          ? `Đã khôi phục hoàn toàn ${blocksAdded} blocks và ${presetsAdded} presets từ đám mây!`
          : `Hợp nhất thành công: +${blocksAdded} blocks mới, cập nhật ${blocksUpdated} blocks; +${presetsAdded} presets mới, cập nhật ${presetsUpdated} presets.`,
      summary: rawPackage.summary,
      mergeStats: {
        blocksAdded,
        blocksUpdated,
        presetsAdded,
        presetsUpdated,
      },
    };
  } catch (err: any) {
    console.error('Pull Zero-Knowledge Sync Error:', err);
    return {
      success: false,
      message: err.message || 'Lỗi khi tải hoặc giải mã dữ liệu.',
    };
  }
}
