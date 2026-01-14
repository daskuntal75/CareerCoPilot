import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Key, Copy, CheckCircle, Loader2, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BackupCodesSetupProps {
  onCodesGenerated?: () => void;
}

export function BackupCodesSetup({ onCodesGenerated }: BackupCodesSetupProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [status, setStatus] = useState<{
    hasBackupCodes: boolean;
    remaining: number;
    generated_at?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("generate-backup-codes", {
        body: { action: "status" },
      });

      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error("Error fetching backup codes status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-backup-codes", {
        body: { action: "generate" },
      });

      if (error) throw error;

      setCodes(data.codes);
      setShowCodes(true);
      setShowRegenerateDialog(false);
      toast.success("Backup codes generated!");
      onCodesGenerated?.();
      
      // Refresh status after generation
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate backup codes");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAll = () => {
    const codesText = codes.map((code, i) => `${i + 1}. ${code}`).join("\n");
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Backup codes copied to clipboard");
  };

  const handleDownload = () => {
    const codesText = `TailoredApply Backup Codes
Generated: ${new Date().toLocaleString()}

${codes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

Keep these codes safe! Each code can only be used once.
If you lose access to your authenticator app, use one of these codes to sign in.
`;
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailoredapply-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showCodes && codes.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Alert variant="destructive" className="bg-warning/10 border-warning text-warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-warning">
            <strong>Save these codes now!</strong> They won't be shown again.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, index) => (
            <div
              key={index}
              className="font-mono text-sm bg-muted px-3 py-2 rounded border border-border text-center"
            >
              {code}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyAll} className="flex-1">
            {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <Button
          variant="default"
          onClick={() => {
            setShowCodes(false);
            setCodes([]);
          }}
          className="w-full"
        >
          I've Saved My Codes
        </Button>
      </motion.div>
    );
  }

  if (status?.hasBackupCodes) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="font-medium text-success">Backup codes are set up</p>
            <p className="text-sm text-muted-foreground">
              {status.remaining} of 10 codes remaining
              {status.remaining <= 3 && (
                <span className="text-warning ml-1">(consider regenerating)</span>
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowRegenerateDialog(true)}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate Backup Codes
        </Button>

        <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Regenerate Backup Codes?
              </DialogTitle>
              <DialogDescription>
                This will invalidate all your existing backup codes. Make sure you save the new codes somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowRegenerateDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
        <Key className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Recovery backup codes</p>
          <p className="text-sm text-muted-foreground">
            Generate one-time use codes to recover your account if you lose access to your authenticator app.
          </p>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full">
        {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
        Generate Backup Codes
      </Button>
    </div>
  );
}

export default BackupCodesSetup;
