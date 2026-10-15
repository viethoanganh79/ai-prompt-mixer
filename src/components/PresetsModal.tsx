import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Play,
  Trash2,
  X,
  Check,
  ArrowRight,
  Share2,
  Download,
} from 'lucide-react';
import { usePromptMixer } from '../context/PromptMixerContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PromptPreset } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'browse' | 'save';
  onSharePreset?: (preset: PromptPreset) => void;
  onOpenImport?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'browse',
  onSharePreset,
  onOpenImport,
  onShowToast,
}) => {
  const {
    presets,
    loadPreset,
    deletePreset,
    saveCurrentAsPreset,
    canvasItems,
    activePresetId,
  } = usePromptMixer();

  const { t, isVietnamese } = useLanguage();

  const [mode, setMode] = useState<'browse' | 'save'>(defaultMode);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveCategory, setSaveCategory] = useState('Marketing');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleApply = (preset: PromptPreset) => {
    loadPreset(preset.id);
    onShowToast(
      'success',
      isVietnamese ? 'Đã tải Preset!' : 'Preset Loaded!',
      isVietnamese ? `Preset "${preset.name}" đã được nạp vào Mixer.` : `Preset "${preset.name}" loaded into Mixer.`
    );
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = isVietnamese ? `Bạn có chắc muốn xóa preset "${name}"?` : `Are you sure you want to delete preset "${name}"?`;
    if (confirm(confirmMsg)) {
      await deletePreset(id);
      onShowToast('info', isVietnamese ? 'Đã xóa preset' : 'Deleted preset');
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      onShowToast('error', isVietnamese ? 'Chưa nhập tên preset' : 'Preset name required');
      return;
    }

    if (canvasItems.length === 0) {
      onShowToast(
        'error',
        isVietnamese ? 'Canvas trống' : 'Canvas empty',
        isVietnamese ? 'Cần có ít nhất một block để lưu thành preset.' : 'At least one block is required to save a preset.'
      );
      return;
    }

    setSaving(true);
    try {
      const newPreset = await saveCurrentAsPreset(saveName.trim(), saveDesc.trim(), saveCategory.trim());
      onShowToast(
        'success',
        isVietnamese ? 'Đã lưu Preset mới!' : 'Saved New Preset!',
        isVietnamese ? `"${newPreset.name}" đã sẵn sàng tái sử dụng.` : `"${newPreset.name}" is ready for reuse.`
      );
      setSaveName('');
      setSaveDesc('');
      setMode('browse');
    } catch {
      onShowToast('error', isVietnamese ? 'Lỗi khi lưu preset' : 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {isVietnamese ? 'Quản lý Presets (Công thức Prompt)' : 'Manage Presets (Prompt Recipes)'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isVietnamese ? 'Lưu và tái sử dụng chuỗi ghép nối prompt blocks thường dùng' : 'Save and reuse frequent block combinations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex text-xs">
              <button
                onClick={() => setMode('browse')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                  mode === 'browse'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isVietnamese ? `Danh sách (${presets.length})` : `Browse (${presets.length})`}
              </button>
              <button
                onClick={() => setMode('save')}
                className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  mode === 'save'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Lưu Canvas' : 'Save Canvas'}</span>
              </button>
              {onOpenImport && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenImport();
                  }}
                  className="px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                  title={isVietnamese ? 'Nhập Preset từ URL hoặc file' : 'Import Preset from URL or file'}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isVietnamese ? 'Nhập' : 'Import'}</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {mode === 'browse' ? (
            <div className="space-y-3.5">
              {presets.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isVietnamese ? 'Chưa có preset nào được lưu' : 'No presets saved yet'}
                  </p>
                  <p className="text-xs mt-1 text-slate-500">
                    {isVietnamese
                      ? 'Sắp xếp các block trên Canvas rồi chuyển sang tab "Lưu Canvas" để tạo preset đầu tiên.'
                      : 'Arrange blocks on the Canvas, then switch to "Save Canvas" to create your first preset.'}
                  </p>
                </div>
              ) : (
                presets.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  const blockNames = preset.canvasItems?.map((ci) => ci.title) || [];

                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        isActive
                          ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {preset.name}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {preset.category}
                            </span>
                            {isActive && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">
                                {isVietnamese ? 'Đang dùng' : 'Active'}
                              </span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                              {preset.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onSharePreset && (
                            <button
                              onClick={() => onSharePreset(preset)}
                              className="px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                              title={isVietnamese ? 'Chia sẻ preset này qua URL nén' : 'Share this preset via compressed URL'}
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="hidden sm:inline">{isVietnamese ? 'Chia sẻ' : 'Share'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleApply(preset)}
                            className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{isVietnamese ? 'Áp dụng' : 'Apply'}</span>
                          </button>
                          <button
                            onClick={() => handleDelete(preset.id, preset.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={isVietnamese ? 'Xóa preset này' : 'Delete this preset'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sequence of chained blocks */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium mr-1">
                          {isVietnamese ? 'Chuỗi block:' : 'Block chain:'}
                        </span>
                        {blockNames.map((name, i) => (
                          <React.Fragment key={i}>
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                              {i + 1}. {name}
                            </span>
                            {i < blockNames.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Variables summary if available */}
                      {preset.variableValues && Object.keys(preset.variableValues).length > 0 && (
                        <div className="mt-2 pt-2 border-dashed border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-slate-400 font-medium mr-1">
                            {isVietnamese ? 'Giá trị mẫu:' : 'Sample values:'}
                          </span>
                          {Object.entries(preset.variableValues).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] border border-indigo-200/50 dark:border-indigo-800/50"
                              title={`${k}: ${v}`}
                            >
                              {`{{${k}}}`}: {v.length > 24 ? v.substring(0, 24) + '...' : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Save Current Canvas Form */
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
                <span className="font-bold">
                  {isVietnamese
                    ? `Đang lưu ${canvasItems.length} blocks từ Workspace hiện tại:`
                    : `Saving ${canvasItems.length} blocks from current Workspace:`}
                </span>
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs opacity-90">
                  {canvasItems.map((ci, idx) => (
                    <li key={ci.instanceId}>
                      {idx + 1}. {ci.title} ({ci.category})
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  {isVietnamese ? 'Tên Preset:' : 'Preset Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={isVietnamese ? 'Ví dụ: Tối ưu SEO & Hook viral' : 'E.g., Senior SaaS Launch & Positioning'}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  {isVietnamese ? 'Danh mục:' : 'Category:'}
                </label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="Marketing">{isVietnamese ? 'Marketing & Copywriting' : 'Marketing & Copywriting'}</option>
                  <option value="Engineering">{isVietnamese ? 'Kỹ thuật & Lập trình' : 'Engineering & Programming'}</option>
                  <option value="Data & AI">{isVietnamese ? 'Dữ liệu & Trí tuệ nhân tạo' : 'Data & Artificial Intelligence'}</option>
                  <option value="Business">{isVietnamese ? 'Chiến lược & Kinh doanh' : 'Business & Strategy'}</option>
                  <option value="Education">{isVietnamese ? 'Giáo dục & Nghiên cứu' : 'Education & Research'}</option>
                  <option value="Custom">{isVietnamese ? 'Khác / Tùy chỉnh' : 'Other / Custom'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  {isVietnamese ? 'Mô tả mục đích sử dụng:' : 'Usage Description:'}
                </label>
                <textarea
                  rows={2}
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder={isVietnamese ? 'Mô tả ngắn gọn khi nào nên dùng preset này...' : 'Briefly describe when to use this preset...'}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('browse')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                >
                  {isVietnamese ? 'Quay lại' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !saveName.trim()}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md shadow-indigo-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? t('common.saving') : (isVietnamese ? 'Lưu thành Preset' : 'Save as Preset')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
