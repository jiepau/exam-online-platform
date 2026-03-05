import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PWAInstallPrompt = () => {
  const { showInstallDialog, install, dismiss, isInstalled } = usePWAInstall();

  if (!showInstallDialog || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-card border border-border shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="h-8 w-8 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground">
              Install Aplikasi
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Install aplikasi ke perangkat Anda untuk akses lebih cepat dan pengalaman ujian yang lebih stabil.
            </p>
          </div>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={dismiss}
            >
              Nanti Saja
            </Button>
            <Button
              className="flex-1"
              onClick={install}
            >
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
