import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  RefreshCw,
  Lock,
  Cookie,
  BarChart3,
  Megaphone,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useConsentManagement } from "@/hooks/useConsentManagement";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  action_type: string;
  action_target: string | null;
  action_data: any;
  created_at: string;
  approval_status: string | null;
  ip_address: string | null;
}

const actionTypeLabels: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "bg-success/20 text-success" },
  logout: { label: "Logout", color: "bg-muted text-muted-foreground" },
  cover_letter_generated: { label: "Cover Letter Generated", color: "bg-accent/20 text-accent" },
  interview_prep_generated: { label: "Interview Prep Generated", color: "bg-accent/20 text-accent" },
  document_uploaded: { label: "Document Uploaded", color: "bg-primary/20 text-primary" },
  document_deleted: { label: "Document Deleted", color: "bg-destructive/20 text-destructive" },
  application_created: { label: "Application Created", color: "bg-success/20 text-success" },
  application_updated: { label: "Application Updated", color: "bg-warning/20 text-warning" },
  settings_updated: { label: "Settings Updated", color: "bg-muted text-muted-foreground" },
  password_changed: { label: "Password Changed", color: "bg-warning/20 text-warning" },
  export_requested: { label: "Export Requested", color: "bg-primary/20 text-primary" },
};

const CONFIRM_DELETE_TEXT = "DELETE MY ACCOUNT";

const SecurityPrivacyDashboard = () => {
  const { user } = useAuth();
  const { consent, updateConsent, isLoading: consentLoading } = useConsentManagement();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
    }
  }, [user]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load activity log");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Use the comprehensive GDPR export function
      const { data, error } = await supabase.functions.invoke("gdpr-export-data");

      if (error) throw error;

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully - includes all your personal data");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      // Use the comprehensive GDPR delete function
      const { data, error } = await supabase.functions.invoke("gdpr-delete-account", {
        body: { confirmText: CONFIRM_DELETE_TEXT },
      });

      if (error) throw error;

      toast.success("Your account and all data have been permanently deleted");

      // Sign out will happen automatically since the user is deleted
      // But we call it anyway to clear local state
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingApprovals = auditLogs.filter(log => log.approval_status === "pending");

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            Security Overview
          </CardTitle>
          <CardDescription>Your data protection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Encryption</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All data encrypted at rest and in transit using AES-256
              </p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Zero-Retention AI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI models don't store or train on your data
              </p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">PII Redaction</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sensitive info redacted before vector storage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cookie & Tracking Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-accent" />
            Cookie & Tracking Preferences
          </CardTitle>
          <CardDescription>
            Control how we collect and use your data (GDPR compliant)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Essential Cookies - Always On */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <Label className="text-base font-medium">Essential Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Required for authentication and core functionality
                </p>
              </div>
            </div>
            <Switch checked={true} disabled />
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <Label className="text-base font-medium">Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help us improve by tracking feature usage and page views
                </p>
              </div>
            </div>
            <Switch
              checked={consent.analytics}
              onCheckedChange={(checked) => updateConsent({ analytics: checked })}
              disabled={consentLoading}
            />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <Label className="text-base font-medium">Marketing Communications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive personalized tips and product updates
                </p>
              </div>
            </div>
            <Switch
              checked={consent.marketing}
              onCheckedChange={(checked) => updateConsent({ marketing: checked })}
              disabled={consentLoading}
            />
          </div>

          {consent.consentTimestamp && (
            <p className="text-xs text-muted-foreground text-center">
              Last updated: {format(new Date(consent.consentTimestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pending Approvals
              <Badge variant="outline" className="ml-2 bg-warning/20 text-warning border-warning/30">
                {pendingApprovals.length}
              </Badge>
            </CardTitle>
            <CardDescription>Actions requiring your approval before proceeding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-warning" />
                    <div>
                      <p className="text-sm font-medium">{approval.action_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(approval.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <XCircle className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Activity Log
              </CardTitle>
              <CardDescription>Recent activity on your account</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {auditLogs.map((log) => {
                  const typeInfo = actionTypeLabels[log.action_type] || {
                    label: log.action_type,
                    color: "bg-muted text-muted-foreground",
                  };
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        {log.action_target && (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {log.action_target}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-accent" />
            Data Management
          </CardTitle>
          <CardDescription>Export or delete your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <h4 className="font-medium">Export Your Data</h4>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your data (GDPR/CCPA compliant)
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Data
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <h4 className="font-medium text-destructive">Delete All Data</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your data including resumes, applications, and history
              </p>
            </div>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setDeleteConfirmText("");
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      <p>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers, including:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All uploaded resumes and documents</li>
                        <li>All job applications and cover letters</li>
                        <li>All interview preparation materials</li>
                        <li>All activity history and analytics</li>
                        <li>All vector embeddings and search data</li>
                      </ul>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="delete-confirm" className="text-foreground font-medium">
                          Type <span className="font-mono text-destructive">{CONFIRM_DELETE_TEXT}</span> to confirm:
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type here to confirm..."
                          className="border-destructive/50 focus-visible:ring-destructive"
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllData}
                    disabled={isDeleting || deleteConfirmText !== CONFIRM_DELETE_TEXT}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPrivacyDashboard;
