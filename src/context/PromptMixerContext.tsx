import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  PromptBlock,
  CanvasBlock,
  PromptPreset,
  UserLog,
  LogAttachment,
  SyncConfig,
  PromptOutputFormat,
  CustomAIConfig,
} from '../types';
import { localDb } from '../db/indexedDbEngine';
import { DEFAULT_BLOCKS, DEFAULT_PRESETS, getDefaultBlocks, getDefaultPresets } from '../db/defaultData';
import { fetchBlocksFromGoogleSheet, pushBlocksToWebhook } from '../services/googleSheetsSync';
import {
  extractVariablesFromText,
  extractUnifiedVariableMap,
  replaceVariableInCompiledPrompt,
  VariableInputType,
} from '../utils/variableParser';
import { compileCanvasBlocks } from '../utils/promptCompiler';

interface PromptMixerContextType {
  // Library & Canvas
  blocks: PromptBlock[];
  canvasItems: CanvasBlock[];
  presets: PromptPreset[];
  logs: UserLog[];
  activePresetId: string | null;

  // Variables & Compilation
  variables: Record<string, string>;
  detectedVariables: string[];
  canvasVariableDefs: Record<string, { mode: VariableInputType; options: string[] }>;
  compiledPrompt: string;
  promptFormat: PromptOutputFormat;
  setPromptFormat: (format: PromptOutputFormat) => void;
  setVariableValue: (name: string, value: string) => void;
  resetVariables: () => void;

  // Canvas Actions
  addBlockToCanvas: (block: PromptBlock) => void;
  removeCanvasItem: (instanceId: string) => void;
  toggleCanvasItem: (instanceId: string) => void;
  moveCanvasItemUp: (instanceId: string) => void;
  moveCanvasItemDown: (instanceId: string) => void;
  updateCanvasItemContent: (instanceId: string, content: string) => void;
  updateCanvasItemPrefixSuffix: (instanceId: string, prefix: string, suffix: string) => void;
  duplicateCanvasItem: (instanceId: string) => void;
  clearCanvas: () => void;

  // Presets
  saveCurrentAsPreset: (name: string, description: string, category: string) => Promise<PromptPreset>;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => Promise<void>;

  // Block Library Management
  createCustomBlock: (data: Omit<PromptBlock, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PromptBlock>;
  updateLibraryBlock: (block: PromptBlock) => Promise<void>;
  deleteLibraryBlock: (id: string) => Promise<void>;

  // Theme & Settings
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Sync with Google Sheets
  syncConfig: SyncConfig;
  updateSyncConfig: (updates: Partial<SyncConfig>) => Promise<void>;
  syncPullFromSheet: () => Promise<{ success: boolean; count: number; error?: string }>;
  syncPushToSheet: () => Promise<{ success: boolean; message: string }>;

  // Logs & History
  logPromptAction: (
    action: 'copied' | 'tested' | 'exported',
    customText?: string,
    aiResponse?: string,
    durationMs?: number,
    attachments?: LogAttachment[]
  ) => Promise<UserLog | null>;
  deleteLog: (id: string) => Promise<void>;
  deleteLogs: (ids: string[]) => Promise<void>;
  updateLogAiOutput: (logId: string, aiResponse: string | undefined) => Promise<void>;
  addLogAttachment: (logId: string, attachment: LogAttachment) => Promise<void>;
  removeLogAttachment: (logId: string, attachmentId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  toggleVariableOption: (varName: string, option: string) => void;
  setVariableSingleOption: (varName: string, option: string) => void;

  // Database Backup, Restore & Selective Import
  exportJsonBackup: () => Promise<string>;
  exportSqlDump: () => Promise<string>;
  importBackupData: (json: string) => Promise<{ blocksCount: number; presetsCount: number }>;
  importResolvedBatch: (
    blocksToSave: PromptBlock[],
    presetsToSave: PromptPreset[]
  ) => Promise<{ blocksCount: number; presetsCount: number }>;
  resetDatabaseToDefaults: (lang?: 'vi' | 'en') => Promise<void>;
  switchLibraryLanguage: (lang: 'vi' | 'en') => Promise<void>;
  refreshLibraryFromDb: () => Promise<void>;

  // AI Testing & Multi-Model Playground (Pro Custom Key)
  isTestingAi: boolean;
  aiConfig: CustomAIConfig;
  updateAiConfig: (partial: Partial<CustomAIConfig>) => Promise<void>;
  testPromptWithAI: (
    promptText?: string,
    overrideConfig?: Partial<CustomAIConfig>
  ) => Promise<{
    success: boolean;
    output?: string;
    durationMs?: number;
    model?: string;
    provider?: string;
    error?: string;
  }>;
  testPromptWithGemini: (promptText?: string) => Promise<{
    success: boolean;
    output?: string;
    durationMs?: number;
    error?: string;
  }>;
  aiTestResult: {
    prompt: string;
    output: string;
    durationMs: number;
    timestamp: string;
    model?: string;
    provider?: string;
  } | null;
  clearAiTestResult: () => void;
}

const PromptMixerContext = createContext<PromptMixerContextType | undefined>(undefined);

export const PromptMixerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [canvasItems, setCanvasItems] = useState<CanvasBlock[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    sheetUrl: '',
    sheetId: '',
    gid: '0',
    webhookUrl: '',
    lastSyncTime: null,
    status: 'idle',
    errorMessage: null,
    autoSync: false,
    totalSyncedBlocks: 0,
  });

