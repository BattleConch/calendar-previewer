import { useEffect, useState } from "react";

export const DESKTOP_BREAKPOINT = 1024;

/** `undefined` until mounted so SSR never guesses the wrong layout. */
export function useIsDesktop(): boolean | undefined {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const read = () => setIsDesktop(mql.matches);
    read();
    mql.addEventListener("change", read);
    return () => mql.removeEventListener("change", read);
  }, []);

  return isDesktop;
}
