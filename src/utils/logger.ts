// Simple logger utilities used across the app.
// - logError: logs errors in development, prefixes messages for clarity.
export function logError(message?: any, ...optionalParams: any[]) {
  if (import.meta.env?.MODE !== 'development') return;
  // dev-only logging
  // eslint-disable-next-line no-console
  console.error('[task-app]', message, ...optionalParams);
}

export function logInfo(message?: any, ...optionalParams: any[]) {
  if (import.meta.env?.MODE !== 'development') return;
  // eslint-disable-next-line no-console
  console.info('[task-app]', message, ...optionalParams);
}
