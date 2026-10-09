export const PRESET_VARIABLE_OPTIONS: Record<string, { label: string; mode: 'single' | 'multi'; options: string[] }> = {
  technology_stack: {
    label: 'Công nghệ / Tech Stack',
    mode: 'multi',
    options: [
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'Next.js 15',
      'Node.js / Express',
      'Python / FastAPI',
      'PostgreSQL',
      'SQLite / IndexedDB',
      'Docker & Kubernetes',
      'GraphQL',
    ],
  },
  tech_stack: {
    label: 'Tech Stack',
    mode: 'multi',
    options: ['React', 'TypeScript', 'Vue 3', 'Node.js', 'Python', 'Go', 'PostgreSQL', 'Tailwind CSS'],
  },
  framework: {
    label: 'Framework',
    mode: 'single',
    options: ['React & Vite', 'Next.js App Router', 'Vue 3 & Vite', 'Express.js', 'FastAPI', 'Spring Boot', 'Laravel', 'Flutter'],
  },
  language_runtime: {
    label: 'Ngôn ngữ / Runtime',
    mode: 'single',
    options: ['TypeScript 5.8 trên Node 22', 'JavaScript ES2024', 'Python 3.12', 'Go 1.23', 'Rust 1.80', 'Java 21 LTS'],
  },
  database: {
    label: 'Cơ sở dữ liệu',
    mode: 'single',
    options: ['IndexedDB / Client Storage', 'SQLite', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase'],
  },
  niche: {
    label: 'Lĩnh vực / Niche',
    mode: 'single',
    options: [
      'B2B SaaS & Phần mềm năng suất',
      'Thương mại điện tử & Bán lẻ',
      'Fintech & Dịch vụ tài chính',
      'EdTech & Giáo dục trực tuyến',
      'HealthTech & Sức khỏe',
      'AI & Tự động hóa quy trình',
      'Marketing & Sáng tạo nội dung',
      'Bất động sản & Du lịch',
    ],
  },
  domain: {
    label: 'Chuyên môn / Ngành',
    mode: 'single',
    options: [
      'Customer Sentiment & NPS Analytics',
      'Predictive Modeling & Time Series',
      'Natural Language Processing (NLP)',
      'Computer Vision & OCR',
      'Recommendation Systems',
      'Risk Assessment & Fraud Detection',
    ],
  },
  target_audience: {
    label: 'Đối tượng mục tiêu',
    mode: 'multi',
    options: [
      'Lập trình viên & Kỹ sư phần mềm',
      'Nhà sáng lập Startup & CEO',
      'Trưởng phòng Marketing & Growth',
      'Người dùng phổ thông / Khách hàng cá nhân',
      'Học sinh & Sinh viên',
      'Doanh nghiệp vừa và nhỏ (SMB)',
      'Chuyên gia kỹ thuật cấp cao',
    ],
  },
  product_type: {
    label: 'Loại sản phẩm',
    mode: 'single',
    options: [
      'Ứng dụng web SaaS B2B',
      'Ứng dụng di động (Mobile App)',
      'Tiện ích mở rộng trình duyệt (Browser Extension)',
      'Nền tảng thương mại điện tử (E-commerce)',
      'Bộ công cụ API & SDK dành cho lập trình viên',
      'Khóa học trực tuyến & Cộng đồng số',
    ],
  },
  market_region: {
    label: 'Khu vực thị trường',
    mode: 'single',
    options: ['Toàn cầu (Global)', 'Việt Nam & Đông Nam Á', 'Bắc Mỹ (US/Canada)', 'Châu Âu (EU)', 'Châu Á - Thái Bình Dương'],
  },
  learner_level: {
    label: 'Trình độ người học',
    mode: 'single',
    options: ['Người mới bắt đầu (Beginner)', 'Trung cấp (Intermediate)', 'Nâng cao / Chuyên sâu (Advanced)', 'Chuyên gia nghiên cứu'],
  },
  subject: {
    label: 'Chủ đề giảng dạy',
    mode: 'single',
    options: [
      'Cấu trúc dữ liệu & Giải thuật',
      'Kinh tế học vi mô & Tài chính',
      'Trí tuệ nhân tạo & Machine Learning',
      'Thiết kế hệ thống phân tán',
      'Tâm lý học hành vi người tiêu dùng',
      'Kỹ năng viết lách & Giao tiếp thuyết phục',
    ],
  },
  campaign_goal: {
    label: 'Mục tiêu chiến dịch',
    mode: 'single',
    options: [
      'Landing Page Hero Headline & Subhead',
      'Chuỗi Email chào mừng chuyển đổi cao',
      'Quảng cáo Meta/TikTok thu hút Lead',
      'Bài viết Thought Leadership trên LinkedIn',
      'Kịch bản Video ngắn viral',
    ],
  },
  variation_count: {
    label: 'Số lượng biến thể',
    mode: 'single',
    options: ['3', '5', '7', '10'],
  },
  max_word_limit: {
    label: 'Giới hạn số từ',
    mode: 'single',
    options: ['100', '250', '500', '800', '1200'],
  },
  tone: {
    label: 'Giọng điệu (Tone)',
    mode: 'multi',
    options: [
      'Chuyên nghiệp & Chuẩn mực',
      'Hài hước & Gần gũi',
      'Súc tích & Thẳng thắn',
      'Thuyết phục & Hùng biện',
      'Hàn lâm & Nghiêm ngặt',
      'Truyền cảm hứng & Năng lượng',
    ],
  },
  output_format: {
    label: 'Định dạng đầu ra',
    mode: 'single',
    options: [
      'Markdown có phân cấp đề mục',
      'Bảng so sánh chi tiết (Table)',
      'Danh sách checklist từng bước',
      'JSON Schema có cấu trúc',
      'Đoạn văn ngắn súc tích',
    ],
  },
  role: {
    label: 'Vai trò chuyên gia',
    mode: 'single',
    options: [
      'Senior Software Engineer & Tech Lead',
      'Creative Copywriter & Content Strategist',
      'Data Scientist & ML Engineer',
      'Executive Coach & Leadership Advisor',
      'Product Manager & UX Specialist',
    ],
  },
  core_pain_point: {
    label: 'Vấn đề cốt lõi (Pain Point)',
    mode: 'single',
    options: [
      'Tốn quá nhiều thời gian xử lý thủ công',
      'Tỷ lệ chuyển đổi thấp và thiếu tính thuyết phục',
      'Hệ thống khó mở rộng và chi phí vận hành cao',
      'Khó khăn trong việc tuyển dụng và đào tạo nhân sự',
      'Dữ liệu rời rạc, thiếu cái nhìn trực quan',
    ],
  },
  business_objective: {
    label: 'Mục tiêu kinh doanh',
    mode: 'multi',
    options: [
      'Tăng trưởng doanh thu 30%',
      'Cắt giảm thời gian xử lý 50%',
      'Nâng cao sự hài lòng khách hàng (NPS > 70)',
      'Tối ưu hóa chi phí vận hành máy chủ',
      'Xây dựng thương hiệu đầu ngành',
    ],
  },
  complexity_level: {
    label: 'Độ phức tạp',
    mode: 'single',
    options: ['Cơ bản (Beginner)', 'Trung bình (Intermediate)', 'Chuyên sâu (Advanced)', 'Cực đại (Production-Grade)'],
  },
};

export function getVariableDefaultOptions(varName: string) {
  const normalized = varName.toLowerCase().trim();
  if (PRESET_VARIABLE_OPTIONS[normalized]) {
    return PRESET_VARIABLE_OPTIONS[normalized];
  }

  // Fuzzy match
  for (const [key, val] of Object.entries(PRESET_VARIABLE_OPTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }

  return null;
}
