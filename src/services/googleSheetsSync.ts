import { PromptBlock, PromptPreset, PromptCategory } from '../types';

export interface SheetParseResult {
  isValid: boolean;
  sheetId?: string;
  gid?: string;
  exportCsvUrl?: string;
  error?: string;
}

export function parseGoogleSheetUrl(url: string): SheetParseResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL không được để trống' };
  }

  const trimmed = url.trim();

  // Pattern 1: Standard Google Sheets URL
  // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const standardMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (standardMatch) {
    const sheetId = standardMatch[1];
    let gid = '0';
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }

    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    return {
      isValid: true,
      sheetId,
      gid,
      exportCsvUrl,
    };
  }

  // Pattern 2: Published to web URL
  // e.g. https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?output=csv
  const pubMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    const pubId = pubMatch[1];
    let exportCsvUrl = trimmed;
    if (!trimmed.includes('output=csv')) {
      exportCsvUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
    }
    return {
      isValid: true,
      sheetId: pubId,
      gid: '0',
      exportCsvUrl,
    };
  }

  // Fallback: check if it's already an export or csv link
  if (trimmed.endsWith('.csv') || trimmed.includes('format=csv') || trimmed.includes('output=csv')) {
    return {
      isValid: true,
      exportCsvUrl: trimmed,
    };
  }

  return {
    isValid: false,
    error: 'Đường dẫn không hợp lệ. Vui lòng dán link Google Sheet hợp lệ dạng: https://docs.google.com/spreadsheets/d/.../edit',
  };
}

// RFC 4180 compliant CSV parser that handles newlines within quotes
export function parseCsv(csvText: string): Record<string, string>[] {
  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if (char === '\n' && !insideQuote) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    return [];
  }

  // Normalize header names
  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => {
    const lower = h.toLowerCase().trim();
    if (lower === 'tiêu đề' || lower === 'tieu de' || lower === 'name') return 'title';
    if (lower === 'danh mục' || lower === 'danh muc' || lower === 'loại') return 'category';
    if (lower === 'nội dung' || lower === 'noi dung' || lower === 'prompt') return 'content';
    if (lower === 'mô tả' || lower === 'mo ta') return 'description';
    if (lower === 'thẻ' || lower === 'the' || lower === 'tag') return 'tags';
    if (lower === 'biến số' || lower === 'bien so' || lower === 'variable') return 'variables';
    return lower;
  });

  const records: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      record[header] = row[c] !== undefined ? row[c] : '';
    }
    records.push(record);
  }

  return records;
}

export function convertRowsToBlocks(records: Record<string, string>[]): PromptBlock[] {
  const validCategories: PromptCategory[] = [
    'persona',
    'context',
    'instructions',
    'constraints',
    'style',
    'output',
    'examples',
    'custom',
  ];

  const now = new Date().toISOString();

  return records
    .filter((r) => r.title && r.content)
    .map((r, index) => {
      let rawCat = (r.category || 'custom').toLowerCase().trim() as PromptCategory;
      if (!validCategories.includes(rawCat)) {
        rawCat = 'custom';
      }

      // Parse tags
      const tags = (r.tags || '')
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter(Boolean);

      // Extract variables in content like {{variable_name}}
      const varMatches = r.content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      const extractedVars = Array.from(new Set(varMatches.map((m) => m.replace(/[{}]/g, ''))));

      // Extra variables from column if any
      const columnVars = (r.variables || '')
        .split(/[,;|]/)
        .map((v) => v.trim())
        .filter(Boolean);

      const allVars = Array.from(new Set([...extractedVars, ...columnVars]));

      return {
        id: r.id || `sheet-block-${Date.now()}-${index}`,
        title: r.title,
        category: rawCat,
        content: r.content,
        description: r.description || '',
        tags: tags.length > 0 ? tags : ['google-sheet', rawCat],
        variables: allVars,
        createdAt: r.createdat || now,
        updatedAt: now,
        isCustom: true,
        sheetRowId: `row-${index + 2}`,
      };
    });
}

