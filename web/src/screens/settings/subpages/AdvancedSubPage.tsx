import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { theme } from '../theme';
import {
  setMatrixSign,
  WHEEL_IDS,
  type DriveAxis,
  type DriveProfile,
  type MatrixSign,
  type WheelId,
} from '../../../drive/driveModel';
import { DarkNumericSetting } from '../sharedControls';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface AdvancedSubPageProps {
  profile: DriveProfile;
  onUpdate: (p: DriveProfile) => void;
}

function MatrixSignText({ sign }: { sign: MatrixSign }) {
  return (
    <Text
      style={[
        s.matrixSign,
        sign === 1 ? s.signPositive : sign === -1 ? s.signNegative : s.signZero,
      ]}
    >
      {sign === 1 ? '+' : sign === -1 ? '−' : '0'}
    </Text>
  );
}

export function AdvancedSubPage({ profile, onUpdate }: AdvancedSubPageProps) {
  // Closed by default as specified
  const [matrixOpen, setMatrixOpen] = useState(false);

  const axes: { axis: DriveAxis; label: string }[] = [
    { axis: 'fwd', label: 'Tiến' },
    { axis: 'side', label: 'Ngang' },
    { axis: 'turn', label: 'Quay' },
  ];

  return (
    <View style={s.container}>
      {/* 1. Ma trận hướng (Closed by default) */}
      <View style={s.sectionCard}>
        <Pressable
          label="Mở hoặc đóng Ma trận hướng"
          onPress={() => setMatrixOpen((v) => !v)}
          style={s.accordionHeader}
        >
          <View style={s.accordionHeaderLeft}>
            <Text style={s.sectionTitle}>Ma trận hướng (Direction Matrix)</Text>
            <Text style={s.hintText}>
              {profile.customMatrix ? 'Tùy chỉnh' : 'Mặc định'} · {matrixOpen ? 'Nhấn để ẩn' : 'Nhấn để mở'}
            </Text>
          </View>
          <View style={s.accordionIcon}>
            {matrixOpen ? (
              <ChevronUp color={theme.textMuted} size={20} />
            ) : (
              <ChevronDown color={theme.textMuted} size={20} />
            )}
          </View>
        </Pressable>

        {matrixOpen && (
          <View style={s.matrixWrap}>
            <Text style={s.matrixHint}>
              Chạm vào từng ô để đổi dấu (+, −, 0) tương ứng với trục và bánh xe.
            </Text>

            <View style={s.matrixTable}>
              <View style={s.matrixRow}>
                <Text style={s.matrixAxisLabel}>Trục</Text>
                {WHEEL_IDS.map((w) => (
                  <Text key={w} style={s.matrixColumn}>
                    {w.toUpperCase()}
                  </Text>
                ))}
              </View>

              {axes.map(({ axis, label }) => (
                <View key={axis} style={s.matrixRow}>
                  <Text style={s.matrixAxisLabel}>{label}</Text>
                  {WHEEL_IDS.map((w: WheelId) => {
                    const locked = axis === 'side' && profile.wheelType === 'standard';
                    return (
                      <Pressable
                        key={w}
                        label={`${label}, bánh ${w.toUpperCase()}: ${profile.matrix[axis][w]}`}
                        disabled={locked}
                        onPress={() => {
                          const order: MatrixSign[] = [1, -1, 0];
                          const next =
                            order[(order.indexOf(profile.matrix[axis][w]) + 1) % order.length];
                          onUpdate(setMatrixSign(profile, axis, w, next));
                        }}
                        style={[s.matrixCell, locked && s.cellLocked]}
                      >
                        {locked ? (
                          <Text style={s.matrixSign}>—</Text>
                        ) : (
                          <MatrixSignText sign={profile.matrix[axis][w]} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 2. Giới hạn động cơ & Tốc độ */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Giới hạn động cơ (Speed Limits)</Text>
        <Text style={s.hintText}>
          Thiết lập vùng chết PWM tối thiểu và giới hạn trần tốc độ cho hệ thống.
        </Text>

        <View style={s.settingsList}>
          <DarkNumericSetting
            label="PWM tối thiểu (vùng chết)"
            value={profile.minPwm}
            min={0}
            max={profile.maxLimit}
            onChange={(v) => onUpdate({ ...profile, minPwm: Math.round(v) })}
          />
          <DarkNumericSetting
            label="Giới hạn tốc độ tối đa"
            value={profile.maxLimit}
            min={Math.max(1, profile.minPwm)}
            max={255}
            onChange={(v) => onUpdate({ ...profile, maxLimit: Math.round(v) })}
          />
        </View>
      </View>

      {/* 3. Bù công suất từng bánh */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Bù công suất từng bánh (Compensation)</Text>
        <Text style={s.hintText}>
          Giảm bớt công suất từng động cơ (80% – 100%) để triệt tiêu độ lệch khi xe di chuyển thẳng.
        </Text>

        <View style={s.compGrid}>
          {WHEEL_IDS.map((w) => (
            <View key={w} style={s.compItem}>
              <DarkNumericSetting
                label={`Bánh ${w.toUpperCase()}`}
                value={profile.motors[w].compensation}
                min={80}
                max={100}
                suffix="%"
                onChange={(v) =>
                  onUpdate({
                    ...profile,
                    motors: {
                      ...profile.motors,
                      [w]: {
                        ...profile.motors[w],
                        compensation: Math.round(v),
                      },
                    },
                  })
                }
              />
            </View>
          ))}
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
    gap: 14,
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
  accordionHeader: {
    alignItems: 'center',
    cursor: 'pointer',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  accordionHeaderLeft: {
    flex: '1 1 0%',
    gap: 2,
  },
  accordionIcon: {
    paddingLeft: 8,
  },
  matrixWrap: {
    borderTopColor: theme.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 12,
  },
  matrixHint: {
    color: theme.textMuted,
    fontSize: 11,
  },
  matrixTable: {
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 2,
    padding: 8,
  },
  matrixRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    padding: '4px 0',
  },
  matrixAxisLabel: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 700,
    width: 60,
  },
  matrixColumn: {
    color: theme.textMuted,
    flex: '1 1 0%',
    fontSize: 12,
    fontWeight: 800,
    textAlign: 'center',
  },
  matrixCell: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flex: '1 1 0%',
    height: 40,
    justifyContent: 'center',
  },
  cellLocked: {
    backgroundColor: theme.cardDisabled,
    borderColor: theme.borderSubtle,
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  matrixSign: {
    fontSize: 16,
    fontWeight: 800,
  },
  signPositive: {
    color: theme.success,
  },
  signNegative: {
    color: theme.accent,
  },
  signZero: {
    color: theme.textMuted,
  },
  settingsList: {
    gap: 8,
  },
  compGrid: {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  compItem: {
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    padding: '8px 12px',
  },
};
