import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, 
  Save, 
  RefreshCw, 
  FileText, 
  Users, 
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Play,
  History,
  Clock,
  ChevronDown,
  
  Eye,
  Tag,
  GitCompare,
  FlaskConical,
  X,
  Check,
  Pencil,
  Download,
  Upload,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  TrendingUp
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";

interface AIPromptManagementProps {
  refreshTrigger?: number;
}

interface PromptSettings {
  coverLetterSystemPrompt: string;
  coverLetterUserPrompt: string;
  interviewPrepSystemPrompt: string;
  interviewPrepUserPrompt: string;
}

interface PromptVersion {
  id: string;
  setting_key: string;
  setting_value: { prompt?: string };
  version_number: number;
  version_label: string | null;
  created_at: string;
  is_current: boolean;
  avg_quality_rating?: number | null;
  total_uses?: number;
  positive_ratings?: number;
  negative_ratings?: number;
}

interface ExportedConfig {
  exportedAt: string;
  version: string;
  prompts: PromptSettings;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}

const defaultPrompts: PromptSettings = {
  coverLetterSystemPrompt: `You are a senior professional analyzing a job posting against resume materials to create a compelling cover letter with requirements mapping.

# TRUTHFULNESS CONSTRAINT
Do not invent or embellish experience not in the resume. If a requirement has no match, state "No direct match" in the mapping table.`,
  
  coverLetterUserPrompt: `# TASK

## Step 1: Extract Top 10 Job Requirements
Focus on decision-critical requirements (ownership scope, leadership, domain expertise). Exclude generic skills.

## Step 2: Map Experience to Requirements
For each requirement, find matching resume evidence. Use "No direct match" if none found.

## Step 3: Calculate Fit Score
Count requirements genuinely met, divide by 10, multiply by 100.

## Step 4: Write Cover Letter

**Opening**: Professional yet attention-grabbing, stand out from typical letters.

**Body** (2-3 paragraphs): Focus on top 3 requirements using STAR format (Situation, Task, Action, Result) with specific metrics. Keep narratives flowing naturally.

**Fit Statement**: Reference your calculated fit percentage.

**Closing**: Polite, professional, impactful call-to-action.

**Tone**: Professional yet engaging, ATS-friendly with relevant keywords.`,

  interviewPrepSystemPrompt: `You are a senior professional preparing for an interview. Your task is to create comprehensive interview preparation materials.

# CRITICAL RULES
- Base ALL responses ONLY on actual experiences from the provided resume
- DO NOT fabricate metrics, outcomes, or experiences
- Maintain complete accuracy to resume content`,

  interviewPrepUserPrompt: `# TASK

Create comprehensive interview preparation:

## Phase 1: Company Research
- Vision/mission, industry position, products/services
- Research culture via Glassdoor, LinkedIn insights

## Phase 2: Strategic Analysis
- SWOT analysis with critical factors
- Competitive landscape

## Phase 3: Interview Preparation
- Core requirements and competencies
- Unique Value Proposition based on resume
- Why this company / Why leaving current role
- Predict interview structure

## Phase 4: Interview Questions (10-12 total)
Generate role-specific questions by interviewer type with STAR answers.

## Phase 5: Questions to Ask
3 strategic questions per interviewer type

## Phase 6: Follow-up Templates
Brief professional email templates for each round`,
};

// Simple diff algorithm for text comparison
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = (a: string[], b: string[]): Set<string> => {
    const set = new Set<string>();
    for (const line of a) {
      if (b.includes(line)) set.add(line);
    }
    return set;
  };

  const commonLines = lcs(oldLines, newLines);
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldIdx >= oldLines.length) {
      result.push({ type: "added", content: newLines[newIdx] });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      result.push({ type: "removed", content: oldLines[oldIdx] });
      oldIdx++;
    } else if (oldLine === newLine) {
      result.push({ type: "unchanged", content: oldLine });
      oldIdx++;
      newIdx++;
    } else if (!commonLines.has(oldLine)) {
      result.push({ type: "removed", content: oldLine });
      oldIdx++;
    } else if (!commonLines.has(newLine)) {
      result.push({ type: "added", content: newLine });
      newIdx++;
    } else {
      result.push({ type: "removed", content: oldLine });
      result.push({ type: "added", content: newLine });
      oldIdx++;
      newIdx++;
    }
  }

  return result;
}