// Fetch Sheet Blocks via Server Proxy with Client Fallback
export async function fetchBlocksFromGoogleSheet(sheetUrl: string): Promise<{
  success: boolean;
  blocks: PromptBlock[];
  rawRowCount: number;
  error?: string;
}> {
  const parseResult = parseGoogleSheetUrl(sheetUrl);
  if (!parseResult.isValid || !parseResult.exportCsvUrl) {
    return {
      success: false,
      blocks: [],
      rawRowCount: 0,
      error: parseResult.error || 'Invalid Sheet URL',
    };
  }

  try {
    // 1. Try server proxy route first
    const proxyResponse = await fetch('/api/sheets/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sheetUrl }),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (!data.success) {
        throw new Error(data.error || 'Server proxy failed to retrieve sheet data');
      }

      const rows = parseCsv(data.data);
      const blocks = convertRowsToBlocks(rows);
      return {
        success: true,
        blocks,
        rawRowCount: rows.length,
      };
    }

    // 2. Client fallback
    const directRes = await fetch(parseResult.exportCsvUrl);
    if (!directRes.ok) {
      throw new Error(`Direct fetch failed with status ${directRes.status}`);
    }
    const csvData = await directRes.text();
    const rows = parseCsv(csvData);
    const blocks = convertRowsToBlocks(rows);
    return {
      success: true,
      blocks,
      rawRowCount: rows.length,
    };
  } catch (err: any) {
    return {
      success: false,
      blocks: [],
      rawRowCount: 0,
      error:
        err?.message ||
        'Không thể tải dữ liệu từ Google Sheet. Hãy kiểm tra quyền truy cập (Chia sẻ với "Bất kỳ ai có đường liên kết").',
    };
  }
}

// Generate CSV data for export to Google Sheets
export function generateCsvForBlocks(blocks: PromptBlock[]): string {
  const headers = ['id', 'title', 'category', 'content', 'description', 'tags', 'variables', 'updatedAt'];

  const rows = blocks.map((b) => {
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    return [
      escapeCsv(b.id),
      escapeCsv(b.title),
      escapeCsv(b.category),
      escapeCsv(b.content),
      escapeCsv(b.description),
      escapeCsv(b.tags.join(', ')),
      escapeCsv((b.variables || []).join(', ')),
      escapeCsv(b.updatedAt),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Push blocks to Google Apps Script Webhook
export async function pushBlocksToWebhook(
  webhookUrl: string,
  blocks: PromptBlock[],
  presets: PromptPreset[]
): Promise<{ success: boolean; message: string }> {
  try {
    const payload = {
      action: 'sync_blocks',
      source: 'AI Prompt Mixer Studio',
      timestamp: new Date().toISOString(),
      blocks,
      presets,
    };

    const res = await fetch('/api/sheets/push-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, payload }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to sync with webhook');
    }

    return {
      success: true,
      message: `Đã đồng bộ thành công ${blocks.length} blocks lên Google Sheet qua Webhook!`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Lỗi khi gửi dữ liệu tới Webhook',
    };
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script - 2-Way Sync for AI Prompt Mixer
 * Hướng dẫn cài đặt trong 1 phút:
 * 1. Mở Google Sheet của bạn -> Tiện ích mở rộng (Extensions) -> Apps Script
 * 2. Dán đoạn mã này vào file Code.gs và nhấn Lưu (Save)
 * 3. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment)
 * 4. Chọn Loại: "Ứng dụng web" (Web app)
 *    - Thực thi dưới quyền: "Tôi" (Me)
 *    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone)
 * 5. Sao chép URL ứng dụng web và dán vào ô "Google Apps Script Webhook URL" trong AI Prompt Mixer.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Ghi đè hoặc thêm header nếu sheet còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["title", "category", "content", "description", "tags", "variables", "updatedAt"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e8f0fe");
    }
    
    if (data.blocks && data.blocks.length > 0) {
      // Xóa các hàng cũ và ghi lại toàn bộ danh sách blocks
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      
      var rows = [];
      for (var i = 0; i < data.blocks.length; i++) {
        var b = data.blocks[i];
        rows.push([
          b.title || "",
          b.category || "custom",
          b.content || "",
          b.description || "",
          (b.tags || []).join(", "),
          (b.variables || []).join(", "),
          b.updatedAt || new Date().toISOString()
        ]);
      }
      
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sync completed: " + (data.blocks ? data.blocks.length : 0) + " blocks recorded.",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ blocks: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0].map(function(h) { return h.toString().toLowerCase().trim(); });
  var result = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var item = {};
    for (var c = 0; c < headers.length; c++) {
      item[headers[c]] = row[c];
    }
    result.push(item);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ blocks: result }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
