import { createRoot } from 'react-dom/client';
import App from './App';

const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    args.length > 0 &&
    typeof args[0] === 'string' &&
    args[0].includes(
      'ResizeObserver loop completed with undelivered notifications',
    )
  ) {
    // Ignore this specific ResizeObserver warning
    return;
  }
  originalConsoleError(...args);
};

window.addEventListener('error', (event) => {
  event.preventDefault();
});

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
