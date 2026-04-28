"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  duration?: number;
  onDone: () => void;
}

export function Toast({ message, duration = 2000, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setExiting(false);

      const exitTimer = setTimeout(() => {
        setExiting(true);
      }, duration - 300);

      const removeTimer = setTimeout(() => {
        setVisible(false);
        setExiting(false);
        onDone();
      }, duration);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [message, duration, onDone]);

  if (!visible || !message) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-[var(--color-bg)] text-[var(--color-main)] border border-[var(--color-main)] text-sm z-50"
      style={{
        animation: exiting
          ? "toastOut 0.3s ease-in forwards"
          : "toastIn 0.2s ease-out",
      }}
    >
      {message}
    </div>
  );
}
