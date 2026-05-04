import { config } from './config';
import { api } from './api';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: unknown) => void>;
    OneSignal?: {
      init: (cfg: Record<string, unknown>) => Promise<void>;
      User: {
        PushSubscription: {
          id: string | null;
          addEventListener: (event: string, cb: (e: { current: { id: string | null } }) => void) => void;
        };
      };
      Notifications: {
        requestPermission: () => Promise<boolean>;
      };
      login: (externalId: string) => Promise<void>;
    };
  }
}

let initialized = false;

export async function initOneSignal(userId: string): Promise<void> {
  if (!config.oneSignalAppId || config.oneSignalAppId === 'fill_me_in') {
    // eslint-disable-next-line no-console
    console.info('[OneSignal] disabled (no app id)');
    return;
  }
  if (initialized) return;
  initialized = true;

  await injectScript('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js');

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignalRaw) => {
    const OneSignal = OneSignalRaw as typeof window.OneSignal;
    if (!OneSignal) return;
    try {
      await OneSignal.init({
        appId: config.oneSignalAppId,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });

      await OneSignal.login(userId).catch(() => undefined);

      // Register current player id (if any)
      const subId = OneSignal.User.PushSubscription.id;
      if (subId) {
        await api.notifications.subscribe(subId, navigator.userAgent).catch(() => undefined);
      }

      // Listen for changes (permission granted later)
      OneSignal.User.PushSubscription.addEventListener('change', (e) => {
        if (e.current.id) {
          api.notifications
            .subscribe(e.current.id, navigator.userAgent)
            .catch(() => undefined);
        }
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[OneSignal] init failed:', e);
    }
  });
}

export async function requestPushPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.OneSignal) {
      resolve(false);
      return;
    }
    window.OneSignal.Notifications.requestPermission().then(resolve).catch(() => resolve(false));
  });
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed loading ${src}`));
    document.head.appendChild(s);
  });
}
