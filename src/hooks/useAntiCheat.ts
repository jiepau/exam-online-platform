import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

// Play alarm buzzer using Web Audio API
const playAlarmSound = (violationCount: number) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beeps = violationCount >= 2 ? 3 : 2;

    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = violationCount >= 2 ? 880 : 660;
      gain.gain.value = 0.3;
      const start = ctx.currentTime + i * 0.3;
      osc.start(start);
      osc.stop(start + 0.2);
    }

    setTimeout(() => ctx.close(), (beeps * 0.3 + 0.5) * 1000);
  } catch {
    // Audio not supported
  }
};

interface AntiCheatOptions {
  onViolation?: (type: string, count: number) => void;
  maxViolations?: number;
  onMaxViolations?: () => void;
}

export const useAntiCheat = (active: boolean, options: AntiCheatOptions = {}) => {
  const { onViolation, maxViolations = 5, onMaxViolations } = options;
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastViolationType, setLastViolationType] = useState<string | null>(null);
  const [lastViolationTime, setLastViolationTime] = useState(0);

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
      // Cooldown: ignore violations within 5 seconds of each other to prevent double-counting
      const now = Date.now();
      setLastViolationTime((prevTime) => {
        if (now - prevTime < 5000) return prevTime; // skip, too soon

        setViolations((prev) => {
          const next = prev + 1;
          setLastViolationType(type);
          onViolation?.(type, next);

          // Play alarm sound for supervisor
          playAlarmSound(next);

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

        return now;
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

    // Detect tab switch / window blur (with 15s tolerance)
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const clearBlurTimer = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearBlurTimer();
        blurTimer = setTimeout(() => {
          addViolation("Berpindah tab/jendela");
        }, 15000);
      } else {
        clearBlurTimer();
      }
    };

    const handleBlur = () => {
      clearBlurTimer();
      blurTimer = setTimeout(() => {
        addViolation("Berpindah tab/jendela");
      }, 15000);
    };

    const handleFocus = () => {
      clearBlurTimer();
    };

    // Detect fullscreen exit & auto re-enter on mobile
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && active) {
        addViolation("Keluar dari fullscreen");
        // Auto re-enter fullscreen after a short delay (especially useful on mobile)
        setTimeout(() => {
          if (active && !document.fullscreenElement) {
            enterFullscreen();
          }
        }, 1500);
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
    window.addEventListener("focus", handleFocus);

    return () => {
      clearBlurTimer();
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
      window.removeEventListener("focus", handleFocus);
    };
  }, [active, addViolation]);

  return { violations, isFullscreen, enterFullscreen, exitFullscreen, maxViolations, lastViolationType };
};
