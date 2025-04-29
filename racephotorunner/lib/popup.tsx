'use client';

import React, { useState, createContext, useContext } from 'react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Types
type AlertType = 'success' | 'error' | 'info';
type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';

// Context for managing dialog state
interface PopupContextType {
  openAlert: (title: string, message: string, type?: AlertType) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showToast: (message: string, type?: AlertType, duration?: number) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

// Popup Provider Component
export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});
  const [onCancelAction, setOnCancelAction] = useState<(() => void) | undefined>(undefined);

  const openAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  };

  const openConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmAction(() => onConfirm);
    setOnCancelAction(() => onCancel);
    setConfirmOpen(true);
  };

  const showToast = (message: string, type: AlertType = 'info', duration: number = 3000) => {
    switch (type) {
      case 'success':
        toast.success(message, { duration });
        break;
      case 'error':
        toast.error(message, { duration });
        break;
      default:
        toast.info(message, { duration });
        break;
    }
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (onConfirmAction) onConfirmAction();
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    if (onCancelAction) onCancelAction();
  };

  return (
    <PopupContext.Provider value={{ openAlert, openConfirm, showToast }}>
      {children}
      
      {/* Alert Dialog */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="sm:max-w-[350px] bg-gray-100">
          <DialogHeader>
            <DialogTitle className="text-black">
              {alertTitle}
            </DialogTitle>
            <DialogDescription className="text-gray-800">{alertMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertOpen(false)} className="bg-gray-800 hover:bg-gray-900 text-white">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[350px] bg-white border border-gray-300 shadow-xl z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">{confirmTitle}</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2 text-sm">{confirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleCancel} className="text-sm font-normal px-3 py-1 h-8 text-gray-800">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} className="text-sm font-medium px-3 py-1 h-8 bg-red-600 hover:bg-red-700">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PopupContext.Provider>
  );
}

// Hook for using the popup context
export function usePopup() {
  const context = useContext(PopupContext);
  if (context === undefined) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
}

// Standalone functions for non-component use
let popupFunctions: PopupContextType | null = null;

export function setPopupFunctions(functions: PopupContextType) {
  popupFunctions = functions;
}

export function showAlert(title: string, message: string, type: AlertType = 'info') {
  if (popupFunctions) {
    popupFunctions.openAlert(title, message, type);
  } else {
    console.warn('PopupProvider not initialized. Falling back to browser alert.');
    alert(`${title}\n\n${message}`);
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  if (popupFunctions) {
    popupFunctions.openConfirm(title, message, onConfirm, onCancel);
  } else {
    console.warn('PopupProvider not initialized. Falling back to browser confirm.');
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  }
}

export function showToast(message: string, type: AlertType = 'info', duration: number = 3000) {
  if (popupFunctions) {
    popupFunctions.showToast(message, type, duration);
  } else {
    console.warn('PopupProvider not initialized. Falling back to console log.');
    console.log(`Toast (${type}): ${message}`);
  }
} 