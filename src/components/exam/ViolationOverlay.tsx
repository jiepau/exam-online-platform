import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface ViolationOverlayProps {
  violationType: string | null;
  violationCount: number;
  maxViolations: number;
}

const ViolationOverlay = ({ violationType, violationCount, maxViolations }: ViolationOverlayProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (violationType && violationCount > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [violationType, violationCount]);

  if (!visible || !violationType) return null;

  const isCritical = violationCount >= maxViolations - 1;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Flashing red border */}
      <div
        className="absolute inset-0 border-[6px] rounded-none"
        style={{
          borderColor: isCritical ? "hsl(0 84% 50%)" : "hsl(25 95% 53%)",
          animation: "violation-flash 0.5s ease-in-out infinite alternate",
        }}
      />

      {/* Center warning card */}
      <div
        className="relative pointer-events-auto rounded-2xl px-8 py-6 text-center shadow-2xl max-w-sm mx-4"
        style={{
          backgroundColor: isCritical ? "hsl(0 84% 50% / 0.95)" : "hsl(25 95% 53% / 0.95)",
          animation: "violation-shake 0.4s ease-in-out",
        }}
      >
        <div className="flex justify-center mb-3">
          {isCritical ? (
            <ShieldAlert className="h-16 w-16 text-white animate-pulse" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-white animate-bounce" />
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">
          {isCritical ? "🚨 PERINGATAN KERAS!" : "⚠️ PELANGGARAN!"}
        </h2>
        <p className="text-white/90 text-base font-semibold mb-3">
          {violationType}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white font-bold text-lg">
          Pelanggaran {violationCount} / {maxViolations}
        </div>
        {isCritical && (
          <p className="text-white/80 text-sm mt-3 font-medium">
            Pelanggaran berikutnya akan mengumpulkan ujian otomatis!
          </p>
        )}
      </div>

      <style>{`
        @keyframes violation-flash {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }
        @keyframes violation-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

export default ViolationOverlay;
