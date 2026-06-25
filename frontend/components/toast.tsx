import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const getStyle = () => {
    switch (message.type) {
      case 'success':
        return 'bg-zinc-950 border-emerald-900/50 text-emerald-400';
      case 'error':
        return 'bg-zinc-950 border-rose-900/50 text-rose-400';
      case 'info':
      default:
        return 'bg-zinc-950 border-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl font-mono text-xs max-w-sm transition duration-300 animate-in slide-in-from-bottom-5 ${getStyle()}`}>
      {message.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
      {message.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
      <span className="flex-1 leading-normal">{message.text}</span>
      <button 
        onClick={() => onClose(message.id)}
        className="text-zinc-650 hover:text-zinc-400 transition duration-150 cursor-pointer shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
