import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Loader2, CheckCircle, Trash2, Plus, Fingerprint } from "lucide-react";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PasskeyLoginProps {
  onSuccess?: () => void;
  mode?: "login" | "setup";
}

export function PasskeyLogin({ onSuccess, mode = "login" }: PasskeyLoginProps) {
  const {
    loading,
    checking,
    available,
    passkeys,
    registerPasskey,
    authenticateWithPasskey,
    removePasskey,
    getUserPasskeys,
  } = usePasskeyAuth();

  const [userPasskeys, setUserPasskeys] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (mode === "setup") {
      loadUserPasskeys();
    }
  }, [mode]);

  const loadUserPasskeys = async () => {
    const keys = await getUserPasskeys();
    setUserPasskeys(keys);
  };

  const handleAuthenticate = async () => {
    const result = await authenticateWithPasskey();
    if (result.success) {
      onSuccess?.();
    }
  };

  const handleRegister = async () => {
    if (!passkeyName.trim()) {
      toast.error("Please enter a name for your passkey");
      return;
    }

    setRegistering(true);
    const success = await registerPasskey(passkeyName.trim());
    setRegistering(false);

    if (success) {
      setShowAddDialog(false);
      setPasskeyName("");
      loadUserPasskeys();
      onSuccess?.();
    }
  };

  const handleRemove = async (credentialId: string) => {
    const success = await removePasskey(credentialId);
    if (success) {
      loadUserPasskeys();
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!available) {
    if (mode === "setup") {
      return (
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-muted-foreground">Passkey not available</p>
              <p className="text-sm text-muted-foreground">
                Your device or browser doesn't support passkeys. Try using Chrome, Safari, or Edge on a device with biometric authentication.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (mode === "setup") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
          <Key className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Passwordless sign-in with passkeys</p>
            <p className="text-sm text-muted-foreground">
              Passkeys are a safer and easier alternative to passwords. Sign in with your fingerprint, face, or screen lock.
            </p>
          </div>
        </div>

        {userPasskeys.length > 0 ? (
          <div className="space-y-2">
            <Label>Your passkeys</Label>
            {userPasskeys.map((passkey) => (
              <div
                key={passkey.credentialId}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-medium text-sm">{passkey.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(passkey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(passkey.credentialId)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No passkeys registered yet
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add a Passkey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Passkey</DialogTitle>
              <DialogDescription>
                Give your passkey a name to identify it later (e.g., "MacBook Pro", "iPhone").
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="passkey-name">Passkey name</Label>
                <Input
                  id="passkey-name"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  placeholder="My MacBook"
                  maxLength={50}
                />
              </div>
              <Button
                onClick={handleRegister}
                disabled={registering || !passkeyName.trim()}
                className="w-full"
              >
                {registering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Create Passkey
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Login mode - only show if passkeys exist
  if (passkeys.length === 0) return null;

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
        <Key className="w-4 h-4 mr-2" />
      )}
      Sign in with Passkey
    </Button>
  );
}

export default PasskeyLogin;
