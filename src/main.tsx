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
}

// Register Service Worker for offline Cleanroom capability
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
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


