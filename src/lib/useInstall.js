import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

let deferredPrompt = null;
let registrationStarted = false;
let updateServiceWorker = null;
let removeListeners = null;
const subscribers = new Set();
const status = { canInstall: false, offlineReady: false, needRefresh: false, error: null };

function publish(patch) {
  Object.assign(status, patch);
  for (const subscriber of subscribers) subscriber({ ...status });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || 'App installation is unavailable.');
}

function startRegistration() {
  if (registrationStarted || typeof window === 'undefined') return;
  registrationStarted = true;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const beforeInstall = (event) => {
    event.preventDefault();
    if (standalone()) return;
    deferredPrompt = event;
    publish({ canInstall: true, error: null });
  };
  const installed = () => {
    deferredPrompt = null;
    publish({ canInstall: false, error: null });
  };
  window.addEventListener('beforeinstallprompt', beforeInstall);
  window.addEventListener('appinstalled', installed);
  removeListeners = () => {
    window.removeEventListener('beforeinstallprompt', beforeInstall);
    window.removeEventListener('appinstalled', installed);
  };
  if (!('serviceWorker' in navigator)) return;
  try {
    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady() { publish({ offlineReady: true, error: null }); },
      onNeedRefresh() { publish({ needRefresh: true }); },
      onRegisteredSW(_url, registration) {
        if (registration?.active && navigator.serviceWorker.controller) publish({ offlineReady: true });
        if (registration?.waiting) publish({ needRefresh: true });
      },
      onRegisterError(error) { publish({ error: errorMessage(error) }); },
    });
  } catch (error) {
    publish({ error: errorMessage(error) });
  }
}

/** Native installation is requested only from an explicit install() click. */
export function useInstall() {
  const [current, setCurrent] = useState(() => ({ ...status }));
  useEffect(() => {
    subscribers.add(setCurrent);
    startRegistration();
    setCurrent({ ...status });
    return () => { subscribers.delete(setCurrent); };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt;
    if (!prompt) return { outcome: 'unavailable' };
    deferredPrompt = null;
    publish({ canInstall: false, error: null });
    try {
      await prompt.prompt();
      return await prompt.userChoice;
    } catch (error) {
      publish({ error: errorMessage(error) });
      return { outcome: 'error' };
    }
  }, []);

  const updateApp = useCallback(async () => {
    if (!updateServiceWorker) return false;
    try {
      publish({ error: null });
      await updateServiceWorker(true);
      return true;
    } catch (error) {
      publish({ error: errorMessage(error) });
      return false;
    }
  }, []);

  return { ...current, install, updateApp };
}

export default useInstall;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    removeListeners?.();
    subscribers.clear();
    registrationStarted = false;
    deferredPrompt = null;
  });
}
