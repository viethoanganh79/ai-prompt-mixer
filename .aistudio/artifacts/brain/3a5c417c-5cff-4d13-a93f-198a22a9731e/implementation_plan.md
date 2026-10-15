# Kế hoạch Triển khai Tính năng Song ngữ (Vietnamese & English) cho Prompt Mixer

Kế hoạch kiến trúc và lộ trình triển khai hệ thống đa ngôn ngữ (i18n) toàn diện, bao gồm bản dịch giao diện 100%, bộ chuyển đổi ngôn ngữ trong hộp thoại Cài đặt, và thư viện khối mẫu prompt song ngữ (tự động chuyển đổi danh mục và nội dung mẫu giữa Tiếng Việt và Tiếng Anh).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định kỹ thuật cốt lõi đã được xác nhận theo yêu cầu người dùng:
>
> 1. **Phạm vi dịch thuật**:
>    - **Toàn bộ giao diện người dùng**: Mọi thanh điều hướng (Navbar), thanh công cụ (Sidebar), bảng dựng prompt (Canvas), bảng xuất kết quả (Output Panel), và tất cả 10+ cửa sổ modal/drawer.
>    - **Thư viện mẫu prompt mặc định**: Toàn bộ danh mục (Persona, Context, Instructions, Constraints, Tone & Style, Output Format, Few-shot Examples) và các khối mẫu tích hợp sẵn được chuẩn hóa song ngữ (Việt & Anh).
> 2. **Vị trí nút chuyển đổi ngôn ngữ**:
>    - Tích hợp trực tiếp vào **Hộp thoại Cài đặt & Cấu hình** (Settings Modal / DatabaseModal hiện tại) thành một khu vực cấu hình giao diện nổi bật, cho phép chọn giữa **Tiếng Việt 🇻🇳** và **English 🇬🇧**.
>    - Bổ sung phím tắt / menu chọn nhanh ngôn ngữ ở thanh Header hoặc menu Tài khoản để người dùng quốc tế dễ dàng nhận biết và đổi ngay từ màn hình đầu tiên.
> 3. **Cơ chế xử lý Thư viện Mẫu (Template Blocks) khi đổi ngôn ngữ**:
>    - Danh mục và các khối mẫu mặc định của hệ thống (`built-in blocks`) sẽ tự động hiển thị tiêu đề, mô tả và nội dung prompt bằng ngôn ngữ tương ứng (`vi` hoặc `en`).
>    - Các khối do người dùng tự tạo (`isCustom: true`) được bảo toàn nguyên vẹn nội dung của người dùng, không bị ghi đè hay mất dữ liệu.

---

## 1. Overview & Core Concept

* **Triết lý Thiết kế**: "Zero-Latency Native Bilingual Experience" – Không phụ thuộc thư viện bên ngoài nặng nề, sử dụng giải pháp type-safe i18n thuần TypeScript, phản hồi tức thì khi chuyển ngôn ngữ mà không cần tải lại trang (hot re-render).
* **Ngôn ngữ hỗ trợ**:
  * `vi`: Tiếng Việt (Mặc định).
  * `en`: English (Quốc tế).
* **Lưu trữ tùy chọn (Persistence)**:
  * Tùy chọn ngôn ngữ được lưu trong `localStorage` và tự động đồng bộ vào cấu hình đám mây nếu người dùng đã đăng nhập Google Pro.
  * Tự động nhận diện ngôn ngữ trình duyệt (`navigator.language`) trong lần đầu truy cập nếu chưa có cấu hình trước đó.

---

## 2. User Experience & Visual Design

### Luồng Người dùng (User Flow)

```
[ Người dùng mở ứng dụng ]
       │
       ├─► Vào "Cài đặt & Dữ liệu" (Biểu tượng Settings trên Navbar)
       │         │
       │         ▼
       │   [ Hộp thoại Cài đặt ] ──► Tab "Giao diện & Ngôn ngữ / Language"
       │         │
       │         ├─► Chọn "Tiếng Việt 🇻🇳" ──► Cập nhật UI & Mẫu tiếng Việt
       │         └─► Chọn "English 🇬🇧"    ──► Cập nhật UI & Mẫu tiếng Anh
       │
       └─► (Tuỳ chọn) Đổi nhanh từ Header menu góc phải
```

