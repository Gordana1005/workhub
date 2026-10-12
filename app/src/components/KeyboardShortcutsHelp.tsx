'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// The shortcuts dialog (and its hotkey binding) only matters with a physical keyboard + mouse, so
// phones/tablets never download it. It loads lazily once a hover-capable fine pointer is detected.
const KeyboardShortcutsDialog = dynamic(() => import('./KeyboardShortcutsDialog'), { ssr: false });

export default function KeyboardShortcutsHelp() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  return enabled ? <KeyboardShortcutsDialog /> : null;
}
