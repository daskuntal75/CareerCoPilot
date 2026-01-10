/**
 * Audit Logging Utilities for Human-in-the-Loop (HITL) Architecture
 * 
 * Implements:
 * - OWASP LLM06: Excessive Agency Prevention
 * - Cryptographic logging for external actions
 * - Non-repudiation for user approvals
 */

import { generateApprovalHash } from './security-utils.ts';

export interface AuditLogEntry {
  user_id: string;
  action_type: ActionType;
  action_target: string;
  action_data: Record<string, unknown>;
  approval_status: 'pending' | 'approved' | 'rejected' | 'expired';
  approval_hash?: string;
  approved_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export type ActionType =
  | 'cover_letter_generated'
  | 'interview_prep_generated'
  | 'resume_parsed'
  | 'job_analysis_completed'
  | 'external_action_requested'
  | 'external_action_approved'
  | 'data_exported'
  | 'account_deleted'
  | 'pii_redaction_applied'
  | 'security_threat_detected';

/**
 * Create an audit log entry
 * Called automatically when significant actions occur
 */
export async function createAuditLog(
  supabase: any,
  entry: AuditLogEntry
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        user_id: entry.user_id,
        action_type: entry.action_type,
        action_target: entry.action_target,
        action_data: entry.action_data,
        approval_status: entry.approval_status,
        approval_hash: entry.approval_hash,
        approved_at: entry.approved_at,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Audit log creation failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Audit log error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Create an approval request for external actions
 * Must be approved before any external action is taken
 */
export async function createApprovalRequest(
  supabase: any,
  userId: string,
  actionType: ActionType,
  actionTarget: string,
  actionData: Record<string, unknown>
): Promise<{ success: boolean; approvalId?: string; approvalHash?: string; error?: string }> {
  const timestamp = new Date();
  const approvalHash = await generateApprovalHash(userId, actionType, actionData, timestamp);

  const result = await createAuditLog(supabase, {
    user_id: userId,
    action_type: actionType,
    action_target: actionTarget,
    action_data: {
      ...actionData,
      requires_approval: true,
      created_timestamp: timestamp.toISOString(),
    },
    approval_status: 'pending',
    approval_hash: approvalHash,
  });

  if (result.success) {
    return {
      success: true,
      approvalId: result.id,
      approvalHash,
    };
  }

  return { success: false, error: result.error };
}

/**
 * Approve a pending action
 * Requires the user to confirm before external actions are taken
 */
export async function approveAction(
  supabase: any,
  approvalId: string,
  userId: string,
  approvalHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the approval hash matches
    const { data: existing, error: fetchError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', approvalId)
      .eq('user_id', userId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Approval not found or already processed' };
    }

    if (existing.approval_hash !== approvalHash) {
      // Log the failed approval attempt
      await createAuditLog(supabase, {
        user_id: userId,
        action_type: 'security_threat_detected',
        action_target: approvalId,
        action_data: {
          threat_type: 'hash_mismatch',
          original_action: existing.action_type,
        },
        approval_status: 'rejected',
      });
      return { success: false, error: 'Invalid approval hash' };
    }

    // Check if approval has expired (5 minute window)
    const createdAt = new Date(existing.action_data.created_timestamp);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now.getTime() - createdAt.getTime() > fiveMinutes) {
      await supabase
        .from('audit_log')
        .update({ approval_status: 'expired' })
        .eq('id', approvalId);
      return { success: false, error: 'Approval has expired' };
    }

    // Approve the action
    const { error: updateError } = await supabase
      .from('audit_log')
      .update({
        approval_status: 'approved',
        approved_at: now.toISOString(),
      })
      .eq('id', approvalId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Log a security threat detection
 * Used when prompt injection or other attacks are detected
 */
export async function logSecurityThreat(
  supabase: any,
  userId: string | null,
  threatType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('sanitization_log').insert({
      user_id: userId,
      input_type: threatType,
      original_hash: details.hash || 'unknown',
      threats_detected: details.threats || [],
    });

    // Also log to audit if we have a user
    if (userId) {
      await createAuditLog(supabase, {
        user_id: userId,
        action_type: 'security_threat_detected',
        action_target: threatType,
        action_data: details,
        approval_status: 'approved', // Already processed
      });
    }
  } catch (err) {
    console.error('Failed to log security threat:', err);
  }
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(
  supabase: any,
  userId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get pending approvals:', error);
    return [];
  }

  return data || [];
}
