 import type { Json } from "@/integrations/supabase/types";
 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import { Skeleton } from "@/components/ui/skeleton";
import { 
  Save, 
  RefreshCw, 
  Cpu, 
  Zap, 
  Brain, 
  Sparkles,
  Play,
  GitCompare,
  CheckCircle,
  AlertCircle,
  Clock,
  Timer,
  DollarSign,
  Sliders,
  Settings2,
  ExternalLink,
  Server
} from "lucide-react";
 import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
 } from "@/components/ui/select";
 import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 } from "@/components/ui/dialog";
 import {
 Tabs,
 TabsContent,
 TabsList,
 TabsTrigger,
 } from "@/components/ui/tabs";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Textarea } from "@/components/ui/textarea";
 
 interface AIModelSelectorProps {
   refreshTrigger?: number;
 }
 
 interface ModelConfig {
   id: string;
   name: string;
   provider: string;
   description: string;
   strengths: string[];
   speed: "fast" | "medium" | "slow";
   quality: "standard" | "high" | "premium";
   costTier: "low" | "medium" | "high";
   costPer1kInput: number;
   costPer1kOutput: number;
 }
 
 interface ModelSelection {
   model: string;
   displayName: string;
   temperature?: number;
   maxTokens?: number;
 }
 
 interface ComparisonResult {
   model: string;
   output: string;
   latencyMs: number;
   wordCount: number;
   error?: string;
   estimatedCost?: number;
   inputTokens?: number;
   outputTokens?: number;
   temperature?: number;
   maxTokens?: number;
 }
 
 interface CRISPEvaluation {
   clarity: number;
   relevance: number;
   insight: number;
   structure: number;
   professionalism: number;
   total: number;
 }
 
 // Supported models for Lovable AI Gateway
 const AVAILABLE_MODELS: ModelConfig[] = [
   {
     id: "google/gemini-3-flash-preview",
     name: "Gemini 3 Flash Preview",
     provider: "Google",
     description: "Fast preview of Google's next-generation model. Balanced speed and capability.",
     strengths: ["Fast generation", "Good quality", "Cost effective"],
     speed: "fast",
     quality: "high",
     costTier: "low",
     costPer1kInput: 0.000075,
     costPer1kOutput: 0.0003,
   },
   {
     id: "google/gemini-2.5-pro",
     name: "Gemini 2.5 Pro",
     provider: "Google",
     description: "Top-tier Gemini model. Best for complex reasoning and large context.",
     strengths: ["Complex reasoning", "Large context", "Multimodal"],
     speed: "slow",
     quality: "premium",
     costTier: "high",
     costPer1kInput: 0.00125,
     costPer1kOutput: 0.005,
   },
   {
     id: "google/gemini-2.5-flash",
     name: "Gemini 2.5 Flash",
     provider: "Google",
     description: "Balanced choice with good multimodal and reasoning capabilities.",
     strengths: ["Balanced", "Multimodal", "Reasoning"],
     speed: "medium",
     quality: "high",
     costTier: "medium",
     costPer1kInput: 0.000075,
     costPer1kOutput: 0.0003,
   },
   {
     id: "google/gemini-2.5-flash-lite",
     name: "Gemini 2.5 Flash Lite",
     provider: "Google",
     description: "Fastest and cheapest. Good for simple tasks.",
     strengths: ["Very fast", "Low cost", "Simple tasks"],
     speed: "fast",
     quality: "standard",
     costTier: "low",
     costPer1kInput: 0.00005,
     costPer1kOutput: 0.0002,
   },
   {
     id: "openai/gpt-5",
     name: "GPT-5",
     provider: "OpenAI",
     description: "Powerful all-rounder with excellent reasoning and multimodal support.",
     strengths: ["Accurate", "Nuanced", "Multimodal"],
     speed: "slow",
     quality: "premium",
     costTier: "high",
     costPer1kInput: 0.005,
     costPer1kOutput: 0.015,
   },
   {
     id: "openai/gpt-5-mini",
     name: "GPT-5 Mini",
     provider: "OpenAI",
     description: "Good performance without overpaying. Strong reasoning.",
     strengths: ["Good balance", "Reasoning", "Cost effective"],
     speed: "medium",
     quality: "high",
     costTier: "medium",
     costPer1kInput: 0.00015,
     costPer1kOutput: 0.0006,
   },
   {
     id: "openai/gpt-5-nano",
     name: "GPT-5 Nano",
     provider: "OpenAI",
     description: "Designed for speed and cost saving. Best for simple tasks.",
     strengths: ["Very fast", "Efficient", "Low cost"],
     speed: "fast",
     quality: "standard",
     costTier: "low",
     costPer1kInput: 0.00005,
     costPer1kOutput: 0.0002,
   },
   {
     id: "openai/gpt-5.2",
     name: "GPT-5.2",
     provider: "OpenAI",
     description: "Latest OpenAI model with enhanced reasoning capabilities.",
     strengths: ["Best reasoning", "Complex tasks", "Latest"],
     speed: "medium",
     quality: "premium",
     costTier: "high",
     costPer1kInput: 0.003,
     costPer1kOutput: 0.012,
   },
   {
     id: "google/gemini-3-pro-preview",
     name: "Gemini 3 Pro Preview",
     provider: "Google",
     description: "Next-generation of Gemini 2.5 Pro. Top performance.",
     strengths: ["Best quality", "Complex reasoning", "Latest"],
     speed: "medium",
     quality: "premium",
     costTier: "high",
     costPer1kInput: 0.00125,
     costPer1kOutput: 0.005,
   },
 ];
 
 const speedIcons = {
   fast: <Zap className="w-3 h-3 text-success" />,
   medium: <Cpu className="w-3 h-3 text-warning" />,
   slow: <Brain className="w-3 h-3 text-muted-foreground" />,
 };
 
 const qualityColors = {
   standard: "bg-secondary text-secondary-foreground",
   high: "bg-accent/20 text-accent",
   premium: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
 };
 
