import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-v2";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show dialog if user hasn't dismissed before
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        setShowInstallDialog(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setShowInstallDialog(false);
  };

  const dismiss = () => {
    setShowInstallDialog(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

  return { showInstallDialog, install, dismiss, isInstalled, canInstall: !!deferredPrompt };
}
