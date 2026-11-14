import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsScreen } from '../components/SettingsScreen';
import { useController } from '../context/ControllerContext';

export default function SettingsRoute() {
  const router = useRouter();
  const { presets, changePreset, applyPreset, resetPresets } = useController();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsScreen
          presets={presets}
          onChange={changePreset}
          onApply={(value) => {
            applyPreset(value);
            router.back();
          }}
          onReset={resetPresets}
          onBack={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
