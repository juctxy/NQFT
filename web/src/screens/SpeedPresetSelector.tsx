import { SPEED_LEVEL_LABELS, SPEED_LEVELS, WHEEL_IDS, type SpeedLevel } from '../drive/driveModel';
import { Pressable, Text, View, type Style } from '../ui/rn';

const formatPwm = (pwm: number) => {
  const value = Math.round(pwm);
  return value > 0 ? `+${value}` : `${value}`;
};

export function SpeedPresetSelector({
  level,
  wheelPwm,
  ready,
  onSelectLevel,
}: {
  level: SpeedLevel;
  wheelPwm: Record<(typeof WHEEL_IDS)[number], number>;
  ready: boolean;
  onSelectLevel: (l: SpeedLevel) => void;
}) {
  return (
    <View style={s.root}>
      <View role="group" aria-label="Mức tốc độ" style={s.levels}>
        {SPEED_LEVELS.map((speedLevel) => {
          const selected = speedLevel === level;
          return (
            <Pressable
              key={speedLevel}
              label={`Mức tốc độ: ${SPEED_LEVEL_LABELS[speedLevel]}`}
              selected={selected}
              disabled={!ready}
              onPress={() => onSelectLevel(speedLevel)}
              style={({ pressed }) => [
                s.levelButton,
                selected && s.levelButtonSelected,
                pressed && s.pressed,
                !ready && s.disabled,
              ]}
            >
              <Text style={[s.levelText, selected && s.levelTextSelected]}>{SPEED_LEVEL_LABELS[speedLevel]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View role="group" aria-label="PWM lệnh tính cho từng bánh" style={s.readouts}>
        {WHEEL_IDS.map((wheel) => (
          <View key={wheel} style={s.readout}>
            <Text style={s.wheelLabel}>{wheel.toUpperCase()}:</Text>
            <Text style={s.pwmValue}>{formatPwm(wheelPwm[wheel])}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  root: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  levels: { flexDirection: 'row', flexShrink: 0, gap: 5 },
  levelButton: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 9,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    minWidth: 68,
    paddingLeft: 8,
    paddingRight: 8,
    width: 68,
  },
  levelButtonSelected: {
    backgroundColor: '#f47518',
    borderColor: '#f47518',
    boxShadow: '0px 3px 8px rgba(244,117,24,0.28)',
  },
  levelText: { color: '#06324d', fontSize: 12, fontWeight: 800 },
  levelTextSelected: { color: '#fff' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  readouts: {
    alignContent: 'center',
    display: 'grid',
    flexShrink: 0,
    gap: '0 4px',
    gridTemplateColumns: 'repeat(2, 54px)',
    gridTemplateRows: 'repeat(2, 18px)',
    justifyContent: 'center',
    width: 112,
  },
  readout: { alignItems: 'center', flexDirection: 'row', gap: 2, justifyContent: 'center' },
  wheelLabel: { color: '#334155', flexShrink: 0, fontSize: 9, fontWeight: 700, width: 18 },
  pwmValue: { color: '#f47518', flexShrink: 0, fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 800, textAlign: 'right', width: 30 },
};