### Chi tiết Giao diện & Trải nghiệm (UI/UX)

1. **Bộ chọn ngôn ngữ trong Hộp thoại Cài đặt (`DatabaseModal.tsx` / `SettingsModal`)**:
   * Thiết kế Segmented Card trực quan với cờ quốc gia, tên bản ngữ và tên quốc tế:
     * Card 1: 🇻🇳 **Tiếng Việt** (Mặc định) - Giao diện tiếng Việt & kho prompt chuẩn Việt Nam.
     * Card 2: 🇬🇧 **English** - Full English UI & Silicon Valley standard prompt templates.
   * Hiển thị trạng thái active với viền sáng màu indigo/emerald và dấu tích xác nhận.
2. **Khu vực Sidebar (Kho Khối Prompt)**:
   * Khi chọn Tiếng Anh:
     * Các danh mục hiển thị: *Persona & Role*, *Context & Background*, *Task & Instructions*, *Rules & Constraints*, *Tone & Style*, *Output Format*, *Few-shot Examples*, *Custom Blocks*.
     * Mô tả danh mục và nhãn tìm kiếm chuyển sang tiếng Anh.
     * Các khối mẫu sẵn chuyển nội dung prompt và biến số sang chuẩn tiếng Anh (ví dụ: `{{technology_stack |* React 19, TypeScript, Node.js}}`, `{{target_audience |* Developers, Startup Founders}}`).
3. **Bảng Ghép nối (Prompt Canvas) & Kết quả (Output Panel)**:
   * Các nhãn điều khiển: "Thêm khối" -> "Add Block", "Xóa tất cả" -> "Clear Canvas", "Prompt đã trộn" -> "Compiled Prompt", "Chế độ xem Markdown / XML" -> "Markdown / XML View", "Kiểm tra với AI" -> "Test with AI".
   * Các biến số và dropdown lựa chọn hiển thị nhãn tiếng Anh trực quan.

---

## 3. Key Product Decisions & Trade-Offs

* **Quyết định 1: Tạo mô-đun dịch Type-Safe chuyên biệt (`src/i18n/`) thay vì cài thêm thư viện npm nặng nề**:
  * *Lý do*: Giữ cho bundle size cực nhỏ, tải nhanh tức thì, không gây xung đột kiểu dữ liệu, dễ dàng bảo trì và bổ sung ngôn ngữ thứ ba (như Nhật, Hàn, Pháp) trong tương lai.
  * *Kiến trúc*: Định nghĩa từ điển `vi.ts` và `en.ts` với đầy đủ khóa định danh dạng phân cấp (`common`, `navbar`, `sidebar`, `canvas`, `output`, `modals`, `categories`, `errors`).
* **Quyết định 2: Chiến lược Quản lý Mẫu Prompt Mặc định (Default Templates)**:
  * *Lựa chọn*: Tách biệt dữ liệu mẫu thành `DEFAULT_BLOCKS_VI` và `DEFAULT_BLOCKS_EN` trong `src/db/defaultData.ts`.
  * *Cơ chế hiển thị*: Đối với các khối hệ thống (có ID bắt đầu bằng `block-`), ứng dụng sẽ tự động ánh xạ nội dung tương ứng theo ngôn ngữ hiện hành khi duyệt hoặc kéo thả vào Canvas. Đối với các khối do người dùng tự lưu (`isCustom: true`), dữ liệu được giữ nguyên vẹn.
* **Quyết định 3: Tích hợp trực tiếp vào Context chung (`LanguageContext` hoặc mở rộng `PromptMixerContext`)**:
  * *Lý do*: Đảm bảo mọi thành phần trong ứng dụng nhận diện ngay lập tức sự thay đổi ngôn ngữ mà không cần reload trang.

---

## 4. Technical Architecture & Data Strategy

### Cấu trúc Thư mục Mới

```
src/
├── i18n/
│   ├── index.ts               # Core i18n helper, useTranslation hook, Language type
│   ├── locales/
│   │   ├── vi.ts              # Toàn bộ bản dịch Tiếng Việt
│   │   └── en.ts              # Toàn bộ bản dịch Tiếng Anh
├── context/
│   ├── LanguageContext.tsx    # Context quản lý ngôn ngữ và chuyển đổi realtime
├── db/
│   ├── defaultData.ts         # Song ngữ cho DEFAULT_BLOCKS và DEFAULT_PRESETS
├── utils/
│   ├── categoryMeta.ts        # Hỗ trợ hàm getCategoryMeta(categoryId, lang)
```