// External model interface
interface ExternalModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  isEnabled: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
  defaultTemperature: number;
  maxTokens: number;
}

const AIModelSelector = ({ refreshTrigger }: AIModelSelectorProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coverLetterModel, setCoverLetterModel] = useState<ModelSelection>({
    model: "google/gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
  });
  const [interviewPrepModel, setInterviewPrepModel] = useState<ModelSelection>({
    model: "google/gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // External models state
  const [externalModels, setExternalModels] = useState<ExternalModelConfig[]>([]);
  
  // Comparison state
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonType, setComparisonType] = useState<"cover_letter" | "interview_prep">("cover_letter");
  const [selectedModelsForComparison, setSelectedModelsForComparison] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [comparisonRunning, setComparisonRunning] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<string, CRISPEvaluation>>({});
  
  // Model configuration state for comparison
  const [modelConfigs, setModelConfigs] = useState<Record<string, { temperature: number; maxTokens: number }>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configEditModel, setConfigEditModel] = useState<string | null>(null);
  
  // Test data for comparisons
  const [testJobDescription, setTestJobDescription] = useState(`Senior Software Engineer at TechCorp

Requirements:
- 5+ years of experience with React and TypeScript
- Experience with cloud platforms (AWS/GCP)
- Strong problem-solving skills
- Team leadership experience preferred
- Excellent communication skills`);
  
  const [testResume, setTestResume] = useState(`Jane Smith - Software Engineer

Experience:
- 6 years at StartupABC as Lead Frontend Engineer
- Built React applications serving 1M+ users
- Led team of 4 developers
- Implemented CI/CD pipelines on AWS
- Reduced page load times by 40%`);

  // Combined models for comparison (built-in + external)
  const allModelsForComparison = useMemo(() => {
    const builtIn = AVAILABLE_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      isExternal: false,
      speed: m.speed,
      costPer1kInput: m.costPer1kInput,
      costPer1kOutput: m.costPer1kOutput,
    }));
    
    const external = externalModels
      .filter(m => m.isEnabled)
      .map(m => ({
        id: `external/${m.id}`,
        name: m.name,
        provider: m.provider,
        isExternal: true,
        speed: "medium" as const,
        costPer1kInput: m.costPer1kInput,
        costPer1kOutput: m.costPer1kOutput,
      }));
    
    return [...builtIn, ...external];
  }, [externalModels]);

  useEffect(() => {
    fetchModelSettings();
    fetchExternalModels();
  }, [refreshTrigger]);

  const fetchExternalModels = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "external_ai_models")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.setting_value) {
        const modelsData = data.setting_value as { models?: ExternalModelConfig[] };
        setExternalModels(modelsData.models || []);
      }
    } catch (error) {
      console.error("Error fetching external models:", error);
    }
  };
 
   const fetchModelSettings = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from("admin_settings")
         .select("setting_key, setting_value")
         .in("setting_key", ["ai_model_cover_letter", "ai_model_interview_prep"]);
 
       if (error) throw error;
 
       data?.forEach((setting) => {
        const value = setting.setting_value as unknown as ModelSelection;
         if (setting.setting_key === "ai_model_cover_letter" && value?.model) {
           setCoverLetterModel(value);
         }
         if (setting.setting_key === "ai_model_interview_prep" && value?.model) {
           setInterviewPrepModel(value);
         }
       });
       
       setHasChanges(false);
     } catch (error) {
       console.error("Error fetching model settings:", error);
       toast.error("Failed to load model settings");
     } finally {
       setLoading(false);
     }
   };
 
   // Helper functions for cost calculation
   const estimateTokens = (text: string): number => {
     return Math.ceil(text.length / 4);
   };
 
   const calculateCost = (modelId: string, inputTokens: number, outputTokens: number): number => {
     const model = AVAILABLE_MODELS.find(m => m.id === modelId);
     if (!model) return 0;
     return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
   };
 
   const openModelConfig = (modelId: string) => {
     const existingConfig = modelConfigs[modelId] || { temperature: 0.7, maxTokens: 4000 };
     setModelConfigs(prev => ({ ...prev, [modelId]: existingConfig }));
     setConfigEditModel(modelId);
     setConfigDialogOpen(true);
   };
 
   const totalComparisonCost = useMemo(() => {
     return comparisonResults.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
   }, [comparisonResults]);
 
   const saveModelSettings = async () => {
     setSaving(true);
     try {
      // Update cover letter model
      const { error: error1 } = await supabase
        .from("admin_settings")
        .update({
          setting_value: coverLetterModel as unknown as Json,
          description: "Selected AI model for cover letter generation",
        })
        .eq("setting_key", "ai_model_cover_letter");

      if (error1) throw error1;

      // Update interview prep model
      const { error: error2 } = await supabase
        .from("admin_settings")
        .update({
          setting_value: interviewPrepModel as unknown as Json,
          description: "Selected AI model for interview prep generation",
        })
        .eq("setting_key", "ai_model_interview_prep");

      if (error2) throw error2;

      setHasChanges(false);
      toast.success("Model settings saved successfully");
    } catch (error) {
      console.error("Error saving model settings:", error);
      toast.error("Failed to save model settings");
    } finally {
      setSaving(false);
    }
  };
 
   const handleModelChange = (type: "cover_letter" | "interview_prep", modelId: string) => {
     const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
     if (!model) return;
 
     const selection: ModelSelection = {
       model: modelId,
       displayName: model.name,
     };
 
     if (type === "cover_letter") {
       setCoverLetterModel(selection);
     } else {
       setInterviewPrepModel(selection);
     }
     setHasChanges(true);
   };
 
   const toggleModelForComparison = (modelId: string) => {
     setSelectedModelsForComparison((prev) => {
       if (prev.includes(modelId)) {
         return prev.filter((m) => m !== modelId);
       }
       if (prev.length >= 4) {
         toast.error("Maximum 4 models can be compared at once");
         return prev;
       }
       return [...prev, modelId];
     });
   };
 
   const runComparison = async () => {
     if (selectedModelsForComparison.length < 2) {
       toast.error("Please select at least 2 models to compare");
       return;
     }
 
     setComparisonRunning(true);
     setComparisonResults([]);
     setEvaluations({});
 
     try {
       const results: ComparisonResult[] = [];
       const inputText = testJobDescription + testResume;
       const estimatedInputTokens = estimateTokens(inputText);
 
       for (const modelId of selectedModelsForComparison) {
         const startTime = Date.now();
         const config = modelConfigs[modelId] || { temperature: 0.7, maxTokens: 4000 };
         
         try {
           const functionName = comparisonType === "cover_letter" 
             ? "generate-cover-letter" 
             : "generate-interview-prep";
           
           const response = await supabase.functions.invoke(functionName, {
             body: {
               resumeContent: testResume,
               jobDescription: testJobDescription,
               jobTitle: "Senior Software Engineer",
               company: "TechCorp",
               stream: false,
               overrideModel: modelId,
               overrideTemperature: config.temperature,
               overrideMaxTokens: config.maxTokens,
             },
           });
 
           const latencyMs = Date.now() - startTime;
           
           if (response.error) {
             results.push({
               model: modelId,
               output: "",
               latencyMs,
               wordCount: 0,
               error: response.error.message,
               temperature: config.temperature,
               maxTokens: config.maxTokens,
             });
           } else {
             const output = comparisonType === "cover_letter"
               ? response.data.coverLetter || JSON.stringify(response.data)
               : JSON.stringify(response.data, null, 2);
             
             const outputTokens = estimateTokens(output);
             const estimatedCost = calculateCost(modelId, estimatedInputTokens, outputTokens);
             
             results.push({
               model: modelId,
               output,
               latencyMs,
               wordCount: output.split(/\s+/).length,
               estimatedCost,
               inputTokens: estimatedInputTokens,
               outputTokens,
               temperature: config.temperature,
               maxTokens: config.maxTokens,
             });
           }
         } catch (error) {
           results.push({
             model: modelId,
             output: "",
             latencyMs: Date.now() - startTime,
             wordCount: 0,
             error: error instanceof Error ? error.message : "Unknown error",
             temperature: config.temperature,
             maxTokens: config.maxTokens,
           });
         }
         
         // Update results as they come in
         setComparisonResults([...results]);
       }
 
       // Run CRISP evaluations
       const evals: Record<string, CRISPEvaluation> = {};
       for (const result of results) {
         if (!result.error && result.output) {
           evals[result.model] = evaluateCRISP(result.output);
         }
       }
       setEvaluations(evals);
 
       toast.success("Comparison complete");
     } catch (error) {
       console.error("Comparison error:", error);
       toast.error("Comparison failed");
     } finally {
       setComparisonRunning(false);
     }
   };
 
   // CRISP evaluation framework (simplified scoring)
   const evaluateCRISP = (text: string): CRISPEvaluation => {
     const words = text.split(/\s+/);
     const sentences = text.split(/[.!?]+/).filter(Boolean);
     const paragraphs = text.split(/\n\n+/).filter(Boolean);
 
     // Clarity: Sentence length and structure
     const avgSentenceLength = words.length / Math.max(sentences.length, 1);
     const clarity = Math.min(10, Math.max(1, 10 - Math.abs(avgSentenceLength - 15) / 3));
 
     // Relevance: Check for job-related keywords
     const relevantKeywords = ["experience", "skills", "team", "project", "developed", "led", "achieved", "implemented"];
     const keywordCount = relevantKeywords.filter((kw) => text.toLowerCase().includes(kw)).length;
     const relevance = Math.min(10, (keywordCount / relevantKeywords.length) * 10);
 
     // Insight: Check for specific metrics and achievements
     const hasMetrics = /\d+%|\d+\+|\$\d+|million|thousand/i.test(text);
     const hasSTAR = /situation|task|action|result/i.test(text);
     const insight = hasMetrics ? 8 : hasSTAR ? 6 : 4;
 
     // Structure: Check for proper formatting
     const hasHeadings = /^#+\s|^\[.+\]/m.test(text);
     const hasLists = /^[-*]\s/m.test(text);
     const structure = paragraphs.length >= 3 ? 8 : paragraphs.length >= 2 ? 6 : 4;
     const structureBonus = (hasHeadings ? 1 : 0) + (hasLists ? 1 : 0);
     const structureScore = Math.min(10, structure + structureBonus);
 
     // Professionalism: Tone and vocabulary
     const professionalWords = ["appreciate", "opportunity", "contribute", "expertise", "dedicated", "passion"];
     const professionalCount = professionalWords.filter((w) => text.toLowerCase().includes(w)).length;
     const professionalism = Math.min(10, 5 + professionalCount);
 
     const total = (clarity + relevance + insight + structureScore + professionalism) / 5;
 
     return {
       clarity: Math.round(clarity * 10) / 10,
       relevance: Math.round(relevance * 10) / 10,
       insight: Math.round(insight * 10) / 10,
       structure: Math.round(structureScore * 10) / 10,
       professionalism: Math.round(professionalism * 10) / 10,
       total: Math.round(total * 10) / 10,
     };
   };
 
   const getModelConfig = (modelId: string) => AVAILABLE_MODELS.find((m) => m.id === modelId);
 
   const rankedResults = [...comparisonResults]
     .filter((r) => !r.error && evaluations[r.model])
     .sort((a, b) => (evaluations[b.model]?.total || 0) - (evaluations[a.model]?.total || 0));
 
   if (loading) {
     return (
       <Card>
         <CardHeader>
           <Skeleton className="h-6 w-48" />
           <Skeleton className="h-4 w-64 mt-2" />
         </CardHeader>
         <CardContent className="space-y-4">
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Cpu className="w-5 h-5 text-accent" />
                 AI Model Selection
               </CardTitle>
               <CardDescription>
                 Choose which AI models power cover letter and interview prep generation
               </CardDescription>
             </div>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setComparisonOpen(true)}
               >
                 <GitCompare className="w-4 h-4" />
                 Compare Models
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={fetchModelSettings}
               >
                 <RefreshCw className="w-4 h-4" />
               </Button>
               {hasChanges && (
                 <Button size="sm" onClick={saveModelSettings} disabled={saving}>
                   {saving ? (
                     <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                   ) : (
                     <Save className="w-4 h-4" />
                   )}
                   Save Changes
                 </Button>
               )}
             </div>
           </div>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Cover Letter Model */}
           <div className="space-y-3">
             <Label className="flex items-center gap-2">
               <Sparkles className="w-4 h-4 text-accent" />
               Cover Letter Generation Model
             </Label>
             <Select
               value={coverLetterModel.model}
               onValueChange={(value) => handleModelChange("cover_letter", value)}
             >
               <SelectTrigger className="w-full">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {AVAILABLE_MODELS.map((model) => (
                   <SelectItem key={model.id} value={model.id}>
                     <div className="flex items-center gap-2">
                       {speedIcons[model.speed]}
                       <span>{model.name}</span>
                       <Badge variant="secondary" className="text-xs">
                         {model.provider}
                       </Badge>
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             {getModelConfig(coverLetterModel.model) && (
               <div className="flex flex-wrap gap-2 mt-2">
                 <Badge className={qualityColors[getModelConfig(coverLetterModel.model)!.quality]}>
                   {getModelConfig(coverLetterModel.model)!.quality} quality
                 </Badge>
                 <Badge variant="outline">
                   {getModelConfig(coverLetterModel.model)!.speed} speed
                 </Badge>
                 <span className="text-xs text-muted-foreground">
                   {getModelConfig(coverLetterModel.model)!.description}
                 </span>
               </div>
             )}
           </div>
 
           {/* Interview Prep Model */}
           <div className="space-y-3">
             <Label className="flex items-center gap-2">
               <Brain className="w-4 h-4 text-accent" />
               Interview Prep Generation Model
             </Label>
             <Select
               value={interviewPrepModel.model}
               onValueChange={(value) => handleModelChange("interview_prep", value)}
             >
               <SelectTrigger className="w-full">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {AVAILABLE_MODELS.map((model) => (
                   <SelectItem key={model.id} value={model.id}>
                     <div className="flex items-center gap-2">
                       {speedIcons[model.speed]}
                       <span>{model.name}</span>
                       <Badge variant="secondary" className="text-xs">
                         {model.provider}
                       </Badge>
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             {getModelConfig(interviewPrepModel.model) && (
               <div className="flex flex-wrap gap-2 mt-2">
                 <Badge className={qualityColors[getModelConfig(interviewPrepModel.model)!.quality]}>
                   {getModelConfig(interviewPrepModel.model)!.quality} quality
                 </Badge>
                 <Badge variant="outline">
                   {getModelConfig(interviewPrepModel.model)!.speed} speed
                 </Badge>
                 <span className="text-xs text-muted-foreground">
                   {getModelConfig(interviewPrepModel.model)!.description}
                 </span>
               </div>
             )}
           </div>
 
           {/* Model Quick Reference */}
           <div className="pt-4 border-t border-border">
             <h4 className="text-sm font-medium mb-3">Available Models Reference</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
               {AVAILABLE_MODELS.map((model) => (
                 <div
                   key={model.id}
                   className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2"
                 >
                   <div className="flex items-center justify-between">
                     <span className="font-medium text-sm">{model.name}</span>
                     <Badge variant="secondary" className="text-xs">
                       {model.provider}
                     </Badge>
                   </div>
                   <div className="flex items-center gap-2">
                     {speedIcons[model.speed]}
                     <span className="text-xs text-muted-foreground">{model.speed}</span>
                     <span className="text-xs text-muted-foreground">•</span>
                     <span className="text-xs text-muted-foreground">{model.quality}</span>
                   </div>
                   <div className="flex flex-wrap gap-1">
                     {model.strengths.map((s) => (
                       <Badge key={s} variant="outline" className="text-xs">
                         {s}
                       </Badge>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Model Comparison Dialog */}
       <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
         <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <GitCompare className="w-5 h-5 text-accent" />
               AI Model Comparison (CRISP Evaluation)
             </DialogTitle>
             <DialogDescription>
               Compare outputs from different models using the CRISP framework (Clarity, Relevance, Insight, Structure, Professionalism)
             </DialogDescription>
           </DialogHeader>
 
           <Tabs defaultValue="setup" className="flex-1">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="setup">Setup Test</TabsTrigger>
               <TabsTrigger value="results" disabled={comparisonResults.length === 0}>
                 Results {comparisonResults.length > 0 && `(${comparisonResults.length})`}
               </TabsTrigger>
             </TabsList>
 
             <TabsContent value="setup" className="space-y-4 mt-4">
               {/* Test Type */}
               <div className="space-y-2">
                 <Label>Generation Type</Label>
                 <Select
                   value={comparisonType}
                   onValueChange={(v) => setComparisonType(v as "cover_letter" | "interview_prep")}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="cover_letter">Cover Letter</SelectItem>
                     <SelectItem value="interview_prep">Interview Prep</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               {/* Test Data */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Sample Job Description</Label>
                   <Textarea
                     value={testJobDescription}
                     onChange={(e) => setTestJobDescription(e.target.value)}
                     rows={6}
                     className="text-sm"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Sample Resume</Label>
                   <Textarea
                     value={testResume}
                     onChange={(e) => setTestResume(e.target.value)}
                     rows={6}
                     className="text-sm"
                   />
                 </div>
               </div>
 
              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Select Models to Compare (2-4)</Label>
                
                {/* Built-in Models */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Lovable AI Gateway Models</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => toggleModelForComparison(model.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedModelsForComparison.includes(model.id)
                            ? "border-accent bg-accent/10"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{model.name}</span>
                          {selectedModelsForComparison.includes(model.id) && (
                            <CheckCircle className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {speedIcons[model.speed]}
                          <span className="text-xs text-muted-foreground">{model.provider}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* External Models */}
                {externalModels.filter(m => m.isEnabled).length > 0 && (
                  <div className="space-y-1 mt-4">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      External Models
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {externalModels.filter(m => m.isEnabled).map((model) => (
                        <button
                          key={model.id}
                          onClick={() => toggleModelForComparison(`external/${model.id}`)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedModelsForComparison.includes(`external/${model.id}`)
                              ? "border-accent bg-accent/10"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{model.name}</span>
                            {selectedModelsForComparison.includes(`external/${model.id}`) && (
                              <CheckCircle className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Server className="w-3 h-3 text-accent" />
                            <span className="text-xs text-muted-foreground">{model.provider}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
             </TabsContent>
 
             <TabsContent value="results" className="mt-4">
               <ScrollArea className="h-[500px]">
                 {/* Rankings */}
                 {rankedResults.length > 0 && (
                   <div className="mb-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                     <h4 className="font-medium mb-3 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-accent" />
                       CRISP Rankings
                     </h4>
                     <div className="space-y-2">
                       {rankedResults.map((result, index) => {
                         const model = getModelConfig(result.model);
                         const eval_ = evaluations[result.model];
                          const maxLatency = Math.max(...rankedResults.map(r => r.latencyMs));
                          const latencyPercent = (result.latencyMs / maxLatency) * 100;
                         return (
                           <div
                             key={result.model}
                               className="flex items-center gap-3 p-3 rounded bg-background"
                           >
                             <span className="font-bold text-lg w-6">{index + 1}</span>
                             <span className="font-medium flex-1">{model?.name}</span>
                             <div className="flex gap-2 text-xs">
                               <span>C: {eval_.clarity}</span>
                               <span>R: {eval_.relevance}</span>
                               <span>I: {eval_.insight}</span>
                               <span>S: {eval_.structure}</span>
                               <span>P: {eval_.professionalism}</span>
                             </div>
                             <Badge className="bg-accent text-accent-foreground">
                               Score: {eval_.total}/10
                             </Badge>
                               <div className="flex items-center gap-2 min-w-[120px]">
                                 <Timer className="w-3 h-3 text-muted-foreground" />
                                 <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                   <div 
                                     className="h-full bg-gradient-to-r from-success to-warning transition-all duration-300"
                                     style={{ width: `${latencyPercent}%` }}
                                   />
                                 </div>
                                 <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                                   {(result.latencyMs / 1000).toFixed(1)}s
                                 </span>
                               </div>
                           </div>
                         );
                       })}
                     </div>
                       
                       {/* Latency Summary */}
                       <div className="mt-4 pt-3 border-t border-accent/20">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                           <Clock className="w-4 h-4" />
                           <span className="font-medium">Latency Comparison</span>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           {rankedResults.map((result) => {
                             const model = getModelConfig(result.model);
                             const isFastest = result.latencyMs === Math.min(...rankedResults.map(r => r.latencyMs));
                             const isSlowest = result.latencyMs === Math.max(...rankedResults.map(r => r.latencyMs));
                             return (
                               <div 
                                 key={result.model + '-latency'} 
                                 className={`p-2 rounded-lg border ${
                                   isFastest ? 'border-success bg-success/10' : 
                                   isSlowest ? 'border-warning bg-warning/10' : 
                                   'border-border bg-secondary/20'
                                 }`}
                               >
                                 <div className="text-xs text-muted-foreground truncate">{model?.name}</div>
                                 <div className="flex items-center gap-1">
                                   <span className={`text-lg font-bold ${
                                     isFastest ? 'text-success' : isSlowest ? 'text-warning' : ''
                                   }`}>
                                     {(result.latencyMs / 1000).toFixed(1)}s
                                   </span>
                                   {isFastest && <Zap className="w-4 h-4 text-success" />}
                                 </div>
                                 <div className="text-xs text-muted-foreground">
                                   {result.wordCount} words • {Math.round(result.wordCount / (result.latencyMs / 1000))} w/s
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                   </div>
                 )}
 
                 {/* Individual Results */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   {comparisonResults.map((result) => {
                     const model = getModelConfig(result.model);
                     const eval_ = evaluations[result.model];
                     return (
                       <div
                         key={result.model}
                         className="border border-border rounded-lg overflow-hidden"
                       >
                         <div className="p-3 bg-secondary/30 border-b border-border">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="font-medium">{model?.name}</span>
                               <Badge variant="secondary">{model?.provider}</Badge>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <span>{result.wordCount} words</span>
                               <span>•</span>
                               <span>{(result.latencyMs / 1000).toFixed(1)}s</span>
                             </div>
                           </div>
                           {eval_ && (
                             <div className="mt-2 flex gap-2 text-xs">
                               <Badge variant="outline">CRISP: {eval_.total}/10</Badge>
                             </div>
                           )}
                         </div>
                         <ScrollArea className="h-48 p-3">
                           {result.error ? (
                             <div className="flex items-center gap-2 text-destructive">
                               <AlertCircle className="w-4 h-4" />
                               <span>{result.error}</span>
                             </div>
                           ) : (
                             <pre className="text-xs whitespace-pre-wrap font-mono">
                               {result.output.substring(0, 2000)}
                               {result.output.length > 2000 && "..."}
                             </pre>
                           )}
                         </ScrollArea>
                       </div>
                     );
                   })}
                 </div>
               </ScrollArea>
             </TabsContent>
           </Tabs>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setComparisonOpen(false)}>
               Close
             </Button>
             <Button
               onClick={runComparison}
               disabled={comparisonRunning || selectedModelsForComparison.length < 2}
             >
               {comparisonRunning ? (
                 <>
                   <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                   Running...
                 </>
               ) : (
                 <>
                   <Play className="w-4 h-4" />
                   Run Comparison
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 };
 
 export default AIModelSelector;