import { useEffect, useState } from 'react';
import { theme } from './theme';
import { Text, View, type Style } from '../../ui/rn';

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
