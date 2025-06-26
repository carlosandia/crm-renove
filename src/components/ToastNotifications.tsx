import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const ToastNotifications: React.FC = () => {
  const { toasts, dismiss } = useToast();

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
      case 'destructive':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
      case 'destructive':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border rounded-lg p-4 shadow-lg animate-fade-in-down ${getToastStyles(toast.variant || 'default')}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getToastIcon(toast.variant || 'default')}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-sm mt-1 opacity-90">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastNotifications; 