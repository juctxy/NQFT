import { theme } from '../theme';
import {
  setDriveWheelType,
  WHEEL_IDS,
  type DriveProfile,
  type WheelType,
} from '../../../drive/driveModel';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

const wheelTypeName = (p: { wheelType: WheelType }) =>
  p.wheelType === 'standard' ? 'Standard' : p.wheelType === 'omni' ? 'Omni' : 'Mecanum';

function DarkWheelDiagram({ profile }: { profile: DriveProfile }) {
  return (
    <View style={s.diagramCard}>
      <View style={s.diagramBody}>
        {WHEEL_IDS.map((w) => (
          <View key={w} style={s.diagramWheel}>
            <Text style={s.diagramWheelName}>{w.toUpperCase()}</Text>
            <Text style={s.diagramWheelSigns}>
              {profile.matrix.fwd[w] > 0 ? '↑' : profile.matrix.fwd[w] < 0 ? '↓' : '·'}
              {'  '}
              {profile.matrix.side[w] > 0 ? '→' : profile.matrix.side[w] < 0 ? '←' : '·'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={s.diagramCaption}>
        Bố trí bánh nhìn từ trên xuống · {wheelTypeName(profile)}
      </Text>
    </View>
  );
}

interface WheelTypeSubPageProps {
  profile: DriveProfile;
  onUpdate: (p: DriveProfile) => void;
}

export function WheelTypeSubPage({ profile, onUpdate }: WheelTypeSubPageProps) {
  return (
    <View style={s.container}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Chọn cấu hình bánh xe</Text>
        <Text style={s.hintText}>
          Chọn loại bánh xe để áp dụng mô hình động học phù hợp (Standard: bánh thường; Omni / Mecanum: bánh đa hướng).
        </Text>

        <View style={s.wheelTypeOptions}>
          {(['standard', 'omni', 'mecanum'] as const).map((t) => (
            <Pressable
              key={t}
              selected={profile.wheelType === t}
              onPress={() => onUpdate(setDriveWheelType(profile, t))}
              style={[
                s.wheelTypeButton,
                profile.wheelType === t && s.wheelTypeButtonSelected,
              ]}
            >
              <Text
                style={[
                  s.wheelTypeText,
                  profile.wheelType === t && s.wheelTypeTextSelected,
                ]}
              >
                {wheelTypeName({ wheelType: t })}
              </Text>
            </Pressable>
          ))}
        </View>

        <DarkWheelDiagram profile={profile} />
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
  wheelTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  wheelTypeButton: {
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
  wheelTypeButtonSelected: {
    backgroundColor: theme.accentBg,
    borderColor: theme.accent,
  },
  wheelTypeText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  wheelTypeTextSelected: {
    color: theme.accent,
  },
  diagramCard: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    marginTop: 6,
    padding: '20px 16px 14px',
  },
  diagramBody: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(2, 90px)',
  },
  diagramWheel: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 4,
    justifyContent: 'center',
    padding: '10px 8px',
  },
  diagramWheelName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: 800,
  },
  diagramWheelSigns: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 700,
  },
  diagramCaption: {
    color: theme.textSubtle,
    fontSize: 11,
    fontWeight: 500,
  },
};
