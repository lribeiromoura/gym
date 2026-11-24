'use client';

import { useEffect, useState } from 'react';

/**
 * SSR-safe media query hook used by ResponsiveDialog to switch
 * between mobile bottom-sheet Drawer (< 640px) and desktop Dialog (>= 640px).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
