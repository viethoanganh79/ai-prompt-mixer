import { PromptBlock, PromptPreset, UserLog, SyncConfig } from '../types';
import { DEFAULT_BLOCKS, DEFAULT_PRESETS } from './defaultData';

const DB_NAME = 'ai_prompt_mixer_db';
const DB_VERSION = 1;

export class LocalDbEngine {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Table: blocks
        if (!db.objectStoreNames.contains('blocks')) {
          const blockStore = db.createObjectStore('blocks', { keyPath: 'id' });
          blockStore.createIndex('category', 'category', { unique: false });
          blockStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Table: presets
        if (!db.objectStoreNames.contains('presets')) {
          const presetStore = db.createObjectStore('presets', { keyPath: 'id' });
          presetStore.createIndex('category', 'category', { unique: false });
          presetStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Table: logs
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Table: settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        // Check if initial seeding needed
        await this.ensureInitialSeed();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.initPromise;
  }

  private async ensureInitialSeed() {
    const existingBlocks = await this.getAllBlocks();
    if (existingBlocks.length === 0) {
      await this.bulkInsertBlocks(DEFAULT_BLOCKS);
    } else {
      // Tự động nâng cấp các khối mẫu hệ thống sang schema mới
      const sampleSenior = existingBlocks.find((b) => b.id === 'block-persona-senior-architect');
      if (sampleSenior && !sampleSenior.content.includes('|*')) {
        for (const defBlock of DEFAULT_BLOCKS) {
          const exists = existingBlocks.find((b) => b.id === defBlock.id);
          if (exists && !exists.isCustom) {
            await this.saveBlock(defBlock);
          }
        }
      }
    }

    const existingPresets = await this.getAllPresets();
    if (existingPresets.length === 0) {
      for (const preset of DEFAULT_PRESETS) {
        await this.savePreset(preset);
      }
    } else {
      // Tự động nâng cấp các presets mẫu sang schema mới và đồng bộ tùy chọn biến
      const sampleSaasPreset = existingPresets.find((p) => p.id === 'preset-saas-copywriter');
      const needsPresetUpgrade =
        sampleSaasPreset &&
        (!sampleSaasPreset.canvasItems.some((item) => item.content.includes('|')) ||
          sampleSaasPreset.variableValues?.niche === 'B2B AI Productivity Software');

      if (needsPresetUpgrade) {
        for (const defPreset of DEFAULT_PRESETS) {
          await this.savePreset(defPreset);
        }
      } else {
        // Đảm bảo nạp các preset mẫu mới thêm vào nếu chưa có trong DB
        for (const defPreset of DEFAULT_PRESETS) {
          const exists = existingPresets.find((p) => p.id === defPreset.id);
          if (!exists) {
            await this.savePreset(defPreset);
          }
        }
      }
    }
  }

  // --- BLOCKS CRUD ---
  async getAllBlocks(): Promise<PromptBlock[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blocks', 'readonly');
      const store = tx.objectStore('blocks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getBlock(id: string): Promise<PromptBlock | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blocks', 'readonly');
      const store = tx.objectStore('blocks');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBlock(block: PromptBlock): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blocks', 'readwrite');
      const store = tx.objectStore('blocks');
      const request = store.put(block);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async bulkInsertBlocks(blocks: PromptBlock[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blocks', 'readwrite');
      const store = tx.objectStore('blocks');

      blocks.forEach((b) => store.put(b));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteBlock(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blocks', 'readwrite');
      const store = tx.objectStore('blocks');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- PRESETS CRUD ---
  async getAllPresets(): Promise<PromptPreset[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('presets', 'readonly');
      const store = tx.objectStore('presets');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async savePreset(preset: PromptPreset): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('presets', 'readwrite');
      const store = tx.objectStore('presets');
      const request = store.put(preset);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePreset(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('presets', 'readwrite');
      const store = tx.objectStore('presets');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- LOGS CRUD ---
  async getAllLogs(): Promise<UserLog[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');
      const request = store.getAll();

      request.onsuccess = () => {
        const sorted = (request.result || []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addLog(log: UserLog): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.put(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLog(log: UserLog): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.put(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLog(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async bulkDeleteLogs(ids: string[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      ids.forEach((id) => store.delete(id));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearLogs(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SETTINGS STORE ---
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- BACKUP & SQL EXPORT / IMPORT ---
  async exportJsonDump(): Promise<string> {
    const blocks = await this.getAllBlocks();
    const presets = await this.getAllPresets();
    const logs = await this.getAllLogs();

    const dump = {
      version: 1,
      appName: 'AI Prompt Mixer',
      exportedAt: new Date().toISOString(),
      tables: {
        blocks,
        presets,
        logs,
      },
    };

    return JSON.stringify(dump, null, 2);
  }

  async exportSqlDump(): Promise<string> {
    const blocks = await this.getAllBlocks();
    const presets = await this.getAllPresets();
    const logs = await this.getAllLogs();

    let sql = `-- =========================================================\n`;
    sql += `-- AI Prompt Mixer - SQLite Database Dump\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- =========================================================\n\n`;

    // Table: blocks
    sql += `CREATE TABLE IF NOT EXISTS blocks (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  title TEXT NOT NULL,\n`;
    sql += `  category TEXT NOT NULL,\n`;
    sql += `  content TEXT NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  tags TEXT,\n`;
    sql += `  variables TEXT,\n`;
    sql += `  createdAt TEXT,\n`;
    sql += `  updatedAt TEXT\n`;
    sql += `);\n\n`;

    for (const b of blocks) {
      const tagsJson = JSON.stringify(b.tags).replace(/'/g, "''");
      const varsJson = JSON.stringify(b.variables || []).replace(/'/g, "''");
      const title = b.title.replace(/'/g, "''");
      const desc = (b.description || '').replace(/'/g, "''");
      const content = b.content.replace(/'/g, "''");

      sql += `INSERT OR REPLACE INTO blocks (id, title, category, content, description, tags, variables, createdAt, updatedAt) VALUES ('${b.id}', '${title}', '${b.category}', '${content}', '${desc}', '${tagsJson}', '${varsJson}', '${b.createdAt}', '${b.updatedAt}');\n`;
    }

    // Table: presets
    sql += `\nCREATE TABLE IF NOT EXISTS presets (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  name TEXT NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  category TEXT,\n`;
    sql += `  canvasItems TEXT NOT NULL,\n`;
    sql += `  variableValues TEXT,\n`;
    sql += `  createdAt TEXT,\n`;
    sql += `  updatedAt TEXT\n`;
    sql += `);\n\n`;

    for (const p of presets) {
      const name = p.name.replace(/'/g, "''");
      const desc = (p.description || '').replace(/'/g, "''");
      const cat = (p.category || '').replace(/'/g, "''");
      const items = JSON.stringify(p.canvasItems).replace(/'/g, "''");
      const vars = JSON.stringify(p.variableValues || {}).replace(/'/g, "''");

      sql += `INSERT OR REPLACE INTO presets (id, name, description, category, canvasItems, variableValues, createdAt, updatedAt) VALUES ('${p.id}', '${name}', '${desc}', '${cat}', '${items}', '${vars}', '${p.createdAt}', '${p.updatedAt}');\n`;
    }

    // Table: logs
    sql += `\nCREATE TABLE IF NOT EXISTS logs (\n`;
    sql += `  id TEXT PRIMARY KEY,\n`;
    sql += `  timestamp TEXT NOT NULL,\n`;
    sql += `  promptText TEXT NOT NULL,\n`;
    sql += `  charCount INTEGER,\n`;
    sql += `  wordCount INTEGER,\n`;
    sql += `  estimatedTokens INTEGER,\n`;
    sql += `  action TEXT,\n`;
    sql += `  blockCount INTEGER,\n`;
    sql += `  presetName TEXT\n`;
    sql += `);\n\n`;

    for (const l of logs) {
      const pText = l.promptText.replace(/'/g, "''");
      const pName = (l.presetName || '').replace(/'/g, "''");
      sql += `INSERT OR REPLACE INTO logs (id, timestamp, promptText, charCount, wordCount, estimatedTokens, action, blockCount, presetName) VALUES ('${l.id}', '${l.timestamp}', '${pText}', ${l.charCount}, ${l.wordCount}, ${l.estimatedTokens}, '${l.action}', ${l.blockCount}, '${pName}');\n`;
    }

    return sql;
  }

  async importData(jsonString: string): Promise<{ blocksCount: number; presetsCount: number }> {
    try {
      const parsed = JSON.parse(jsonString);
      let blocksCount = 0;
      let presetsCount = 0;

      if (parsed.tables?.blocks && Array.isArray(parsed.tables.blocks)) {
        await this.bulkInsertBlocks(parsed.tables.blocks);
        blocksCount = parsed.tables.blocks.length;
      } else if (Array.isArray(parsed.blocks)) {
        await this.bulkInsertBlocks(parsed.blocks);
        blocksCount = parsed.blocks.length;
      }

      if (parsed.tables?.presets && Array.isArray(parsed.tables.presets)) {
        for (const p of parsed.tables.presets) {
          await this.savePreset(p);
        }
        presetsCount = parsed.tables.presets.length;
      } else if (Array.isArray(parsed.presets)) {
        for (const p of parsed.presets) {
          await this.savePreset(p);
        }
        presetsCount = parsed.presets.length;
      }

      return { blocksCount, presetsCount };
    } catch (e: any) {
      throw new Error(`Failed to parse import data: ${e.message}`);
    }
  }

  async resetToDefaults(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['blocks', 'presets'], 'readwrite');
      const blockStore = tx.objectStore('blocks');
      const presetStore = tx.objectStore('presets');

      blockStore.clear();
      presetStore.clear();

      DEFAULT_BLOCKS.forEach((b) => blockStore.put(b));
      DEFAULT_PRESETS.forEach((p) => presetStore.put(p));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDb = new LocalDbEngine();
