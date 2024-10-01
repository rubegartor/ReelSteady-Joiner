import ReactDOM from 'react-dom/client';

import Application from '@components/Application';
import { NotificationProvider } from '@components/Notification/NotificationContext';

import { AppChannel } from '@src/AppChannel';

window.addEventListener('error', (event: ErrorEvent): void => {
  window.electron.ipcRenderer.send(AppChannel.UnhandledException, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error
  });
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
  window.electron.ipcRenderer.send(AppChannel.UnhandledException, {
    message: event.reason?.message || 'Unhandled Rejection',
    error: event.reason?.stack || event.reason
  });
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <NotificationProvider>
    <Application />
  </NotificationProvider>
);
