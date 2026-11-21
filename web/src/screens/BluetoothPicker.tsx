import { useEffect, useState } from 'react';
import { Bluetooth, RefreshCw, X } from 'lucide-react';
import { nearbyDeviceName, type NearbyDevice } from '../hooks/BluetoothContext';
import { Pressable, Text, View, type Style } from '../ui/rn';

function Spinner({ color }: { color: string }) {
  return <span className="rn-spinner" style={{ borderColor: color, borderTopColor: 'transparent' }} aria-hidden="true" />;
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
}: {
  visible: boolean;
  devices: NearbyDevice[];
  isScanning: boolean;
  isConnecting: boolean;
  connectedDevice: NearbyDevice | null;
  error: string | null;
  onClose: () => void;
  onScan: () => void;
  onConnect: (d: NearbyDevice) => Promise<void>;
  onDisconnect: () => void;
}) {
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const connect = async (d: NearbyDevice) => {
    setConnectingId(d.id);
    try {
      await onConnect(d);
    } finally {
      setConnectingId(null);
    }
  };
  const scanDisabled = isScanning || isConnecting || Boolean(connectedDevice);

  return (
    <View style={s.overlay} role="dialog" aria-modal="true">
      <View style={s.panel}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Bluetooth color="#f47518" size={20} />
            <Text style={s.title}>BLE DEVICES</Text>
          </View>
          <Pressable label="Close Bluetooth devices" onPress={onClose} style={s.closeButton}>
            <X color="#06324d" size={20} />
          </Pressable>
        </View>

        {error ? <Text style={s.error} aria-live="polite">{error}</Text> : null}

        {connectedDevice ? (
          <View style={s.connectedPanel}>
            <Text style={s.connectedText}>Connected to {nearbyDeviceName(connectedDevice)}</Text>
            <Pressable onPress={onDisconnect} style={s.secondaryButton}>
              <Text style={s.secondaryButtonText}>Disconnect</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.scanStatus}>
              {isScanning ? <Spinner color="#f47518" /> : null}
              <Text style={s.statusText}>
                {isScanning
                  ? 'Searching nearby devices…'
                  : devices.length
                    ? `${devices.length} device${devices.length === 1 ? '' : 's'} found`
                    : 'No nearby BLE devices found'}
              </Text>
            </View>
            <View style={s.deviceList}>
              {devices.map((d) => (
                <View key={d.id} style={s.deviceRow}>
                  <View style={s.deviceDetails}>
                    <Text numberOfLines={1} style={s.deviceName}>{nearbyDeviceName(d)}</Text>
                  </View>
                  <Pressable
                    label={connectingId === d.id ? `Connecting to ${nearbyDeviceName(d)}` : `Connect to ${nearbyDeviceName(d)}`}
                    disabled={isConnecting}
                    onPress={() => void connect(d)}
                    style={[s.connectButton, isConnecting && s.disabledButton]}
                  >
                    {connectingId === d.id ? <Spinner color="#fff" /> : <Text style={s.connectButtonText}>Connect</Text>}
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={s.footer}>
          <Pressable disabled={scanDisabled} onPress={onScan} style={[s.scanButton, scanDisabled && s.disabledButton]}>
            {isScanning ? <Spinner color="#fff" /> : <RefreshCw color="#fff" size={16} />}
            <Text style={s.scanButtonText}>{isScanning ? 'Scanning…' : 'Scan again'}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.doneButton}>
            <Text style={s.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 20, 32, 0.62)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  panel: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '100%', maxWidth: 480, padding: 16, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: '#06324d', fontSize: 16, fontWeight: 800 },
  closeButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  error: { backgroundColor: '#fef2f2', borderRadius: 6, color: '#991b1b', marginBottom: 8, padding: 8 },
  scanStatus: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 32 },
  statusText: { color: '#334155', fontSize: 13 },
  deviceList: { maxHeight: 110, overflowY: 'auto' },
  deviceRow: {
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingTop: 6,
    paddingBottom: 6,
  },
  deviceDetails: { flex: '1 1 0%' },
  deviceName: { color: '#06324d', fontSize: 14, fontWeight: 700 },
  connectButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 82,
    paddingLeft: 10,
    paddingRight: 10,
  },
  connectButtonText: { color: '#fff', fontSize: 12, fontWeight: 700 },
  connectedPanel: { alignItems: 'center', gap: 12, paddingTop: 18, paddingBottom: 18 },
  connectedText: { color: '#166534', fontSize: 15, fontWeight: 700, textAlign: 'center' },
  secondaryButton: { borderColor: '#06324d', borderRadius: 6, borderWidth: 1, padding: '8px 18px' },
  secondaryButtonText: { color: '#06324d', fontWeight: 700 },
  footer: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingLeft: 12,
    paddingRight: 12,
  },
  scanButtonText: { color: '#fff', fontSize: 12, fontWeight: 700 },
  doneButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 72 },
  doneButtonText: { color: '#06324d', fontWeight: 700 },
  disabledButton: { opacity: 0.55 },
};
