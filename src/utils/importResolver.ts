import { PromptBlock, PromptPreset } from '../types';
import { SharedPayload } from './shareUtils';

export type ConflictResolution = 'overwrite' | 'clone' | 'skip';

export interface BlockImportItem {
  id: string;
  original: PromptBlock;
  incoming: PromptBlock;
  status: 'new' | 'exact_duplicate' | 'id_conflict' | 'title_conflict';
  existingMatch?: PromptBlock;
  resolution: ConflictResolution;
  selected: boolean;
}

export interface PresetImportItem {
  id: string;
  original: PromptPreset;
  incoming: PromptPreset;
  status: 'new' | 'exact_duplicate' | 'id_conflict' | 'name_conflict';
  existingMatch?: PromptPreset;
  resolution: ConflictResolution;
  selected: boolean;
}

export interface ImportAnalysis {
  payload: SharedPayload;
  blockItems: BlockImportItem[];
  presetItems: PresetImportItem[];
  totalIncoming: number;
  newCount: number;
  conflictCount: number;
}

/**
 * Phân tích dữ liệu nhập vào và so khớp với thư viện hiện có để phát hiện xung đột
 */
export function analyzeImportPayload(
  payload: SharedPayload,
  existingBlocks: PromptBlock[],
  existingPresets: PromptPreset[]
): ImportAnalysis {
  const existingBlockIdMap = new Map(existingBlocks.map((b) => [b.id, b]));
  const existingBlockTitleMap = new Map(existingBlocks.map((b) => [b.title.trim().toLowerCase(), b]));

  const existingPresetIdMap = new Map(existingPresets.map((p) => [p.id, p]));
  const existingPresetNameMap = new Map(existingPresets.map((p) => [p.name.trim().toLowerCase(), p]));

  const blockItems: BlockImportItem[] = [];
  const presetItems: PresetImportItem[] = [];

  // Trích xuất danh sách blocks và presets từ payload
  let incomingBlocks: PromptBlock[] = [];
  let incomingPresets: PromptPreset[] = [];

  if (payload.type === 'block' && 'block' in payload.data) {
    incomingBlocks = [payload.data.block];
  } else if (payload.type === 'preset' && 'preset' in payload.data) {
    incomingPresets = [payload.data.preset];
  } else if (payload.type === 'bundle' && 'blocks' in payload.data) {
    incomingBlocks = payload.data.blocks || [];
    incomingPresets = payload.data.presets || [];
  }

  // Phân tích từng Block
  for (const block of incomingBlocks) {
    const idMatch = existingBlockIdMap.get(block.id);
    const titleMatch = existingBlockTitleMap.get(block.title.trim().toLowerCase());
    const existingMatch = idMatch || titleMatch;

    let status: BlockImportItem['status'] = 'new';
    let defaultResolution: ConflictResolution = 'clone';

    if (idMatch && idMatch.content === block.content && idMatch.title === block.title) {
      status = 'exact_duplicate';
      defaultResolution = 'skip';
    } else if (idMatch) {
      status = 'id_conflict';
      defaultResolution = 'clone';
    } else if (titleMatch) {
      status = 'title_conflict';
      defaultResolution = 'clone';
    } else {
      status = 'new';
      defaultResolution = 'overwrite'; // Mới hoàn toàn thì ghi vào bình thường
    }

    blockItems.push({
      id: block.id,
      original: block,
      incoming: { ...block },
      status,
      existingMatch,
      resolution: defaultResolution,
      selected: defaultResolution !== 'skip',
    });
  }

  // Phân tích từng Preset
  for (const preset of incomingPresets) {
    const idMatch = existingPresetIdMap.get(preset.id);
    const nameMatch = existingPresetNameMap.get(preset.name.trim().toLowerCase());
    const existingMatch = idMatch || nameMatch;

    let status: PresetImportItem['status'] = 'new';
    let defaultResolution: ConflictResolution = 'clone';

    if (idMatch && idMatch.name === preset.name && idMatch.canvasItems.length === preset.canvasItems.length) {
      status = 'exact_duplicate';
      defaultResolution = 'skip';
    } else if (idMatch) {
      status = 'id_conflict';
      defaultResolution = 'clone';
    } else if (nameMatch) {
      status = 'name_conflict';
      defaultResolution = 'clone';
    } else {
      status = 'new';
      defaultResolution = 'overwrite';
    }

    presetItems.push({
      id: preset.id,
      original: preset,
      incoming: { ...preset },
      status,
      existingMatch,
      resolution: defaultResolution,
      selected: defaultResolution !== 'skip',
    });
  }

  const conflictCount =
    blockItems.filter((b) => b.status !== 'new').length +
    presetItems.filter((p) => p.status !== 'new').length;

  const newCount =
    blockItems.filter((b) => b.status === 'new').length +
    presetItems.filter((p) => p.status === 'new').length;

  return {
    payload,
    blockItems,
    presetItems,
    totalIncoming: blockItems.length + presetItems.length,
    newCount,
    conflictCount,
  };
}

