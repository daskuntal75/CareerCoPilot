import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type NotificationType = "status_change" | "interview_reminder" | "weekly_summary";

interface SendNotificationOptions {
  notificationType: NotificationType;
  applicationId?: string;
  data?: Record<string, any>;
}

export function useNotifications() {
  const { user } = useAuth();

  const sendNotification = useCallback(async (options: SendNotificationOptions) => {
    if (!user?.id) {
      console.warn("Cannot send notification: user not authenticated");
      return { success: false, error: "User not authenticated" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          userId: user.id,
          ...options,
        },
      });

      if (error) {
        console.error("Error sending notification:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error("Error sending notification:", error);
      return { success: false, error: error.message };
    }
  }, [user?.id]);

  const notifyStatusChange = useCallback(
    async (
      applicationId: string,
      company: string,
      jobTitle: string,
      oldStatus: string,
      newStatus: string
    ) => {
      return sendNotification({
        notificationType: "status_change",
        applicationId,
        data: { company, jobTitle, oldStatus, newStatus },
      });
    },
    [sendNotification]
  );

  const notifyInterviewReminder = useCallback(
    async (
      applicationId: string,
      company: string,
      jobTitle: string,
      interviewDate?: string
    ) => {
      return sendNotification({
        notificationType: "interview_reminder",
        applicationId,
        data: { company, jobTitle, interviewDate },
      });
    },
    [sendNotification]
  );

  return {
    sendNotification,
    notifyStatusChange,
    notifyInterviewReminder,
  };
}
