import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Fingerprint, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BiometricLoginProps {
  onSuccess?: () => void;
  mode?: "login" | "setup";
}

// Check if WebAuthn is supported
const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined;
};

// Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export function BiometricLogin({ onSuccess, mode = "login" }: BiometricLoginProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    setChecking(true);
    try {
      const isAvailable = await isPlatformAuthenticatorAvailable();
      setAvailable(isAvailable);

      // Check if user has enrolled biometrics
      const credentialId = localStorage.getItem("biometric_credential_id");
      setEnrolled(!!credentialId);
    } catch (err) {
      console.error("Error checking biometric availability:", err);
    } finally {
      setChecking(false);
    }
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

  const handleEnroll = async () => {
    if (!available) {
      toast.error("Biometric authentication not available on this device");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to set up biometric login");
        return;
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
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      // Store the credential ID locally (in production, store on server)
      localStorage.setItem("biometric_credential_id", arrayBufferToBase64(credential.rawId));
      localStorage.setItem("biometric_user_id", user.id);

      setEnrolled(true);
      toast.success("Biometric login enabled!");
      onSuccess?.();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Biometric authentication was cancelled or denied");
      } else {
        toast.error(err.message || "Failed to set up biometric login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!available || !enrolled) return;

    setLoading(true);
    try {
      const credentialId = localStorage.getItem("biometric_credential_id");
      const storedUserId = localStorage.getItem("biometric_user_id");

      if (!credentialId || !storedUserId) {
        toast.error("Biometric not set up. Please sign in with password first.");
        return;
      }

      const challenge = generateChallenge();

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          allowCredentials: [
            {
              id: base64ToArrayBuffer(credentialId),
              type: "public-key",
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!assertion) {
        throw new Error("Authentication failed");
      }

      // In a production app, you'd verify this on the server
      // For now, we'll use a refresh token stored during password login
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        toast.error("Session expired. Please sign in with password.");
        localStorage.removeItem("biometric_credential_id");
        localStorage.removeItem("biometric_user_id");
        setEnrolled(false);
        return;
      }

      toast.success("Biometric authentication successful!");
      onSuccess?.();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Biometric authentication was cancelled or denied");
      } else {
        toast.error(err.message || "Biometric authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem("biometric_credential_id");
    localStorage.removeItem("biometric_user_id");
    setEnrolled(false);
    toast.success("Biometric login disabled");
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!available) {
    return (
      <div className="p-4 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <Fingerprint className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-muted-foreground">Biometric login not available</p>
            <p className="text-sm text-muted-foreground">
              Your device doesn't support Face ID, Touch ID, or Windows Hello.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "setup") {
    if (enrolled) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="font-medium text-success">Biometric login enabled</p>
              <p className="text-sm text-muted-foreground">
                You can use Face ID, Touch ID, or Windows Hello to sign in
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleRemove} className="w-full">
            Disable Biometric Login
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
          <Fingerprint className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Quick sign-in with biometrics</p>
            <p className="text-sm text-muted-foreground">
              Use Face ID, Touch ID, or Windows Hello for faster access.
            </p>
          </div>
        </div>
        <Button onClick={handleEnroll} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Fingerprint className="w-4 h-4 mr-2" />}
          Enable Biometric Login
        </Button>
      </div>
    );
  }

  // Login mode
  if (!enrolled) return null;

  return (
    <Button
      variant="outline"
      onClick={handleAuthenticate}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Fingerprint className="w-4 h-4 mr-2" />
      )}
      Sign in with biometrics
    </Button>
  );
}

export default BiometricLogin;
