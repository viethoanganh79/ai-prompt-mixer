import { PromptBlock, PromptPreset, CanvasBlock } from '../types';

export interface ZeroKnowledgeSyncSummary {
  blocksCount: number;
  presetsCount: number;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  clientVersion: string;
  byteSize: number;
}

export interface EncryptedSyncPackage {
  version: number;
  format: 'zero-knowledge-aes-gcm-256';
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  keyCheckHash: string; // SHA-256 verification hash
  summary: ZeroKnowledgeSyncSummary;
}

export interface DecryptedPromptPayload {
  version: number;
  exportedAt: string;
  blocks: PromptBlock[];
  presets: PromptPreset[];
  canvasItems?: CanvasBlock[];
  settings?: Record<string, any>;
}

// Helpers for Base64 conversion
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// PBKDF2 Key Derivation
async function deriveAesKey(passkey: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passkeyKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passkey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passkeyKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generates a quick verifier hash of the passkey with the salt to check correctness
export async function computePasskeyCheckHash(passkey: string, saltBase64: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`prompt_mixer_zk_verifier:${passkey}:${saltBase64}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Encrypt prompt payload using client-side AES-GCM-256 with PBKDF2 derived key.
 * The server only sees encrypted ciphertext, random IV, random Salt, and metadata summary.
 */
export async function encryptPromptPayload(
  payload: DecryptedPromptPayload,
  passkey: string,
  deviceMeta: { deviceId: string; deviceName: string }
): Promise<EncryptedSyncPackage> {
  if (!passkey || passkey.trim().length < 6) {
    throw new Error('Passkey phải có tối thiểu 6 ký tự để đảm bảo an toàn mã hóa.');
  }

  // 1. Generate 16 bytes cryptographic random salt
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  // 2. Generate 12 bytes cryptographic random IV for AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  // 3. Derive 256-bit AES-GCM key using PBKDF2
  const aesKey = await deriveAesKey(passkey, salt);

  // 4. Serialize and encode payload
  const jsonStr = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(jsonStr);

  // 5. Encrypt with AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    aesKey,
    plaintextBytes
  );

  const saltBase64 = arrayBufferToBase64(salt);
  const ivBase64 = arrayBufferToBase64(iv);
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
  const keyCheckHash = await computePasskeyCheckHash(passkey, saltBase64);

  const summary: ZeroKnowledgeSyncSummary = {
    blocksCount: payload.blocks?.length || 0,
    presetsCount: payload.presets?.length || 0,
    timestamp: new Date().toISOString(),
    deviceId: deviceMeta.deviceId,
    deviceName: deviceMeta.deviceName,
    clientVersion: '2.0.0',
    byteSize: ciphertextBase64.length,
  };

  return {
    version: 1,
    format: 'zero-knowledge-aes-gcm-256',
    salt: saltBase64,
    iv: ivBase64,
    ciphertext: ciphertextBase64,
    keyCheckHash,
    summary,
  };
}

/**
 * Decrypt cloud package using client-provided passkey.
 * Returns decrypted blocks and presets or throws/returns clear error on wrong passkey.
 */
export async function decryptPromptPayload(
  pkg: EncryptedSyncPackage,
  passkey: string
): Promise<{ ok: true; payload: DecryptedPromptPayload } | { ok: false; error: string }> {
  if (!pkg || !pkg.ciphertext || !pkg.salt || !pkg.iv) {
    return { ok: false, error: 'Gói dữ liệu đồng bộ bị thiếu hoặc không đúng định dạng.' };
  }

  if (!passkey) {
    return { ok: false, error: 'Vui lòng nhập Passkey để giải mã dữ liệu đám mây.' };
  }

  // 1. Verify passkey check hash first for quick, friendly feedback if available
  if (pkg.keyCheckHash) {
    const candidateHash = await computePasskeyCheckHash(passkey, pkg.salt);
    if (candidateHash !== pkg.keyCheckHash) {
      return {
        ok: false,
        error: 'Passkey không chính xác. Vui lòng kiểm tra lại mật khẩu giải mã của bạn.',
      };
    }
  }

  try {
    const salt = base64ToArrayBuffer(pkg.salt);
    const iv = base64ToArrayBuffer(pkg.iv);
    const ciphertext = base64ToArrayBuffer(pkg.ciphertext);

    // 2. Derive key with same salt
    const aesKey = await deriveAesKey(passkey, salt);

    // 3. Decrypt with AES-GCM
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      aesKey,
      ciphertext as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    const payload = JSON.parse(jsonStr) as DecryptedPromptPayload;

    if (!Array.isArray(payload.blocks) || !Array.isArray(payload.presets)) {
      return { ok: false, error: 'Dữ liệu sau khi giải mã không đúng cấu trúc thư viện Prompt.' };
    }

    return { ok: true, payload };
  } catch (err: any) {
    console.error('Zero-Knowledge Decryption failed:', err);
    return {
      ok: false,
      error:
        'Không thể giải mã dữ liệu. Passkey có thể bị sai hoặc dữ liệu trên đám mây đã bị can thiệp trái phép.',
    };
  }
}

/**
 * Returns a persistent device ID and human-friendly name
 */
export function getOrCreateDeviceInfo(): { deviceId: string; deviceName: string } {
  let deviceId = localStorage.getItem('prompt_mixer_device_id');
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('prompt_mixer_device_id', deviceId);
  }

  let deviceName = localStorage.getItem('prompt_mixer_device_name');
  if (!deviceName) {
    // Generate intuitive default name based on user-agent
    const ua = navigator.userAgent;
    let os = 'Thiết bị';
    if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Web';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    deviceName = `${browser} trên ${os}`;
    localStorage.setItem('prompt_mixer_device_name', deviceName);
  }

  return { deviceId, deviceName };
}

export function saveCustomDeviceName(name: string): void {
  localStorage.setItem('prompt_mixer_device_name', name.trim());
}
