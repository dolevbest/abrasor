import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

export const [MenuProvider, useMenu] = createContextHook(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);

  return useMemo(() => ({
    isMenuOpen,
    openMenu,
    closeMenu,
    toggleMenu,
  }), [isMenuOpen, openMenu, closeMenu, toggleMenu]);
});