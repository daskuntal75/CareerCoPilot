import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/demo-config";

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSetting: (key: keyof AppSettings, value: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value");

      if (error) {
        // If RLS blocks access (non-admin), use defaults with demo mode from public check
        console.log("Using default settings (user may not be admin)");
        // Try to get demo mode status from a public endpoint or edge function
        await checkDemoModePublic();
        return;
      }

      if (data) {
        const newSettings = { ...DEFAULT_SETTINGS };
        data.forEach((row) => {
          if (row.setting_key === "stripe_enabled") {
            newSettings.stripeEnabled = row.setting_value === true || row.setting_value === "true";
          }
          if (row.setting_key === "demo_mode") {
            newSettings.demoMode = row.setting_value === true || row.setting_value === "true";
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkDemoModePublic = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-demo-mode");
      if (!error && data) {
        setSettings({
          stripeEnabled: data.stripe_enabled || false,
          demoMode: data.demo_mode ?? true,
        });
      }
    } catch {
      // Use defaults if edge function fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    const settingKey = key === "stripeEnabled" ? "stripe_enabled" : "demo_mode";
    
    const { error } = await supabase
      .from("admin_settings")
      .update({ setting_value: value })
      .eq("setting_key", settingKey);

    if (error) {
      throw error;
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  return (
    <AppSettingsContext.Provider value={{ settings, loading, updateSetting, refreshSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
}
