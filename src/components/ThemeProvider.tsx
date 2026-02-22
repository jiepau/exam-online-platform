import { useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

const THEME_MAP: Record<string, { primary: string; accent: string; ring: string; gradient: string }> = {
  green: {
    primary: "152 72% 30%",
    accent: "152 72% 36%",
    ring: "152 72% 30%",
    gradient: "linear-gradient(135deg, hsl(152 72% 28%), hsl(160 65% 35%))",
  },
  blue: {
    primary: "217 91% 40%",
    accent: "217 91% 50%",
    ring: "217 91% 40%",
    gradient: "linear-gradient(135deg, hsl(217 91% 35%), hsl(210 85% 45%))",
  },
  teal: {
    primary: "174 72% 30%",
    accent: "174 72% 40%",
    ring: "174 72% 30%",
    gradient: "linear-gradient(135deg, hsl(174 72% 28%), hsl(180 65% 35%))",
  },
  purple: {
    primary: "262 72% 40%",
    accent: "262 72% 50%",
    ring: "262 72% 40%",
    gradient: "linear-gradient(135deg, hsl(262 72% 35%), hsl(270 65% 45%))",
  },
  amber: {
    primary: "38 92% 40%",
    accent: "38 92% 50%",
    ring: "38 92% 40%",
    gradient: "linear-gradient(135deg, hsl(38 92% 35%), hsl(45 85% 45%))",
  },
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useAppSettings();

  useEffect(() => {
    const theme = THEME_MAP[settings.theme] || THEME_MAP.green;
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--exam-nav-active", theme.primary);
    root.style.setProperty("--exam-nav-answered", theme.accent);
    root.style.setProperty("--success", theme.accent);
    root.style.setProperty("--success-foreground", "0 0% 100%");

    // Update gradient utility
    const style = document.getElementById("dynamic-theme") || document.createElement("style");
    style.id = "dynamic-theme";
    style.textContent = `.exam-gradient { background: ${theme.gradient} !important; }`;
    if (!document.getElementById("dynamic-theme")) {
      document.head.appendChild(style);
    }
  }, [settings.theme]);

  return <>{children}</>;
};
