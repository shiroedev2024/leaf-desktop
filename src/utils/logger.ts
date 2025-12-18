import {
  trace as tauriTrace,
  debug as tauriDebug,
  info as tauriInfo,
  warn as tauriWarn,
  error as tauriError,
  attachConsole,
} from '@tauri-apps/plugin-log';

// Synchronous wrappers that mimic console.* behavior
function info(...args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  tauriInfo(message).catch((err) => console.error('Logger info failed:', err));
}

function error(...args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  tauriError(message).catch((err) =>
    console.error('Logger error failed:', err)
  );
}

function warn(...args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  tauriWarn(message).catch((err) => console.error('Logger warn failed:', err));
}

function debug(...args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  tauriDebug(message).catch((err) =>
    console.error('Logger debug failed:', err)
  );
}

function trace(...args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  tauriTrace(message).catch((err) =>
    console.error('Logger trace failed:', err)
  );
}

export { info, error, warn, debug, trace, attachConsole };
