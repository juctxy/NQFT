import { theme } from '../theme';
import { LEVEL_PWM, SPEED_LEVEL_LABELS, SPEED_LEVELS, type SpeedLevel } from '../../../drive/driveModel';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface SpeedSubPageProps {
  level: SpeedLevel;
  onSelectLevel: (l: SpeedLevel) => void;
  /** Xe báo trong code chưa khai báo chân PWM -> không có mức tốc độ. */
  noPwmPin?: boolean;
}

/** Mức tốc độ: PWM cố định cho từng mức, joystick chỉ chọn hướng. */
export function SpeedSubPage({ level, onSelectLevel, noPwmPin = false }: SpeedSubPageProps) {
  return (
    <View style={s.container}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Mức tốc độ</Text>
        {noPwmPin ? (
          <View style={s.warnBox}>
            <Text style={s.warnText}>Trong code chưa set up chân PWM</Text>
            <Text style={s.hintText}>
              Xe luôn chạy PWM 255. Muốn có Chậm / Vừa / Nhanh: khai báo chân PWM (EN) cho cả 4 bánh, ví dụ
              Car.wheelFL(32, 33, 25, false), rồi nạp lại code.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.levelOptions}>
              {SPEED_LEVELS.map((l) => (
                <Pressable
                  key={l}
                  label={`Mức tốc độ: ${SPEED_LEVEL_LABELS[l]} (PWM ${LEVEL_PWM[l]})`}
                  selected={level === l}
                  onPress={() => onSelectLevel(l)}
                  style={[s.levelButton, level === l && s.levelButtonSelected]}
                >
                  <Text style={[s.levelText, level === l && s.levelTextSelected]}>{SPEED_LEVEL_LABELS[l]}</Text>
                  <Text style={[s.pwmText, level === l && s.levelTextSelected]}>PWM {LEVEL_PWM[l]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.hintText}>
              PWM cố định cho mỗi mức. Joystick chọn hướng gần nhất trong 8 hướng (4 hướng thẳng, 4 hướng chéo); tốc độ theo
              mức đang chọn, sau đó mới trừ bù công suất từng bánh.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  container: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: 800,
  },
  hintText: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: '16px',
  },
  levelOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flex: '1 1 0%',
    justifyContent: 'center',
    minHeight: 44,
  },
  levelButtonSelected: {
    backgroundColor: theme.accentBg,
    borderColor: theme.accent,
  },
  levelText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  levelTextSelected: {
    color: theme.accent,
  },
  pwmText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: 600,
    marginTop: 2,
  },
  warnBox: {
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.accent,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  warnText: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 800,
  },
};
