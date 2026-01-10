import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Clock, ChevronRight, Check, Trash2, RotateCcw, FileText, 
  MessageSquare, Star, MoreVertical 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DocumentVersion {
  id: string;
  user_id: string;
  application_id: string | null;
  document_type: "cover_letter" | "interview_prep";
  version_number: number;
  content?: string | null;
  structured_content?: any;
  version_name?: string | null;
  is_current: boolean;
  created_at: string;
  created_by_action?: string | null;
}

interface VersionHistoryPanelProps {
  versions: DocumentVersion[];
  currentVersionId?: string;
  documentType: "cover_letter" | "interview_prep";
  onSelectVersion: (version: DocumentVersion) => void;
  onRestoreVersion: (version: DocumentVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onRenameVersion: (versionId: string, newName: string) => void;
  isLoading?: boolean;
}

const actionLabels: Record<string, string> = {
  initial: "Original",
  regenerated: "Regenerated",
  manual_edit: "Edited",
};

const VersionHistoryPanel = ({
  versions,
  currentVersionId,
  documentType,
  onSelectVersion,
  onRestoreVersion,
  onDeleteVersion,
  onRenameVersion,
  isLoading = false,
}: VersionHistoryPanelProps) => {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

  const handleDeleteClick = (versionId: string) => {
    setVersionToDelete(versionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (versionToDelete) {
      onDeleteVersion(versionToDelete);
      setVersionToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  if (versions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Version History</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          No versions saved yet. Versions are created when you regenerate or make significant edits.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Version History</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          versions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "border rounded-lg transition-colors",
                version.id === currentVersionId
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              )}
            >
              <button
                onClick={() => onSelectVersion(version)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className="flex-shrink-0">
                  {documentType === "cover_letter" ? (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {version.version_name || `Version ${version.version_number}`}
                    </span>
                    {version.is_current && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </span>
                    {version.created_by_action && (
                      <span className="text-xs text-muted-foreground">
                        • {actionLabels[version.created_by_action] || version.created_by_action}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!version.is_current && (
                      <>
                        <DropdownMenuItem onClick={() => onRestoreVersion(version)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore this version
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(version.id)}
                      className="text-destructive focus:text-destructive"
                      disabled={version.is_current}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete version
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this version from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VersionHistoryPanel;
