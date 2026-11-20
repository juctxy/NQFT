import { createContext, useContext, type ReactNode } from 'react';
import { useBluetoothConnection } from '../hooks/useBluetoothConnection';

type BluetoothContextValue = ReturnType<typeof useBluetoothConnection>;

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const bluetooth = useBluetoothConnection();
  return (
    <BluetoothContext.Provider value={bluetooth}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within BluetoothProvider');
  }
  return context;
}
