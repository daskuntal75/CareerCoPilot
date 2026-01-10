import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserResume {
  id: string;
  resume_type: "detailed" | "abridged";
  file_name: string;
  file_path: string | null;
  content: string;
  uploaded_at: string;
  updated_at: string;
}

export interface UserCoverLetterTemplate {
  id: string;
  file_name: string | null;
  file_path: string | null;
  content: string;
  uploaded_at: string;
  updated_at: string;
}

export interface UserProfileData {
  detailedResume: UserResume | null;
  abridgedResume: UserResume | null;
  coverLetterTemplate: UserCoverLetterTemplate | null;
  isProfileComplete: boolean;
  isLoading: boolean;
}

// Cache for profile data
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useUserProfile() {
  const { user } = useAuth();
  const [detailedResume, setDetailedResume] = useState<UserResume | null>(null);
  const [abridgedResume, setAbridgedResume] = useState<UserResume | null>(null);
  const [coverLetterTemplate, setCoverLetterTemplate] = useState<UserCoverLetterTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProfile = useCallback(async (showLoading = true, bypassCache = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = user.id;
    const cached = profileCache.get(cacheKey);
    if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setDetailedResume(cached.data.detailedResume);
      setAbridgedResume(cached.data.abridgedResume);
      setCoverLetterTemplate(cached.data.coverLetterTemplate);
      setIsLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Only show loading on initial fetch, not on refetches
    if (showLoading && !hasFetchedRef.current) {
      setIsLoading(true);
    }
    
    try {
      // Fetch resumes and template in parallel
      const [resumesResult, templateResult] = await Promise.all([
        supabase
          .from("user_resumes")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("user_cover_letter_templates")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (resumesResult.error) {
        console.error("Error fetching resumes:", resumesResult.error);
      }
      
      if (templateResult.error) {
        console.error("Error fetching cover letter template:", templateResult.error);
      }

      const resumes = resumesResult.data || [];
      const detailed = resumes.find(r => r.resume_type === "detailed") as UserResume | undefined;
      const abridged = resumes.find(r => r.resume_type === "abridged") as UserResume | undefined;
      const template = templateResult.data as UserCoverLetterTemplate | null;

      setDetailedResume(detailed || null);
      setAbridgedResume(abridged || null);
      setCoverLetterTemplate(template);

      // Update cache
      profileCache.set(cacheKey, {
        data: {
          detailedResume: detailed || null,
          abridgedResume: abridged || null,
          coverLetterTemplate: template,
        },
        timestamp: Date.now(),
      });
      
      hasFetchedRef.current = true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error fetching user profile:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(() => {
    return fetchProfile(false, true); // Bypass cache on manual refresh
  }, [fetchProfile]);

  // Clear cache on logout
  useEffect(() => {
    if (!user) {
      profileCache.clear();
      hasFetchedRef.current = false;
    }
  }, [user]);

  // Memoize return value to prevent unnecessary re-renders
  const isProfileComplete = useMemo(() => detailedResume !== null, [detailedResume]);

  return {
    detailedResume,
    abridgedResume,
    coverLetterTemplate,
    isProfileComplete,
    isLoading,
    refreshProfile,
  };
}