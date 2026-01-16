import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Check if WebAuthn is supported
const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined;
};

// Check if platform authenticator is available
const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// Check if conditional mediation is available (passkey autofill)
const isConditionalMediationAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    // @ts-ignore - Conditional mediation support check
    return await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
  } catch {
    return false;
  }
};

interface PasskeyCredential {
  credentialId: string;
  publicKey: string;
  userId: string;
  createdAt: string;
  name: string;
}

const PASSKEY_STORAGE_KEY = "passkey_credentials";

export function usePasskeyAuth() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [conditionalAvailable, setConditionalAvailable] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setChecking(true);
    try {
      const isAvailable = await isPlatformAuthenticatorAvailable();
      setAvailable(isAvailable);

      const conditional = await isConditionalMediationAvailable();
      setConditionalAvailable(conditional);

      // Load stored passkeys
      loadPasskeys();
    } catch (err) {
      console.error("Error checking passkey availability:", err);
    } finally {
      setChecking(false);
    }
  };

  const loadPasskeys = () => {
    try {
      const stored = localStorage.getItem(PASSKEY_STORAGE_KEY);
      if (stored) {
        setPasskeys(JSON.parse(stored));
      }
    } catch {
      setPasskeys([]);
    }
  };

  const savePasskeys = (credentials: PasskeyCredential[]) => {
    localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(credentials));
    setPasskeys(credentials);
  };

  const generateChallenge = (): Uint8Array => {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    return challenge;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  /**
   * Register a new passkey for the current user
   */
  const registerPasskey = useCallback(async (name: string = "My Passkey"): Promise<boolean> => {
    if (!available) {
      toast.error("Passkey authentication not available on this device");
      return false;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to register a passkey");
        return false;
      }

      const challenge = generateChallenge();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          rp: {
            name: "TailoredApply",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || "user",
            displayName: user.user_metadata?.full_name || user.email || "User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required", // Required for passkeys
            requireResidentKey: true,
          },
          attestation: "none",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Failed to create passkey");
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Store the passkey locally (in production, store on server)
      const newPasskey: PasskeyCredential = {
        credentialId: arrayBufferToBase64(credential.rawId),
        publicKey: arrayBufferToBase64(response.getPublicKey() as ArrayBuffer),
        userId: user.id,
        createdAt: new Date().toISOString(),
        name,
      };

      const updated = [...passkeys.filter(p => p.userId === user.id), newPasskey];
      savePasskeys(updated);

      toast.success("Passkey registered successfully!");
      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Passkey registration was cancelled or denied");
      } else if (err.name === "InvalidStateError") {
        toast.error("A passkey is already registered for this account");
      } else {
        toast.error(err.message || "Failed to register passkey");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [available, passkeys]);

  /**
   * Authenticate with a passkey
   */
  const authenticateWithPasskey = useCallback(async (): Promise<{ success: boolean; userId?: string }> => {
    if (!available) {
      return { success: false };
    }

    setLoading(true);
    try {
      const challenge = generateChallenge();

      // Allow any discoverable credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) {
        return { success: false };
      }

      const credentialId = arrayBufferToBase64(assertion.rawId);
      
      // Find the matching passkey
      const matchingPasskey = passkeys.find(p => p.credentialId === credentialId);
      
      if (!matchingPasskey) {
        toast.error("Passkey not recognized. Please sign in with password.");
        return { success: false };
      }

      // Refresh the session for this user
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        toast.error("Session expired. Please sign in with password.");
        return { success: false };
      }

      toast.success("Passkey authentication successful!");
      return { success: true, userId: matchingPasskey.userId };
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        // User cancelled
        return { success: false };
      }
      console.error("Passkey authentication error:", err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [available, passkeys]);

  /**
   * Remove a passkey
   */
  const removePasskey = useCallback(async (credentialId: string): Promise<boolean> => {
    try {
      const updated = passkeys.filter(p => p.credentialId !== credentialId);
      savePasskeys(updated);
      toast.success("Passkey removed");
      return true;
    } catch {
      toast.error("Failed to remove passkey");
      return false;
    }
  }, [passkeys]);

  /**
   * Get passkeys for the current user
   */
  const getUserPasskeys = useCallback(async (): Promise<PasskeyCredential[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return passkeys.filter(p => p.userId === user.id);
  }, [passkeys]);

  return {
    loading,
    checking,
    available,
    conditionalAvailable,
    passkeys,
    registerPasskey,
    authenticateWithPasskey,
    removePasskey,
    getUserPasskeys,
  };
}

export default usePasskeyAuth;
