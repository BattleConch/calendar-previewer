import { useEffect, useState } from "react";

const KEY = "calendry.settings";
const EVENT = "calendry:settings-changed";

export type TimeFormat = "12" | "24";

export type NavPrefs = { hideNotes: boolean; timeFormat: TimeFormat };

function readSettings(): Partial<NavPrefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<NavPrefs>;
  } catch {
    return {};
  }
}

export function readHideNotes(): boolean {
  return !!readSettings().hideNotes;
}

export function readTimeFormat(): TimeFormat {
  return readSettings().timeFormat === "24" ? "24" : "12";
}

export function formatTime(time: string, timeFormat: TimeFormat): string {
  if (timeFormat === "24") return time;
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
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

/** Reads the clock preference and updates every visible time when it changes. */
export function useTimeFormat(): TimeFormat {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12");

  useEffect(() => {
    const read = () => setTimeFormat(readTimeFormat());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return timeFormat;
}
