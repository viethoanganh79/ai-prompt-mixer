export type VariableInputType = 'text' | 'single' | 'multi';

export interface ParsedVariableDef {
  name: string;
  mode: VariableInputType;
  options: string[];
  rawTag: string;
}

/**
 * Parses an inner variable tag content (e.g. from {{...}}):
 * - "{{bien}}" -> name="bien", mode="text", options=[]
 * - "{{bien | opt 1, opt 2}}" -> name="bien", mode="single", options=['opt 1', 'opt 2']
 * - "{{bien |* opt 1, opt 2}}" -> name="bien", mode="multi", options=['opt 1', 'opt 2']
 */
export function parseVariableTag(inner: string): ParsedVariableDef {
  const trimmed = inner.trim();

  // Multi-select with |*
  if (trimmed.includes('|*')) {
    const starIdx = trimmed.indexOf('|*');
    const name = trimmed.substring(0, starIdx).trim();
    const optsStr = trimmed.substring(starIdx + 2).trim();
    const options = optsStr
      ? optsStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return {
      name,
      mode: 'multi',
      options,
      rawTag: `{{${trimmed}}}`,
    };
  }

  // Single-select with |
  if (trimmed.includes('|')) {
    const pipeIdx = trimmed.indexOf('|');
    const name = trimmed.substring(0, pipeIdx).trim();
    const optsStr = trimmed.substring(pipeIdx + 1).trim();
    const options = optsStr
      ? optsStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return {
      name,
      mode: 'single',
      options,
      rawTag: `{{${trimmed}}}`,
    };
  }

  // Free text input
  return {
    name: trimmed,
    mode: 'text',
    options: [],
    rawTag: `{{${trimmed}}}`,
  };
}

/**
 * Extracts all variable tags defined in a prompt text template.
 */
export function extractVariablesFromText(text: string): ParsedVariableDef[] {
  if (!text) return [];
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  const list: ParsedVariableDef[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const inner = m.replace(/^\{\{|\}\}$/g, '');
    const parsed = parseVariableTag(inner);
    if (parsed.name) {
      list.push(parsed);
      seen.add(parsed.name);
    }
  }

  return list;
}

/**
 * Returns a unified dictionary of variable configurations from multiple content texts.
 * Prioritizes tags with options and 'multi' mode when duplicates exist.
 */
export function extractUnifiedVariableMap(
  texts: string[]
): Record<string, { mode: VariableInputType; options: string[] }> {
  const map: Record<string, { mode: VariableInputType; options: string[] }> = {};

  for (const text of texts) {
    const list = extractVariablesFromText(text);
    for (const item of list) {
      if (!map[item.name]) {
        map[item.name] = {
          mode: item.mode,
          options: [...item.options],
        };
      } else {
        const existing = map[item.name];
        // Upgrade mode: multi > single > text
        if (item.mode === 'multi') {
          existing.mode = 'multi';
        } else if (item.mode === 'single' && existing.mode === 'text') {
          existing.mode = 'single';
        }
        // Merge options
        item.options.forEach((opt) => {
          if (!existing.options.includes(opt)) {
            existing.options.push(opt);
          }
        });
      }
    }
  }

  return map;
}

/**
 * Encodes a variable into prompt text format:
 * - text: {{bien}}
 * - single: {{bien | opt1, opt2}}
 * - multi: {{bien |* opt1, opt2}}
 */
export function encodeVariableTag(
  name: string,
  mode: VariableInputType,
  options: string[]
): string {
  const cleanName = name.trim();
  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

  if (mode === 'multi') {
    return cleanOptions.length > 0
      ? `{{${cleanName} |* ${cleanOptions.join(', ')}}}`
      : `{{${cleanName} |*}}`;
  }
  if (mode === 'single') {
    return cleanOptions.length > 0
      ? `{{${cleanName} | ${cleanOptions.join(', ')}}}`
      : `{{${cleanName} |}}`;
  }
  return `{{${cleanName}}}`;
}

/**
 * Updates a variable tag inside a template string with the new mode and options.
 */
export function updateVariableInTemplate(
  text: string,
  varName: string,
  newMode: VariableInputType,
  newOptions: string[]
): string {
  const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\{\\{\\s*${escapedName}\\s*(?:\\|[\\s\\S]*?)?\\}\\}`, 'g');
  const newTag = encodeVariableTag(varName, newMode, newOptions);

  if (regex.test(text)) {
    return text.replace(regex, newTag);
  } else {
    return `${text} ${newTag}`.trim();
  }
}

/**
 * Replaces any occurrence of variable (whether {{var}}, {{var | ...}}, or {{var |* ...}})
 * with its filled value in the final compiled prompt.
 */
export function replaceVariableInCompiledPrompt(
  text: string,
  varName: string,
  value: string | undefined
): string {
  const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\{\\{\\s*${escapedName}\\s*(?:\\|[\\s\\S]*?)?\\}\\}`, 'g');
  const replacement =
    value !== undefined && value.trim() !== '' ? value.trim() : `{{${varName}}}`;

  return text.replace(regex, () => replacement);
}
