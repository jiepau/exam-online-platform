import { useEffect, useState } from "react";
import { ShieldAlert, Play, Square, AlertTriangle, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useAppSettings, AntiCheatConfig, DEFAULT_ANTI_CHEAT } from "@/hooks/useAppSettings";

interface LogEntry {
  type: string;
  count: number;
  at: string;
}

const TOGGLES: { key: keyof AntiCheatConfig; label: string; desc: string }[] = [
  { key: "require_fullscreen", label: "Wajib Mode Fullscreen", desc: "Paksa layar penuh" },
  { key: "detect_tab_switch", label: "Deteksi Pindah Tab/Jendela", desc: "Toleransi 15 detik" },
  { key: "block_copy_paste", label: "Blokir Copy / Paste / Cut", desc: "Mencegah salin & tempel" },
  { key: "block_right_click", label: "Blokir Klik Kanan", desc: "Menonaktifkan menu konteks" },
  { key: "block_shortcuts", label: "Blokir Shortcut Keyboard", desc: "F12, Ctrl+C/V/P, dll" },
  { key: "block_printscreen", label: "Deteksi PrintScreen", desc: "Catat saat tombol PrintScreen ditekan" },
];

const AntiCheatTest = () => {
  const { settings } = useAppSettings();
  const [config, setConfig] = useState<AntiCheatConfig>(DEFAULT_ANTI_CHEAT);
  const [simulating, setSimulating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    if (settings.id) setConfig({ ...DEFAULT_ANTI_CHEAT, ...settings.anti_cheat_config });
  }, [settings]);

  const { violations, isFullscreen, enterFullscreen, exitFullscreen, maxViolations, lastViolationType } =
    useAntiCheat(simulating, {
      config,
      maxViolations: config.max_violations,
      onViolation: (type, count) => {
        setLogs((prev) => [{ type, count, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
      },
      onMaxViolations: () => {
        setAutoSubmitted(true);
        setSimulating(false);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        toast.error("🚨 Simulasi dihentikan: batas pelanggaran tercapai (auto-submit pada ujian asli).");
      },
    });

  const start = async () => {
    setLogs([]);
    setAutoSubmitted(false);
    setSimulating(true);
    if (config.require_fullscreen) {
      setTimeout(() => enterFullscreen(), 200);
    }
    toast.success("🧪 Simulasi anti-cheat dimulai. Coba lakukan pelanggaran.");
  };

  const stop = () => {
    setSimulating(false);
    if (document.fullscreenElement) exitFullscreen();
    toast.message("Simulasi dihentikan");
  };

  const reset = () => {
    setLogs([]);
    setAutoSubmitted(false);
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <h2 className="text-2xl font-bold text-foreground">Simulasi Anti-Cheat</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Uji konfigurasi anti-cheat sebelum digunakan pada ujian sungguhan. Pelanggaran di sini <b>tidak</b> tercatat ke database.
      </p>

      <div className="grid gap-6 lg:grid-cols-2 max-w-6xl">
        {/* Config Panel */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-2">Konfigurasi (sementara untuk simulasi)</h3>
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch
                disabled={simulating}
                checked={Boolean(config[t.key])}
                onCheckedChange={(v) => setConfig((p) => ({ ...p, [t.key]: v }))}
              />
            </div>
          ))}
          <div className="rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Maksimal Pelanggaran</Label>
            <Input
              type="number"
              min={1}
              max={20}
              disabled={simulating}
              value={config.max_violations}
              onChange={(e) =>
                setConfig((p) => ({ ...p, max_violations: Math.max(1, parseInt(e.target.value) || 1) }))
              }
              className="w-24 mt-2"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {!simulating ? (
              <Button onClick={start} className="gap-2 exam-gradient border-0 flex-1">
                <Play className="h-4 w-4" /> Mulai Simulasi
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" className="gap-2 flex-1">
                <Square className="h-4 w-4" /> Hentikan
              </Button>
            )}
            <Button onClick={reset} variant="outline" className="gap-2" disabled={simulating}>
              <RotateCcw className="h-4 w-4" /> Reset Log
            </Button>
          </div>
        </div>

        {/* Live Status & Log */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Status Simulasi</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={simulating ? "default" : "secondary"} className="mt-1">
                  {simulating ? "Berjalan" : autoSubmitted ? "Auto-Submit" : "Idle"}
                </Badge>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Fullscreen</p>
                <Badge variant={isFullscreen ? "default" : "outline"} className="mt-1">
                  {isFullscreen ? "Aktif" : "Tidak"}
                </Badge>
              </div>
              <div className="rounded-lg border border-border p-3 col-span-2">
                <p className="text-xs text-muted-foreground">Pelanggaran</p>
                <p className="text-2xl font-bold text-destructive">
                  {violations} <span className="text-base text-muted-foreground font-normal">/ {maxViolations}</span>
                </p>
                {lastViolationType && (
                  <p className="text-xs text-muted-foreground mt-1">Terakhir: {lastViolationType}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Saran Pengujian
            </h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Tekan <kbd className="px-1 rounded bg-muted">ESC</kbd> untuk keluar fullscreen</li>
              <li>Pindah tab atau minimize jendela selama &gt;15 detik</li>
              <li>Tekan <kbd className="px-1 rounded bg-muted">Ctrl+C</kbd> / <kbd className="px-1 rounded bg-muted">Ctrl+V</kbd></li>
              <li>Klik kanan di mana saja</li>
              <li>Tekan <kbd className="px-1 rounded bg-muted">F12</kbd> atau <kbd className="px-1 rounded bg-muted">PrintScreen</kbd></li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Log Pelanggaran</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada pelanggaran terdeteksi.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 py-1.5">
                    <span className="text-foreground">
                      <Badge variant="outline" className="mr-2">#{l.count}</Badge>
                      {l.type}
                    </span>
                    <span className="text-muted-foreground">{l.at}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AntiCheatTest;
