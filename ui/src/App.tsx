import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Ports } from './pages/Ports';
import { Services } from './pages/Services';
import { Processes } from './pages/Processes';
import { Containers } from './pages/Containers';
import { useThemeStore } from './store/theme';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { isDark } = useThemeStore();
  
  // Connect WebSocket
  useWebSocket();
  
  // Setup keyboard shortcuts
  useKeyboardShortcuts();

  // Apply theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ports" element={<Ports />} />
        <Route path="/services" element={<Services />} />
        <Route path="/processes" element={<Processes />} />
        <Route path="/containers" element={<Containers />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
