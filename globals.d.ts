// Global type declarations for third-party browser APIs loaded via CDN

interface Window {
  OneSignalDeferred: Array<(sdk: any) => void | Promise<void>>
}

// Extend the OneSignal global type used in layout.tsx
declare var OneSignal: any
