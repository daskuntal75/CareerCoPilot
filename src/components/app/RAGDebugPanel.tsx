import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronRight, Bug, Database, FileText, Target, Link2, Check, X, CheckCheck, XCircle, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ResumeChunk {
  id: string;
  chunk_index: number;
  chunk_type: string;
  content: string;
  token_count: number;
}

interface JobRequirement {
  id: string;
  requirement_index: number;
  requirement_text: string;
  category: string | null;
  is_critical: boolean;
}

interface RequirementMatch {
  id: string;
  requirement_id: string;
  chunk_id: string;
  similarity_score: number;
  match_evidence: string | null;
  is_verified: boolean;
}

interface RAGDebugPanelProps {
  applicationId: string | null;
}

const RAGDebugPanel = ({ applicationId }: RAGDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chunks" | "requirements" | "matches">("chunks");
  const [chunks, setChunks] = useState<ResumeChunk[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [matches, setMatches] = useState<RequirementMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [showFilters, setShowFilters] = useState(false);

  // Filter matches by similarity threshold
  const filteredMatches = useMemo(() => {
    return matches.filter(m => Number(m.similarity_score) >= similarityThreshold);
  }, [matches, similarityThreshold]);

  // Get counts for bulk actions
  const pendingMatches = useMemo(() => {
    return filteredMatches.filter(m => m.is_verified === null);
  }, [filteredMatches]);

  const bulkVerifyMatches = async () => {
    if (pendingMatches.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const matchIds = pendingMatches.map(m => m.id);
      const { error } = await supabase
        .from("requirement_matches")
        .update({ is_verified: true })
        .in("id", matchIds);

      if (error) throw error;

      // Update local state
      setMatches(prev => prev.map(m => 
        matchIds.includes(m.id) ? { ...m, is_verified: true } : m
      ));
      
      toast.success(`Verified ${matchIds.length} matches above ${(similarityThreshold * 100).toFixed(0)}% threshold`);
    } catch (error) {
      console.error("Error bulk verifying matches:", error);
      toast.error("Failed to bulk verify matches");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const bulkRejectMatches = async () => {
    const belowThresholdMatches = matches.filter(m => 
      Number(m.similarity_score) < similarityThreshold && m.is_verified === null
    );
    
    if (belowThresholdMatches.length === 0) {
      toast.info("No pending matches below threshold to reject");
      return;
    }
    
    setIsBulkUpdating(true);
    try {
      const matchIds = belowThresholdMatches.map(m => m.id);
      const { error } = await supabase
        .from("requirement_matches")
        .update({ is_verified: false })
        .in("id", matchIds);

      if (error) throw error;

      // Update local state
      setMatches(prev => prev.map(m => 
        matchIds.includes(m.id) ? { ...m, is_verified: false } : m
      ));
      
      toast.success(`Rejected ${matchIds.length} matches below ${(similarityThreshold * 100).toFixed(0)}% threshold`);
    } catch (error) {
      console.error("Error bulk rejecting matches:", error);
      toast.error("Failed to bulk reject matches");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const resetAllMatches = async () => {
    if (matches.length === 0) return;
    
    setIsBulkUpdating(true);
    try {
      const matchIds = matches.map(m => m.id);
      const { error } = await supabase
        .from("requirement_matches")
        .update({ is_verified: null })
        .in("id", matchIds);

      if (error) throw error;

      // Update local state
      setMatches(prev => prev.map(m => ({ ...m, is_verified: null })));
      
      toast.success(`Reset verification status for ${matchIds.length} matches`);
    } catch (error) {
      console.error("Error resetting matches:", error);
      toast.error("Failed to reset matches");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchDebugData();
    }
  }, [isOpen, applicationId]);

  const fetchDebugData = async () => {
    if (!applicationId) return;
    
    setIsLoading(true);
    try {
      // First get the application to find the user_id
      const { data: application } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", applicationId)
        .single();

      // Fetch resume chunks - try by application_id first, then by user_id
      let chunksData: ResumeChunk[] = [];
      
      // First try fetching by application_id
      const { data: appChunks, error: appChunksError } = await supabase
        .from("resume_chunks")
        .select("id, chunk_index, chunk_type, content, token_count")
        .eq("application_id", applicationId)
        .order("chunk_index");
      
      if (appChunks && appChunks.length > 0) {
        chunksData = appChunks;
      } else if (application?.user_id) {
        // Fallback: fetch by user_id (for resumes not linked to specific application)
        const { data: userChunks } = await supabase
          .from("resume_chunks")
          .select("id, chunk_index, chunk_type, content, token_count")
          .eq("user_id", application.user_id)
          .order("chunk_index");
        
        chunksData = userChunks || [];
      }
      
      setChunks(chunksData);

      // Fetch job requirements
      const { data: reqsData, error: reqsError } = await supabase
        .from("job_requirements")
        .select("id, requirement_index, requirement_text, category, is_critical")
        .eq("application_id", applicationId)
        .order("requirement_index");

      if (reqsError) throw reqsError;
      setRequirements(reqsData || []);

      // Fetch requirement matches
      if (reqsData && reqsData.length > 0) {
        const reqIds = reqsData.map(r => r.id);
        const { data: matchesData, error: matchesError } = await supabase
          .from("requirement_matches")
          .select("id, requirement_id, chunk_id, similarity_score, match_evidence, is_verified")
          .in("requirement_id", reqIds)
          .order("similarity_score", { ascending: false });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getChunkById = (id: string) => chunks.find(c => c.id === id);
  const getRequirementById = (id: string) => requirements.find(r => r.id === id);

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "text-success bg-success/10";
    if (score >= 0.6) return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  const updateMatchVerification = async (matchId: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from("requirement_matches")
        .update({ is_verified: isVerified })
        .eq("id", matchId);

      if (error) throw error;

      // Update local state
      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, is_verified: isVerified } : m
      ));
    } catch (error) {
      console.error("Error updating match verification:", error);
    }
  };

  if (!applicationId) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-2 w-[600px] max-h-[500px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-secondary/50 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">RAG Pipeline Debug</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  App ID: {applicationId.slice(0, 8)}...
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("chunks")}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "chunks"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Chunks ({chunks.length})
              </button>
              <button
                onClick={() => setActiveTab("requirements")}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "requirements"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Target className="w-4 h-4 inline mr-1" />
                Requirements ({requirements.length})
              </button>
              <button
                onClick={() => setActiveTab("matches")}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "matches"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link2 className="w-4 h-4 inline mr-1" />
                Matches ({filteredMatches.length}/{matches.length})
              </button>
            </div>

            {/* Bulk Actions Bar - Only show on matches tab */}
            {activeTab === "matches" && matches.length > 0 && (
              <div className="border-b border-border bg-secondary/30 px-4 py-2 space-y-2">
                {/* Filter Toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Filter className="w-3 h-3" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {pendingMatches.length} pending above threshold
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-3">
                        {/* Similarity Threshold Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-foreground">
                              Similarity Threshold
                            </label>
                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                              ≥ {(similarityThreshold * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Slider
                            value={[similarityThreshold]}
                            onValueChange={([value]) => setSimilarityThreshold(value)}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Bulk Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-success/10 border-success/30 text-success hover:bg-success/20"
                            onClick={bulkVerifyMatches}
                            disabled={isBulkUpdating || pendingMatches.length === 0}
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Verify All ≥{(similarityThreshold * 100).toFixed(0)}%
                            {pendingMatches.length > 0 && ` (${pendingMatches.length})`}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                            onClick={bulkRejectMatches}
                            disabled={isBulkUpdating}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject All &lt;{(similarityThreshold * 100).toFixed(0)}%
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={resetAllMatches}
                            disabled={isBulkUpdating}
                          >
                            Reset All
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[380px] p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Chunks Tab */}
                  {activeTab === "chunks" && (
                    <div className="space-y-2">
                      {chunks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No chunks found</p>
                      ) : (
                        chunks.map((chunk) => (
                          <div key={chunk.id} className="border border-border rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleExpand(chunk.id)}
                              className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors text-left"
                            >
                              {expandedItems.has(chunk.id) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                #{chunk.chunk_index}
                              </span>
                              <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                                {chunk.chunk_type}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {chunk.token_count} tokens
                              </span>
                            </button>
                            <AnimatePresence>
                              {expandedItems.has(chunk.id) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-3 pt-0">
                                    <pre className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {chunk.content}
                                    </pre>
                                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                                      ID: {chunk.id}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Requirements Tab */}
                  {activeTab === "requirements" && (
                    <div className="space-y-2">
                      {requirements.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No requirements found</p>
                      ) : (
                        requirements.map((req) => (
                          <div key={req.id} className="border border-border rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                #{req.requirement_index + 1}
                              </span>
                              {req.is_critical && (
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                  Critical
                                </span>
                              )}
                              {req.category && (
                                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                                  {req.category}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground mt-2">{req.requirement_text}</p>
                            <p className="text-xs text-muted-foreground mt-2 font-mono">
                              ID: {req.id}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Matches Tab */}
                  {activeTab === "matches" && (
                    <div className="space-y-2">
                      {filteredMatches.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          {matches.length === 0 ? "No matches found" : `No matches above ${(similarityThreshold * 100).toFixed(0)}% threshold`}
                        </p>
                      ) : (
                        filteredMatches.map((match) => {
                          const req = getRequirementById(match.requirement_id);
                          const chunk = getChunkById(match.chunk_id);
                          return (
                            <div key={match.id} className="border border-border rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleExpand(match.id)}
                                className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors text-left"
                              >
                                {expandedItems.has(match.id) ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className={cn(
                                  "text-xs font-mono px-2 py-0.5 rounded font-bold",
                                  getSimilarityColor(Number(match.similarity_score))
                                )}>
                                  {(Number(match.similarity_score) * 100).toFixed(1)}%
                                </span>
                                <span className="text-sm text-foreground flex-1 truncate">
                                  Req #{req?.requirement_index !== undefined ? req.requirement_index + 1 : "?"} → Chunk #{chunk?.chunk_index ?? "?"}
                                </span>
                                {match.is_verified === true && (
                                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">
                                    ✓ Verified
                                  </span>
                                )}
                                {match.is_verified === false && (
                                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                    ✗ Rejected
                                  </span>
                                )}
                              </button>
                              <AnimatePresence>
                                {expandedItems.has(match.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 pt-0 space-y-3">
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Requirement:</p>
                                        <p className="text-sm text-foreground bg-secondary/30 p-2 rounded">
                                          {req?.requirement_text || "Unknown"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Matched Chunk ({chunk?.chunk_type}):</p>
                                        <pre className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                                          {chunk?.content || "Unknown"}
                                        </pre>
                                      </div>
                                      {match.match_evidence && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Evidence:</p>
                                          <p className="text-sm text-foreground bg-primary/5 p-2 rounded border border-primary/20">
                                            {match.match_evidence}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Verification Controls */}
                                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                                        <span className="text-xs text-muted-foreground">Verification:</span>
                                        <Button
                                          size="sm"
                                          variant={match.is_verified === true ? "default" : "outline"}
                                          className={cn(
                                            "h-7 text-xs",
                                            match.is_verified === true && "bg-success hover:bg-success/90"
                                          )}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateMatchVerification(match.id, true);
                                          }}
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Verify
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={match.is_verified === false ? "default" : "outline"}
                                          className={cn(
                                            "h-7 text-xs",
                                            match.is_verified === false && "bg-destructive hover:bg-destructive/90"
                                          )}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateMatchVerification(match.id, false);
                                          }}
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Reject
                                        </Button>
                                        {match.is_verified !== null && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-muted-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Reset to null/unreviewed state
                                              updateMatchVerification(match.id, null as unknown as boolean);
                                            }}
                                          >
                                            Reset
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={isOpen ? "default" : "outline"}
        size="sm"
        className="shadow-lg"
      >
        <Database className="w-4 h-4 mr-1" />
        {isOpen ? "Hide" : "RAG Debug"}
      </Button>
    </div>
  );
};

export default RAGDebugPanel;
