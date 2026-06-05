import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AntiCheatConfig {
  block_copy_paste: boolean;
  block_right_click: boolean;
  block_shortcuts: boolean;
  block_printscreen: boolean;
  detect_tab_switch: boolean;
  require_fullscreen: boolean;
  max_violations: number;
}

export const DEFAULT_ANTI_CHEAT: AntiCheatConfig = {
  block_copy_paste: true,
  block_right_click: true,
  block_shortcuts: true,
  block_printscreen: true,
  detect_tab_switch: true,
  require_fullscreen: true,
  max_violations: 5,
};

export interface AppSettings {
  id: string;
  school_name: string;
  app_name: string;
  school_logo_url: string | null;
  theme: string;
  anti_cheat_config: AntiCheatConfig;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: "",
  school_name: "MTS Al Wathoniyah 43",
  app_name: "Sistem Ujian Online",
  school_logo_url: null,
  theme: "green",
  anti_cheat_config: DEFAULT_ANTI_CHEAT,
};

const STORAGE_KEY = "app_settings_cache";

const normalize = (data: any): AppSettings => ({
  ...DEFAULT_SETTINGS,
  ...data,
  anti_cheat_config: { ...DEFAULT_ANTI_CHEAT, ...(data?.anti_cheat_config || {}) },
});

const loadCached = (): AppSettings | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return null;
};

let cachedSettings: AppSettings | null = loadCached();
let cacheListeners: Array<(s: AppSettings) => void> = [];

const notifyListeners = (s: AppSettings) => {
  cachedSettings = s;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  cacheListeners.forEach((fn) => fn(s));
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(cachedSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    const listener = (s: AppSettings) => setSettings(s);
    cacheListeners.push(listener);

    if (!cachedSettings) {
      supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) notifyListeners(normalize(data));
          setLoading(false);
        });
    }

    return () => {
      cacheListeners = cacheListeners.filter((l) => l !== listener);
    };
  }, []);

  const refetch = async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).single();
    if (data) notifyListeners(normalize(data));
  };

  return { settings, loading, refetch };
};
