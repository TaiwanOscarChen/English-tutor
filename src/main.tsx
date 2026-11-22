/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global Client-Side Stability Guards (Anti-Crash Protection)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent unhandled rejections from terminating script contexts without polluting console warnings
    event.preventDefault?.();
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('ResizeObserver') || msg.includes('WebSocket')) {
      event.preventDefault?.();
    }
  });

  // Auto-recover once if a stale hashed lazy chunk fails to load after a new deployment
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.();
    try {
      const lastReloadAt = Number(sessionStorage.getItem('fse_chunk_reload_at') || '0');
      if (Date.now() - lastReloadAt > 30_000) {
        sessionStorage.setItem('fse_chunk_reload_at', String(Date.now()));
        window.location.reload();
      }
    } catch {}
  });
}

// Register Service Worker for offline Cleanroom capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


