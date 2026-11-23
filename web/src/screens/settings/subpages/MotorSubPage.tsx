import { useState } from 'react';
import { Play } from 'lucide-react';
import { theme } from '../theme';
import { WHEEL_IDS, type DriveProfile, type WheelId } from '../../../drive/driveModel';
import { DarkNumericSetting } from '../sharedControls';
import { Slider, Switch } from '../../../ui/controls';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface MotorSubPageProps {
  profile: DriveProfile;
  onUpdate: (p: DriveProfile) => void;
  /** Gạt công tắc Đảo chiều: đang kết nối thì áp dụng xuống xe ngay. */
  onInvertChange: (wheel: WheelId, inverted: boolean) => void;
  /** Bắt đầu giữ nút KIỂM TRA của 1 bánh. */
  onTestStart: (wheel: WheelId) => void;
  /** Thả nút KIỂM TRA. */
  onTestEnd: () => void;
}

export function MotorSubPage({
  profile,
  onUpdate,
  onInvertChange,
  onTestStart,
  onTestEnd,
}: MotorSubPageProps) {
  const [accel, setAccel] = useState(profile.softAccelMs);

  return (
    <View style={s.container}>
      {/* Kiểm tra từng động cơ & Đảo chiều */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Kiểm tra từng động cơ & Đảo chiều</Text>
        <Text style={s.hintText}>
          Kê xe lên cho bánh không chạm đất, rồi nhấn giữ KIỂM TRA: bánh đó quay thử theo chiều TIẾN (40 %), thả tay là dừng.
          Bánh quay ngược thì gạt Đảo chiều: khi đang kết nối, xe đổi chiều động cơ ngay (lưu luôn vào xe).
        </Text>

        <View style={s.motorGrid}>
          {WHEEL_IDS.map((w) => (
            <View key={w} style={s.motorCard}>
              <View style={s.motorHeader}>
                <Text style={s.motorName}>BÁNH {w.toUpperCase()}</Text>
                <View style={s.invertRow}>
                  <Text style={s.invertLabel}>Đảo chiều</Text>
                  <Switch
                    label={`Đảo chiều động cơ ${w.toUpperCase()}`}
                    value={profile.motors[w].inverted}
                    onValueChange={(v) => onInvertChange(w, v)}
                    trackColor={{ false: theme.border, true: theme.accent }}
                    thumbColor={
                      profile.motors[w].inverted ? '#fff' : theme.textMuted
                    }
                  />
                </View>
              </View>

              <Pressable
                label={`Nhấn giữ để kiểm tra động cơ ${w.toUpperCase()}`}
                onPressIn={() => onTestStart(w)}
                onPressOut={onTestEnd}
                style={({ pressed }) => [
                  s.motorTestButton,
                  pressed && s.motorTestButtonPressed,
                ]}
              >
                <Play color="#fff" size={16} />
                <Text style={s.motorTestText}>KIỂM TRA</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Tăng tốc mềm */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Tăng tốc mềm (Soft Acceleration)</Text>
        <Text style={s.hintText}>
          Thời gian chuyển đổi mượt mà khi tăng/giảm ga để bảo vệ động cơ và chống trượt bánh.
        </Text>

        <View style={s.accelCard}>
          <View style={s.accelHeader}>
            <Text style={s.accelLabel}>Thời gian gia tốc</Text>
            <Text style={s.accelReadout}>{accel} ms</Text>
          </View>
          <Slider
            label="Thời gian tăng tốc mềm"
            min={0}
            max={400}
            step={10}
            value={accel}
            onValueChange={(v) => setAccel(Math.round(v))}
            onSlidingComplete={(v) =>
              onUpdate({ ...profile, softAccelMs: Math.round(v) })
            }
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.cardBorder}
            thumbTintColor={theme.accent}
            style={s.slider}
          />
          <DarkNumericSetting
            label="Nhập chính xác"
            value={profile.softAccelMs}
            min={0}
            max={400}
            suffix="ms"
            onChange={(v) =>
              onUpdate({ ...profile, softAccelMs: Math.round(v) })
            }
          />
        </View>
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
  motorGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  motorCard: {
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  motorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  motorName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 800,
  },
  invertRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  invertLabel: {
    color: theme.textMuted,
    fontSize: 11,
  },
  motorTestButton: {
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 8,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
  },
  motorTestButtonPressed: {
    backgroundColor: theme.accentHover,
  },
  motorTestText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
  },
  accelCard: {
    gap: 8,
    marginTop: 4,
  },
  accelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accelLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 700,
  },
  accelReadout: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: 800,
  },
  slider: {
    width: '100%',
  },
};
