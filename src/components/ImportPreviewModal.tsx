import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
  Link,
  FileCode,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PromptBlock, PromptPreset } from '../types';
import { usePromptMixer } from '../context/PromptMixerContext';
import {
  SharedPayload,
  decompressPayload,
  clearShareParamFromUrl,
} from '../utils/shareUtils';
import {
  analyzeImportPayload,
  resolveImportExecution,
  ConflictResolution,
  BlockImportItem,
  PresetImportItem,
} from '../utils/importResolver';
import { extractVariablesFromText } from '../utils/variableParser';
import { useLanguage } from '../i18n/LanguageContext';

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingPayload?: SharedPayload | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  incomingPayload = null,
  onShowToast,
}) => {
  const {
    blocks: existingBlocks,
    presets: existingPresets,
    importResolvedBatch,
    addBlockToCanvas,
    loadPreset,
  } = usePromptMixer();

  const { t, isVietnamese } = useLanguage();

  // Mode: 'input' (dán link/mã/file) hoặc 'preview' (xem trước & giải quyết xung đột)
  const [stage, setStage] = useState<'input' | 'preview'>('input');
  const [activePayload, setActivePayload] = useState<SharedPayload | null>(null);

  // Input tab states
  const [inputTab, setInputTab] = useState<'url' | 'json' | 'file'>('url');
  const [urlOrCodeInput, setUrlOrCodeInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Preview & Conflict resolution states
  const [blockItems, setBlockItems] = useState<BlockImportItem[]>([]);
  const [presetItems, setPresetItems] = useState<PresetImportItem[]>([]);
  const [globalResolution, setGlobalResolution] = useState<ConflictResolution>('clone');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [applyImmediately, setApplyImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khi có incomingPayload từ URL (hoặc props), tự động chuyển sang stage preview
  useEffect(() => {
    if (incomingPayload) {
      setActivePayload(incomingPayload);
      setStage('preview');
    } else if (isOpen && !activePayload) {
      setStage('input');
    }
  }, [incomingPayload, isOpen]);

  // Phân tích payload khi activePayload thay đổi
  useEffect(() => {
    if (activePayload && isOpen) {
      const analysis = analyzeImportPayload(activePayload, existingBlocks, existingPresets);
      setBlockItems(analysis.blockItems);
      setPresetItems(analysis.presetItems);
    }
  }, [activePayload, existingBlocks, existingPresets, isOpen]);

  // Áp dụng resolution hàng loạt cho các mục bị xung đột
  const handleApplyGlobalResolution = (resolution: ConflictResolution) => {
    setGlobalResolution(resolution);
    setBlockItems((prev) =>
      prev.map((item) =>
        item.status === 'new'
          ? item
          : { ...item, resolution, selected: resolution !== 'skip' }
      )
    );
    setPresetItems((prev) =>
      prev.map((item) =>
        item.status === 'new'
          ? item
          : { ...item, resolution, selected: resolution !== 'skip' }
      )
    );
  };

  const handleToggleSelectAll = (select: boolean) => {
    setBlockItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: select,
        // Nếu chọn tất cả mà đang ở 'skip', chuyển sang 'clone' để được nhập
        resolution: select && item.resolution === 'skip' ? 'clone' : item.resolution,
      }))
    );
    setPresetItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: select,
        resolution: select && item.resolution === 'skip' ? 'clone' : item.resolution,
      }))
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Phân tích dữ liệu từ input manual
  const handleParseInput = () => {
    setIsParsing(true);
    let candidate = '';
    if (inputTab === 'url') {
      candidate = urlOrCodeInput.trim();
      // Nếu là URL đầy đủ chứa #share= hoặc ?share=
      if (candidate.includes('share=')) {
        candidate = candidate.split('share=')[1]?.split('&')[0] || candidate;
      }
    } else if (inputTab === 'json') {
      candidate = jsonInput.trim();
    }

    if (!candidate) {
      onShowToast('error', 'Vui lòng dán liên kết hoặc mã dữ liệu');
      setIsParsing(false);
      return;
    }

    const parsed = decompressPayload(candidate);
    setIsParsing(false);

    if (parsed) {
      setActivePayload(parsed);
      setStage('preview');
      onShowToast('success', 'Nhận diện dữ liệu thành công!');
    } else {
      onShowToast(
        'error',
        'Không thể đọc dữ liệu',
        'Chuỗi mã hoặc liên kết không đúng định dạng nén hoặc JSON hợp lệ.'
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = decompressPayload(text);
      if (parsed) {
        setActivePayload(parsed);
        setStage('preview');
        onShowToast('success', 'Đã đọc tệp dữ liệu!');
      } else {
        onShowToast('error', 'Tệp tin không đúng định dạng chia sẻ của Prompt Mixer');
      }
    } catch {
      onShowToast('error', 'Lỗi khi đọc tệp tin');
    } finally {
      e.target.value = '';
    }
  };

  // Tổng số mục có xung đột phát hiện trong payload
  const totalConflictCount = useMemo(() => {
    return (
      blockItems.filter((b) => b.status !== 'new').length +
      presetItems.filter((p) => p.status !== 'new').length
    );
  }, [blockItems, presetItems]);

  // Đếm chính xác số lượng block và preset được chọn thực sự để nhập
  const selectedBlocksCount = useMemo(() => {
    return blockItems.filter((b) => b.selected && b.resolution !== 'skip').length;
  }, [blockItems]);

  const selectedPresetsCount = useMemo(() => {
    return presetItems.filter((p) => p.selected && p.resolution !== 'skip').length;
  }, [presetItems]);

  const selectedCount = selectedBlocksCount + selectedPresetsCount;
  const totalIncomingCount = blockItems.length + presetItems.length;

  // Thực hiện nhập dữ liệu
  const handleExecuteImport = async () => {
    if (selectedCount === 0) {
      onShowToast('info', 'Chưa có mục nào được chọn để nhập');
      return;
    }

    setIsSubmitting(true);
    try {
      const { finalBlocks, finalPresets, summary } = resolveImportExecution(
        blockItems,
        presetItems
      );

      await importResolvedBatch(finalBlocks, finalPresets);

      // Nếu người dùng chọn áp dụng ngay
      if (applyImmediately) {
        if (finalPresets.length > 0) {
          loadPreset(finalPresets[0].id);
        } else if (finalBlocks.length === 1) {
          addBlockToCanvas(finalBlocks[0]);
        }
      }

      // Xóa tham số share trên thanh URL để tránh reload mở lại modal
      clearShareParamFromUrl();

      const messages: string[] = [];
      if (summary.newBlocks + summary.newPresets > 0) {
        messages.push(
          isVietnamese
            ? `${summary.newBlocks + summary.newPresets} mục mới`
            : `${summary.newBlocks + summary.newPresets} new items`
        );
      }
      if (summary.clonedBlocks + summary.clonedPresets > 0) {
        messages.push(
          isVietnamese
            ? `${summary.clonedBlocks + summary.clonedPresets} bản sao mới`
            : `${summary.clonedBlocks + summary.clonedPresets} new clones`
        );
      }
      if (summary.overwrittenBlocks + summary.overwrittenPresets > 0) {
        messages.push(
          isVietnamese
            ? `${summary.overwrittenBlocks + summary.overwrittenPresets} ghi đè`
            : `${summary.overwrittenBlocks + summary.overwrittenPresets} overwritten`
        );
      }

      onShowToast(
        'success',
        isVietnamese ? 'Nhập dữ liệu thành công!' : 'Data imported successfully!',
        (isVietnamese ? 'Đã lưu vào bộ nhớ: ' : 'Saved to library: ') + messages.join(', ') + '.'
      );

      handleCloseModal();
    } catch (err: any) {
      onShowToast(
        'error',
        isVietnamese ? 'Lỗi nhập dữ liệu' : 'Import failed',
        err?.message || (isVietnamese ? 'Có lỗi xảy ra' : 'An error occurred')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    clearShareParamFromUrl();
    setActivePayload(null);
    setStage('input');
    setUrlOrCodeInput('');
    setJsonInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {stage === 'preview'
                  ? (isVietnamese ? 'Xem trước & Nhập dữ liệu' : 'Preview & Import Data')
                  : (isVietnamese ? 'Nhập Dữ liệu Chia sẻ' : 'Import Shared Data')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stage === 'preview'
                  ? (isVietnamese
                      ? 'Kiểm tra nội dung, phát hiện trùng lặp và chọn phương án xử lý an toàn'
                      : 'Inspect content, detect duplicates, and choose safe resolution strategies')
                  : (isVietnamese
                      ? 'Dán liên kết chia sẻ URL, mã nén hoặc tải lên tệp JSON'
                      : 'Paste share URL, compressed string, or upload JSON files')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {stage === 'input' ? (
            /* --- STAGE 1: INPUT MODES --- */
            <div className="space-y-4">
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex text-xs">
                <button
                  onClick={() => setInputTab('url')}
                  className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    inputTab === 'url'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Link / Mã nén URL' : 'Link / Compressed LZ'}</span>
                </button>
                <button
                  onClick={() => setInputTab('json')}
                  className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    inputTab === 'json'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Dán mã JSON' : 'Paste JSON'}</span>
                </button>
                <button
                  onClick={() => setInputTab('file')}
                  className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    inputTab === 'file'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tải tệp JSON' : 'Upload File'}</span>
                </button>
              </div>

              {inputTab === 'url' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dán đường dẫn chia sẻ (hoặc chuỗi mã sau dấu #share=)
                  </label>
                  <textarea
                    rows={4}
                    value={urlOrCodeInput}
                    onChange={(e) => setUrlOrCodeInput(e.target.value)}
                    placeholder="https://...#share=... hoặc chuỗi mã nén LZ"
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <p className="text-[11px] text-slate-400">
                    Mẹo: Bạn có thể dán toàn bộ đường link trình duyệt mà người khác gửi cho bạn.
                  </p>
                </div>
              )}

              {inputTab === 'json' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dán nội dung JSON đã sao chép
                  </label>
                  <textarea
                    rows={5}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"v": 1, "type": "block", ...}'
                    className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              )}

              {inputTab === 'file' && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn tệp tin JSON từ máy tính của bạn
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Hỗ trợ tệp backup .json hoặc tệp block/preset đã xuất
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn tệp tin...</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {inputTab !== 'file' && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleParseInput}
                    disabled={isParsing}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>Kiểm tra & Xem trước</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* --- STAGE 2: PREVIEW & CONFLICT RESOLUTION --- */
            <div className="space-y-4">
              {/* Header Info Banner */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                      {activePayload?.type === 'block'
                        ? '1 Block Prompt'
                        : activePayload?.type === 'preset'
                        ? '1 Preset'
                        : `Gói Thư viện (${blockItems.length} blocks, ${presetItems.length} presets)`}
                    </span>
                    {activePayload?.meta?.title && (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {activePayload.meta.title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nguồn: {activePayload?.sourceApp || 'AI Prompt Mixer'} • Xuất lúc:{' '}
                    {activePayload?.exportedAt
                      ? new Date(activePayload.exportedAt).toLocaleString('vi-VN')
                      : 'Mới đây'}
                  </p>
                </div>

                {!incomingPayload && (
                  <button
                    onClick={() => setStage('input')}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    Chọn mục khác
                  </button>
                )}
              </div>

              {/* Conflict Notification & Bulk Policy Banner */}
              {totalConflictCount > 0 ? (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/30 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Phát hiện {totalConflictCount} mục bị trùng ID hoặc tên với thư viện hiện tại</span>
                  </div>
                  <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
                    Chọn nhanh chính sách xử lý chung cho tất cả các mục bị trùng lặp:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalResolution('clone')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        globalResolution === 'clone'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                      }`}
                    >
                      Nhân bản mới (An toàn nhất)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalResolution('overwrite')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        globalResolution === 'overwrite'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                      }`}
                    >
                      Ghi đè mục cũ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalResolution('skip')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        globalResolution === 'skip'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Bỏ qua mục trùng
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dữ liệu mới hoàn toàn, không có xung đột nào với thư viện của bạn.</span>
                </div>
              )}

              {/* Items List Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Chi tiết danh sách nhập ({blockItems.length + presetItems.length} mục)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-slate-500 hover:underline font-medium"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Blocks Section */}
              {blockItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Blocks Prompt ({blockItems.length})</span>
                  </div>

                  <div className="space-y-2">
                    {blockItems.map((item, idx) => {
                      const isExpanded = !!expandedItems[`block-${item.id}`];
                      const varCount = extractVariablesFromText(item.incoming.content).length;

                      return (
                        <div
                          key={`block-${item.id}-${idx}`}
                          className={`p-3 rounded-xl border transition-all ${
                            item.selected
                              ? item.status === 'new'
                                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                              : 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={item.selected && item.resolution !== 'skip'}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setBlockItems((prev) =>
                                  prev.map((b) => {
                                    if (b.id !== item.id) return b;
                                    return {
                                      ...b,
                                      selected: checked,
                                      resolution: checked && b.resolution === 'skip' ? 'clone' : b.resolution,
                                    };
                                  })
                                );
                              }}
                              className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {item.incoming.title}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                    {item.incoming.category}
                                  </span>
                                  {varCount > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-mono">
                                      {varCount} biến
                                    </span>
                                  )}
                                </div>

                                {/* Status & Conflict Selector */}
                                <div className="flex items-center gap-2">
                                  {item.status === 'new' ? (
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      Mục mới
                                    </span>
                                  ) : (
                                    <select
                                      value={item.selected ? item.resolution : 'skip'}
                                      onChange={(e) => {
                                        const res = e.target.value as ConflictResolution;
                                        setBlockItems((prev) =>
                                          prev.map((b) => {
                                            if (b.id !== item.id) return b;
                                            return {
                                              ...b,
                                              resolution: res,
                                              selected: res !== 'skip',
                                            };
                                          })
                                        );
                                      }}
                                      className="text-xs px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-amber-200 font-medium focus:outline-none"
                                    >
                                      <option value="clone">Nhân bản mới</option>
                                      <option value="overwrite">Ghi đè mục cũ</option>
                                      <option value="skip">Bỏ qua</option>
                                    </select>
                                  )}

                                  <button
                                    onClick={() => toggleExpand(`block-${item.id}`)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Xem nội dung block"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {item.status !== 'new' && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                  {item.status === 'exact_duplicate'
                                    ? 'Khớp hoàn toàn với 1 block đã có trong thư viện'
                                    : item.status === 'title_conflict'
                                    ? `Đã có block trùng tiêu đề: "${item.existingMatch?.title}"`
                                    : 'Trùng mã ID với block trong thư viện'}
                                </p>
                              )}

                              {isExpanded && (
                                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                                  {item.incoming.content}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Presets Section */}
              {presetItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Presets Công thức ({presetItems.length})</span>
                  </div>

                  <div className="space-y-2">
                    {presetItems.map((item, idx) => {
                      const isExpanded = !!expandedItems[`preset-${item.id}`];

                      return (
                        <div
                          key={`preset-${item.id}-${idx}`}
                          className={`p-3 rounded-xl border transition-all ${
                            item.selected
                              ? item.status === 'new'
                                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                              : 'opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={item.selected && item.resolution !== 'skip'}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPresetItems((prev) =>
                                  prev.map((p) => {
                                    if (p.id !== item.id) return p;
                                    return {
                                      ...p,
                                      selected: checked,
                                      resolution: checked && p.resolution === 'skip' ? 'clone' : p.resolution,
                                    };
                                  })
                                );
                              }}
                              className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {item.incoming.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-mono">
                                    {item.incoming.canvasItems.length} blocks
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {item.status === 'new' ? (
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      Mục mới
                                    </span>
                                  ) : (
                                    <select
                                      value={item.selected ? item.resolution : 'skip'}
                                      onChange={(e) => {
                                        const res = e.target.value as ConflictResolution;
                                        setPresetItems((prev) =>
                                          prev.map((p) => {
                                            if (p.id !== item.id) return p;
                                            return {
                                              ...p,
                                              resolution: res,
                                              selected: res !== 'skip',
                                            };
                                          })
                                        );
                                      }}
                                      className="text-xs px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-amber-200 font-medium focus:outline-none"
                                    >
                                      <option value="clone">Nhân bản mới</option>
                                      <option value="overwrite">Ghi đè mục cũ</option>
                                      <option value="skip">Bỏ qua</option>
                                    </select>
                                  )}

                                  <button
                                    onClick={() => toggleExpand(`preset-${item.id}`)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Xem chuỗi block trong preset"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {item.incoming.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                  {item.incoming.description}
                                </p>
                              )}

                              {isExpanded && (
                                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                                  <div className="text-[11px] font-semibold text-slate-500">Chuỗi khối:</div>
                                  <div className="flex flex-wrap gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                                    {item.incoming.canvasItems.map((c, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                        {i + 1}. {c.title}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option to apply right away */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyImmediately}
                    onChange={(e) => setApplyImmediately(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Áp dụng ngay lên Canvas Mixer sau khi nhập thành công</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div>
            {stage === 'preview' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Đã chọn:{' '}
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">
                    {selectedCount}
                  </strong>{' '}
                  / {totalIncomingCount} mục
                </span>
                {totalIncomingCount > 1 && blockItems.length > 0 && presetItems.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    ({selectedBlocksCount} blocks, {selectedPresetsCount} presets)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Hủy
            </button>

            {stage === 'preview' && (
              <button
                onClick={handleExecuteImport}
                disabled={isSubmitting || selectedCount === 0}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận Nhập ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
