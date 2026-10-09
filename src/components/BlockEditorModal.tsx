import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  X,
  Layers,
  Sliders,
  Sparkles,
  ListFilter,
  Info,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { PromptBlock, PromptCategory } from '../types';
import { CATEGORY_MAP } from '../utils/categoryMeta';
import {
  extractVariablesFromText,
  encodeVariableTag,
  updateVariableInTemplate,
  VariableInputType,
} from '../utils/variableParser';

interface BlockEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBlock?: PromptBlock | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const BlockEditorModal: React.FC<BlockEditorModalProps> = ({
  isOpen,
  onClose,
  initialBlock,
  onShowToast,
}) => {
  const { createCustomBlock, updateLibraryBlock } = usePromptMixer();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PromptCategory>('custom');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<VariableInputType>('single');
  const [saving, setSaving] = useState(false);

  // Extract variables detected in current content
  const detectedVarDefs = useMemo(() => {
    return extractVariablesFromText(content);
  }, [content]);

  // Group unique variables by name
  const uniqueVars = useMemo(() => {
    const map = new Map<string, { mode: VariableInputType; optionsStr: string }>();
    detectedVarDefs.forEach((def) => {
      if (!map.has(def.name)) {
        map.set(def.name, {
          mode: def.mode,
          optionsStr: def.options.join(', '),
        });
      }
    });
    return Array.from(map.entries()).map(([name, val]) => ({
      name,
      mode: val.mode,
      optionsStr: val.optionsStr,
    }));
  }, [detectedVarDefs]);

  useEffect(() => {
    if (initialBlock) {
      setTitle(initialBlock.title);
      setCategory(initialBlock.category);
      setContent(initialBlock.content);
      setDescription(initialBlock.description || '');
      setTagsInput(initialBlock.tags ? initialBlock.tags.join(', ') : '');
    } else {
      setTitle('');
      setCategory('custom');
      setContent('');
      setDescription('');
      setTagsInput('');
    }
  }, [initialBlock, isOpen]);

  if (!isOpen) return null;

  const insertVariable = (
    varName: string,
    mode: VariableInputType = 'text',
    sampleOptions?: string[]
  ) => {
    const cleanName = varName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!cleanName) return;
    const tag = encodeVariableTag(cleanName, mode, sampleOptions || []);
    setContent((prev) => (prev ? `${prev} ${tag}` : tag));
    setNewVarName('');
  };

  const handleUpdateVarInContent = (
    varName: string,
    newMode: VariableInputType,
    newOptionsStr: string
  ) => {
    const opts = newOptionsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updatedContent = updateVariableInTemplate(content, varName, newMode, opts);
    setContent(updatedContent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      onShowToast('error', 'Thiếu thông tin', 'Vui lòng nhập Tiêu đề và Nội dung block.');
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (initialBlock) {
        await updateLibraryBlock({
          ...initialBlock,
          title: title.trim(),
          category,
          content: content.trim(),
          description: description.trim(),
          tags,
        });
        onShowToast('success', 'Đã cập nhật block', `"${title}"`);
      } else {
        await createCustomBlock({
          title: title.trim(),
          category,
          content: content.trim(),
          description: description.trim(),
          tags,
          isCustom: true,
        });
        onShowToast('success', 'Đã tạo block mới', `"${title}" đã lưu vào thư viện.`);
      }

      onClose();
    } catch {
      onShowToast('error', 'Lỗi khi lưu block');
    } finally {
      setSaving(false);
    }
  };

  const sampleQuickVars = [
    { name: 'target_audience', mode: 'multi' as const, opts: ['Developers', 'Startup Founders', 'Marketers'] },
    { name: 'industry', mode: 'single' as const, opts: ['B2B SaaS', 'E-commerce', 'Fintech', 'EdTech'] },
    { name: 'role', mode: 'single' as const, opts: ['Senior Tech Lead', 'Creative Copywriter', 'Data Scientist'] },
    { name: 'tech_stack', mode: 'multi' as const, opts: ['React 19', 'TypeScript', 'Node.js', 'PostgreSQL'] },
    { name: 'tone', mode: 'single' as const, opts: ['Chuyên nghiệp', 'Hài hước', 'Súc tích'] },
    { name: 'custom_goal', mode: 'text' as const, opts: [] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {initialBlock ? 'Chỉnh sửa Prompt Block' : 'Tạo Prompt Block mới'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Lưu vào thư viện SQLite/IndexedDB cục bộ và đồng bộ tự động
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                Tiêu đề Block:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Giám đốc Marketing B2B"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                Danh mục (Category):
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PromptCategory)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Mô tả ngắn:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giải thích ngắn gọn tác dụng của khối này..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          {/* Content with Variable Inserters */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Nội dung câu lệnh (Prompt Template):
              </label>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                Cú pháp `{'{{biến}}'}` lưu trực tiếp trong text
              </span>
            </div>

            {/* Syntax Rules & Comma-Separated Annotation Box */}
            <div className="mb-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-100">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Quy tắc mã hoá biến số trong nội dung prompt:</span>
                </div>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  Lưu thẳng trong text
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold">{`{{bien}}`}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-sans text-[11px] mt-0.5">
                    Dành cho người dùng tự do nhập văn bản
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">{`{{bien | lựa chọn 1, lựa chọn 2}}`}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-sans text-[11px] mt-0.5">
                    Dropdown chọn 1 mục — <strong className="text-amber-800 dark:text-amber-300 underline font-semibold">ngăn cách bằng dấu phẩy (,)</strong>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
                  <div className="text-purple-600 dark:text-purple-400 font-bold">{`{{bien |* lựa chọn 1, lựa chọn 2}}`}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-sans text-[11px] mt-0.5">
                    Dropdown chọn nhiều mục — <strong className="text-amber-800 dark:text-amber-300 underline font-semibold">ngăn cách bằng dấu phẩy (,)</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-amber-800/90 dark:text-amber-300/90 flex items-center gap-1.5 pt-0.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Chú thích:</strong> Các lựa chọn được <strong>ngăn cách bởi dấu phẩy (,)</strong>. Cấu trúc lưu thẳng trong text mà không cần structure phức tạp thêm.
                </span>
              </div>
            </div>

            {/* Quick Variable Bar */}
            <div className="mb-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium mr-1 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Gợi ý biến:
              </span>
              {sampleQuickVars.map((v) => (
                <button
                  type="button"
                  key={v.name}
                  onClick={() => insertVariable(v.name, v.mode, v.opts)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 transition-colors shadow-2xs flex items-center gap-1"
                  title={`Chèn biến ${v.name} (${v.mode === 'multi' ? 'chọn nhiều' : v.mode === 'single' ? 'chọn 1' : 'tự điền'})`}
                >
                  <span>+{v.name}</span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    ({v.mode === 'multi' ? 'multi |*' : v.mode === 'single' ? 'single |' : 'text'})
                  </span>
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="text"
                  placeholder="tên_biến"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none w-24 font-mono"
                />
                <select
                  value={newVarType}
                  onChange={(e) => setNewVarType(e.target.value as VariableInputType)}
                  aria-label="Loại biến mới"
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="text">Tự điền {'{{v}}'}</option>
                  <option value="single">Chọn 1 {'{{v |}}'}</option>
                  <option value="multi">Chọn nhiều {'{{v |*}}'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => newVarName && insertVariable(newVarName, newVarType)}
                  disabled={!newVarName}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white disabled:opacity-40"
                >
                  Chèn
                </button>
              </div>
            </div>

            <textarea
              required
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: You are an expert {{industry | SaaS, E-commerce, EdTech}} strategist. Focus on optimizing {{goal}} for {{target_audience |* Developers, Founders}}..."
              className="w-full p-3.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 leading-relaxed"
            />
          </div>

          {/* Configurable Variable Options & Mode */}
          {uniqueVars.length > 0 && (
            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Biến số phát hiện trong template ({uniqueVars.length} biến)
                  </span>
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Tự động đồng bộ với nội dung văn bản
                </span>
              </div>

              <div className="space-y-3">
                {uniqueVars.map((v) => {
                  return (
                    <div
                      key={v.name}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                            {encodeVariableTag(
                              v.name,
                              v.mode,
                              v.optionsStr ? v.optionsStr.split(',').map((s) => s.trim()).filter(Boolean) : []
                            )}
                          </span>
                        </div>

                        {/* Mode switch */}
                        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => handleUpdateVarInContent(v.name, 'text', '')}
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              v.mode === 'text'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Tự điền {'{{v}}'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateVarInContent(
                                v.name,
                                'single',
                                v.optionsStr || 'Lựa chọn 1, Lựa chọn 2'
                              )
                            }
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              v.mode === 'single'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Chọn 1 {'{{v |}}'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateVarInContent(
                                v.name,
                                'multi',
                                v.optionsStr || 'Lựa chọn 1, Lựa chọn 2'
                              )
                            }
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              v.mode === 'multi'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Chọn nhiều {'{{v |*}}'}
                          </button>
                        </div>
                      </div>

                      {v.mode !== 'text' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Danh sách lựa chọn (ngăn cách bằng dấu phẩy):
                            </label>
                            <span className="text-amber-700 dark:text-amber-400 text-[10px]">
                              * Phân cách các mục bằng dấu phẩy (,)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={v.optionsStr}
                            onChange={(e) => handleUpdateVarInContent(v.name, v.mode, e.target.value)}
                            placeholder="Nhập các lựa chọn, ngăn cách bởi dấu phẩy (vd: Lựa chọn 1, Lựa chọn 2, Lựa chọn 3)"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            💡 Ví dụ: <span className="font-mono">React 19, TypeScript, Tailwind CSS, Next.js</span> (mỗi lựa chọn cách nhau bằng dấu phẩy)
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          Biến tự do: Người dùng sẽ gõ trực tiếp văn bản vào ô nhập liệu khi mix prompt.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Thẻ phân loại (Tags, cách nhau bởi dấu phẩy):
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="marketing, viral, seo, copy"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:underline"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !content.trim()}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md shadow-indigo-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : initialBlock ? 'Lưu cập nhật' : 'Tạo Block mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
