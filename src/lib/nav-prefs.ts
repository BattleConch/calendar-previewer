import { useEffect, useState } from "react";

const KEY = "calendry.settings";
const EVENT = "calendry:settings-changed";

export type NavPrefs = { hideNotes: boolean };

export function readHideNotes(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return !!JSON.parse(raw).hideNotes;
  } catch {
    return false;
  }
}

export function notifySettingsChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/** Reads the "hide notes tab" preference and stays in sync across the app. */
export function useHideNotes(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const read = () => setHidden(readHideNotes());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return hidden;
}
