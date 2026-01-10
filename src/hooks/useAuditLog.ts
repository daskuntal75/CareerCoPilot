import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

interface ApprovalRequest {
  id: string;
  actionType: string;
  actionTarget: string;
  actionData: Json;
  approvalHash: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Hook for Human-in-the-Loop (HITL) approval workflow
 * Implements OWASP LLM06: Excessive Agency Prevention
 */
export function useAuditLog() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch pending approval requests
   */
  const fetchPendingApprovals = useCallback(async () => {
    if (!user) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const approvals: ApprovalRequest[] = (data || []).map((entry) => ({
        id: entry.id,
        actionType: entry.action_type,
        actionTarget: entry.action_target || "",
        actionData: entry.action_data,
        approvalHash: entry.approval_hash || "",
        createdAt: new Date(entry.created_at),
        expiresAt: new Date(new Date(entry.created_at).getTime() + 5 * 60 * 1000),
      }));

      setPendingApprovals(approvals);
      return approvals;
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Approve a pending action
   */
  const approveAction = useCallback(
    async (approvalId: string, approvalHash: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("audit_log")
          .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", approvalId)
          .eq("user_id", user.id)
          .eq("approval_hash", approvalHash)
          .eq("approval_status", "pending");

        if (error) throw error;

        // Refresh pending approvals
        await fetchPendingApprovals();
        return true;
      } catch (error) {
        console.error("Failed to approve action:", error);
        return false;
      }
    },
    [user, fetchPendingApprovals]
  );

  /**
   * Reject a pending action
   */
  const rejectAction = useCallback(
    async (approvalId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("audit_log")
          .update({
            approval_status: "rejected",
          })
          .eq("id", approvalId)
          .eq("user_id", user.id)
          .eq("approval_status", "pending");

        if (error) throw error;

        await fetchPendingApprovals();
        return true;
      } catch (error) {
        console.error("Failed to reject action:", error);
        return false;
      }
    },
    [user, fetchPendingApprovals]
  );

  /**
   * Log an action (for non-approval-required actions)
   */
  const logAction = useCallback(
    async (
      actionType: string,
      actionTarget: string,
      actionData: Record<string, unknown>
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase.from("audit_log").insert([{
          user_id: user.id,
          action_type: actionType,
          action_target: actionTarget,
          action_data: actionData as Json,
          approval_status: "approved",
        }]);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Failed to log action:", error);
        return false;
      }
    },
    [user]
  );

  /**
   * Get audit history
   */
  const getAuditHistory = useCallback(
    async (limit: number = 50) => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from("audit_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Failed to get audit history:", error);
        return [];
      }
    },
    [user]
  );

  return {
    pendingApprovals,
    loading,
    fetchPendingApprovals,
    approveAction,
    rejectAction,
    logAction,
    getAuditHistory,
  };
}

export default useAuditLog;
