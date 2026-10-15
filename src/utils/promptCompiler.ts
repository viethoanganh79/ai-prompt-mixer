import { CanvasBlock, PromptCategory, PromptOutputFormat } from '../types';
import { replaceVariableInCompiledPrompt } from './variableParser';

export function getXmlTagNameForCategory(category: PromptCategory): string {
  switch (category) {
    case 'persona':
      return 'role';
    case 'context':
      return 'context';
    case 'instructions':
      return 'instructions';
    case 'constraints':
      return 'constraints';
    case 'style':
      return 'style_and_tone';
    case 'output':
      return 'output_format';
    case 'examples':
      return 'examples';
    case 'custom':
    default:
      return 'section';
  }
}

/**
 * Loại bỏ các tiêu đề markdown trùng lặp ở đầu block khi render vào thẻ XML
 * ví dụ: "### Background Context:\n..." -> "..."
 */
export function stripLeadingMarkdownHeader(text: string): string {
  if (!text) return '';
  return text.replace(/^#{1,4}\s+[^\n:]+:\s*\n*/i, '').trim();
}

/**
 * Biên dịch danh sách canvas items thành prompt cuối cùng theo định dạng mong muốn:
 * - 'xml': Đóng gói phân cấp trong thẻ XML cô lập theo chuẩn AI Prompt Engineering hiện đại (<prompt>, <role>, <context>, v.v.)
 * - 'markdown': Nối các block thông qua markdown truyền thống
 */
export function compileCanvasBlocks(
  canvasItems: CanvasBlock[],
  variables: Record<string, string>,
  detectedVariables: string[],
  format: PromptOutputFormat = 'markdown',
  rootTag = 'prompt'
): string {
  const activeBlocks = canvasItems.filter((item) => item.isEnabled);
  if (activeBlocks.length === 0) return '';

  if (format === 'markdown') {
    return activeBlocks
      .map((item) => {
        let text = (item.content || '').trim();
        detectedVariables.forEach((v) => {
          text = replaceVariableInCompiledPrompt(text, v, variables[v]);
        });

        // Đảm bảo mỗi khối trong Markdown có tiêu đề rõ ràng nếu chưa có (#, ##, ###)
        const hasHeader = /^#{1,4}\s+/m.test(text);
        const sectionHeader = hasHeader ? '' : `### ${item.title.trim()}\n\n`;

        const prefix = item.prefix && item.prefix.trim() ? `${item.prefix.trim()}\n\n` : '';
        const suffix = item.suffix && item.suffix.trim() ? `\n\n${item.suffix.trim()}` : '';

        return `${prefix}${sectionHeader}${text}${suffix}`.trim();
      })
      .filter((chunk) => chunk.length > 0)
      .join('\n\n\n')
      .trim();
  }

  // XML Format: Cô lập và phân cấp ngữ nghĩa mở rộng
  const xmlSections = activeBlocks.map((item) => {
    let text = item.content;
    detectedVariables.forEach((v) => {
      text = replaceVariableInCompiledPrompt(text, v, variables[v]);
    });

    const tagName = getXmlTagNameForCategory(item.category);
    const cleanedText = stripLeadingMarkdownHeader(text);
    
    // Thụt lề nội dung bên trong thẻ XML 2 spaces để dễ đọc
    const indentedContent = cleanedText
      .split('\n')
      .map((line) => (line.length > 0 ? `  ${line}` : ''))
      .join('\n');

    const escapedTitle = item.title.replace(/"/g, '&quot;');
    return `  <${tagName} name="${escapedTitle}">\n${indentedContent}\n  </${tagName}>`;
  });

  return `<${rootTag}>\n${xmlSections.join('\n\n')}\n</${rootTag}>`;
}
