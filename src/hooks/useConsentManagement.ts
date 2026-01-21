import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_STORAGE_KEY = "privacy_consent";
const CONSENT_VERSION = "1.0";

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean; // Always true - required for app
  consentGiven: boolean;
  consentVersion: string;
  consentTimestamp: string | null;
}

const DEFAULT_CONSENT: ConsentPreferences = {
  analytics: false,
  marketing: false,
  functional: true,
  consentGiven: false,
  consentVersion: CONSENT_VERSION,
  consentTimestamp: null,
};

// Generate a simple anonymous ID for non-logged-in users
const getAnonymousId = (): string => {
  let anonymousId = localStorage.getItem("anonymous_consent_id");
  if (!anonymousId) {
    anonymousId = `anon_${crypto.randomUUID()}`;
    localStorage.setItem("anonymous_consent_id", anonymousId);
  }
  return anonymousId;
};

export function useConsentManagement() {
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentPreferences>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if consent version matches
        if (parsed.consentVersion === CONSENT_VERSION) {
          return parsed;
        }
        // If version changed, user needs to re-consent
        return DEFAULT_CONSENT;
      } catch {
        return DEFAULT_CONSENT;
      }
    }
    return DEFAULT_CONSENT;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load consent from database for logged-in users
  useEffect(() => {
    const loadConsent = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("analytics_consent, marketing_consent, consent_updated_at")
            .eq("user_id", user.id)
            .single();

          if (!error && data && data.consent_updated_at) {
            const dbConsent: ConsentPreferences = {
              analytics: data.analytics_consent ?? false,
              marketing: data.marketing_consent ?? false,
              functional: true,
              consentGiven: true,
              consentVersion: CONSENT_VERSION,
              consentTimestamp: data.consent_updated_at,
            };
            setConsent(dbConsent);
            localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(dbConsent));
          }
        } catch (err) {
          console.error("Error loading consent:", err);
        }
      }
      setIsLoading(false);
    };

    loadConsent();
  }, [user]);

  // Save consent to database and localStorage
  const updateConsent = useCallback(async (
    newConsent: Partial<Omit<ConsentPreferences, "functional" | "consentVersion">>
  ) => {
    const timestamp = new Date().toISOString();
    const updatedConsent: ConsentPreferences = {
      ...consent,
      ...newConsent,
      functional: true,
      consentGiven: true,
      consentVersion: CONSENT_VERSION,
      consentTimestamp: timestamp,
    };

    // Save to localStorage immediately
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updatedConsent));
    setConsent(updatedConsent);

    // Save to database
    try {
      if (user) {
        // Update profile for logged-in users
        await supabase
          .from("profiles")
          .update({
            analytics_consent: updatedConsent.analytics,
            marketing_consent: updatedConsent.marketing,
            consent_updated_at: timestamp,
          })
          .eq("user_id", user.id);

        // Also store detailed consent record
        await supabase.from("user_consent").upsert({
          user_id: user.id,
          analytics_consent: updatedConsent.analytics,
          marketing_consent: updatedConsent.marketing,
          functional_consent: true,
          consent_given_at: timestamp,
          consent_updated_at: timestamp,
          consent_method: "settings",
          consent_version: CONSENT_VERSION,
        }, {
          onConflict: "user_id",
        });
      } else {
        // Store anonymous consent
        const anonymousId = getAnonymousId();
        await supabase.from("user_consent").upsert({
          anonymous_id: anonymousId,
          analytics_consent: updatedConsent.analytics,
          marketing_consent: updatedConsent.marketing,
          functional_consent: true,
          consent_given_at: timestamp,
          consent_updated_at: timestamp,
          consent_method: "banner",
          consent_version: CONSENT_VERSION,
        }, {
          onConflict: "anonymous_id",
        });
      }
    } catch (err) {
      console.error("Error saving consent:", err);
      // Consent still saved locally, so functionality continues
    }
  }, [user, consent]);

  // Accept all cookies
  const acceptAll = useCallback(() => {
    updateConsent({
      analytics: true,
      marketing: true,
    });
  }, [updateConsent]);

  // Accept only essential/functional cookies
  const acceptEssentialOnly = useCallback(() => {
    updateConsent({
      analytics: false,
      marketing: false,
    });
  }, [updateConsent]);

  // Revoke all optional consent
  const revokeConsent = useCallback(() => {
    updateConsent({
      analytics: false,
      marketing: false,
    });
  }, [updateConsent]);

  // Check if we need to show consent banner
  const needsConsent = !consent.consentGiven;

  // Check if analytics is allowed
  const canTrackAnalytics = consent.consentGiven && consent.analytics;

  return {
    consent,
    isLoading,
    needsConsent,
    canTrackAnalytics,
    updateConsent,
    acceptAll,
    acceptEssentialOnly,
    revokeConsent,
  };
}
