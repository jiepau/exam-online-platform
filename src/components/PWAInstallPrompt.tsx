import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoDefault from "@/assets/logo-madrasah.png";

const PWAInstallPrompt = () => {
  const { showInstallDialog, install, dismiss, isInstalled } = usePWAInstall();
  const { settings } = useAppSettings();

  if (!showInstallDialog || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Colored header */}
        <div className="exam-gradient px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={settings.school_logo_url || logoDefault} alt="Logo" className="h-10 w-10 object-contain rounded-lg bg-white/20 p-1" />
            <div>
              <h3 className="text-sm font-bold text-white">{settings.school_name}</h3>
              <p className="text-xs text-white/70">{settings.app_name}</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-4">
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
