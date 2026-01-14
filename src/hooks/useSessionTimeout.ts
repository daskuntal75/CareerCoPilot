import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SessionTimeoutConfig {
  enabled: boolean;
  timeout_minutes: number;
  warn_before_minutes: number;
  require_reauth_for_sensitive: boolean;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  enabled: true,
  timeout_minutes: 60,
  warn_before_minutes: 5,
  require_reauth_for_sensitive: true,
};

const SESSION_TIMEOUT_KEY = "session_timeout_settings";

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const [config, setConfig] = useState<SessionTimeoutConfig>(DEFAULT_CONFIG);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Load config on mount
  useEffect(() => {
    if (!user) return;

    const loadConfig = async () => {
      // Try localStorage first
      const cached = localStorage.getItem(`${SESSION_TIMEOUT_KEY}_${user.id}`);
      if (cached) {
        try {
          setConfig(JSON.parse(cached));
        } catch {}
      }

      // Then fetch from server
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", `${SESSION_TIMEOUT_KEY}_${user.id}`)
          .single();

        if (data) {
          const serverConfig = data.setting_value as unknown as SessionTimeoutConfig;
          setConfig(serverConfig);
          localStorage.setItem(`${SESSION_TIMEOUT_KEY}_${user.id}`, JSON.stringify(serverConfig));
        }
      } catch {}
    };

    loadConfig();
  }, [user]);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setTimeRemaining(null);

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!config.enabled || config.timeout_minutes === 0 || !user) return;

    const timeoutMs = config.timeout_minutes * 60 * 1000;
    const warningMs = (config.timeout_minutes - config.warn_before_minutes) * 60 * 1000;

    // Set warning timer
    if (config.warn_before_minutes > 0) {
      warningRef.current = setTimeout(() => {
        setShowWarning(true);
        const remainingMs = config.warn_before_minutes * 60 * 1000;
        setTimeRemaining(Math.ceil(remainingMs / 1000));

        // Start countdown
        countdownRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningMs);
    }

    // Set timeout timer
    timeoutRef.current = setTimeout(async () => {
      toast.info("Session expired due to inactivity");
      await signOut();
    }, timeoutMs);
  }, [config, user, signOut]);

  // Setup activity listeners
  useEffect(() => {
    if (!config.enabled || !user) return;

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      // Only reset if not already in warning state and enough time has passed
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > 1000) {
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimer();

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [config.enabled, user, resetTimer]);

  // Extend session (dismiss warning and reset timer)
  const extendSession = useCallback(() => {
    resetTimer();
    toast.success("Session extended");
  }, [resetTimer]);

  // Format remaining time
  const formatTimeRemaining = (): string => {
    if (timeRemaining === null) return "";
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return {
    config,
    showWarning,
    timeRemaining,
    formatTimeRemaining,
    extendSession,
    resetTimer,
  };
}

export default useSessionTimeout;
