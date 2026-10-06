import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installIdentityFetch } from './api/session';
import { startCloudSync } from './api/cloudSync';
import { startPlanTracking } from './api/plan';
import { PlanHost } from './components/plan/PlanHost';
import { installErrorReporting } from './api/errorReport';

installErrorReporting();

installIdentityFetch(((import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) || '');
startCloudSync();
startPlanTracking();

// PWA & Service Worker Initialization (MEGA BATCH D)
if (typeof window !== 'undefined') {
  // Ensure manifest and Apple touch icons are linked in head
  const head = document.head;

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.webmanifest';
    head.appendChild(manifestLink);
  }

  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/apple-touch-icon.png';
    head.appendChild(appleIcon);
  }

  // Ensure viewport-fit=cover for notch phones
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  // Apple mobile web app capable
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const metaCapable = document.createElement('meta');
    metaCapable.name = 'apple-mobile-web-app-capable';
    metaCapable.content = 'yes';
    head.appendChild(metaCapable);
  }

  if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
    const metaBar = document.createElement('meta');
    metaBar.name = 'apple-mobile-web-app-status-bar-style';
    metaBar.content = 'black-translucent';
    head.appendChild(metaBar);
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Listen for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update ready
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration ignored:', err);
        });
    });

    // Listen for SW broadcast messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'MATRIX_NETWORK_OFFLINE') {
        window.dispatchEvent(new CustomEvent('matrix:offline'));
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Plan dialogs (upgrade prompt, Stripe result) live in their own root so they work on every screen.
const planRoot = document.createElement('div');
planRoot.id = 'matrix-plan-root';
document.body.appendChild(planRoot);
ReactDOM.createRoot(planRoot).render(<PlanHost />);
