export type PromptCategory =
  | 'persona'
  | 'context'
  | 'instructions'
  | 'constraints'
  | 'style'
  | 'output'
  | 'examples'
  | 'custom';

export type VariableSelectMode = 'text' | 'single' | 'multi';

/**
 * Schema mới của PromptBlock:
 * Biến số và các tùy chọn được lưu trực tiếp bên trong `content` theo cú pháp:
 * - {{bien}}: người dùng nhập text tự do
 * - {{bien | lựa chọn 1, lựa chọn 2}}: danh sách chọn 1 (dropdown single-select)
 * - {{bien |* lựa chọn 1, lựa chọn 2}}: danh sách chọn nhiều (dropdown multi-select)
 * Không cần bảng phụ hoặc cấu trúc phụ (variableConfigs) lưu ngoài.
 */
export interface PromptBlock {
  id: string;
  title: string;
  category: PromptCategory;
  content: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  sheetRowId?: string;
  // Trường tùy chọn để tương thích ngược nếu có dữ liệu cũ
  variables?: string[];
}

export interface CanvasBlock {
  instanceId: string;
  blockId: string;
  title: string;
  category: PromptCategory;
  content: string;
  prefix: string;
  suffix: string;
  isEnabled: boolean;
  order: number;
}

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  canvasItems: CanvasBlock[];
  variableValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface LogAttachment {
  id: string;
  name: string;
  type: string; // 'text/plain', 'application/json', 'markdown', etc.
  content: string;
  size?: number;
  uploadedAt: string;
}

export interface UserLog {
  id: string;
  timestamp: string;
  promptText: string;
  charCount: number;
  wordCount: number;
  estimatedTokens: number;
  action: 'copied' | 'tested' | 'exported';
  blockCount: number;
  presetName?: string;
  aiResponse?: string;
  durationMs?: number;
  attachments?: LogAttachment[];
}

export interface SyncConfig {
  sheetUrl: string;
  sheetId: string;
  gid: string;
  webhookUrl: string;
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage: string | null;
  autoSync: boolean;
  totalSyncedBlocks: number;
}

export interface CategoryMeta {
  id: PromptCategory;
  label: string;
  description: string;
  badgeColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: string;
}

// Custom URL Shortener & Backend Settings Types
export interface ShortenerServiceConfig {
  customEndpoint: string;
  apiKey: string;
  defaultDomain?: string;
  isVerified?: boolean;
}

export interface ProSecurityPreferences {
  defaultMaxViews: number | null; // 1 = burn after reading, null = unlimit
  defaultExpiresInHours: number | null; // 1, 24, 168 (7 ngày), null = unlimit
  alwaysRequirePassword: boolean;
}

export interface UserCloudSettings {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isPro: boolean;
  proPlan?: 'monthly' | 'yearly' | 'lifetime';
  proExpiresAt?: string;
  shortener: ShortenerServiceConfig;
  securityPreferences: ProSecurityPreferences;
  backendSyncEndpoint?: string;
  lastSyncedAt?: string;
  updatedAt: string;
}

export interface ProSecurityOptions {
  password?: string;
  maxViews?: number | null; // 1 (burn after reading), 5, 20, null = unlimit
  expiresInHours?: number | null; // 1, 24, 168, 720, null = vĩnh viễn
  customAlias?: string;
}

export interface ShortenLinkResponse {
  shortUrl: string;
  slug: string;
  createdAt?: string;
  expiresAt?: string | null;
  maxViews?: number | null;
  hasPassword?: boolean;
  isBurnAfterReading?: boolean;
  authorBadge?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  proPlan?: string;
  proExpiresAt?: string;
}

// Zero-Knowledge Multi-Device Sync Types
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
  salt: string;
  iv: string;
  ciphertext: string;
  keyCheckHash: string;
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

export type CloudSyncMergeMode = 'smart_merge' | 'overwrite';

// Prompt Output Formats
export type PromptOutputFormat = 'xml' | 'markdown';

// External AI Playground Model Configuration (Pro Feature)
export type AIModelProvider =
  | 'built-in' // Server default Gemini
  | 'gemini'   // Custom Google Gemini API Key
  | 'openai'   // OpenAI (GPT-4o, etc.)
  | 'anthropic'// Anthropic (Claude 3.5 Sonnet, etc.)
  | 'openrouter' // OpenRouter (Llama 3.3, Claude, DeepSeek, etc.)
  | 'groq'     // Groq Ultra-fast inference
  | 'custom';  // Custom OpenAI-compatible endpoint (Ollama, vLLM, DeepSeek, etc.)

export interface CustomAIConfig {
  provider: AIModelProvider;
  apiKey: string;
  endpointUrl?: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  systemInstruction?: string;
}
