import { useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type EventCategory = 
  | "navigation"
  | "authentication"
  | "application"
  | "cover_letter"
  | "interview_prep"
  | "profile"
  | "engagement";

interface TrackEventOptions {
  eventName: string;
  category: EventCategory;
  data?: Record<string, any>;
  pagePath?: string;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

export function useAnalytics() {
  const { user } = useAuth();
  const pendingEventsRef = useRef<TrackEventOptions[]>([]);
  const isFlushingRef = useRef(false);

  // Batch events and flush periodically
  const flushEvents = useCallback(async () => {
    if (isFlushingRef.current || pendingEventsRef.current.length === 0) return;
    
    isFlushingRef.current = true;
    const eventsToSend = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    try {
      const sessionId = getSessionId();
      const events = eventsToSend.map(event => ({
        user_id: user?.id || null,
        session_id: sessionId,
        event_name: event.eventName,
        event_category: event.category,
        event_data: event.data || {},
        page_path: event.pagePath || window.location.pathname,
      }));

      const { error } = await supabase.from("analytics_events").insert(events);
      if (error) {
        console.error("Error tracking events:", error);
        // Put events back if failed
        pendingEventsRef.current = [...eventsToSend, ...pendingEventsRef.current];
      }
    } catch (error) {
      console.error("Error flushing analytics:", error);
    } finally {
      isFlushingRef.current = false;
    }
  }, [user?.id]);

  const trackEvent = useCallback((options: TrackEventOptions) => {
    pendingEventsRef.current.push(options);
    
    // Flush after short delay to batch events
    setTimeout(() => {
      flushEvents();
    }, 500);
  }, [flushEvents]);

  // Common tracking helpers
  const trackPageView = useCallback((pageName: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: "page_view",
      category: "navigation",
      data: { page_name: pageName, ...data },
    });
  }, [trackEvent]);

  const trackApplicationEvent = useCallback((action: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: `application_${action}`,
      category: "application",
      data,
    });
  }, [trackEvent]);

  const trackCoverLetterEvent = useCallback((action: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: `cover_letter_${action}`,
      category: "cover_letter",
      data,
    });
  }, [trackEvent]);

  const trackInterviewPrepEvent = useCallback((action: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: `interview_prep_${action}`,
      category: "interview_prep",
      data,
    });
  }, [trackEvent]);

  const trackAuthEvent = useCallback((action: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: `auth_${action}`,
      category: "authentication",
      data,
    });
  }, [trackEvent]);

  const trackEngagement = useCallback((action: string, data?: Record<string, any>) => {
    trackEvent({
      eventName: action,
      category: "engagement",
      data,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackApplicationEvent,
    trackCoverLetterEvent,
    trackInterviewPrepEvent,
    trackAuthEvent,
    trackEngagement,
  };
}
