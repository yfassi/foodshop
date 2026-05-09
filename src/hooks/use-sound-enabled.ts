"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "admin-sound-enabled";
const EVENT = "admin-sound-enabled:changed";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): boolean {
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === "true";
}

function getServerSnapshot(): boolean {
  return true;
}

export function useSoundEnabled() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setEnabled = useCallback((v: boolean) => {
    localStorage.setItem(KEY, String(v));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  return { enabled, toggle, setEnabled };
}
