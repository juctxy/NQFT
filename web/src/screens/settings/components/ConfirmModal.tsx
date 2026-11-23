import { theme } from '../theme';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <View style={s.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <View style={s.card}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.message}>{message}</Text>
        <View style={s.actions}>
          <Pressable onPress={onCancel} style={s.cancelButton} label={cancelLabel}>
            <Text style={s.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={[s.confirmButton, destructive && s.destructiveButton]}
            label={confirmLabel}
          >
            <Text style={[s.confirmText, destructive && s.destructiveText]}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 16,
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    maxWidth: 400,
    padding: '20px 20px 16px',
    width: '100%',
  },
  title: {
    color: theme.text,
    fontSize: 17,
    fontWeight: 800,
  },
  message: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: '19px',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 14,
  },
  cancelText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 16,
  },
  confirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
  destructiveButton: {
    backgroundColor: theme.danger,
  },
  destructiveText: {
    color: '#fff',
  },
};