### Schema & Interface Mở rộng

```typescript
export type Language = 'vi' | 'en';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}
```

---

## 5. Implementation Phases & Step-by-Step Milestones

### Giai đoạn 1: Xây dựng Nền tảng i18n & Từ điển Dịch thuật (Foundation)
1. Tạo thư mục `src/i18n/` và file định nghĩa bản dịch `vi.ts`, `en.ts`.
2. Dịch toàn diện các chuỗi văn bản cho:
   - Header, Navbar, Dropdown menu, Trạng thái đồng bộ.
   - Sidebar, Danh mục, Bộ lọc, Thẻ tag.
   - Canvas, Quản lý khối, Tiền tố / Hậu tố, Biến số tự do & Dropdown.
   - Output Panel, Token counter, Bộ copy, Chế độ xem Markdown/XML, Trình test AI Playground.
   - Các cửa sổ: Cài đặt Dữ liệu, Presets, Block Editor, History, Share, Import Conflict Resolver, Zero-Knowledge Sync, Pro Upgrade, AI Config.
3. Tạo `LanguageContext.tsx` và hook `useTranslation()`, tự động đọc/ghi `localStorage`.

### Giai đoạn 2: Song ngữ Thư viện Mẫu Prompt & Danh mục (Template Library)
1. Cập nhật `src/utils/categoryMeta.ts` để hỗ trợ hiển thị song ngữ cho 8 danh mục cốt lõi.
2. Bổ sung `DEFAULT_BLOCKS_EN` và `DEFAULT_PRESETS_EN` trong `src/db/defaultData.ts` với nội dung chuẩn hóa bằng tiếng Anh.
3. Cập nhật `PromptMixerContext.tsx` để đồng bộ thư viện mẫu hiển thị theo ngôn ngữ hiện hành.

### Giai đoạn 3: Cập nhật Giao diện & Hộp thoại Cài đặt (UI Components)
1. Thêm bộ chuyển đổi ngôn ngữ trực quan vào `DatabaseModal.tsx` (thêm Tab "Giao diện & Cài đặt chung / Settings").
2. Bổ sung nút chuyển nhanh ngôn ngữ (Cờ 🇻🇳 / 🇬🇧) trên Navbar để tối ưu trải nghiệm người dùng quốc tế.
3. Thay thế toàn bộ hardcoded text trong các component bằng hook `t(...)`.

### Giai đoạn 4: Kiểm thử, Tối ưu & Hoàn thiện (Verification & Polish)
1. Kiểm tra chuyển đổi qua lại giữa Tiếng Việt và Tiếng Anh trên tất cả các trang và modal.
2. Xác minh hoạt động lưu trữ biến số, trình biên dịch prompt Markdown/XML, và gọi thử nghiệm AI bằng tiếng Anh.
3. Kiểm tra kiểm thử biên dịch ứng dụng (`compile_applet`).

---

## 6. Verification Plan

* **Kiểm tra Chuyển đổi Ngôn ngữ**:
  - Mở Hộp thoại Cài đặt -> Chọn Tiếng Anh -> Kiểm tra toàn bộ UI lập tức chuyển sang English.
  - Tải lại trang (F5) -> Xác minh tùy chọn ngôn ngữ được lưu trong `localStorage`.
* **Kiểm tra Thư viện Mẫu Prompt**:
  - Khi ở Tiếng Anh: Các khối mẫu hiển thị tiêu đề, mô tả và nội dung tiếng Anh.
  - Khi kéo khối vào Canvas: Nội dung và các gợi ý biến số chuyển sang tiếng Anh chuẩn xác.
  - Các khối tùy chỉnh do người dùng tạo không bị ảnh hưởng.
* **Kiểm tra Biên dịch & Xuất Prompt**:
  - Kiểm tra xem Markdown/XML view hoạt động mượt mà với cả văn bản tiếng Anh và tiếng Việt.
* **Kiểm tra Build Code**:
  - Chạy `compile_applet` để đảm bảo không có lỗi type TypeScript hoặc lỗi cú pháp nào.
