import type { LocalizedText } from "@/i18n/localized-text";

/**
 * F004 FR-351 / FR-352 copy, transcribed verbatim from Figma frame 1161:8944
 * (Community Standards, D003). Vietnamese master; the design supplies no
 * English text, so English shows the Vietnamese copy (D004). In the design each
 * rule is one sentence; there is no separate title and explanation.
 */
export interface CommunityStandardsContent {
  /** Gold lead paragraph under the page title. */
  lead: LocalizedText;
  /** White sentence introducing the numbered rules. */
  rulesIntro: LocalizedText;
  /** Exactly ten content rules, in order (FR-351). */
  rules: readonly LocalizedText[];
  security: {
    intro: LocalizedText;
    points: readonly LocalizedText[];
    /** Gold support line closing the page. */
    contact: LocalizedText;
  };
}

export const COMMUNITY_STANDARDS: CommunityStandardsContent = {
  lead: {
    vi: "Tiêu chuẩn Cộng đồng (Community Standards) được xây dựng nhằm đảm bảo một môi trường văn minh, an toàn và tích cực cho tất cả thành viên tham gia phong trào ghi nhận, cảm ơn Sun* Kudos.",
  },
  rulesIntro: {
    vi: "Các nội dung phát hiện có một trong những tiêu chí vi phạm bên dưới sẽ được gắn nhãn Spam và được hệ thống chủ động ẩn.",
  },
  rules: [
    { vi: "Sử dụng từ ngữ thô tục, chửi bậy, hay có nội dung xúc phạm, bôi nhọ." },
    { vi: "Đề cập đến các vấn đề chính trị, tôn giáo, phân biệt giới tính." },
    { vi: "Chứa số liệu cụ thể (doanh thu, hợp đồng, KPI, khách hàng, mã dự án, số tài khoản...)." },
    { vi: "Đề cập tên đối tác, khách hàng, tổ chức bên ngoài." },
    { vi: "Chứa thông tin cá nhân (email, số điện thoại, địa chỉ, thông tin gia đình)." },
    { vi: "Gửi lặp lại 3+ tin nhắn có nội dung tương tự nhau trong thời gian ngắn." },
    { vi: "Nội dung Kudos quá ngắn (dưới 30 kí tự), không có ngữ cảnh (“Cảm ơn nhiều”, “Thanks nhé”, “Good job!”)." },
    { vi: "Gửi cho quá nhiều người/nhóm người trong thời gian ngắn (<3s/lời nhắn)." },
    { vi: "Ngôn từ spam (chỉ chứa ký tự như \".\", \",\", \"...\", hay ký tự không có nội dung)." },
    { vi: "Mức độ “tim” tăng đột biến bất thường (theo hành vi người dùng trung bình)." },
  ],
  security: {
    intro: {
      vi: "Sunner cam kết bảo vệ thông tin. Mọi thành viên có trách nhiệm bảo mật nội dung chia sẻ trên hệ thống.",
    },
    points: [
      { vi: "Bảo mật Thông tin: Toàn bộ thông tin Sunner chia sẻ sẽ được bảo mật trên hệ thống." },
      {
        vi: "Phạm vi Chia sẻ: Toàn bộ thông tin nhân sự và dự án trong hệ thống được bảo mật. Sunner vui lòng chỉ chia sẻ trong nội bộ Sun*.",
      },
    ],
    contact: {
      vi: "Liên hệ Hỗ trợ: Mọi thắc mắc, Sunner vui lòng liên hệ đại diện BTC SAA: Slack duong.thi.thuy.an để được hỗ trợ.",
    },
  },
};
