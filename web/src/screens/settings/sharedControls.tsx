import { useEffect, useState } from 'react';
import { theme } from './theme';
import { pwmPercent } from '../../drive/driveModel';
import { Slider } from '../../ui/controls';
import { Pressable, Text, View, type Style } from '../../ui/rn';

/** Ô nhập số có kẹp giá trị khi rời ô / Enter. Dùng theme tối. */
export function DarkNumberInput({
  value,
  onCommit,
  maxLength,
  placeholder,
  label,
}: {
  value: string;
  onCommit: (raw: string) => void;
  maxLength: number;
  placeholder: string;
  label: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <input
      className="rn-input"
      aria-label={label}
      inputMode="numeric"
      maxLength={maxLength}
      placeholder={placeholder}
      value={text}
      style={s.numberInput}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

/** Hàng chỉnh tốc độ PWM 0-255 (chỉ số nguyên). */
export function DarkSpeedSetting({
  label,
  value,
  minPwm,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  minPwm: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = (v: number) => {
    const n = Math.max(0, Math.min(255, Math.round(v)));
    setDraft(n);
    onChange(n);
  };

  const lowPwm = value > 0 && value < minPwm;

  return (
    <View style={s.speedCard}>
      <View style={s.speedTitleRow}>
        <Text style={s.speedLabel}>{label}</Text>
        <Text style={s.speedReadout}>
          {Math.round(value)} · {pwmPercent(Math.round(value))}%
        </Text>
      </View>
      <View style={s.speedControls}>
        <Pressable
          label={`Giảm ${label}`}
          disabled={disabled || value <= 0}
          onPress={() => commit(value - 1)}
          style={[s.stepButton, (disabled || value <= 0) && s.disabled]}
        >
          <Text style={s.stepButtonText}>−</Text>
        </Pressable>
        <Slider
          label={label}
          disabled={disabled}
          min={0}
          max={255}
          value={draft}
          onValueChange={(v) => setDraft(Math.round(v))}
          onSlidingComplete={commit}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor={theme.cardBorder}
          thumbTintColor={theme.accent}
          style={s.speedSlider}
        />
        <Pressable
          label={`Tăng ${label}`}
          disabled={disabled || value >= 255}
          onPress={() => commit(value + 1)}
          style={[s.stepButton, (disabled || value >= 255) && s.disabled]}
        >
          <Text style={s.stepButtonText}>+</Text>
        </Pressable>
        <DarkNumberInput
          label={`Nhập giá trị ${label}`}
          maxLength={3}
          placeholder="PWM"
          value={String(Math.round(draft))}
          onCommit={(raw) => {
            const n = Number(raw);
            if (raw.trim() !== '' && Number.isFinite(n)) commit(n);
            else setDraft(value);
          }}
        />
      </View>
      {lowPwm ? (
        <Text style={s.warningText}>
          PWM đang dưới mức tối thiểu của động cơ ({minPwm}).
        </Text>
      ) : null}
    </View>
  );
}

/** Ô chỉnh số (PWM, ms, %) */
export function DarkNumericSetting({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={s.numericSetting}>
      <Text style={s.settingLabel}>{label}</Text>
      <View style={s.numericInputWrap}>
        <DarkNumberInput
          label={label}
          maxLength={4}
          placeholder="Nhập giá trị"
          value={String(Math.round(value))}
          onCommit={(raw) => {
            const n = Number(raw);
            onChange(
              raw.trim() !== '' && Number.isFinite(n)
                ? Math.max(min, Math.min(max, Math.round(n)))
                : value,
            );
          }}
        />
        {suffix ? <Text style={s.settingSuffix}>{suffix}</Text> : null}
        <Text style={s.settingRange}>
          {min}–{max}
        </Text>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  numberInput: {
    backgroundColor: theme.card,
    border: `1px solid ${theme.cardBorder}`,
    borderRadius: 8,
    color: theme.text,
    fontSize: 14,
    fontWeight: 700,
    height: 38,
    outline: 'none',
    padding: '0 8px',
    textAlign: 'center',
    width: 60,
  },
  speedCard: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  speedTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 700,
  },
  speedReadout: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: 800,
  },
  speedControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    height: 38,
    justifyContent: 'center',
    minWidth: 38,
    width: 38,
  },
  stepButtonText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: '20px',
  },
  speedSlider: {
    flex: '1 1 0%',
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.4,
  },
  warningText: {
    color: theme.warning,
    fontSize: 11,
    lineHeight: '15px',
  },
  numericSetting: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    paddingTop: 6,
  },
  settingLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
  },
  numericInputWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  settingSuffix: {
    color: theme.textMuted,
    fontSize: 12,
  },
  settingRange: {
    color: theme.textSubtle,
    fontSize: 11,
    minWidth: 44,
    textAlign: 'right',
  },
};
