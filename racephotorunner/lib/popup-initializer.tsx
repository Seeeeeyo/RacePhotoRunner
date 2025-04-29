'use client';

import { useEffect } from 'react';
import { usePopup, setPopupFunctions } from './popup';

// Client component to initialize popup functions
export default function PopupInitializer() {
  const popupFunctions = usePopup();
  
  // Set popup functions for global access
  useEffect(() => {
    setPopupFunctions(popupFunctions);
  }, [popupFunctions]);
  
  return null;
} 