/**
 * Xử lý dữ liệu cuối cùng theo phương án giải quyết xung đột của người dùng
 */
export function resolveImportExecution(
  blockItems: BlockImportItem[],
  presetItems: PresetImportItem[]
): {
  finalBlocks: PromptBlock[];
  finalPresets: PromptPreset[];
  summary: {
    overwrittenBlocks: number;
    clonedBlocks: number;
    newBlocks: number;
    skippedBlocks: number;
    overwrittenPresets: number;
    clonedPresets: number;
    newPresets: number;
    skippedPresets: number;
  };
} {
  const finalBlocks: PromptBlock[] = [];
  const finalPresets: PromptPreset[] = [];

  const summary = {
    overwrittenBlocks: 0,
    clonedBlocks: 0,
    newBlocks: 0,
    skippedBlocks: 0,
    overwrittenPresets: 0,
    clonedPresets: 0,
    newPresets: 0,
    skippedPresets: 0,
  };

  // 1. Blocks
  for (const item of blockItems) {
    if (!item.selected || item.resolution === 'skip') {
      summary.skippedBlocks++;
      continue;
    }

    if (item.status === 'new') {
      summary.newBlocks++;
      finalBlocks.push({
        ...item.incoming,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    if (item.resolution === 'overwrite') {
      summary.overwrittenBlocks++;
      finalBlocks.push({
        ...item.incoming,
        // Giữ ID của mục hiện có nếu trùng tên nhưng khác ID
        id: item.existingMatch?.id || item.incoming.id,
        updatedAt: new Date().toISOString(),
      });
    } else if (item.resolution === 'clone') {
      summary.clonedBlocks++;
      const rand = Math.random().toString(36).substring(2, 6);
      finalBlocks.push({
        ...item.incoming,
        id: `block-imported-${Date.now()}-${rand}`,
        title: `${item.incoming.title} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true,
      });
    }
  }

  // 2. Presets
  for (const item of presetItems) {
    if (!item.selected || item.resolution === 'skip') {
      summary.skippedPresets++;
      continue;
    }

    if (item.status === 'new') {
      summary.newPresets++;
      finalPresets.push({
        ...item.incoming,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    if (item.resolution === 'overwrite') {
      summary.overwrittenPresets++;
      finalPresets.push({
        ...item.incoming,
        id: item.existingMatch?.id || item.incoming.id,
        updatedAt: new Date().toISOString(),
      });
    } else if (item.resolution === 'clone') {
      summary.clonedPresets++;
      const rand = Math.random().toString(36).substring(2, 6);
      finalPresets.push({
        ...item.incoming,
        id: `preset-imported-${Date.now()}-${rand}`,
        name: `${item.incoming.name} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    finalBlocks,
    finalPresets,
    summary,
  };
}
