import type { LucideIcon } from 'lucide-react';
import { theme } from '../theme';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface SettingsCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
  style?: Style;
}

export function SettingsCard({
  title,
  subtitle,
  icon: Icon,
  disabled,
  disabledReason,
  onPress,
  style,
}: SettingsCardProps) {
  const effectiveSubtitle = disabled && disabledReason ? disabledReason : subtitle;

  return (
    <Pressable
      role="button"
      label={`${title}: ${effectiveSubtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        disabled && s.cardDisabled,
        pressed && !disabled && s.cardPressed,
        style,
      ]}
    >
      <View style={[s.iconWrap, disabled && s.iconWrapDisabled]}>
        <Icon
          size={26}
          strokeWidth={1.8}
          color={disabled ? theme.textDisabled : theme.text}
        />
      </View>
      <Text style={[s.title, disabled && s.titleDisabled]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[s.subtitle, disabled && s.subtitleDisabled]} numberOfLines={1}>
        {effectiveSubtitle}
      </Text>
    </Pressable>
  );
}

const s: Record<string, Style> = {
  card: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flex: '1 1 0%',
    gap: 8,
    justifyContent: 'center',
    minHeight: 110,
    minWidth: 140,
    padding: '16px 12px',
    textAlign: 'center',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  cardPressed: {
    backgroundColor: theme.cardPressed,
    borderColor: theme.cardBorderHover,
  },
  cardDisabled: {
    backgroundColor: theme.cardDisabled,
    borderColor: theme.borderSubtle,
    cursor: 'not-allowed',
    opacity: 0.65,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    minHeight: 32,
  },
  iconWrapDisabled: {
    opacity: 0.6,
  },
  title: {
    color: theme.text,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.2,
    lineHeight: '19px',
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
};