  const DEFAULT_AI_CONFIG: CustomAIConfig = {
    provider: 'built-in',
    apiKey: '',
    endpointUrl: '',
    model: 'gemini-3.8-flash',
    temperature: 0.7,
  };

  const [promptFormat, setPromptFormatState] = useState<PromptOutputFormat>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prompt_output_format_v2');
      if (saved === 'markdown' || saved === 'xml') {
        return saved as PromptOutputFormat;
      }
    }
    return 'markdown';
  });

  const setPromptFormat = useCallback((format: PromptOutputFormat) => {
    setPromptFormatState(format);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_output_format_v2', format);
      localStorage.setItem('prompt_output_format', format);
    }
  }, []);

  const [aiConfig, setAiConfig] = useState<CustomAIConfig>(DEFAULT_AI_CONFIG);

  useEffect(() => {
    const loadAiConfig = async () => {
      try {
        const saved = await localDb.getSetting<CustomAIConfig>('custom_ai_config', DEFAULT_AI_CONFIG);
        if (saved) {
          // Tự động chuyển đổi các model cũ / không còn khả dụng sang gemini-3.8-flash
          if (
            saved.model === 'gemini-2.5-flash' ||
            saved.model === 'gemini-3.6-flash' ||
            !saved.model
          ) {
            saved.model = 'gemini-3.8-flash';
          }
          setAiConfig(saved);
        }
      } catch (e) {
        console.warn('Failed to load AI config from IndexedDB:', e);
      }
    };
    loadAiConfig();
  }, []);

  const updateAiConfig = useCallback(async (partial: Partial<CustomAIConfig>) => {
    setAiConfig((prev) => {
      const next = { ...prev, ...partial };
      localDb.setSetting('custom_ai_config', next);
      return next;
    });
  }, []);

  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    prompt: string;
    output: string;
    durationMs: number;
    timestamp: string;
    model?: string;
    provider?: string;
  } | null>(null);

  // Initialize DB and load data
  useEffect(() => {
    let mounted = true;
    const loadInitData = async () => {
      try {
        await localDb.init();
        const loadedBlocks = await localDb.getAllBlocks();
        const loadedPresets = await localDb.getAllPresets();
        const loadedLogs = await localDb.getAllLogs();
        const savedSyncConfig = await localDb.getSetting<SyncConfig>('syncConfig', syncConfig);

        if (mounted) {
          setBlocks(loadedBlocks);
          setPresets(loadedPresets);
          setLogs(loadedLogs);
          setSyncConfig(savedSyncConfig);

          // If canvas empty, load first preset by default
          if (loadedPresets.length > 0) {
            const firstPreset = loadedPresets[0];
            setActivePresetId(firstPreset.id);
            setCanvasItems(firstPreset.canvasItems);
            setVariables(firstPreset.variableValues || {});
          } else if (loadedBlocks.length >= 3) {
            // Load 3 sample blocks
            const initialCanvas: CanvasBlock[] = loadedBlocks.slice(0, 3).map((b, i) => ({
              instanceId: `inst-${Date.now()}-${i}`,
              blockId: b.id,
              title: b.title,
              category: b.category,
              content: b.content,
              prefix: '',
              suffix: '\n\n',
              isEnabled: true,
              order: i,
            }));
            setCanvasItems(initialCanvas);
          }
        }
      } catch (e) {
        console.error('Failed to initialize local DB:', e);
      }
    };

    loadInitData();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync dark mode class on root HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Extract all {{variable}} patterns from active canvas items
  const detectedVariables = useMemo(() => {
    const varSet = new Set<string>();
    canvasItems
      .filter((item) => item.isEnabled)
      .forEach((item) => {
        const parsedList = extractVariablesFromText(item.content);
        parsedList.forEach((p) => {
          if (p.name) varSet.add(p.name);
        });
      });
    return Array.from(varSet);
  }, [canvasItems]);

  // Unified variable definitions (mode + options) parsed directly from active block templates
  const canvasVariableDefs = useMemo(() => {
    const activeTexts = canvasItems
      .filter((item) => item.isEnabled)
      .map((item) => item.content);
    return extractUnifiedVariableMap(activeTexts);
  }, [canvasItems]);

  // Compile active blocks into the final prompt (XML or Markdown format)
  const compiledPrompt = useMemo(() => {
    return compileCanvasBlocks(canvasItems, variables, detectedVariables, promptFormat);
  }, [canvasItems, variables, detectedVariables, promptFormat]);

  const setVariableValue = useCallback((name: string, value: string) => {
    setVariables((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const resetVariables = useCallback(() => {
    setVariables({});
  }, []);

  // --- Canvas Actions ---
  const addBlockToCanvas = useCallback((block: PromptBlock) => {
    setCanvasItems((prev) => {
      const newItem: CanvasBlock = {
        instanceId: `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        blockId: block.id,
        title: block.title,
        category: block.category,
        content: block.content,
        prefix: '',
        suffix: '\n\n',
        isEnabled: true,
        order: prev.length,
      };
      return [...prev, newItem];
    });
    setActivePresetId(null);
  }, []);

  const removeCanvasItem = useCallback((instanceId: string) => {
    setCanvasItems((prev) => prev.filter((item) => item.instanceId !== instanceId));
    setActivePresetId(null);
  }, []);

  const toggleCanvasItem = useCallback((instanceId: string) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, isEnabled: !item.isEnabled } : item))
    );
  }, []);

  const moveCanvasItemUp = useCallback((instanceId: string) => {
    setCanvasItems((prev) => {
      const index = prev.findIndex((i) => i.instanceId === instanceId);
      if (index <= 0) return prev;
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((it, idx) => ({ ...it, order: idx }));
    });
    setActivePresetId(null);
  }, []);

  const moveCanvasItemDown = useCallback((instanceId: string) => {
    setCanvasItems((prev) => {
      const index = prev.findIndex((i) => i.instanceId === instanceId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((it, idx) => ({ ...it, order: idx }));
    });
    setActivePresetId(null);
  }, []);

  const updateCanvasItemContent = useCallback((instanceId: string, content: string) => {
    setCanvasItems((prev) =>
      prev.map((item) => (item.instanceId === instanceId ? { ...item, content } : item))
    );
    setActivePresetId(null);
  }, []);

  const updateCanvasItemPrefixSuffix = useCallback(
    (instanceId: string, prefix: string, suffix: string) => {
      setCanvasItems((prev) =>
        prev.map((item) =>
          item.instanceId === instanceId ? { ...item, prefix, suffix } : item
        )
      );
    },
    []
  );

  const duplicateCanvasItem = useCallback((instanceId: string) => {
    setCanvasItems((prev) => {
      const itemIndex = prev.findIndex((i) => i.instanceId === instanceId);
      if (itemIndex === -1) return prev;
      const item = prev[itemIndex];
      const duplicated: CanvasBlock = {
        ...item,
        instanceId: `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${item.title} (Bản sao)`,
        order: itemIndex + 1,
      };
      const newItems = [...prev];
      newItems.splice(itemIndex + 1, 0, duplicated);
      return newItems.map((it, idx) => ({ ...it, order: idx }));
    });
    setActivePresetId(null);
  }, []);

  const clearCanvas = useCallback(() => {
    setCanvasItems([]);
    setActivePresetId(null);
  }, []);

  // --- Presets Actions ---
  const saveCurrentAsPreset = useCallback(
    async (name: string, description: string, category: string): Promise<PromptPreset> => {
      const newPreset: PromptPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        description,
        category: category || 'Custom',
        canvasItems,
        variableValues: { ...variables },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDb.savePreset(newPreset);
      setPresets((prev) => [newPreset, ...prev]);
      setActivePresetId(newPreset.id);
      return newPreset;
    },
    [canvasItems, variables]
  );

  const loadPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;
      setActivePresetId(preset.id);
      setCanvasItems(preset.canvasItems);
      setVariables(preset.variableValues || {});
    },
    [presets]
  );

  const deletePreset = useCallback(async (presetId: string) => {
    await localDb.deletePreset(presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    setActivePresetId((current) => (current === presetId ? null : current));
  }, []);

  // --- Library Block CRUD ---
  const createCustomBlock = useCallback(
    async (data: Omit<PromptBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptBlock> => {
      const now = new Date().toISOString();
      const newBlock: PromptBlock = {
        ...data,
        id: `block-custom-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        isCustom: true,
      };

      await localDb.saveBlock(newBlock);
      setBlocks((prev) => [newBlock, ...prev]);
      return newBlock;
    },
    []
  );

  const updateLibraryBlock = useCallback(async (block: PromptBlock) => {
    const updated = {
      ...block,
      updatedAt: new Date().toISOString(),
    };
    await localDb.saveBlock(updated);
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? updated : b)));
  }, []);

  const deleteLibraryBlock = useCallback(async (id: string) => {
    await localDb.deleteBlock(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // --- Google Sheets Sync Actions ---
  const updateSyncConfig = useCallback(async (updates: Partial<SyncConfig>) => {
    setSyncConfig((prev) => {
      const updated = { ...prev, ...updates };
      localDb.setSetting('syncConfig', updated);
      return updated;
    });
  }, []);

  const syncPullFromSheet = useCallback(async () => {
    if (!syncConfig.sheetUrl) {
      return { success: false, count: 0, error: 'Chưa cấu hình URL Google Sheet' };
    }

    setSyncConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: null }));

    try {
      const result = await fetchBlocksFromGoogleSheet(syncConfig.sheetUrl);

      if (!result.success || result.blocks.length === 0) {
        throw new Error(result.error || 'Không tìm thấy dòng dữ liệu nào trong Google Sheet');
      }

      // Merge blocks with existing library (avoiding exact ID collisions)
      await localDb.bulkInsertBlocks(result.blocks);
      const allUpdatedBlocks = await localDb.getAllBlocks();

      const newSyncState: SyncConfig = {
        ...syncConfig,
        status: 'success',
        lastSyncTime: new Date().toISOString(),
        errorMessage: null,
        totalSyncedBlocks: result.blocks.length,
      };

      setBlocks(allUpdatedBlocks);
      setSyncConfig(newSyncState);
      await localDb.setSetting('syncConfig', newSyncState);

      return { success: true, count: result.blocks.length };
    } catch (e: any) {
      const errorMsg = e.message || 'Lỗi không xác định khi đồng bộ';
      const failedState: SyncConfig = {
        ...syncConfig,
        status: 'error',
        errorMessage: errorMsg,
      };
      setSyncConfig(failedState);
      await localDb.setSetting('syncConfig', failedState);
      return { success: false, count: 0, error: errorMsg };
    }
  }, [syncConfig]);

  const syncPushToSheet = useCallback(async () => {
    if (!syncConfig.webhookUrl) {
      return {
        success: false,
        message: 'Cần cung cấp Google Apps Script Webhook URL để đẩy dữ liệu hai chiều.',
      };
    }

    setSyncConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: null }));

    const res = await pushBlocksToWebhook(syncConfig.webhookUrl, blocks, presets);

    if (res.success) {
      const successState: SyncConfig = {
        ...syncConfig,
        status: 'success',
        lastSyncTime: new Date().toISOString(),
      };
      setSyncConfig(successState);
      await localDb.setSetting('syncConfig', successState);
      return { success: true, message: res.message };
    } else {
      const errorState: SyncConfig = {
        ...syncConfig,
        status: 'error',
        errorMessage: res.message,
      };
      setSyncConfig(errorState);
      await localDb.setSetting('syncConfig', errorState);
      return { success: false, message: res.message };
    }
  }, [syncConfig, blocks, presets]);

  // --- Logs & History ---
  const logPromptAction = useCallback(
    async (
      action: 'copied' | 'tested' | 'exported',
      customText?: string,
      aiResponse?: string,
      durationMs?: number,
      attachments?: LogAttachment[]
    ): Promise<UserLog | null> => {
      const text = customText || compiledPrompt;
      if (!text) return null;

      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const estimatedTokens = Math.ceil(chars / 4);

      const activePreset = presets.find((p) => p.id === activePresetId);

      const newLog: UserLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        promptText: text,
        charCount: chars,
        wordCount: words,
        estimatedTokens,
        action,
        blockCount: canvasItems.filter((i) => i.isEnabled).length,
        presetName: activePreset?.name,
        aiResponse,
        durationMs,
        attachments: attachments || [],
      };

      await localDb.addLog(newLog);
      setLogs((prev) => [newLog, ...prev]);
      return newLog;
    },
    [compiledPrompt, presets, activePresetId, canvasItems]
  );

  const clearHistory = useCallback(async () => {
    await localDb.clearLogs();
    setLogs([]);
  }, []);

  const deleteLog = useCallback(async (id: string) => {
    await localDb.deleteLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteLogs = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    await localDb.bulkDeleteLogs(ids);
    setLogs((prev) => prev.filter((l) => !ids.includes(l.id)));
  }, []);

  const updateLogAiOutput = useCallback(async (logId: string, aiResponse: string | undefined) => {
    setLogs((prev) => {
      const target = prev.find((l) => l.id === logId);
      if (!target) return prev;
      const updated: UserLog = { ...target, aiResponse };
      localDb.updateLog(updated);
      return prev.map((l) => (l.id === logId ? updated : l));
    });
  }, []);

  const addLogAttachment = useCallback(async (logId: string, attachment: LogAttachment) => {
    setLogs((prev) => {
      const target = prev.find((l) => l.id === logId);
      if (!target) return prev;
      const currentAttachments = target.attachments || [];
      const updated: UserLog = { ...target, attachments: [...currentAttachments, attachment] };
      localDb.updateLog(updated);
      return prev.map((l) => (l.id === logId ? updated : l));
    });
  }, []);

  const removeLogAttachment = useCallback(async (logId: string, attachmentId: string) => {
    setLogs((prev) => {
      const target = prev.find((l) => l.id === logId);
      if (!target) return prev;
      const updatedAttachments = (target.attachments || []).filter((a) => a.id !== attachmentId);
      const updated: UserLog = { ...target, attachments: updatedAttachments };
      localDb.updateLog(updated);
      return prev.map((l) => (l.id === logId ? updated : l));
    });
  }, []);

  const setVariableSingleOption = useCallback((varName: string, option: string) => {
    setVariables((prev) => ({
      ...prev,
      [varName]: option,
    }));
  }, []);

  const toggleVariableOption = useCallback((varName: string, option: string) => {
    setVariables((prev) => {
      const current = prev[varName] || '';
      const parts = current
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      let newParts: string[];
      if (parts.includes(option)) {
        newParts = parts.filter((p) => p !== option);
      } else {
        newParts = [...parts, option];
      }

      return {
        ...prev,
        [varName]: newParts.join(', '),
      };
    });
  }, []);

  // --- Database Backup & Restore ---
  const exportJsonBackup = useCallback(async () => {
    return localDb.exportJsonDump();
  }, []);

  const exportSqlDump = useCallback(async () => {
    return localDb.exportSqlDump();
  }, []);

  const importBackupData = useCallback(async (json: string) => {
    const result = await localDb.importData(json);
    const updatedBlocks = await localDb.getAllBlocks();
    const updatedPresets = await localDb.getAllPresets();
    const updatedLogs = await localDb.getAllLogs();

    setBlocks(updatedBlocks);
    setPresets(updatedPresets);
    setLogs(updatedLogs);

    return result;
  }, []);

  const importResolvedBatch = useCallback(
    async (blocksToSave: PromptBlock[], presetsToSave: PromptPreset[]) => {
      if (blocksToSave.length > 0) {
        await localDb.bulkInsertBlocks(blocksToSave);
      }
      if (presetsToSave.length > 0) {
        await localDb.bulkInsertPresets(presetsToSave);
      }

      const updatedBlocks = await localDb.getAllBlocks();
      const updatedPresets = await localDb.getAllPresets();

      setBlocks(updatedBlocks);
      setPresets(updatedPresets);

      return {
        blocksCount: blocksToSave.length,
        presetsCount: presetsToSave.length,
      };
    },
    []
  );

  const switchLibraryLanguage = useCallback(
    async (targetLang: 'vi' | 'en') => {
      const { updatedBlocks, updatedPresets } = await localDb.switchDefaultLanguage(targetLang);
      setBlocks(updatedBlocks);
      setPresets(updatedPresets);

      // Translate active canvas items that belong to default blocks
      const blockMap = new Map(updatedBlocks.map((b) => [b.id, b]));
      setCanvasItems((prev) =>
        prev.map((item) => {
          if (item.blockId && blockMap.has(item.blockId)) {
            const def = blockMap.get(item.blockId)!;
            return {
              ...item,
              title: def.title,
              category: def.category,
              content: def.content,
            };
          }
          return item;
        })
      );
    },
    []
  );

  const resetDatabaseToDefaults = useCallback(async (lang: 'vi' | 'en' = 'vi') => {
    await localDb.resetToDefaults(lang);
    const defBlocks = getDefaultBlocks(lang);
    const defPresets = getDefaultPresets(lang);
    setBlocks(defBlocks);
    setPresets(defPresets);
    if (defPresets.length > 0) {
      setCanvasItems(defPresets[0].canvasItems);
      setVariables(defPresets[0].variableValues);
      setActivePresetId(defPresets[0].id);
    }
  }, []);

  const refreshLibraryFromDb = useCallback(async () => {
    const loadedBlocks = await localDb.getAllBlocks();
    const loadedPresets = await localDb.getAllPresets();
    setBlocks(loadedBlocks);
    setPresets(loadedPresets);
  }, []);

  // --- AI Testing & Multi-Model Execution ---
  const testPromptWithAI = useCallback(
    async (promptText?: string, overrideConfig?: Partial<CustomAIConfig>) => {
      const targetPrompt = promptText || compiledPrompt;
      if (!targetPrompt) {
        return { success: false, error: 'Chưa có prompt để chạy thử nghiệm' };
      }

      setIsTestingAi(true);
      try {
        const activeConfig = { ...aiConfig, ...overrideConfig };
        const response = await fetch('/api/ai/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: targetPrompt,
            provider: activeConfig.provider,
            apiKey: activeConfig.apiKey,
            endpointUrl: activeConfig.endpointUrl,
            model: activeConfig.model,
            temperature: activeConfig.temperature,
            maxTokens: activeConfig.maxTokens,
            systemInstruction: activeConfig.systemInstruction,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'AI API call failed');
        }

        const resultObj = {
          prompt: targetPrompt,
          output: data.output,
          durationMs: data.durationMs || 0,
          timestamp: new Date().toISOString(),
          model: data.model || activeConfig.model,
          provider: data.provider || activeConfig.provider,
        };

        setAiTestResult(resultObj);

        // Record log
        await logPromptAction('tested', targetPrompt, data.output, data.durationMs);

        return {
          success: true,
          output: data.output,
          durationMs: data.durationMs,
          model: data.model,
          provider: data.provider,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Lỗi khi gọi thử nghiệm với AI model',
        };
      } finally {
        setIsTestingAi(false);
      }
    },
    [compiledPrompt, aiConfig, logPromptAction]
  );

  const testPromptWithGemini = useCallback(
    async (promptText?: string) => {
      return testPromptWithAI(promptText);
    },
    [testPromptWithAI]
  );

  const clearAiTestResult = useCallback(() => {
    setAiTestResult(null);
  }, []);

  return (
    <PromptMixerContext.Provider
      value={{
        blocks,
        canvasItems,
        presets,
        logs,
        activePresetId,
        variables,
        detectedVariables,
        canvasVariableDefs,
        compiledPrompt,
        promptFormat,
        setPromptFormat,
        setVariableValue,
        resetVariables,
        addBlockToCanvas,
        removeCanvasItem,
        toggleCanvasItem,
        moveCanvasItemUp,
        moveCanvasItemDown,
        updateCanvasItemContent,
        updateCanvasItemPrefixSuffix,
        duplicateCanvasItem,
        clearCanvas,
        saveCurrentAsPreset,
        loadPreset,
        deletePreset,
        createCustomBlock,
        updateLibraryBlock,
        deleteLibraryBlock,
        isDarkMode,
        toggleDarkMode,
        syncConfig,
        updateSyncConfig,
        syncPullFromSheet,
        syncPushToSheet,
        logPromptAction,
        deleteLog,
        deleteLogs,
        updateLogAiOutput,
        addLogAttachment,
        removeLogAttachment,
        clearHistory,
        toggleVariableOption,
        setVariableSingleOption,
        exportJsonBackup,
        exportSqlDump,
        importBackupData,
        importResolvedBatch,
        resetDatabaseToDefaults,
        switchLibraryLanguage,
        refreshLibraryFromDb,
        isTestingAi,
        aiConfig,
        updateAiConfig,
        testPromptWithAI,
        testPromptWithGemini,
        aiTestResult,
        clearAiTestResult,
      }}
    >
      {children}
    </PromptMixerContext.Provider>
  );
};

export const usePromptMixer = () => {
  const context = useContext(PromptMixerContext);
  if (!context) {
    throw new Error('usePromptMixer must be used within a PromptMixerProvider');
  }
  return context;
};
