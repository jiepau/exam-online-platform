import { useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

const THEME_MAP: Record<string, { primary: string; accent: string; ring: string; gradient: string }> = {
  green: {
    primary: "152 72% 30%", accent: "152 72% 36%", ring: "152 72% 30%",
    gradient: "linear-gradient(135deg, hsl(152 72% 28%), hsl(160 65% 35%))",
  },
  blue: {
    primary: "217 91% 40%", accent: "217 91% 50%", ring: "217 91% 40%",
    gradient: "linear-gradient(135deg, hsl(217 91% 35%), hsl(210 85% 45%))",
  },
  teal: {
    primary: "174 72% 30%", accent: "174 72% 40%", ring: "174 72% 30%",
    gradient: "linear-gradient(135deg, hsl(174 72% 28%), hsl(180 65% 35%))",
  },
  purple: {
    primary: "262 72% 40%", accent: "262 72% 50%", ring: "262 72% 40%",
    gradient: "linear-gradient(135deg, hsl(262 72% 35%), hsl(270 65% 45%))",
  },
  amber: {
    primary: "38 92% 40%", accent: "38 92% 50%", ring: "38 92% 40%",
    gradient: "linear-gradient(135deg, hsl(38 92% 35%), hsl(45 85% 45%))",
  },
  rose: {
    primary: "350 80% 45%", accent: "350 80% 55%", ring: "350 80% 45%",
    gradient: "linear-gradient(135deg, hsl(350 80% 40%), hsl(340 75% 50%))",
  },
  indigo: {
    primary: "234 85% 45%", accent: "234 85% 55%", ring: "234 85% 45%",
    gradient: "linear-gradient(135deg, hsl(234 85% 40%), hsl(245 80% 50%))",
  },
  emerald: {
    primary: "160 84% 30%", accent: "160 84% 40%", ring: "160 84% 30%",
    gradient: "linear-gradient(135deg, hsl(160 84% 28%), hsl(155 78% 38%))",
  },
  cyan: {
    primary: "190 90% 35%", accent: "190 90% 45%", ring: "190 90% 35%",
    gradient: "linear-gradient(135deg, hsl(190 90% 30%), hsl(195 85% 40%))",
  },
  orange: {
    primary: "24 95% 45%", accent: "24 95% 55%", ring: "24 95% 45%",
    gradient: "linear-gradient(135deg, hsl(24 95% 40%), hsl(30 90% 50%))",
  },
  "pink-purple": {
    primary: "320 80% 45%", accent: "280 75% 50%", ring: "320 80% 45%",
    gradient: "linear-gradient(135deg, hsl(320 80% 45%), hsl(280 75% 50%))",
  },
  "blue-teal": {
    primary: "210 90% 40%", accent: "174 80% 38%", ring: "210 90% 40%",
    gradient: "linear-gradient(135deg, hsl(210 90% 40%), hsl(174 80% 38%))",
  },
  sunset: {
    primary: "15 90% 48%", accent: "340 80% 50%", ring: "15 90% 48%",
    gradient: "linear-gradient(135deg, hsl(40 95% 50%), hsl(15 90% 48%), hsl(340 80% 50%))",
  },
  ocean: {
    primary: "200 85% 40%", accent: "230 80% 50%", ring: "200 85% 40%",
    gradient: "linear-gradient(135deg, hsl(180 75% 38%), hsl(200 85% 40%), hsl(230 80% 50%))",
  },
  forest: {
    primary: "140 70% 30%", accent: "80 60% 40%", ring: "140 70% 30%",
    gradient: "linear-gradient(135deg, hsl(140 70% 30%), hsl(100 65% 35%), hsl(80 60% 40%))",
  },
};

const applyTheme = (themeKey: string) => {
  const theme = THEME_MAP[themeKey] || THEME_MAP.green;
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--ring", theme.ring);
  root.style.setProperty("--exam-nav-active", theme.primary);
  root.style.setProperty("--exam-nav-answered", theme.accent);
  root.style.setProperty("--success", theme.accent);
  root.style.setProperty("--success-foreground", "0 0% 100%");

  const style = document.getElementById("dynamic-theme") || document.createElement("style");
  style.id = "dynamic-theme";
  style.textContent = `.exam-gradient { background: ${theme.gradient} !important; }`;
  if (!document.getElementById("dynamic-theme")) {
    document.head.appendChild(style);
  }
};

// Apply cached theme immediately on load
try {
  const cached = localStorage.getItem("app_settings_cache");
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed?.theme) applyTheme(parsed.theme);
  }
} catch {}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useAppSettings();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  return <>{children}</>;
};
