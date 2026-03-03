import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import ErrorFallback from './components/ErrorFallback';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { TaxDataProvider } from './contexts/TaxDataContext';
import './index.css';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || 'production',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request && event.request.data) {
        delete event.request.data;
      }
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <TaxDataProvider>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
        </TaxDataProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
