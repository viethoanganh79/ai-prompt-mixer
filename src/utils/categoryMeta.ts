import { PromptCategory, CategoryMeta } from '../types';
import { Language } from '../i18n/types';

interface LocalizedCategoryMeta {
  id: PromptCategory;
  label: {
    vi: string;
    en: string;
  };
  description: {
    vi: string;
    en: string;
  };
  badgeColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: string;
}

export const LOCALIZED_CATEGORY_MAP: Record<PromptCategory, LocalizedCategoryMeta> = {
  persona: {
    id: 'persona',
    label: {
      vi: 'Persona & Vai trò',
      en: 'Persona & Role',
    },
    description: {
      vi: 'Chuyên gia, nhân vật hoặc danh tính AI cần đóng vai',
      en: 'Expert identity, specialist persona, or character for AI to adopt',
    },
    badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderColor: 'border-indigo-200 dark:border-indigo-900/50',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    iconName: 'UserCheck',
  },
  context: {
    id: 'context',
    label: {
      vi: 'Bối cảnh & Thông tin nền',
      en: 'Context & Background',
    },
    description: {
      vi: 'Bối cảnh dự án, đối tượng mục tiêu, thông tin nền',
      en: 'Project context, target audience, and environment background',
    },
    badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30',
    bgColor: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    borderColor: 'border-cyan-200 dark:border-cyan-900/50',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    iconName: 'Layers',
  },
  instructions: {
    id: 'instructions',
    label: {
      vi: 'Nhiệm vụ & Chỉ đạo',
      en: 'Task & Instructions',
    },
    description: {
      vi: 'Nhiệm vụ cốt lõi, quy trình từng bước, chỉ đạo',
      en: 'Core directives, step-by-step reasoning, and workflows',
    },
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-900/50',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    iconName: 'CheckSquare',
  },
  constraints: {
    id: 'constraints',
    label: {
      vi: 'Quy tắc & Giới hạn',
      en: 'Rules & Constraints',
    },
    description: {
      vi: 'Giới hạn, cấm đoán, chống ảo giác (hallucination)',
      en: 'Boundaries, negative guardrails, and anti-hallucination rules',
    },
    badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
    bgColor: 'bg-rose-50/50 dark:bg-rose-950/20',
    borderColor: 'border-rose-200 dark:border-rose-900/50',
    textColor: 'text-rose-600 dark:text-rose-400',
    iconName: 'ShieldAlert',
  },
  style: {
    id: 'style',
    label: {
      vi: 'Giọng điệu & Phong cách',
      en: 'Tone & Style',
    },
    description: {
      vi: 'Giọng điệu, sắc thái, độ dài, phong cách ngôn ngữ',
      en: 'Tone of voice, communication demeanor, length, and style',
    },
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-900/50',
    textColor: 'text-amber-600 dark:text-amber-400',
    iconName: 'Sparkles',
  },
  output: {
    id: 'output',
    label: {
      vi: 'Định dạng Đầu ra',
      en: 'Output Format',
    },
    description: {
      vi: 'Định dạng đầu ra (JSON, Markdown, Bảng, Checklist)',
      en: 'Target structure (JSON schema, Markdown table, Checklist)',
    },
    badgeColor: 'bg-violet-500/10 text-violet-500 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
    bgColor: 'bg-violet-50/50 dark:bg-violet-950/20',
    borderColor: 'border-violet-200 dark:border-violet-900/50',
    textColor: 'text-violet-600 dark:text-violet-400',
    iconName: 'FileJson',
  },
  examples: {
    id: 'examples',
    label: {
      vi: 'Ví dụ Mẫu (Few-shot)',
      en: 'Few-shot Examples',
    },
    description: {
      vi: 'Ví dụ mẫu đầu vào - đầu ra để AI noi theo',
      en: 'Input-output exemplar demonstrations for calibration',
    },
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:border-fuchsia-500/30',
    bgColor: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-900/50',
    textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    iconName: 'Lightbulb',
  },
  custom: {
    id: 'custom',
    label: {
      vi: 'Khối Tùy Chỉnh',
      en: 'Custom Block',
    },
    description: {
      vi: 'Khối prompt do bạn tự định nghĩa hoặc import từ Sheet',
      en: 'User-created custom block or imported from Sheets',
    },
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-900/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    iconName: 'Puzzle',
  },
};

export function getCategoryMeta(category: PromptCategory, lang: Language = 'vi'): CategoryMeta {
  const meta = LOCALIZED_CATEGORY_MAP[category] || LOCALIZED_CATEGORY_MAP.custom;
  return {
    id: meta.id,
    label: meta.label[lang] || meta.label.vi,
    description: meta.description[lang] || meta.description.vi,
    badgeColor: meta.badgeColor,
    bgColor: meta.bgColor,
    borderColor: meta.borderColor,
    textColor: meta.textColor,
    iconName: meta.iconName,
  };
}

// Backward compatible default map (Vietnamese)
export const CATEGORY_MAP: Record<PromptCategory, CategoryMeta> = {
  persona: getCategoryMeta('persona', 'vi'),
  context: getCategoryMeta('context', 'vi'),
  instructions: getCategoryMeta('instructions', 'vi'),
  constraints: getCategoryMeta('constraints', 'vi'),
  style: getCategoryMeta('style', 'vi'),
  output: getCategoryMeta('output', 'vi'),
  examples: getCategoryMeta('examples', 'vi'),
  custom: getCategoryMeta('custom', 'vi'),
};

export const CATEGORY_LIST: PromptCategory[] = [
  'persona',
  'context',
  'instructions',
  'constraints',
  'style',
  'output',
  'examples',
  'custom',
];
