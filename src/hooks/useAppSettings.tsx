import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: string;
  school_name: string;
  app_name: string;
  school_logo_url: string | null;
  theme: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: "",
  school_name: "MTS Al Wathoniyah 43",
  app_name: "Sistem Ujian Online",
  school_logo_url: null,
  theme: "green",
};

let cachedSettings: AppSettings | null = null;
let cacheListeners: Array<(s: AppSettings) => void> = [];

const notifyListeners = (s: AppSettings) => {
  cachedSettings = s;
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
          if (data) {
            const s = data as unknown as AppSettings;
            notifyListeners(s);
          }
          setLoading(false);
        });
    }

    return () => {
      cacheListeners = cacheListeners.filter((l) => l !== listener);
    };
  }, []);

  const refetch = async () => {
    const { data } = await supabase.from("app_settings").select("*").limit(1).single();
    if (data) notifyListeners(data as unknown as AppSettings);
  };

  return { settings, loading, refetch };
};
