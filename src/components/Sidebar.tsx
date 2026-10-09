import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Layers,
  Sparkles,
  Filter,
  UserCheck,
  CheckSquare,
  ShieldAlert,
  FileJson,
  Lightbulb,
  Puzzle,
  Trash2,
  Edit3,
  Copy,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { PromptBlock, PromptCategory } from '../types';
import { CATEGORY_MAP } from '../utils/categoryMeta';
import { extractVariablesFromText } from '../utils/variableParser';

interface SidebarProps {
  onOpenNewBlock: () => void;
  onEditBlock: (block: PromptBlock) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewBlock, onEditBlock, onShowToast }) => {
  const { blocks, addBlockToCanvas, deleteLibraryBlock, createCustomBlock, canvasItems } = usePromptMixer();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all');
  const [previewBlock, setPreviewBlock] = useState<PromptBlock | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories: Array<{ id: PromptCategory | 'all'; label: string; count: number }> = useMemo(() => {
    const list: Array<{ id: PromptCategory | 'all'; label: string; count: number }> = [
      { id: 'all', label: 'Tất cả', count: blocks.length },
    ];

    const categoryKeys: PromptCategory[] = [
      'persona',
      'context',
      'instructions',
      'constraints',
      'style',
      'output',
      'examples',
      'custom',
    ];

    categoryKeys.forEach((cat) => {
      const count = blocks.filter((b) => b.category === cat).length;
      if (count > 0 || cat === 'custom') {
        list.push({
          id: cat,
          label: CATEGORY_MAP[cat]?.label || cat,
          count,
        });
      }
    });

    return list;
  }, [blocks]);

  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchCat;

      const matchText =
        b.title.toLowerCase().includes(term) ||
        b.description.toLowerCase().includes(term) ||
        b.content.toLowerCase().includes(term) ||
        b.tags.some((t) => t.toLowerCase().includes(term));

      return matchCat && matchText;
    });
  }, [blocks, selectedCategory, searchTerm]);

  const handleAdd = (block: PromptBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    addBlockToCanvas(block);
    onShowToast('success', 'Đã thêm vào Canvas', `"${block.title}" đã sẵn sàng.`);
  };

  const handleEdit = (block: PromptBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditBlock(block);
  };

  const handleDuplicate = async (block: PromptBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated = await createCustomBlock({
      title: `${block.title} (Bản sao)`,
      category: block.category,
      content: block.content,
      description: block.description,
      tags: [...(block.tags || [])],
      isCustom: true,
    });
    onShowToast('success', 'Đã nhân bản block', `Tạo "${duplicated.title}" thành công.`);
  };

  const handleConfirmDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLibraryBlock(id);
    onShowToast('info', 'Đã xóa block khỏi thư viện', `"${title}"`);
    setConfirmDeleteId(null);
    if (previewBlock?.id === id) setPreviewBlock(null);
  };

  const getCategoryIcon = (cat: PromptCategory) => {
    switch (cat) {
      case 'persona':
        return <UserCheck className="w-3.5 h-3.5" />;
      case 'context':
        return <Layers className="w-3.5 h-3.5" />;
      case 'instructions':
        return <CheckSquare className="w-3.5 h-3.5" />;
      case 'constraints':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'style':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'output':
        return <FileJson className="w-3.5 h-3.5" />;
      case 'examples':
        return <Lightbulb className="w-3.5 h-3.5" />;
      default:
        return <Puzzle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Search & Actions */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Thư viện Prompt Blocks
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {blocks.length} khối mẫu & khối tùy chỉnh
            </p>
          </div>
          <button
            onClick={onOpenNewBlock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo mới</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, thẻ, nội dung prompt..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Block List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Filter className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy block phù hợp
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thử tìm với từ khóa khác hoặc bấm "Tạo mới" để thêm block riêng của bạn.
            </p>
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const meta = CATEGORY_MAP[block.category] || CATEGORY_MAP.custom;
            const isAdded = canvasItems.some((ci) => ci.blockId === block.id);
            const isSelected = previewBlock?.id === block.id;

            return (
              <div
                key={block.id}
                onClick={() => setPreviewBlock(block)}
                className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Header: Category Badge & Quick Add Action */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeColor}`}
                    >
                      {getCategoryIcon(block.category)}
                      {meta.label.split('&')[0]}
                    </span>
                    {block.sheetRowId && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-medium">
                        Sheet
                      </span>
                    )}
                  </div>

                  {/* Add to Canvas Button */}
                  <button
                    onClick={(e) => handleAdd(block, e)}
                    title="Thêm block này vào Mixer Canvas"
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      isAdded
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/80 dark:hover:text-indigo-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAdded ? '+ Thêm tiếp' : 'Ghép'}</span>
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {block.title}
                </h3>

                {/* Description */}
                {block.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {block.description}
                  </p>
                )}

                {/* Variable & Tag Pills */}
                {(() => {
                  const varCount = block.variables?.length ?? extractVariablesFromText(block.content).length;
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {varCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-mono font-medium">
                          {`{${varCount} biến}`}
                        </span>
                      )}
                      {block.tags?.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Card Action Controls: Sửa, Nhân bản, Xóa */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {block.content.length} ký tự
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleEdit(block, e)}
                      className="px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors font-medium"
                      title="Chỉnh sửa nội dung block này"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>

                    <button
                      onClick={(e) => handleDuplicate(block, e)}
                      className="px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors font-medium"
                      title="Tạo bản sao từ block này"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nhân bản</span>
                    </button>

                    {confirmDeleteId === block.id ? (
                      <div
                        className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/70 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Xóa?</span>
                        <button
                          onClick={(e) => handleConfirmDelete(block.id, block.title, e)}
                          className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                        >
                          Đồng ý
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-1 py-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-[10px]"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(block.id);
                        }}
                        className="px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
                        title="Xóa block khỏi thư viện"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mini Preview Drawer at Bottom of Sidebar if block clicked */}
      {previewBlock && (
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Xem trước: {previewBlock.title}
            </span>
            <button
              onClick={() => setPreviewBlock(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded"
            >
              Đóng
            </button>
          </div>

          <div className="max-h-28 overflow-y-auto p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
            {previewBlock.content}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={(e) => handleEdit(previewBlock, e)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chỉnh sửa</span>
            </button>

            <button
              onClick={(e) => handleAdd(previewBlock, e)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm vào Canvas</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
