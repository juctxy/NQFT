// Màn hình hướng dẫn — chuyển từ InstructionsScreen của NQFT.
import { ArrowLeftCircle, BookOpen } from 'lucide-react';
import { Pressable, Text, View, shadow, type Style } from '../ui/rn';

// Nội dung lấy từ bản gốc; mục 2 và 4 được sửa cho đúng với app này
// (bản gốc nói thanh M1/M2 — không có trên giao diện — và "BLE chưa gửi lệnh").
const GUIDES = [
  {
    number: '1',
    title: 'Joystick Điều Hướng (Trái)',
    body: 'Kéo cần gạt theo 8 hướng để điều khiển robot tiến, lùi, rẽ trái/phải hoặc di chuyển chéo. Thả tay ra robot tự động dừng (STOP).',
  },
  {
    number: '2',
    title: 'Mức Tốc Độ & Hồ Sơ A/B',
    body: 'Chạm ô mức tốc độ ở giữa thanh trên để đổi Chậm / Vừa / Nhanh ngay khi xe đang chạy. Nút A, B chọn nhanh 2 hồ sơ đầu tiên.',
  },
  {
    number: '3',
    title: 'Cụm Nút Hành Động (Phải)',
    body: 'Gồm nút CẢN (phòng thủ), SÚT (kích hoạt cơ cấu sút bóng) cùng 2 nút mở rộng FUNC 3 và FUNC 4.',
  },
  {
    number: '4',
    title: 'Chế Độ Lái & Hồ Sơ',
    body: 'Trong Settings, chọn Standard, Omni hoặc Mecanum rồi chỉnh V_fwd, V_side, V_turn cho từng mức tốc độ. Hồ sơ lưu trên điện thoại; xuất/nhập được bằng tệp JSON. Lệnh lái gửi qua BLE tới ESP32 30 lần/giây.',
  },
];

function GuideCard({ number, title, body }: (typeof GUIDES)[number]) {
  return (
    <View style={s.guideCard}>
      <View style={s.guideHeader}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{number}</Text>
        </View>
        <Text style={s.guideTitle}>{title}</Text>
      </View>
      <Text style={s.guideBody}>{body}</Text>
    </View>
  );
}

export function InstructionsScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.page}>
          <View style={s.card}>
            <View style={s.header}>
              <View style={s.titleRow}>
                <BookOpen color="#f47518" size={20} />
                <Text style={s.title}>INSTRUCTION — HƯỚNG DẪN SỬ DỤNG</Text>
              </View>
              <Pressable onPress={onBack} style={({ pressed }) => [s.backButton, pressed && s.pressed]}>
                <ArrowLeftCircle color="#fff" size={16} />
                <Text style={s.backText}>BACK</Text>
              </Pressable>
            </View>
            <View style={s.body}>
              <View style={s.guideRow}>
                <GuideCard {...GUIDES[0]} />
                <GuideCard {...GUIDES[1]} />
              </View>
              <View style={s.guideRow}>
                <GuideCard {...GUIDES[2]} />
                <GuideCard {...GUIDES[3]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  root: { flex: '1 1 0%', backgroundColor: '#e2e8f0', overflowY: 'auto' },
  content: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: 16 },
  page: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  card: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 760,
    overflow: 'hidden',
    width: '100%',
    ...shadow('#06324d', 0.18, 15, 12),
  },
  header: { alignItems: 'center', backgroundColor: '#06324d', flexDirection: 'row', justifyContent: 'space-between', padding: '14px 22px' },
  titleRow: { alignItems: 'center', flex: '1 1 0%', flexDirection: 'row', gap: 10, marginRight: 12 },
  title: { color: '#fff', flexShrink: 1, fontSize: 16, fontWeight: 700, letterSpacing: 0.5 },
  backButton: { alignItems: 'center', backgroundColor: '#f47518', borderRadius: 10, flexDirection: 'row', gap: 6, padding: '8px 14px' },
  backText: { color: '#fff', fontSize: 12, fontWeight: 700 },
  body: { gap: 14, padding: '20px 22px' },
  guideRow: { flexDirection: 'row', gap: 14 },
  guideCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderLeftColor: '#f47518',
    borderLeftWidth: 4,
    borderRadius: 12,
    flex: '1 1 0%',
    gap: 6,
    padding: '14px 16px',
  },
  guideHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  badge: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 11, height: 22, justifyContent: 'center', width: 22 },
  badgeText: { color: '#f47518', fontSize: 12, fontWeight: 800 },
  guideTitle: { color: '#06324d', flex: '1 1 0%', fontSize: 14, fontWeight: 700 },
  guideBody: { color: '#475569', fontSize: 12.5, lineHeight: '18.75px' },
  pressed: { backgroundColor: '#10b981' },
};
