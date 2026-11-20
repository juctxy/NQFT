import { ArrowLeftCircle, BookOpen } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface InstructionsScreenProps {
  onBack: () => void;
}

const INSTRUCTIONS = [
  {
    number: '1',
    title: 'Joystick Điều Hướng (Trái)',
    body: 'Kéo cần gạt theo 8 hướng để điều khiển robot tiến, lùi, rẽ trái/phải hoặc di chuyển chéo. Thả tay ra robot tự động dừng (STOP).',
  },
  {
    number: '2',
    title: 'Thanh Chỉnh Xung M1 & M2',
    body: 'Kéo thanh trượt phía trên để tinh chỉnh độc lập mức công suất PWM (0 – 255) cho Motor trái (M1) và Motor phải (M2).',
  },
  {
    number: '3',
    title: 'Cụm Nút Hành Động (Phải)',
    body: 'Gồm nút CẢN (phòng thủ), SÚT (kích hoạt cơ cấu sút bóng) cùng 2 nút mở rộng FUNC 3 và FUNC 4.',
  },
  {
    number: '4',
    title: 'Chế Độ Lái & Hồ Sơ',
    body: 'Trong Settings, chọn Standard, Omni hoặc Mecanum rồi chỉnh V_main, V_side, V_sub, trim và soft-start. Lưu tối đa 3 hồ sơ trên điện thoại; chọn nhanh hồ sơ trên bộ điều khiển. BLE hiện chỉ kết nối, chưa gửi lệnh đến ESP32.',
  },
];

function GuideCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.guideCard}>
      <View style={styles.guideHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
        <Text style={styles.guideTitle}>{title}</Text>
      </View>
      <Text style={styles.guideBody}>{body}</Text>
    </View>
  );
}

export function InstructionsScreen({ onBack }: InstructionsScreenProps) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BookOpen color="#f47518" size={20} />
            <Text style={styles.title}>INSTRUCTION — HƯỚNG DẪN SỬ DỤNG</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeftCircle color="#fff" size={16} />
            <Text style={styles.backText}>BACK</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.guideRow}>
            <GuideCard {...INSTRUCTIONS[0]} />
            <GuideCard {...INSTRUCTIONS[1]} />
          </View>
          <View style={styles.guideRow}>
            <GuideCard {...INSTRUCTIONS[2]} />
            <GuideCard {...INSTRUCTIONS[3]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 760,
    overflow: 'hidden',
    shadowColor: '#06324d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  guideRow: {
    flexDirection: 'row',
    gap: 14,
  },
  guideCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderLeftColor: '#f47518',
    borderLeftWidth: 4,
    borderRadius: 12,
    flex: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  guideHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  badgeText: {
    color: '#f47518',
    fontSize: 12,
    fontWeight: '800',
  },
  guideTitle: {
    color: '#06324d',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  guideBody: {
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 18.75,
  },
  pressed: {
    backgroundColor: '#10b981',
  },
});
