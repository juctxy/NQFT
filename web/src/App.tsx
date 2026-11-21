// Giao diện chuyển từ NQFT bản web (juctxy.github.io/NQFT): 3 màn hình Điều khiển / Instruction / Settings.
// Điều hướng bằng hash (#/instructions, #/settings) để chạy được trên GitHub Pages và nút Back của điện thoại.
import { useEffect, useState } from 'react';
import { ControllerProvider } from './drive/ControllerContext';
import { BluetoothProvider } from './hooks/BluetoothContext';
import { ControllerScreen } from './screens/ControllerScreen';
import { InstructionsScreen } from './screens/InstructionsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type Route = 'controller' | 'instructions' | 'settings';

let openedInApp = false;

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h === 'instructions' || h === 'settings' ? h : 'controller';
}

function useHashRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const push = (r: Route) => {
    if (r !== 'controller') openedInApp = true;
    window.location.hash = r === 'controller' ? '' : `/${r}`;
  };
  const back = () => {
    // Chỉ lùi lịch sử khi chính app đã mở màn này; mở thẳng link #/settings thì về màn điều khiển.
    if (openedInApp) {
      openedInApp = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setRoute('controller');
    }
  };
  return { route, push, back };
}

export default function App() {
  const { route, push, back } = useHashRoute();
  return (
    <ControllerProvider>
      <BluetoothProvider>
        <div className="safe-area">
          {route === 'instructions' ? (
            <InstructionsScreen onBack={back} />
          ) : route === 'settings' ? (
            <SettingsScreen onClose={back} />
          ) : (
            <ControllerScreen onOpenInstructions={() => push('instructions')} onOpenSettings={() => push('settings')} />
          )}
        </div>
      </BluetoothProvider>
    </ControllerProvider>
  );
}
