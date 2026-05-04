/// <reference types="vite/client" />

/**
 * Mishpachti — Vite client env (see root `.env.example`).
 * Augments Vite's `ImportMetaEnv` so `import.meta.env` is typed in strict mode.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_LIVEKIT_URL?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_ONESIGNAL_APP_ID?: string;
  /** Dev proxy target for `/api` and `/socket.io` (optional). */
  readonly VITE_BACKEND_PROXY?: string;
}
