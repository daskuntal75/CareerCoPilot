import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wand2, 
  Save, 
  RefreshCw, 
  FileText, 
  Users, 
  RotateCcw,
  AlertCircle,
  CheckCircle
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

interface AIPromptManagementProps {
  refreshTrigger?: number;
}

interface PromptSettings {
  coverLetterSystemPrompt: string;
  coverLetterUserPrompt: string;
  interviewPrepSystemPrompt: string;
  interviewPrepUserPrompt: string;
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

const AIPromptManagement = ({ refreshTrigger }: AIPromptManagementProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompts, setPrompts] = useState<PromptSettings>(defaultPrompts);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<PromptSettings>(defaultPrompts);

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

  const handlePromptChange = (key: keyof PromptSettings, value: string) => {
    setPrompts((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
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

  const resetToDefaults = () => {
    setPrompts(defaultPrompts);
    setHasChanges(true);
  };

  const discardChanges = () => {
    setPrompts(savedPrompts);
    setHasChanges(false);
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
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={discardChanges}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard
              </Button>
            )}
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
            <li>• Test changes with a few generations before deploying widely</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIPromptManagement;