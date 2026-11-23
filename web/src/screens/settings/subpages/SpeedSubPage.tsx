import { theme } from '../theme';
import {
  SPEED_LEVEL_LABELS,
  SPEED_LEVELS,
  type DriveProfile,
  type LevelSpeeds,
  type SpeedLevel,
} from '../../../drive/driveModel';
import { DarkSpeedSetting } from '../sharedControls';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

const SPEED_LABELS: Record<keyof LevelSpeeds, string> = {
  vFwd: 'Tiến / lùi (V_fwd)',
  vSide: 'Di chuyển ngang (V_side)',
  vTurn: 'Quay tại chỗ (V_turn)',
};

interface SpeedSubPageProps {
  profile: DriveProfile;
  level: SpeedLevel;
  onUpdate: (p: DriveProfile) => void;
  onSelectLevel: (l: SpeedLevel) => void;
}

export function SpeedSubPage({
  profile,
  level,
  onUpdate,
  onSelectLevel,
}: SpeedSubPageProps) {
  return (
    <View style={s.container}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Mức tốc độ</Text>
        <View style={s.levelOptions}>
          {SPEED_LEVELS.map((l) => (
            <Pressable
              key={l}
              selected={level === l}
              onPress={() => onSelectLevel(l)}
              style={[s.levelButton, level === l && s.levelButtonSelected]}
            >
              <Text style={[s.levelText, level === l && s.levelTextSelected]}>
                {SPEED_LEVEL_LABELS[l]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.hintText}>
          Mỗi mức lưu riêng tốc độ từng trục (chỉ nhận số nguyên PWM 0–255).
        </Text>

        <View style={s.speedList}>
          {(['vFwd', 'vSide', 'vTurn'] as const)
            .filter((k) => k !== 'vSide' || profile.wheelType !== 'standard')
            .map((k) => (
              <DarkSpeedSetting
                key={`${level}-${k}`}
                label={SPEED_LABELS[k]}
                value={profile.levels[level][k]}
                minPwm={profile.minPwm}
                onChange={(v) =>
                  onUpdate({
                    ...profile,
                    levels: {
                      ...profile.levels,
                      [level]: { ...profile.levels[level], [k]: Math.round(v) },
                    },
                  })
                }
              />
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
  speedList: {
    gap: 10,
    marginTop: 6,
  },
};
