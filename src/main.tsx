import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPushServiceWorker } from './services/pushNotifications';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerPushServiceWorker().catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);
