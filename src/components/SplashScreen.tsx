import { useEffect, useState } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import logoMadrasah from "@/assets/logo-madrasah.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const { settings } = useAppSettings();
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Use requestAnimationFrame to ensure the initial 0% renders first
    const raf = requestAnimationFrame(() => {
      setPhase("show");
      setBarWidth(100);
    });
    const t2 = setTimeout(() => setPhase("exit"), 2500);
    const t3 = setTimeout(onFinish, 3100);
    return () => { cancelAnimationFrame(raf); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center exam-gradient transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: 8 + i * 6,
              height: 8 + i * 6,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className={`relative flex flex-col items-center transition-all duration-700 ${
          phase === "enter" ? "scale-75 opacity-0 translate-y-8" : "scale-100 opacity-100 translate-y-0"
        }`}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl scale-150" />
          <img
            src={settings.school_logo_url || logoMadrasah}
            alt="Logo"
            className="relative h-20 w-20 object-contain drop-shadow-2xl"
          />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight text-center">
          {settings.school_name}
        </h1>
        <p className="mt-1 text-sm text-white/70 font-medium">
          {settings.app_name}
        </p>

        {/* Loading bar */}
        <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{ 
              width: `${barWidth}%`,
              transition: 'width 2300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <p className="mt-3 text-xs text-white/50 tracking-widest uppercase">
          Digital Learning Platform
        </p>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
