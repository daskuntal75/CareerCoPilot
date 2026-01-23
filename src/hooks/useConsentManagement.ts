import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

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

  // Load consent from localStorage (consent is stored locally, not in database)
  useEffect(() => {
    setIsLoading(false);
  }, [user]);

  // Save consent to localStorage
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

    // Save to localStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updatedConsent));
    setConsent(updatedConsent);
  }, [consent]);

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
