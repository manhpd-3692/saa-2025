import type { LocalizedText } from "@/i18n/localized-text";

/**
 * F004 FR-001 / BR-001: the six SAA 2025 awards, defined once and read by the
 * Homepage cards and the Awards Information page. Array order is display order.
 * Static content shipped with the app (D006); copy transcribed verbatim from the
 * Figma frames Homepage SAA 2167:9026 and Hệ thống giải 313:8436. No English
 * description was supplied, so English shows the Vietnamese text (D004).
 */

export type AwardUnit = "individual" | "team" | "individualOrTeam";
/** Line under a prize value: "cho mỗi giải thưởng", "cho giải cá nhân", "cho giải tập thể" or none. */
export type AwardPrizeNote = "each" | "individual" | "team" | null;

export interface AwardPrize {
  valueVnd: number;
  note: AwardPrizeNote;
}

export interface Award {
  /** URL fragment on `/awards` (FR-102) and the card's element id. */
  slug: string;
  /** Card title. */
  name: LocalizedText;
  /** Sticky menu label (FR-302). */
  menuLabel: LocalizedText;
  /** One-line text on the Homepage card (FR-206). */
  summary: LocalizedText;
  /** Awards page description; `\n\n` separates paragraphs, `\n` breaks a line. */
  description: LocalizedText;
  quantity: number;
  unit: AwardUnit;
  /** One value, or individual then team for Signature 2025 - Creator (BR-002). */
  prizes: readonly AwardPrize[];
  /** 350 × 350 crop: the 336 px framed artwork plus its 7 px glow on each side. */
  image: string;
}

const image = (slug: string) => `/images/awards/award-${slug}.webp`;
const EACH: AwardPrizeNote = "each";
const MANAGER_SUMMARY = "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm";

