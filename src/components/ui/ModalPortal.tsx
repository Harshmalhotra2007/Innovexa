"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/useScrollLock";

interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function ModalPortal({ isOpen, onClose, title, children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  // Lock background scrolling when modal is active
  useScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for Escape key press to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal Dialog"}
      onClick={(e) => {
        // Dismiss when clicking directly on overlay backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>,
    document.body
  );
}
