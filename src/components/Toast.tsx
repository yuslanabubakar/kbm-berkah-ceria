"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="shrink-0" />,
  error: <AlertCircle size={18} className="shrink-0" />,
  info: <Info size={18} className="shrink-0" />,
};

const STYLES: Record<ToastType, { bg: string; text: string; border: string }> =
  {
    success: {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#047857",
      border: "rgba(16, 185, 129, 0.3)",
    },
    error: {
      bg: "rgba(239, 68, 68, 0.12)",
      text: "#dc2626",
      border: "rgba(239, 68, 68, 0.3)",
    },
    info: {
      bg: "rgba(46, 90, 172, 0.10)",
      text: "#2E5AAC",
      border: "rgba(46, 90, 172, 0.25)",
    },
  };

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const style = STYLES[toast.type];

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-soft backdrop-blur transition-all duration-300"
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        maxWidth: "360px",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0) scale(1)"
          : "translateY(16px) scale(0.95)",
      }}
    >
      {ICONS[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]); // keep max 4
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-24 right-4 z-[9999] flex flex-col items-end gap-2 md:bottom-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.showToast;
}
