export function haptic(pattern: number | number[] = 10) {
  if (typeof window === "undefined") return;
  try { window.navigator.vibrate?.(pattern); } catch {}
}
