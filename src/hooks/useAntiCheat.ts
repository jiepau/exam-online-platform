import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AntiCheatConfig, DEFAULT_ANTI_CHEAT } from "@/hooks/useAppSettings";

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
  config?: Partial<AntiCheatConfig>;
}

export const useAntiCheat = (active: boolean, options: AntiCheatOptions = {}) => {
  const config: AntiCheatConfig = { ...DEFAULT_ANTI_CHEAT, ...(options.config || {}) };
  const maxViolations = options.maxViolations ?? config.max_violations ?? 5;
  const { onViolation, onMaxViolations } = options;

  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastViolationType, setLastViolationType] = useState<string | null>(null);
  const [lastViolationTime, setLastViolationTime] = useState(0);

  const enterFullscreen = useCallback(async () => {
    if (!config.require_fullscreen) {
      setIsFullscreen(true);
      return;
    }
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
  }, [config.require_fullscreen]);

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
      const now = Date.now();
      setLastViolationTime((prevTime) => {
        if (now - prevTime < 5000) return prevTime;

        setViolations((prev) => {
          const next = prev + 1;
          setLastViolationType(type);
          onViolation?.(type, next);
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

    const cleanups: Array<() => void> = [];

    // Copy/paste/cut
    if (config.block_copy_paste) {
      const preventCopyPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        addViolation("Copy/Paste terdeteksi");
      };
      document.addEventListener("copy", preventCopyPaste);
      document.addEventListener("paste", preventCopyPaste);
      document.addEventListener("cut", preventCopyPaste);
      cleanups.push(() => {
        document.removeEventListener("copy", preventCopyPaste);
        document.removeEventListener("paste", preventCopyPaste);
        document.removeEventListener("cut", preventCopyPaste);
      });
    }

    // Right click
    if (config.block_right_click) {
      const preventContextMenu = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", preventContextMenu);
      cleanups.push(() => document.removeEventListener("contextmenu", preventContextMenu));
    }

    // Tab switch detection
    if (config.detect_tab_switch) {
      let blurTimer: ReturnType<typeof setTimeout> | null = null;
      const clearBlurTimer = () => {
        if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      };
      const handleVisibilityChange = () => {
        if (document.hidden) {
          clearBlurTimer();
          blurTimer = setTimeout(() => addViolation("Berpindah tab/jendela"), 15000);
        } else clearBlurTimer();
      };
      const handleBlur = () => {
        clearBlurTimer();
        blurTimer = setTimeout(() => addViolation("Berpindah tab/jendela"), 15000);
      };
      const handleFocus = () => clearBlurTimer();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
      cleanups.push(() => {
        clearBlurTimer();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
      });
    }

    // Fullscreen enforcement
    if (config.require_fullscreen) {
      const handleFullscreenChange = () => {
        const isFull = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
        setIsFullscreen(isFull);
        if (!isFull && active) {
          addViolation("Keluar dari fullscreen");
          setTimeout(() => {
            if (active && !document.fullscreenElement) enterFullscreen();
          }, 1500);
        }
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      cleanups.push(() => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      });
    }

    // Keyboard shortcuts & PrintScreen
    if (config.block_shortcuts || config.block_printscreen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (config.block_shortcuts) {
          if (
            (e.ctrlKey && ["c", "v", "x", "a", "p", "u", "s"].includes(e.key.toLowerCase())) ||
            e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) ||
            (e.ctrlKey && e.key === "F5")
          ) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
        if (config.block_printscreen && e.key === "PrintScreen") {
          e.preventDefault();
          addViolation("Screenshot terdeteksi");
        }
      };
      document.addEventListener("keydown", handleKeyDown, true);
      cleanups.push(() => document.removeEventListener("keydown", handleKeyDown, true));
    }

    // Always disable text selection during exam
    const handleSelectStart = (e: Event) => e.preventDefault();
    document.addEventListener("selectstart", handleSelectStart);
    cleanups.push(() => document.removeEventListener("selectstart", handleSelectStart));

    return () => cleanups.forEach((fn) => fn());
  }, [active, addViolation, config.block_copy_paste, config.block_right_click, config.block_shortcuts, config.block_printscreen, config.detect_tab_switch, config.require_fullscreen, enterFullscreen]);

  return { violations, isFullscreen, enterFullscreen, exitFullscreen, maxViolations, lastViolationType };
};
