// Replaced at build time by vite's __VERSION__ define, with a sensible fallback for dev.
declare const __VERSION__: string;

export const VERSION: string =
  typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev';
