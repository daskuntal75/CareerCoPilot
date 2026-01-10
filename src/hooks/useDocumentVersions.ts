import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentVersion {
  id: string;
  user_id: string;
  application_id: string | null;
  document_type: "cover_letter" | "interview_prep";
  version_number: number;
  content: string | null;
  structured_content: any;
  version_name: string | null;
  is_current: boolean;
  created_at: string;
  created_by_action: string | null;
}

export const useDocumentVersions = (
  applicationId: string | null,
  documentType: "cover_letter" | "interview_prep"
) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!user || !applicationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("application_id", applicationId)
        .eq("document_type", documentType)
        .order("version_number", { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []) as DocumentVersion[];
      setVersions(typedData);
      const current = typedData.find(v => v.is_current);
      setCurrentVersion(current || null);
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, applicationId, documentType]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const saveVersion = async (
    content: string | null,
    structuredContent: any,
    action: "initial" | "regenerated" | "manual_edit",
    versionName?: string
  ) => {
    if (!user || !applicationId) return null;

    try {
      // Get the next version number
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 1;

      // Mark all other versions as not current
      if (versions.length > 0) {
        await supabase
          .from("document_versions")
          .update({ is_current: false })
          .eq("application_id", applicationId)
          .eq("document_type", documentType);
      }

      // Insert new version
      const { data, error } = await supabase
        .from("document_versions")
        .insert({
          user_id: user.id,
          application_id: applicationId,
          document_type: documentType,
          version_number: nextVersionNumber,
          content,
          structured_content: structuredContent,
          version_name: versionName,
          is_current: true,
          created_by_action: action,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh versions
      await fetchVersions();
      
      return data;
    } catch (error) {
      console.error("Error saving version:", error);
      toast.error("Failed to save version");
      return null;
    }
  };

  const restoreVersion = async (version: DocumentVersion) => {
    if (!user || !applicationId) return false;

    try {
      // Mark all versions as not current
      await supabase
        .from("document_versions")
        .update({ is_current: false })
        .eq("application_id", applicationId)
        .eq("document_type", documentType);

      // Create a new version based on the restored one
      const nextVersionNumber = Math.max(...versions.map(v => v.version_number)) + 1;
      
      const { error } = await supabase
        .from("document_versions")
        .insert({
          user_id: user.id,
          application_id: applicationId,
          document_type: documentType,
          version_number: nextVersionNumber,
          content: version.content,
          structured_content: version.structured_content,
          version_name: `Restored from v${version.version_number}`,
          is_current: true,
          created_by_action: "manual_edit",
        });

      if (error) throw error;

      await fetchVersions();
      toast.success(`Restored to version ${version.version_number}`);
      return true;
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
      return false;
    }
  };

  const deleteVersion = async (versionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("document_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;

      await fetchVersions();
      toast.success("Version deleted");
      return true;
    } catch (error) {
      console.error("Error deleting version:", error);
      toast.error("Failed to delete version");
      return false;
    }
  };

  const renameVersion = async (versionId: string, newName: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("document_versions")
        .update({ version_name: newName })
        .eq("id", versionId);

      if (error) throw error;

      await fetchVersions();
      return true;
    } catch (error) {
      console.error("Error renaming version:", error);
      toast.error("Failed to rename version");
      return false;
    }
  };

  return {
    versions,
    currentVersion,
    isLoading,
    saveVersion,
    restoreVersion,
    deleteVersion,
    renameVersion,
    fetchVersions,
  };
};
