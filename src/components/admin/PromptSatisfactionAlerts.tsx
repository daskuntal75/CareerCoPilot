import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  BellOff,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface PromptSatisfactionAlert {
  id: string;
  prompt_version_id: string | null;
  setting_key: string;
  avg_rating: number;
  total_ratings: number;
  threshold: number;
  alert_type: string;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

const PROMPT_TYPE_LABELS: Record<string, string> = {
  "ai_cover_letter_system_prompt": "Cover Letter System Prompt",
  "ai_cover_letter_user_prompt": "Cover Letter User Prompt",
  "ai_interview_prep_system_prompt": "Interview Prep System Prompt",
  "ai_interview_prep_user_prompt": "Interview Prep User Prompt",
  "ai_job_analysis_system_prompt": "Job Analysis System Prompt",
  "ai_job_analysis_user_prompt": "Job Analysis User Prompt",
};

interface PromptSatisfactionAlertsProps {
  onManualCheck?: () => void;
  isCheckingManually?: boolean;
}

const PromptSatisfactionAlerts = ({ onManualCheck, isCheckingManually }: PromptSatisfactionAlertsProps) => {
  const [alerts, setAlerts] = useState<PromptSatisfactionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PromptSatisfactionAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("prompt_satisfaction_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as PromptSatisfactionAlert[]);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  const openResolveDialog = (alert: PromptSatisfactionAlert) => {
    setSelectedAlert(alert);
    setResolutionNotes(alert.resolution_notes || "");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;

    setResolving(selectedAlert.id);
    try {
      const { error } = await supabase
        .from("prompt_satisfaction_alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", selectedAlert.id);

      if (error) throw error;

      toast.success("Alert resolved successfully");
      setResolveDialogOpen(false);
      fetchAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    } finally {
      setResolving(null);
    }
  };

  const handleReopen = async (alertId: string) => {
    setResolving(alertId);
    try {
      const { error } = await supabase
        .from("prompt_satisfaction_alerts")
        .update({
          status: "open",
          resolved_at: null,
          resolution_notes: null,
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alert reopened");
      fetchAlerts();
    } catch (error) {
      console.error("Error reopening alert:", error);
      toast.error("Failed to reopen alert");
    } finally {
      setResolving(null);
    }
  };

  const openAlerts = alerts.filter((a) => a.status === "open");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with manual check button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">Prompt Satisfaction Alerts</h3>
          {openAlerts.length > 0 && (
            <Badge variant="destructive">{openAlerts.length} Open</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {onManualCheck && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onManualCheck}
              disabled={isCheckingManually}
            >
              {isCheckingManually ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Run Manual Check
            </Button>
          )}
        </div>
      </div>

      {/* Open Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Open Alerts ({openAlerts.length})
          </CardTitle>
          <CardDescription>
            Prompts with satisfaction ratings below threshold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BellOff className="w-10 h-10 mb-2 opacity-50" />
              <p>No open alerts - all prompts are performing well!</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {openAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {PROMPT_TYPE_LABELS[alert.setting_key] || alert.setting_key}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {alert.avg_rating.toFixed(2)} / 5
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(alert.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                        <span>
                          {alert.total_ratings} ratings | Threshold: {alert.threshold}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openResolveDialog(alert)}
                      disabled={resolving === alert.id}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Resolved Alerts ({resolvedAlerts.length})
            </CardTitle>
            <CardDescription>Previously addressed satisfaction issues</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {resolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {PROMPT_TYPE_LABELS[alert.setting_key] || alert.setting_key}
                        </span>
                        <Badge variant="outline" className="text-xs text-green-600">
                          Resolved
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Resolved: {alert.resolved_at && format(new Date(alert.resolved_at), "MMM d, yyyy")}
                        </span>
                        {alert.resolution_notes && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {alert.resolution_notes.substring(0, 50)}
                            {alert.resolution_notes.length > 50 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReopen(alert.id)}
                      disabled={resolving === alert.id}
                    >
                      Reopen
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Mark this satisfaction alert as resolved and add any notes about the fix.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted mb-4">
                <div className="font-medium mb-1">
                  {PROMPT_TYPE_LABELS[selectedAlert.setting_key] || selectedAlert.setting_key}
                </div>
                <div className="text-sm text-muted-foreground">
                  Rating: {selectedAlert.avg_rating.toFixed(2)} / 5 ({selectedAlert.total_ratings} ratings)
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  placeholder="Describe what was done to address this issue..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolving !== null}>
              {resolving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptSatisfactionAlerts;
