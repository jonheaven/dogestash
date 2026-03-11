import React, { useState, useEffect } from 'react';
import { Toast } from './Toast';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="animate-slide-in mb-3 isolate"
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: 50 - index
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};
