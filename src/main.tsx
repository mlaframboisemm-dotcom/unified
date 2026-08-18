import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if running on an outdated Render host and redirect seamlessly to the live Google Cloud instance
if (typeof window !== 'undefined' && window.location && window.location.hostname.includes('onrender.com')) {
  const targetLiveUrl = 'https://ais-pre-gatwryypgxhwmumjlhhqxf-522633331757.us-east1.run.app';
  window.location.replace(`${targetLiveUrl}${window.location.pathname}${window.location.search}${window.location.hash}`);
}

// Register Service Worker with automatic update listener
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates periodically
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, reload seamlessly
              window.location.reload();
            }
          });
        }
      });
    }).catch(() => {});
  });

  // Reload when a new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

