import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Key, ArrowLeft, Loader2 } from "lucide-react";

interface BackupCodeVerifyProps {
  onVerified: () => void;
  onBack: () => void;
}

export function BackupCodeVerify({ onVerified, onBack }: BackupCodeVerifyProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 8) {
      toast.error("Please enter a valid 8-character backup code");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-backup-codes", {
        body: { action: "verify", code: code.toUpperCase() },
      });

      if (error) throw error;

      if (data.valid) {
        toast.success(`Backup code accepted! ${data.remaining} codes remaining.`);
        onVerified();
      } else {
        toast.error("Invalid or already used backup code");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify backup code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Key className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Use a Backup Code
        </h2>
        <p className="text-muted-foreground text-sm">
          Enter one of your backup codes to sign in without your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backup-code">Backup Code</Label>
          <Input
            id="backup-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase())}
            placeholder="XXXXXXXX"
            className="text-center text-lg tracking-widest font-mono uppercase"
            maxLength={8}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground text-center">
            Enter your 8-character backup code
          </p>
        </div>

        <Button
          type="submit"
          disabled={verifying || code.length !== 8}
          className="w-full"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Backup Code"
          )}
        </Button>
      </form>

      <Button
        variant="ghost"
        onClick={onBack}
        className="w-full"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Authenticator
      </Button>
    </motion.div>
  );
}

export default BackupCodeVerify;