const AIPromptManagement = ({ refreshTrigger }: AIPromptManagementProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [prompts, setPrompts] = useState<PromptSettings>(defaultPrompts);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<PromptSettings>(defaultPrompts);
  
  // Test preview state
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testType, setTestType] = useState<"cover_letter" | "interview_prep">("cover_letter");
  
  // Version history state
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedVersionKey, setSelectedVersionKey] = useState<string>("ai_cover_letter_system_prompt");
  
  // Diff view state
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{ v1: PromptVersion | null; v2: PromptVersion | null }>({ v1: null, v2: null });
  const [selectingForDiff, setSelectingForDiff] = useState<"v1" | "v2" | null>(null);
  
  // Version labeling state
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  
  // A/B Testing state
  const [abTestOpen, setAbTestOpen] = useState(false);
  const [abTestType, setAbTestType] = useState<"cover_letter" | "interview_prep">("cover_letter");
  const [abTestPromptA, setAbTestPromptA] = useState({ system: "", user: "" });
  const [abTestPromptB, setAbTestPromptB] = useState({ system: "", user: "" });
  const [abTestResultA, setAbTestResultA] = useState<string | null>(null);
  const [abTestResultB, setAbTestResultB] = useState<string | null>(null);
  const [abTestRunning, setAbTestRunning] = useState(false);
  
  // Export/Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExportedConfig | null>(null);
  
  // Analytics state
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [versionAnalytics, setVersionAnalytics] = useState<PromptVersion[]>([]);

  useEffect(() => {
    fetchPrompts();
  }, [refreshTrigger]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "ai_cover_letter_system_prompt",
          "ai_cover_letter_user_prompt",
          "ai_interview_prep_system_prompt",
          "ai_interview_prep_user_prompt",
        ]);

      if (error) throw error;

      const loadedPrompts = { ...defaultPrompts };
      
      data?.forEach((setting) => {
        const value = setting.setting_value as { prompt?: string };
        switch (setting.setting_key) {
          case "ai_cover_letter_system_prompt":
            loadedPrompts.coverLetterSystemPrompt = value?.prompt || defaultPrompts.coverLetterSystemPrompt;
            break;
          case "ai_cover_letter_user_prompt":
            loadedPrompts.coverLetterUserPrompt = value?.prompt || defaultPrompts.coverLetterUserPrompt;
            break;
          case "ai_interview_prep_system_prompt":
            loadedPrompts.interviewPrepSystemPrompt = value?.prompt || defaultPrompts.interviewPrepSystemPrompt;
            break;
          case "ai_interview_prep_user_prompt":
            loadedPrompts.interviewPrepUserPrompt = value?.prompt || defaultPrompts.interviewPrepUserPrompt;
            break;
        }
      });

      setPrompts(loadedPrompts);
      setSavedPrompts(loadedPrompts);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching AI prompts:", error);
      toast.error("Failed to load AI prompts");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionHistory = async (settingKey: string) => {
    setLoadingVersions(true);
    try {
      const { data, error } = await supabase
        .from("ai_prompt_versions")
        .select("*")
        .eq("setting_key", settingKey)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const mappedVersions: PromptVersion[] = (data || []).map((item: any) => ({
        id: item.id,
        setting_key: item.setting_key,
        setting_value: item.setting_value as { prompt?: string },
        version_number: item.version_number,
        version_label: item.version_label,
        created_at: item.created_at,
        is_current: item.is_current ?? false,
        avg_quality_rating: item.avg_quality_rating,
        total_uses: item.total_uses ?? 0,
        positive_ratings: item.positive_ratings ?? 0,
        negative_ratings: item.negative_ratings ?? 0,
      }));
      
      setVersions(mappedVersions);
    } catch (error) {
      console.error("Error fetching version history:", error);
      toast.error("Failed to load version history");
    } finally {
      setLoadingVersions(false);
    }
  };

  // Fetch version analytics for all prompt types
  const fetchVersionAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_prompt_versions")
        .select("*")
        .gt("total_uses", 0)
        .order("total_uses", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const mappedVersions: PromptVersion[] = (data || []).map((item: any) => ({
        id: item.id,
        setting_key: item.setting_key,
        setting_value: item.setting_value as { prompt?: string },
        version_number: item.version_number,
        version_label: item.version_label,
        created_at: item.created_at,
        is_current: item.is_current ?? false,
        avg_quality_rating: item.avg_quality_rating,
        total_uses: item.total_uses ?? 0,
        positive_ratings: item.positive_ratings ?? 0,
        negative_ratings: item.negative_ratings ?? 0,
      }));
      
      setVersionAnalytics(mappedVersions);
    } catch (error) {
      console.error("Error fetching version analytics:", error);
    }
  };

  // Export configuration to JSON
  const exportConfig = () => {
    const config: ExportedConfig = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      prompts: prompts,
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-prompts-config-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Configuration exported successfully");
  };

  // Handle file selection for import
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    try {
      const text = await file.text();
      const config = JSON.parse(text) as ExportedConfig;
      
      // Validate the config structure
      if (!config.prompts || !config.version) {
        throw new Error("Invalid configuration file format");
      }
      
      setImportPreview(config);
    } catch (error) {
      console.error("Error parsing import file:", error);
      toast.error("Invalid configuration file");
      setImportFile(null);
      setImportPreview(null);
    }
  };

  // Apply imported configuration
  const applyImportedConfig = () => {
    if (!importPreview) return;
    
    setPrompts(importPreview.prompts);
    setHasChanges(true);
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview(null);
    toast.success("Configuration imported. Don't forget to save!");
  };

  const handlePromptChange = (key: keyof PromptSettings, value: string) => {
    setPrompts((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveVersion = async (settingKey: string, value: string) => {
    try {
      const { data: existingVersions } = await supabase
        .from("ai_prompt_versions")
        .select("version_number")
        .eq("setting_key", settingKey)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

      await supabase
        .from("ai_prompt_versions")
        .update({ is_current: false })
        .eq("setting_key", settingKey);

      const { error } = await supabase
        .from("ai_prompt_versions")
        .insert({
          setting_key: settingKey,
          setting_value: { prompt: value },
          version_number: nextVersion,
          is_current: true,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving version:", error);
    }
  };

  const updateVersionLabel = async (versionId: string, label: string) => {
    try {
      const { error } = await supabase
        .from("ai_prompt_versions")
        .update({ version_label: label || null })
        .eq("id", versionId);

      if (error) throw error;

      setVersions((prev) =>
        prev.map((v) => (v.id === versionId ? { ...v, version_label: label || null } : v))
      );
      toast.success("Version label updated");
    } catch (error) {
      console.error("Error updating version label:", error);
      toast.error("Failed to update version label");
    } finally {
      setEditingLabel(null);
      setLabelInput("");
    }
  };

  const savePrompts = async () => {
    setSaving(true);
    try {
      const updates = [
        { 
          setting_key: "ai_cover_letter_system_prompt", 
          setting_value: { prompt: prompts.coverLetterSystemPrompt },
          description: "AI system prompt for cover letter generation"
        },
        { 
          setting_key: "ai_cover_letter_user_prompt", 
          setting_value: { prompt: prompts.coverLetterUserPrompt },
          description: "AI user prompt template for cover letter generation"
        },
        { 
          setting_key: "ai_interview_prep_system_prompt", 
          setting_value: { prompt: prompts.interviewPrepSystemPrompt },
          description: "AI system prompt for interview prep generation"
        },
        { 
          setting_key: "ai_interview_prep_user_prompt", 
          setting_value: { prompt: prompts.interviewPrepUserPrompt },
          description: "AI user prompt template for interview prep generation"
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("admin_settings")
          .upsert(update, { onConflict: "setting_key" });
        
        if (error) throw error;
      }

      if (prompts.coverLetterSystemPrompt !== savedPrompts.coverLetterSystemPrompt) {
        await saveVersion("ai_cover_letter_system_prompt", prompts.coverLetterSystemPrompt);
      }
      if (prompts.coverLetterUserPrompt !== savedPrompts.coverLetterUserPrompt) {
        await saveVersion("ai_cover_letter_user_prompt", prompts.coverLetterUserPrompt);
      }
      if (prompts.interviewPrepSystemPrompt !== savedPrompts.interviewPrepSystemPrompt) {
        await saveVersion("ai_interview_prep_system_prompt", prompts.interviewPrepSystemPrompt);
      }
      if (prompts.interviewPrepUserPrompt !== savedPrompts.interviewPrepUserPrompt) {
        await saveVersion("ai_interview_prep_user_prompt", prompts.interviewPrepUserPrompt);
      }

      setSavedPrompts(prompts);
      setHasChanges(false);
      toast.success("AI prompts saved successfully");
    } catch (error) {
      console.error("Error saving AI prompts:", error);
      toast.error("Failed to save AI prompts");
    } finally {
      setSaving(false);
    }
  };

  const testPrompt = async (type: "cover_letter" | "interview_prep") => {
    setTesting(true);
    setTestType(type);
    setTestResult(null);
    setTestDialogOpen(true);

    try {
      const systemPrompt = type === "cover_letter" 
        ? prompts.coverLetterSystemPrompt 
        : prompts.interviewPrepSystemPrompt;
      const userPrompt = type === "cover_letter"
        ? prompts.coverLetterUserPrompt
        : prompts.interviewPrepUserPrompt;

      const { data, error } = await supabase.functions.invoke("test-ai-prompt", {
        body: {
          systemPrompt,
          userPrompt,
          promptType: type,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setTestResult(data.content);
    } catch (error) {
      console.error("Error testing prompt:", error);
      toast.error(error instanceof Error ? error.message : "Failed to test prompt");
      setTestResult("Error: " + (error instanceof Error ? error.message : "Failed to generate test output"));
    } finally {
      setTesting(false);
    }
  };

  const runABTest = async () => {
    setAbTestRunning(true);
    setAbTestResultA(null);
    setAbTestResultB(null);

    try {
      const [resultA, resultB] = await Promise.all([
        supabase.functions.invoke("test-ai-prompt", {
          body: {
            systemPrompt: abTestPromptA.system,
            userPrompt: abTestPromptA.user,
            promptType: abTestType,
          },
        }),
        supabase.functions.invoke("test-ai-prompt", {
          body: {
            systemPrompt: abTestPromptB.system,
            userPrompt: abTestPromptB.user,
            promptType: abTestType,
          },
        }),
      ]);

      if (resultA.error) throw resultA.error;
      if (resultB.error) throw resultB.error;

      setAbTestResultA(resultA.data?.content || "Error generating output");
      setAbTestResultB(resultB.data?.content || "Error generating output");
    } catch (error) {
      console.error("Error running A/B test:", error);
      toast.error(error instanceof Error ? error.message : "Failed to run A/B test");
    } finally {
      setAbTestRunning(false);
    }
  };

  const startABTest = (type: "cover_letter" | "interview_prep") => {
    setAbTestType(type);
    if (type === "cover_letter") {
      setAbTestPromptA({ 
        system: prompts.coverLetterSystemPrompt, 
        user: prompts.coverLetterUserPrompt 
      });
      setAbTestPromptB({ 
        system: prompts.coverLetterSystemPrompt, 
        user: prompts.coverLetterUserPrompt 
      });
    } else {
      setAbTestPromptA({ 
        system: prompts.interviewPrepSystemPrompt, 
        user: prompts.interviewPrepUserPrompt 
      });
      setAbTestPromptB({ 
        system: prompts.interviewPrepSystemPrompt, 
        user: prompts.interviewPrepUserPrompt 
      });
    }
    setAbTestResultA(null);
    setAbTestResultB(null);
    setAbTestOpen(true);
  };

  const restoreVersion = async (version: PromptVersion) => {
    const promptValue = version.setting_value?.prompt;
    if (!promptValue) return;

    switch (version.setting_key) {
      case "ai_cover_letter_system_prompt":
        handlePromptChange("coverLetterSystemPrompt", promptValue);
        break;
      case "ai_cover_letter_user_prompt":
        handlePromptChange("coverLetterUserPrompt", promptValue);
        break;
      case "ai_interview_prep_system_prompt":
        handlePromptChange("interviewPrepSystemPrompt", promptValue);
        break;
      case "ai_interview_prep_user_prompt":
        handlePromptChange("interviewPrepUserPrompt", promptValue);
        break;
    }

    toast.success(`Restored version ${version.version_number}. Don't forget to save!`);
    setHistoryOpen(false);
  };

  const selectForDiff = (version: PromptVersion) => {
    if (selectingForDiff === "v1") {
      setDiffVersions((prev) => ({ ...prev, v1: version }));
      setSelectingForDiff(null);
    } else if (selectingForDiff === "v2") {
      setDiffVersions((prev) => ({ ...prev, v2: version }));
      setSelectingForDiff(null);
    }
  };

  const openDiffView = () => {
    setDiffOpen(true);
  };

  const diffLines = useMemo(() => {
    if (!diffVersions.v1 || !diffVersions.v2) return [];
    const oldText = diffVersions.v1.setting_value?.prompt || "";
    const newText = diffVersions.v2.setting_value?.prompt || "";
    return computeDiff(oldText, newText);
  }, [diffVersions]);

  const resetToDefaults = () => {
    setPrompts(defaultPrompts);
    setHasChanges(true);
  };

  const discardChanges = () => {
    setPrompts(savedPrompts);
    setHasChanges(false);
  };

  const getPromptLabel = (key: string) => {
    switch (key) {
      case "ai_cover_letter_system_prompt":
        return "Cover Letter - System Prompt";
      case "ai_cover_letter_user_prompt":
        return "Cover Letter - User Prompt";
      case "ai_interview_prep_system_prompt":
        return "Interview Prep - System Prompt";
      case "ai_interview_prep_user_prompt":
        return "Interview Prep - User Prompt";
      default:
        return key;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-accent" />
                AI Prompt Management
              </CardTitle>
              <CardDescription>
                Customize the AI prompts used for generating cover letters and interview prep materials
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={discardChanges}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportConfig}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  fetchVersionAnalytics();
                  setAnalyticsOpen(true);
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setHistoryOpen(true);
                  fetchVersionHistory(selectedVersionKey);
                }}
              >
                <History className="w-4 h-4 mr-2" />
                Version History
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-warning" />
                      Reset to Default Prompts?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all AI prompts to their default values. Your current customizations will be lost.
                      You'll still need to save after resetting.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetToDefaults}>
                      Reset to Defaults
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                onClick={savePrompts} 
                disabled={saving || !hasChanges}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-warning/10 text-warning text-sm">
              <AlertCircle className="w-4 h-4" />
              You have unsaved changes
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cover-letter" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cover-letter" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Cover Letter
              </TabsTrigger>
              <TabsTrigger value="interview-prep" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Interview Prep
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cover-letter" className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => startABTest("cover_letter")}
                >
                  <FlaskConical className="w-4 h-4 mr-2" />
                  A/B Test
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testPrompt("cover_letter")}
                  disabled={testing}
                >
                  {testing && testType === "cover_letter" ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Test Prompt
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cl-system" className="text-sm font-medium flex items-center gap-2">
                  System Prompt
                  <span className="text-xs text-muted-foreground font-normal">
                    (Sets the AI's behavior and constraints)
                  </span>
                </Label>
                <Textarea
                  id="cl-system"
                  value={prompts.coverLetterSystemPrompt}
                  onChange={(e) => handlePromptChange("coverLetterSystemPrompt", e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter system prompt..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cl-user" className="text-sm font-medium flex items-center gap-2">
                  User Prompt Template
                  <span className="text-xs text-muted-foreground font-normal">
                    (Instructions for generating the cover letter)
                  </span>
                </Label>
                <Textarea
                  id="cl-user"
                  value={prompts.coverLetterUserPrompt}
                  onChange={(e) => handlePromptChange("coverLetterUserPrompt", e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter user prompt template..."
                />
                <p className="text-xs text-muted-foreground">
                  Note: The resume, job description, and other context are automatically prepended to this prompt.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="interview-prep" className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => startABTest("interview_prep")}
                >
                  <FlaskConical className="w-4 h-4 mr-2" />
                  A/B Test
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testPrompt("interview_prep")}
                  disabled={testing}
                >
                  {testing && testType === "interview_prep" ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Test Prompt
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip-system" className="text-sm font-medium flex items-center gap-2">
                  System Prompt
                  <span className="text-xs text-muted-foreground font-normal">
                    (Sets the AI's behavior and constraints)
                  </span>
                </Label>
                <Textarea
                  id="ip-system"
                  value={prompts.interviewPrepSystemPrompt}
                  onChange={(e) => handlePromptChange("interviewPrepSystemPrompt", e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter system prompt..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip-user" className="text-sm font-medium flex items-center gap-2">
                  User Prompt Template
                  <span className="text-xs text-muted-foreground font-normal">
                    (Instructions for generating interview prep)
                  </span>
                </Label>
                <Textarea
                  id="ip-user"
                  value={prompts.interviewPrepUserPrompt}
                  onChange={(e) => handlePromptChange("interviewPrepUserPrompt", e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter user prompt template..."
                />
                <p className="text-xs text-muted-foreground">
                  Note: The resume, job description, and other context are automatically prepended to this prompt.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Prompt Tips
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Be specific about the output format you expect</li>
              <li>• Include constraints to prevent hallucinations (e.g., "only use information from the resume")</li>
              <li>• Use clear section headers and bullet points for complex instructions</li>
              <li>• Use the "Test Prompt" button to preview output before saving</li>
              <li>• Use "A/B Test" to compare two different prompt variations side-by-side</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Test Result - {testType === "cover_letter" ? "Cover Letter" : "Interview Prep"}
            </DialogTitle>
            <DialogDescription>
              This is a preview using sample resume and job description data.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {testing ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Generating test output...</span>
              </div>
            ) : testResult ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                  {testResult}
                </pre>
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View, compare, and restore previous versions of AI prompts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                "ai_cover_letter_system_prompt",
                "ai_cover_letter_user_prompt",
                "ai_interview_prep_system_prompt",
                "ai_interview_prep_user_prompt",
              ].map((key) => (
                <Button
                  key={key}
                  variant={selectedVersionKey === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedVersionKey(key);
                    fetchVersionHistory(key);
                    setDiffVersions({ v1: null, v2: null });
                  }}
                >
                  {getPromptLabel(key).split(" - ")[0]}
                  <span className="hidden sm:inline ml-1">
                    - {getPromptLabel(key).split(" - ")[1]}
                  </span>
                </Button>
              ))}
            </div>

            {/* Diff comparison controls */}
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <GitCompare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Compare:</span>
              <Button
                variant={selectingForDiff === "v1" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectingForDiff(selectingForDiff === "v1" ? null : "v1")}
              >
                {diffVersions.v1 ? `v${diffVersions.v1.version_number}` : "Select v1"}
              </Button>
              <span className="text-muted-foreground">vs</span>
              <Button
                variant={selectingForDiff === "v2" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectingForDiff(selectingForDiff === "v2" ? null : "v2")}
              >
                {diffVersions.v2 ? `v${diffVersions.v2.version_number}` : "Select v2"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!diffVersions.v1 || !diffVersions.v2}
                onClick={openDiffView}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Diff
              </Button>
              {(diffVersions.v1 || diffVersions.v2) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiffVersions({ v1: null, v2: null })}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {selectingForDiff && (
              <div className="text-sm text-accent flex items-center gap-2 p-2 rounded bg-accent/10">
                <AlertCircle className="w-4 h-4" />
                Click a version below to select it as {selectingForDiff === "v1" ? "the first" : "the second"} comparison version
              </div>
            )}

            <ScrollArea className="h-[45vh]">
              {loadingVersions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No version history available for this prompt yet.</p>
                  <p className="text-sm">Versions are saved automatically when you save changes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <Collapsible key={version.id}>
                      <div 
                        className={`border rounded-lg p-3 transition-colors ${
                          selectingForDiff ? "cursor-pointer hover:border-accent" : ""
                        } ${
                          diffVersions.v1?.id === version.id || diffVersions.v2?.id === version.id 
                            ? "border-accent bg-accent/5" 
                            : ""
                        }`}
                        onClick={() => selectingForDiff && selectForDiff(version)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={version.is_current ? "default" : "secondary"}>
                              v{version.version_number}
                            </Badge>
                            {version.version_label && (
                              <Badge variant="outline" className="gap-1">
                                <Tag className="w-3 h-3" />
                                {version.version_label}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </div>
                            {version.is_current && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {editingLabel === version.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={labelInput}
                                  onChange={(e) => setLabelInput(e.target.value)}
                                  placeholder="e.g., Production v2"
                                  className="h-8 w-36 text-sm"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateVersionLabel(version.id, labelInput)}
                                >
                                  <Check className="w-4 h-4 text-success" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingLabel(null);
                                    setLabelInput("");
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLabel(version.id);
                                  setLabelInput(version.version_label || "");
                                }}
                                title="Add/Edit Label"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </CollapsibleTrigger>
                            {!version.is_current && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => restoreVersion(version)}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                        <CollapsibleContent className="mt-3">
                          <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-48">
                            {version.setting_value?.prompt || "No content"}
                          </pre>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diff View Dialog */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              Compare Versions
            </DialogTitle>
            <DialogDescription>
              Comparing v{diffVersions.v1?.version_number} 
              {diffVersions.v1?.version_label && ` (${diffVersions.v1.version_label})`} 
              → v{diffVersions.v2?.version_number}
              {diffVersions.v2?.version_label && ` (${diffVersions.v2.version_label})`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[65vh]">
            <div className="space-y-1 font-mono text-sm">
              {diffLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-0.5 ${
                    line.type === "added" 
                      ? "bg-success/20 text-success-foreground border-l-2 border-success" 
                      : line.type === "removed" 
                        ? "bg-destructive/20 text-destructive-foreground border-l-2 border-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  <span className="select-none mr-2 text-muted-foreground">
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  {line.content || " "}
                </div>
              ))}
              {diffLines.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No differences found between these versions.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* A/B Test Dialog */}
      <Dialog open={abTestOpen} onOpenChange={setAbTestOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              A/B Test - {abTestType === "cover_letter" ? "Cover Letter" : "Interview Prep"}
            </DialogTitle>
            <DialogDescription>
              Compare two different prompt configurations side-by-side
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Prompt A */}
            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge>A</Badge>
                Prompt Variant A
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">System Prompt</Label>
                <Textarea
                  value={abTestPromptA.system}
                  onChange={(e) => setAbTestPromptA(prev => ({ ...prev, system: e.target.value }))}
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">User Prompt</Label>
                <Textarea
                  value={abTestPromptA.user}
                  onChange={(e) => setAbTestPromptA(prev => ({ ...prev, user: e.target.value }))}
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
              {abTestResultA && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-success">Result A</Label>
                  <ScrollArea className="h-[200px] border rounded p-2">
                    <pre className="text-xs whitespace-pre-wrap">{abTestResultA}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Prompt B */}
            <div className="space-y-3 border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="secondary">B</Badge>
                Prompt Variant B
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">System Prompt</Label>
                <Textarea
                  value={abTestPromptB.system}
                  onChange={(e) => setAbTestPromptB(prev => ({ ...prev, system: e.target.value }))}
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">User Prompt</Label>
                <Textarea
                  value={abTestPromptB.user}
                  onChange={(e) => setAbTestPromptB(prev => ({ ...prev, user: e.target.value }))}
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
              {abTestResultB && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-success">Result B</Label>
                  <ScrollArea className="h-[200px] border rounded p-2">
                    <pre className="text-xs whitespace-pre-wrap">{abTestResultB}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={runABTest} 
              disabled={abTestRunning}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {abTestRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run A/B Test
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Configuration Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import AI Prompt Configuration
            </DialogTitle>
            <DialogDescription>
              Upload a previously exported JSON configuration file to restore prompts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".json"
                onChange={handleImportFileSelect}
                className="hidden"
                id="import-file"
              />
              <label 
                htmlFor="import-file" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select a JSON configuration file
                </span>
                {importFile && (
                  <Badge variant="secondary" className="mt-2">
                    {importFile.name}
                  </Badge>
                )}
              </label>
            </div>
            
            {importPreview && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Configuration Preview</span>
                    <Badge variant="outline">v{importPreview.version}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Exported: {format(new Date(importPreview.exportedAt), "PPpp")}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 border rounded">
                    <span className="font-medium">Cover Letter System:</span>
                    <span className="ml-1 text-muted-foreground">
                      {importPreview.prompts.coverLetterSystemPrompt.length} chars
                    </span>
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-medium">Cover Letter User:</span>
                    <span className="ml-1 text-muted-foreground">
                      {importPreview.prompts.coverLetterUserPrompt.length} chars
                    </span>
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-medium">Interview System:</span>
                    <span className="ml-1 text-muted-foreground">
                      {importPreview.prompts.interviewPrepSystemPrompt.length} chars
                    </span>
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-medium">Interview User:</span>
                    <span className="ml-1 text-muted-foreground">
                      {importPreview.prompts.interviewPrepUserPrompt.length} chars
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Importing will overwrite your current prompts. You'll need to save after importing.
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
                setImportPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={applyImportedConfig}
              disabled={!importPreview}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Apply Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Analytics Dialog */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Prompt Version Performance Analytics
            </DialogTitle>
            <DialogDescription>
              Track which prompt versions produce higher user satisfaction ratings
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            {versionAnalytics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No analytics data available yet.</p>
                <p className="text-sm">Analytics are collected when users rate generated content.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {versionAnalytics.reduce((sum, v) => sum + (v.total_uses || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Rated Uses</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-500 flex items-center gap-1">
                        <ThumbsUp className="w-5 h-5" />
                        {versionAnalytics.reduce((sum, v) => sum + (v.positive_ratings || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Positive Ratings</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-500 flex items-center gap-1">
                        <ThumbsDown className="w-5 h-5" />
                        {versionAnalytics.reduce((sum, v) => sum + (v.negative_ratings || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Negative Ratings</div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Version Performance Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Version Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {versionAnalytics.map((version) => {
                        const satisfactionRate = version.total_uses && version.total_uses > 0
                          ? ((version.positive_ratings || 0) / version.total_uses * 100).toFixed(1)
                          : "N/A";
                        
                        return (
                          <div 
                            key={version.id}
                            className="p-3 border rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <Badge variant={version.is_current ? "default" : "secondary"}>
                                  v{version.version_number}
                                </Badge>
                                {version.version_label && (
                                  <Badge variant="outline" className="ml-2">
                                    {version.version_label}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {getPromptLabel(version.setting_key)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="text-sm font-medium">{version.total_uses || 0}</div>
                                <div className="text-xs text-muted-foreground">Uses</div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-green-500">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span className="text-sm font-medium">{version.positive_ratings || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 text-red-500">
                                  <ThumbsDown className="w-4 h-4" />
                                  <span className="text-sm font-medium">{version.negative_ratings || 0}</span>
                                </div>
                              </div>
                              
                              <div className="text-center min-w-[80px]">
                                <div className="flex items-center gap-1 justify-center">
                                  <TrendingUp className="w-4 h-4 text-accent" />
                                  <span className="text-sm font-medium">
                                    {satisfactionRate}%
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">Satisfaction</div>
                              </div>
                              
                              {version.avg_quality_rating && (
                                <div className="text-center min-w-[60px]">
                                  <div className="text-sm font-medium">
                                    {Number(version.avg_quality_rating).toFixed(1)}/5
                                  </div>
                                  <div className="text-xs text-muted-foreground">Avg Rating</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIPromptManagement;
