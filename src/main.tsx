import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline capability
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('[PWA] Smart Scanner Industrial PRO está lista para trabajar 100% offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