export const AWARDS: readonly Award[] = [
  {
    slug: "top-talent",
    name: { vi: "Top Talent" },
    menuLabel: { vi: "Top Talent" },
    summary: { vi: "Vinh danh top cá nhân xuất sắc trên mọi phương diện" },
    description: {
      vi: "Giải thưởng Top Talent vinh danh những cá nhân xuất sắc toàn diện – những người không ngừng khẳng định năng lực chuyên môn vững vàng, hiệu suất công việc vượt trội, luôn mang lại giá trị vượt kỳ vọng, được đánh giá cao bởi khách hàng và đồng đội. Với tinh thần sẵn sàng nhận mọi nhiệm vụ tổ chức giao phó, họ luôn là nguồn cảm hứng, thúc đẩy động lực và tạo ảnh hưởng tích cực đến cả tập thể.",
    },
    quantity: 10,
    unit: "individual",
    prizes: [{ valueVnd: 7_000_000, note: EACH }],
    image: image("top-talent"),
  },
  {
    slug: "top-project",
    name: { vi: "Top Project" },
    menuLabel: { vi: "Top Project" },
    summary: { vi: "Vinh danh dự án xuất sắc trên mọi phương diện, dự án có doanh thu nổi bật" },
    description: {
      vi: "Giải thưởng Top Project vinh danh các tập thể dự án xuất sắc với kết quả kinh doanh vượt kỳ vọng, hiệu quả vận hành tối ưu và tinh thần làm việc tận tâm. Đây là các dự án có độ phức tạp kỹ thuật cao, hiệu quả tối ưu hóa nguồn lực và chi phí tốt, đề xuất các ý tưởng có giá trị cho khách hàng, đem lại lợi nhuận vượt trội và nhận được phản hồi tích cực từ khách hàng. Các thành viên tuân thủ nghiêm ngặt các tiêu chuẩn phát triển nội bộ trong phát triển dự án, tạo nên một hình mẫu về sự xuất sắc và chuyên nghiệp.",
    },
    quantity: 2,
    unit: "team",
    prizes: [{ valueVnd: 15_000_000, note: EACH }],
    image: image("top-project"),
  },
  {
    slug: "top-project-leader",
    name: { vi: "Top Project Leader" },
    menuLabel: { vi: "Top Project Leader" },
    summary: { vi: "Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá," },
    description: {
      vi: "Giải thưởng Top Project Leader vinh danh những nhà quản lý dự án xuất sắc – những người hội tụ năng lực quản lý vững vàng, khả năng truyền cảm hứng mạnh mẽ, và tư duy “Aim High – Be Agile” trong mọi bài toán và bối cảnh. Dưới sự dẫn dắt của họ, các thành viên không chỉ cùng nhau vượt qua thử thách và đạt được mục tiêu đề ra, mà còn giữ vững ngọn lửa nhiệt huyết, tinh thần Wasshoi, và trưởng thành để trở thành phiên bản tinh hoa – hạnh phúc hơn của chính mình.",
    },
    quantity: 3,
    unit: "individual",
    prizes: [{ valueVnd: 7_000_000, note: EACH }],
    image: image("top-project-leader"),
  },
  {
    slug: "best-manager",
    name: { vi: "Best Manager" },
    menuLabel: { vi: "Best Manager" },
    summary: { vi: MANAGER_SUMMARY },
    description: {
      vi: "Giải thưởng Best Manager vinh danh những nhà lãnh đạo tiêu biểu – người đã dẫn dắt đội ngũ của mình tạo ra kết quả vượt kỳ vọng, tác động nổi bật đến hiệu quả kinh doanh và sự phát triển bền vững của tổ chức. Dưới sự lãnh đạo của họ, đội ngũ luôn chinh phục và làm chủ mọi mục tiêu bằng năng lực đa nhiệm, khả năng phối hợp hiệu quả, và tư duy ứng dụng công nghệ linh hoạt trong kỷ nguyên số. Họ truyền cảm hứng để tập thể trở nên tự tin tràn đầy năng lượng, sẵn sàng đón nhận, thậm chí dẫn dắt tạo ra những thay đổi có tính cách mạng.",
    },
    quantity: 1,
    unit: "individual",
    prizes: [{ valueVnd: 10_000_000, note: null }],
    image: image("best-manager"),
  },
  {
    slug: "signature-2025-creator",
    name: { vi: "Signature 2025 - Creator" },
    menuLabel: { vi: "Signature 2025 - Creator" },
    summary: { vi: MANAGER_SUMMARY },
    description: {
      vi: "Giải thưởng Signature vinh danh cá nhân hoặc tập thể thể hiện tinh thần đặc trưng mà Sun* hướng tới trong từng thời kỳ.\n\nTrong năm 2025, giải thưởng Signature vinh danh Creator - cá nhân/tập thể mang tư duy chủ động và nhạy bén, luôn nhìn thấy cơ hội trong thách thức và tiên phong trong hành động. Họ là những người nhạy bén với vấn đề, nhanh chóng nhận diện và đưa ra những giải pháp thực tiễn, mang lại giá trị rõ rệt cho dự án, khách hàng hoặc tổ chức. Với tư duy kiến tạo và tinh thần “Creator” đặc trưng của Sun*, họ không chỉ phản ứng tích cực trước sự thay đổi mà còn chủ động tạo ra cải tiến, góp phần định hình chuẩn mực mới cho cách mà người Sun* tạo giá trị.",
    },
    quantity: 1,
    unit: "individualOrTeam",
    prizes: [
      { valueVnd: 5_000_000, note: "individual" },
      { valueVnd: 8_000_000, note: "team" },
    ],
    image: image("signature-2025-creator"),
  },
  {
    slug: "mvp",
    name: { vi: "MVP (Most Valuable Person)" },
    menuLabel: { vi: "MVP" },
    summary: { vi: MANAGER_SUMMARY },
    description: {
      vi: "Giải thưởng MVP vinh danh cá nhân xuất sắc nhất năm – gương mặt tiêu biểu đại diện cho toàn bộ tập thể Sun*.\nHọ là người đã thể hiện năng lực vượt trội, tinh thần cống hiến bền bỉ, và tầm ảnh hưởng sâu rộng, để lại dấu ấn mạnh mẽ trong hành trình của Sun* suốt năm qua.\n\nKhông chỉ nổi bật bởi hiệu suất và kết quả công việc, họ còn là nguồn cảm hứng lan tỏa – thông qua suy nghĩ, hành động và ảnh hưởng tích cực của mình đối với tập thể.\nMVP là người hội tụ đầy đủ phẩm chất của người Sun* ưu tú, đồng thời mang trên mình trọng trách lớn lao: trở thành hình mẫu đại diện cho con người và tinh thần Sun*, góp phần dẫn dắt tập thể vươn tới những đỉnh cao mới.",
    },
    quantity: 1,
    unit: "individual",
    prizes: [{ valueVnd: 15_000_000, note: null }],
    image: image("mvp"),
  },
];

/** "7.000.000 VNĐ": dot-grouped thousands, as written in the design. */
export function formatVnd(valueVnd: number): string {
  return `${String(valueVnd).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} VNĐ`;
}

/** Award count as shown on the card: "10", "02", "01". */
export function formatAwardQuantity(quantity: number): string {
  return String(quantity).padStart(2, "0");
}

/** BR-003: the award slug in a `#fragment`, or null when it names no award. */
export function awardSlugFromHash(hash: string): string | null {
  const slug = hash.startsWith("#") ? hash.slice(1) : "";
  return AWARDS.some((award) => award.slug === slug) ? slug : null;
}
