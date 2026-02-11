import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface AntiCheatOptions {
  onViolation?: (type: string, count: number) => void;
  maxViolations?: number;
  onMaxViolations?: () => void;
}

export const useAntiCheat = (active: boolean, options: AntiCheatOptions = {}) => {
  const { onViolation, maxViolations = 3, onMaxViolations } = options;
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // User denied fullscreen
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } catch {}
  }, []);

  const addViolation = useCallback(
    (type: string) => {
      setViolations((prev) => {
        const next = prev + 1;
        onViolation?.(type, next);

        if (next === 1) {
          toast.warning(`⚠️ Peringatan: ${type}. Pelanggaran ${next}/${maxViolations}`);
        } else if (next < maxViolations) {
          toast.error(`🚨 ${type}! Pelanggaran ${next}/${maxViolations}. Ujian akan otomatis dikumpulkan.`);
        } else {
          toast.error("🚨 Batas pelanggaran tercapai! Ujian akan dikumpulkan otomatis.");
          onMaxViolations?.();
        }
        return next;
      });
    },
    [maxViolations, onViolation, onMaxViolations]
  );

  useEffect(() => {
    if (!active) return;

    // Disable copy/paste/cut
    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation("Copy/Paste terdeteksi");
    };

    // Disable right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Detect tab switch / window blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation("Berpindah tab/jendela");
      }
    };

    const handleBlur = () => {
      addViolation("Berpindah tab/jendela");
    };

    // Detect fullscreen exit
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && active) {
        addViolation("Keluar dari fullscreen");
      }
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+P, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && ["c", "v", "x", "a", "p", "u", "s"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key === "F5")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        addViolation("Screenshot terdeteksi");
      }
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("cut", preventCopyPaste);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("selectstart", handleSelectStart);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("cut", preventCopyPaste);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("selectstart", handleSelectStart);
      window.removeEventListener("blur", handleBlur);
    };
  }, [active, addViolation]);

  return { violations, isFullscreen, enterFullscreen, exitFullscreen, maxViolations };
};
