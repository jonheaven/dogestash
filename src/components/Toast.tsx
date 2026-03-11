import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 4000,
  onClose
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / duration) * 100, 100);
      setProgress(progressPercent);

      if (progressPercent >= 100) {
        clearInterval(interval);
        setTimeout(onClose, 200); // Small delay for smooth exit
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-700/50',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
          progress: 'bg-green-400'
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-700/50',
          icon: <XCircleIcon className="w-5 h-5 text-red-400" />,
          progress: 'bg-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-700/50',
          icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />,
          progress: 'bg-yellow-400'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-700/50',
          icon: <InformationCircleIcon className="w-5 h-5 text-blue-400" />,
          progress: 'bg-blue-400'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div className={`relative max-w-sm w-full ${styles.bg} border ${styles.border} rounded-lg shadow-lg backdrop-blur-sm animate-fade-in`}>
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-text-primary">
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className="inline-flex text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-secondary rounded-b-lg overflow-hidden isolate">
        <div
          className={`h-full ${styles.progress} relative`}
          style={{
            width: `${progress}%`,
            transition: 'width 50ms linear'
          }}
        />
      </div>
    </div>
  );
};
