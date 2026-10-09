import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
  BookmarkPlus,
  PlusCircle,
  Wand2,
  Edit2,
  Check,
  Save,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  ListFilter,
  Type,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { CanvasBlock } from '../types';
import { CATEGORY_MAP } from '../utils/categoryMeta';
import { getVariableDefaultOptions } from '../utils/variableOptions';
import { extractVariablesFromText } from '../utils/variableParser';

interface PromptCanvasProps {
  onOpenSavePreset: () => void;
  onOpenNewBlock: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const PromptCanvas: React.FC<PromptCanvasProps> = ({
  onOpenSavePreset,
  onOpenNewBlock,
  onShowToast,
}) => {
  const {
    canvasItems,
    blocks,
    removeCanvasItem,
    toggleCanvasItem,
    moveCanvasItemUp,
    moveCanvasItemDown,
    updateCanvasItemContent,
    updateLibraryBlock,
    duplicateCanvasItem,
    clearCanvas,
    detectedVariables,
    canvasVariableDefs,
    variables,
    setVariableValue,
    toggleVariableOption,
    resetVariables,
  } = usePromptMixer();

  const [expandedEditId, setExpandedEditId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  // Per-variable selection mode ('text' | 'single' | 'multi')
  const [variableModes, setVariableModes] = useState<Record<string, 'text' | 'single' | 'multi'>>({});
  // Per-variable custom options added dynamically by user
  const [customOptionsMap, setCustomOptionsMap] = useState<Record<string, string[]>>({});
  const [addingOptionForVar, setAddingOptionForVar] = useState<string | null>(null);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  // Open dropdown state
  const [openDropdownVar, setOpenDropdownVar] = useState<string | null>(null);
  // Manual text input toggle state
  const [manualInputVars, setManualInputVars] = useState<Record<string, boolean>>({});

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenDropdownVar(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeCount = canvasItems.filter((i) => i.isEnabled).length;

  const handleStartEdit = (item: CanvasBlock) => {
    if (expandedEditId === item.instanceId) {
      setExpandedEditId(null);
    } else {
      setExpandedEditId(item.instanceId);
      setEditingContent(item.content);
    }
  };

  const handleSaveEdit = (instanceId: string) => {
    updateCanvasItemContent(instanceId, editingContent);
    setExpandedEditId(null);
    onShowToast('success', 'Đã lưu chỉnh sửa block trên canvas');
  };

  const handleSaveToLibrary = async (item: CanvasBlock) => {
    updateCanvasItemContent(item.instanceId, editingContent);
    const originalBlock = blocks.find((b) => b.id === item.blockId);
    if (originalBlock) {
      const parsed = extractVariablesFromText(editingContent);
      const extractedVars = Array.from(new Set(parsed.map((p) => p.name)));

      await updateLibraryBlock({
        ...originalBlock,
        content: editingContent,
        variables: extractedVars,
      });
      onShowToast('success', 'Đã cập nhật vào thư viện gốc!', `"${originalBlock.title}" đã được lưu.`);
    } else {
      onShowToast('info', 'Đã lưu trên canvas');
    }
    setExpandedEditId(null);
  };

  const handleAutofillSamples = () => {
    detectedVariables.forEach((v) => {
      const defaultInfo = getVariableDefaultOptions(v);
      if (defaultInfo && defaultInfo.options.length > 0) {
        if (defaultInfo.mode === 'multi') {
          setVariableValue(v, defaultInfo.options.slice(0, 2).join(', '));
        } else {
          setVariableValue(v, defaultInfo.options[0]);
        }
      } else {
        let sampleVal = 'Giá trị mẫu';
        const lower = v.toLowerCase();
        if (lower.includes('tech') || lower.includes('stack')) sampleVal = 'React 19, TypeScript';
        else if (lower.includes('niche')) sampleVal = 'SaaS AI & Tự động hoá';
        else if (lower.includes('domain')) sampleVal = 'E-commerce & Tài chính số';
        else if (lower.includes('audience')) sampleVal = 'Nhà sáng lập & Kỹ sư AI';
        else if (lower.includes('product')) sampleVal = 'AI Prompt Mixer Studio';
        else if (lower.includes('goal')) sampleVal = 'Tối ưu tỷ lệ chuyển đổi & tăng năng suất';
        else if (lower.includes('limit') || lower.includes('count')) sampleVal = '3';
        else if (lower.includes('name')) sampleVal = 'PromptCraft Pro';

        setVariableValue(v, sampleVal);
      }
    });
    onShowToast('info', 'Đã điền giá trị mẫu cho các biến');
  };

  const getEffectiveMode = (varName: string): 'text' | 'single' | 'multi' => {
    if (variableModes[varName]) return variableModes[varName];
    if (canvasVariableDefs?.[varName]?.mode) {
      return canvasVariableDefs[varName].mode;
    }
    const defaultInfo = getVariableDefaultOptions(varName);
    return defaultInfo?.mode || 'single';
  };

  const getVariableOptionsList = (varName: string): string[] => {
    const fromTemplate = canvasVariableDefs?.[varName]?.options || [];
    const defaultInfo = getVariableDefaultOptions(varName);
    const presets = defaultInfo ? defaultInfo.options : [];
    const customs = customOptionsMap[varName] || [];
    if (fromTemplate.length > 0) {
      return Array.from(new Set([...fromTemplate, ...customs]));
    }
    return Array.from(new Set([...presets, ...customs]));
  };

  const handleAddCustomOption = (varName: string) => {
    if (!newOptionInput.trim()) return;
    const trimmed = newOptionInput.trim();
    setCustomOptionsMap((prev) => ({
      ...prev,
      [varName]: [...(prev[varName] || []), trimmed],
    }));
    setNewOptionInput('');
    setAddingOptionForVar(null);
    onShowToast('success', 'Đã thêm tùy chọn', `"${trimmed}"`);
  };

  const handleRemoveCustomOption = (varName: string, optToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomOptionsMap((prev) => ({
      ...prev,
      [varName]: (prev[varName] || []).filter((o) => o !== optToRemove),
    }));
  };

  const handleSelectOption = (varName: string, option: string) => {
    const mode = getEffectiveMode(varName);
    if (mode === 'single') {
      setVariableValue(varName, option);
    } else {
      toggleVariableOption(varName, option);
    }
  };

  const isOptionSelected = (varName: string, option: string): boolean => {
    const val = variables[varName] || '';
    const parts = val.split(',').map((p) => p.trim());
    return parts.includes(option);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Canvas Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Mixer Workspace
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
            {activeCount}/{canvasItems.length} blocks đang kích hoạt
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canvasItems.length > 0 && (
            <>
              <button
                onClick={onOpenSavePreset}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors shadow-xs"
                title="Lưu các block này thành preset tái sử dụng"
              >
                <BookmarkPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Lưu Preset</span>
              </button>

              <button
                onClick={clearCanvas}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Xóa trắng</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Variables Bar with Dropdown Selectors */}
      {detectedVariables.length > 0 && (
        <div className="p-3.5 border-b border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/25 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Biến số động ({detectedVariables.length} biến)
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 hidden md:inline">
                • Dropdown lựa chọn gọn gàng, tiết kiệm diện tích màn hình
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleAutofillSamples}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Điền mẫu
              </button>
              <button
                onClick={resetVariables}
                className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70 hover:underline"
              >
                Xóa rỗng
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {detectedVariables.map((v) => {
              const currentMode = getEffectiveMode(v);
              const options = getVariableOptionsList(v);
              const currentVal = variables[v] || '';
              const isOpen = openDropdownVar === v;
              const isManual = manualInputVars[v];
              const selectedList = currentVal
                ? currentVal.split(',').map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={v}
                  className="p-2.5 rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5 transition-shadow hover:shadow-xs"
                >
                  {/* Top Bar: Variable Tag & Mode Toggle */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 truncate"
                      title={`{{${v}}}`}
                    >
                      {`{{${v}}}`}
                    </span>

                    {/* Mode segmented control */}
                    <div className="flex items-center p-0.5 rounded-md bg-amber-100/60 dark:bg-slate-800 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setVariableModes((prev) => ({ ...prev, [v]: 'text' }));
                          setManualInputVars((prev) => ({ ...prev, [v]: true }));
                        }}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          currentMode === 'text'
                            ? 'bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-200 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Tự do gõ văn bản"
                      >
                        Tự điền
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVariableModes((prev) => ({ ...prev, [v]: 'single' }));
                          setManualInputVars((prev) => ({ ...prev, [v]: false }));
                        }}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          currentMode === 'single'
                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Dropdown chọn 1 mục"
                      >
                        Chọn 1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVariableModes((prev) => ({ ...prev, [v]: 'multi' }));
                          setManualInputVars((prev) => ({ ...prev, [v]: false }));
                        }}
                        className={`px-1.5 py-0.5 rounded transition-all ${
                          currentMode === 'multi'
                            ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Dropdown chọn nhiều mục"
                      >
                        Chọn nhiều
                      </button>
                    </div>
                  </div>

                  {/* Dropdown or Text Input Area */}
                  <div className="relative" data-dropdown-container>
                    {isManual || currentMode === 'text' ? (
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => setVariableValue(v, e.target.value)}
                          placeholder={`Nhập giá trị cho ${v}...`}
                          className="w-full pl-2.5 pr-12 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-amber-500/50"
                        />
                        <div className="absolute right-1 flex items-center gap-0.5">
                          {currentVal && (
                            <button
                              type="button"
                              onClick={() => setVariableValue(v, '')}
                              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                              title="Xóa giá trị"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          {options.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualInputVars((prev) => ({ ...prev, [v]: false }));
                                setOpenDropdownVar(v);
                              }}
                              className="p-0.5 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 rounded"
                              title="Mở danh sách dropdown gợi ý"
                            >
                              <ListFilter className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : currentMode === 'single' ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownVar(isOpen ? null : v)}
                            className="flex-1 flex items-center justify-between px-2.5 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <span
                              className={`truncate font-medium ${
                                currentVal ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
                              }`}
                            >
                              {currentVal || `Chọn ${v} (${options.length})...`}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                                isOpen ? 'rotate-180 text-amber-600' : ''
                              }`}
                            />
                          </button>
                          {currentVal && (
                            <button
                              type="button"
                              onClick={() => setVariableValue(v, '')}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Xóa lựa chọn"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setManualInputVars((prev) => ({ ...prev, [v]: true }))}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                            title="Chuyển sang gõ văn bản tự do"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Floating Single-Select Dropdown Menu */}
                        {isOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-56 flex flex-col">
                            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                              <span>Chọn 1 mục ({options.length} tùy chọn)</span>
                              {currentVal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVariableValue(v, '');
                                    setOpenDropdownVar(null);
                                  }}
                                  className="text-amber-700 dark:text-amber-400 hover:underline"
                                >
                                  Bỏ chọn
                                </button>
                              )}
                            </div>

                            <div className="overflow-y-auto p-1 space-y-0.5">
                              {options.length === 0 ? (
                                <div className="p-2 text-center text-xs text-slate-400 italic">
                                  Chưa có tùy chọn nào
                                </div>
                              ) : (
                                options.map((opt) => {
                                  const isSelected = currentVal === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        setVariableValue(v, opt);
                                        setOpenDropdownVar(null);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                                        isSelected
                                          ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="truncate">{opt}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Add Custom Option Inline */}
                            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-1">
                              <input
                                type="text"
                                value={addingOptionForVar === v ? newOptionInput : ''}
                                onChange={(e) => {
                                  setAddingOptionForVar(v);
                                  setNewOptionInput(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomOption(v);
                                  }
                                }}
                                placeholder="+ Tùy chọn mới..."
                                className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingOptionForVar(v);
                                  handleAddCustomOption(v);
                                }}
                                className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white font-medium"
                              >
                                Thêm
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Multi-Select Dropdown */
                      <div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownVar(isOpen ? null : v)}
                            className="flex-1 flex items-center justify-between px-2.5 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              {selectedList.length > 0 ? (
                                <>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">
                                    {selectedList.length}
                                  </span>
                                  <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                                    {selectedList.join(', ')}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400">
                                  Chọn nhiều ({options.length})...
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                                isOpen ? 'rotate-180 text-amber-600' : ''
                              }`}
                            />
                          </button>
                          {currentVal && (
                            <button
                              type="button"
                              onClick={() => setVariableValue(v, '')}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Xóa lựa chọn"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setManualInputVars((prev) => ({ ...prev, [v]: true }))}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                            title="Chuyển sang gõ văn bản tự do"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Floating Multi-Select Dropdown Menu */}
                        {isOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 flex flex-col">
                            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                              <span>
                                Đã chọn {selectedList.length}/{options.length} mục
                              </span>
                              <div className="flex items-center gap-2 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setVariableValue(v, options.join(', '))}
                                  className="text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                                >
                                  Chọn hết
                                </button>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => setVariableValue(v, '')}
                                  className="text-slate-500 hover:underline"
                                >
                                  Bỏ chọn
                                </button>
                              </div>
                            </div>

                            <div className="overflow-y-auto p-1 space-y-0.5">
                              {options.length === 0 ? (
                                <div className="p-2 text-center text-xs text-slate-400 italic">
                                  Chưa có tùy chọn nào
                                </div>
                              ) : (
                                options.map((opt) => {
                                  const isSelected = selectedList.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => toggleVariableOption(v, opt)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                                        isSelected
                                          ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 font-medium'
                                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span
                                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] border ${
                                            isSelected
                                              ? 'bg-amber-600 border-amber-600 text-white'
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                        >
                                          {isSelected && <Check className="w-2.5 h-2.5" />}
                                        </span>
                                        <span className="truncate">{opt}</span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Add Custom Option Inline */}
                            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-1">
                              <input
                                type="text"
                                value={addingOptionForVar === v ? newOptionInput : ''}
                                onChange={(e) => {
                                  setAddingOptionForVar(v);
                                  setNewOptionInput(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomOption(v);
                                  }
                                }}
                                placeholder="+ Tùy chọn mới..."
                                className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingOptionForVar(v);
                                  handleAddCustomOption(v);
                                }}
                                className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white font-medium"
                              >
                                Thêm
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Canvas Blocks Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {canvasItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
              <Wand2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Mixer Canvas đang trống
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mt-1 mb-5 leading-relaxed">
              Chọn các khối prompt từ thanh bên trái (Persona, Bối cảnh, Nhiệm vụ, Ràng buộc, Định dạng đầu ra) để ghép thành một siêu prompt hoàn chỉnh.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenNewBlock}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Tạo Block tùy chỉnh
              </button>
            </div>
          </div>
        ) : (
          canvasItems.map((item, index) => {
            const meta = CATEGORY_MAP[item.category] || CATEGORY_MAP.custom;
            const isEditing = expandedEditId === item.instanceId;

            return (
              <div
                key={item.instanceId}
                className={`relative rounded-xl border transition-all duration-200 ${
                  item.isEnabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                }`}
              >
                {/* Block Card Header */}
                <div className="p-3.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Step Number Badge */}
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Category Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeColor} shrink-0`}
                    >
                      {meta.label}
                    </span>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h4>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up / Down */}
                    <button
                      onClick={() => moveCanvasItemUp(item.instanceId)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveCanvasItemDown(item.instanceId)}
                      disabled={index === canvasItems.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Enable / Disable toggle */}
                    <button
                      onClick={() => toggleCanvasItem(item.instanceId)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isEnabled
                          ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={item.isEnabled ? 'Tắt block khỏi prompt' : 'Kích hoạt lại block'}
                    >
                      {item.isEnabled ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit Content Toggle */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isEditing
                          ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Chỉnh sửa nội dung block này"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => duplicateCanvasItem(item.instanceId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Nhân bản block này"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete from Canvas */}
                    <button
                      onClick={() => removeCanvasItem(item.instanceId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Gỡ khỏi Canvas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Block Content Display or Inline Editor */}
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={5}
                        className="w-full p-3 text-sm font-mono rounded-xl border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 leading-relaxed"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {editingContent.length} ký tự
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedEditId(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.instanceId)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Lưu trên Canvas</span>
                          </button>
                          <button
                            onClick={() => handleSaveToLibrary(item)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Lưu cả vào thư viện gốc để dùng lần sau"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu vào Thư viện gốc</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
