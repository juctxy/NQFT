import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { theme } from '../theme';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface SettingsRowProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  disabled?: boolean;
  onPress: () => void;
  style?: Style;
}

export function SettingsRow({
  title,
  subtitle,
  icon: Icon,
  disabled,
  onPress,
  style,
}: SettingsRowProps) {
  return (
    <Pressable
      role="button"
      label={`${title}: ${subtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        disabled && s.rowDisabled,
        pressed && !disabled && s.rowPressed,
        style,
      ]}
    >
      <View style={s.leftIconWrap}>
        <Icon
          size={22}
          strokeWidth={1.8}
          color={disabled ? theme.textDisabled : theme.text}
        />
      </View>
      <View style={s.content}>
        <Text style={[s.title, disabled && s.titleDisabled]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[s.subtitle, disabled && s.subtitleDisabled]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={s.rightWrap}>
        <ChevronRight
          size={20}
          strokeWidth={2}
          color={disabled ? theme.textDisabled : theme.textMuted}
        />
      </View>
    </Pressable>
  );
}

const s: Record<string, Style> = {
  row: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 14,
    minHeight: 64,
    padding: '12px 16px',
    transition: 'background-color 0.15s, border-color 0.15s',
    width: '100%',
  },
  rowPressed: {
    backgroundColor: theme.cardPressed,
    borderColor: theme.cardBorderHover,
  },
  rowDisabled: {
    backgroundColor: theme.cardDisabled,
    borderColor: theme.borderSubtle,
    cursor: 'not-allowed',
    opacity: 0.65,
  },
  leftIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 28,
  },
  content: {
    flex: '1 1 0%',
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    color: theme.text,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.2,
    lineHeight: '20px',
  },
  titleDisabled: {
    color: theme.textDisabled,
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
  },
  subtitleDisabled: {
    color: theme.textDisabled,
  },
  rightWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    minWidth: 24,
  },
};
