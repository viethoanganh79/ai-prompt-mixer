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
