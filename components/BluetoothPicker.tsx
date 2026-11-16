import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bluetooth, RefreshCw, X } from 'lucide-react-native';
import { nearbyDeviceName, type NearbyDevice } from '../bluetooth';

interface BluetoothPickerProps {
  visible: boolean;
  devices: NearbyDevice[];
  isScanning: boolean;
  isConnecting: boolean;
  connectedDevice: NearbyDevice | null;
  error: string | null;
  onClose: () => void;
  onScan: () => void;
  onConnect: (device: NearbyDevice) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function BluetoothPicker({
  visible,
  devices,
  isScanning,
  isConnecting,
  connectedDevice,
  error,
  onClose,
  onScan,
  onConnect,
  onDisconnect,
}: BluetoothPickerProps) {
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  const connect = async (device: NearbyDevice) => {
    setConnectingDeviceId(device.id);
    try {
      await onConnect(device);
    } finally {
      setConnectingDeviceId(null);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View accessibilityViewIsModal style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Bluetooth color="#f47518" size={20} />
            <Text accessibilityRole="header" style={styles.title}>BLE DEVICES</Text>
          </View>
          <Pressable
            accessibilityLabel="Close Bluetooth devices"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color="#06324d" size={20} />
          </Pressable>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {connectedDevice ? (
          <View style={styles.connectedPanel}>
            <Text style={styles.connectedText}>
              Connected to {nearbyDeviceName(connectedDevice)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void onDisconnect()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Disconnect</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.scanStatus}>
              {isScanning ? <ActivityIndicator color="#f47518" size="small" /> : null}
              <Text style={styles.statusText}>
                {isScanning
                  ? 'Searching nearby devices…'
                  : devices.length
                    ? `${devices.length} device${devices.length === 1 ? '' : 's'} found`
                    : 'No nearby BLE devices found'}
              </Text>
            </View>
            <ScrollView style={styles.deviceList}>
              {devices.map((device) => (
                <View key={device.id} style={styles.deviceRow}>
                  <View style={styles.deviceDetails}>
                    <Text numberOfLines={1} style={styles.deviceName}>
                      {nearbyDeviceName(device)}
                    </Text>
                    <Text style={styles.deviceSignal}>RSSI {device.rssi} dBm</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={
                      connectingDeviceId === device.id
                        ? `Connecting to ${nearbyDeviceName(device)}`
                        : `Connect to ${nearbyDeviceName(device)}`
                    }
                    accessibilityRole="button"
                    disabled={isConnecting}
                    onPress={() => void connect(device)}
                    style={[styles.connectButton, isConnecting && styles.disabledButton]}
                  >
                    {connectingDeviceId === device.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.connectButtonText}>Connect</Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isScanning || isConnecting || Boolean(connectedDevice)}
            onPress={onScan}
            style={[
              styles.scanButton,
              (isScanning || isConnecting || connectedDevice) && styles.disabledButton,
            ]}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <RefreshCw color="#fff" size={16} />
            )}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning…' : 'Scan again'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 20, 32, 0.62)',
    bottom: 0,
    elevation: 10,
    justifyContent: 'center',
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '100%',
    maxWidth: 480,
    padding: 16,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#06324d',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    color: '#991b1b',
    marginBottom: 8,
    padding: 8,
  },
  scanStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 32,
  },
  statusText: {
    color: '#334155',
    fontSize: 13,
  },
  deviceList: {
    maxHeight: 110,
  },
  deviceRow: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingVertical: 6,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    color: '#06324d',
    fontSize: 14,
    fontWeight: '700',
  },
  deviceSignal: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  connectButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 82,
    paddingHorizontal: 10,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  connectedPanel: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  connectedText: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    borderColor: '#06324d',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#06324d',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
  },
  doneButtonText: {
    color: '#06324d',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
