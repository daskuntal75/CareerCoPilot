import { useState, useEffect, useCallback, useRef } from "react";
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

export function useUserProfile() {
  const { user } = useAuth();
  const [detailedResume, setDetailedResume] = useState<UserResume | null>(null);
  const [abridgedResume, setAbridgedResume] = useState<UserResume | null>(null);
  const [coverLetterTemplate, setCoverLetterTemplate] = useState<UserCoverLetterTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchProfile = useCallback(async (showLoading = true) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch, not on refetches
    if (showLoading && !hasFetchedRef.current) {
      setIsLoading(true);
    }
    
    try {
      // Fetch resumes
      const { data: resumes, error: resumesError } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("user_id", user.id);

      if (resumesError) {
        console.error("Error fetching resumes:", resumesError);
      } else if (resumes) {
        const detailed = resumes.find(r => r.resume_type === "detailed") as UserResume | undefined;
        const abridged = resumes.find(r => r.resume_type === "abridged") as UserResume | undefined;
        setDetailedResume(detailed || null);
        setAbridgedResume(abridged || null);
      }

      // Fetch cover letter template
      const { data: template, error: templateError } = await supabase
        .from("user_cover_letter_templates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (templateError) {
        console.error("Error fetching cover letter template:", templateError);
      } else {
        setCoverLetterTemplate(template as UserCoverLetterTemplate | null);
      }
      
      hasFetchedRef.current = true;
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(() => {
    return fetchProfile(false); // Don't show loading on manual refresh
  }, [fetchProfile]);

  // Profile is complete if detailed resume exists (required)
  const isProfileComplete = detailedResume !== null;

  return {
    detailedResume,
    abridgedResume,
    coverLetterTemplate,
    isProfileComplete,
    isLoading,
    refreshProfile,
  };
}