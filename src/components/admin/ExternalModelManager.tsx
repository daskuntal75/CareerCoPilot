 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import { Switch } from "@/components/ui/switch";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { 
   Plus, 
   Trash2, 
   ExternalLink, 
   Key, 
   Server,
   RefreshCw,
   Edit,
   CheckCircle,
   AlertCircle
 } from "lucide-react";
 
 export interface ExternalModel {
   id: string;
   name: string;
   provider: string;
   apiEndpoint: string;
   apiKeyEnvVar: string;
   modelId: string;
   description: string;
   isEnabled: boolean;
   supportsStreaming: boolean;
   maxTokens: number;
   defaultTemperature: number;
   costPer1kInput: number;
   costPer1kOutput: number;
   createdAt: string;
 }
 
 interface ExternalModelManagerProps {
   refreshTrigger?: number;
   onModelsChange?: () => void;
 }
 
 const ExternalModelManager = ({ refreshTrigger, onModelsChange }: ExternalModelManagerProps) => {
   const [models, setModels] = useState<ExternalModel[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingModel, setEditingModel] = useState<ExternalModel | null>(null);
   const [testing, setTesting] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);
 
   // Form state
   const [formData, setFormData] = useState({
     name: "",
     provider: "",
     apiEndpoint: "",
     apiKeyEnvVar: "",
     modelId: "",
     description: "",
     isEnabled: true,
     supportsStreaming: true,
     maxTokens: 4096,
     defaultTemperature: 0.7,
     costPer1kInput: 0,
     costPer1kOutput: 0,
   });
 
   useEffect(() => {
     fetchModels();
   }, [refreshTrigger]);
 
   const fetchModels = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from("admin_settings")
         .select("setting_value")
         .eq("setting_key", "external_ai_models")
         .maybeSingle();
 
       if (error && error.code !== "PGRST116") throw error;
 
       if (data?.setting_value) {
         const modelsData = data.setting_value as { models?: ExternalModel[] };
         setModels(modelsData.models || []);
       }
     } catch (error) {
       console.error("Error fetching external models:", error);
       toast.error("Failed to load external models");
     } finally {
       setLoading(false);
     }
   };
 
   const saveModels = async (updatedModels: ExternalModel[]) => {
     setSaving(true);
     try {
       // First try to update existing
       const { data: existing } = await supabase
         .from("admin_settings")
         .select("id")
         .eq("setting_key", "external_ai_models")
         .maybeSingle();
 
       if (existing) {
         const { error } = await supabase
           .from("admin_settings")
           .update({
             setting_value: { models: updatedModels } as unknown as import("@/integrations/supabase/types").Json,
             description: "Custom external AI models configured by admin",
           })
           .eq("setting_key", "external_ai_models");
 
         if (error) throw error;
       } else {
         const { error } = await supabase
           .from("admin_settings")
           .insert({
             setting_key: "external_ai_models",
             setting_value: { models: updatedModels } as unknown as import("@/integrations/supabase/types").Json,
             description: "Custom external AI models configured by admin",
           });
 
         if (error) throw error;
       }
 
       setModels(updatedModels);
       onModelsChange?.();
       return true;
     } catch (error) {
       console.error("Error saving models:", error);
       toast.error("Failed to save models");
       return false;
     } finally {
       setSaving(false);
     }
   };
 
   const handleAddEdit = () => {
     if (editingModel) {
       // Edit existing
       const updatedModels = models.map(m => 
         m.id === editingModel.id 
           ? { ...formData, id: editingModel.id, createdAt: editingModel.createdAt }
           : m
       );
       saveModels(updatedModels).then(success => {
         if (success) {
           toast.success("Model updated successfully");
           resetForm();
         }
       });
     } else {
       // Add new
       const newModel: ExternalModel = {
         ...formData,
         id: crypto.randomUUID(),
         createdAt: new Date().toISOString(),
       };
       saveModels([...models, newModel]).then(success => {
         if (success) {
           toast.success("Model added successfully");
           resetForm();
         }
       });
     }
   };
 
   const handleDelete = async (id: string) => {
     const updatedModels = models.filter(m => m.id !== id);
     const success = await saveModels(updatedModels);
     if (success) {
       toast.success("Model deleted");
     }
   };
 
   const handleToggleEnabled = async (id: string, enabled: boolean) => {
     const updatedModels = models.map(m => 
       m.id === id ? { ...m, isEnabled: enabled } : m
     );
     await saveModels(updatedModels);
   };
 
   const testModel = async (model: ExternalModel) => {
     setTesting(model.id);
     try {
       // Test by calling through edge function
       const { data, error } = await supabase.functions.invoke("test-external-model", {
         body: { 
           modelId: model.modelId,
           apiEndpoint: model.apiEndpoint,
           apiKeyEnvVar: model.apiKeyEnvVar,
         },
       });
 
       if (error) throw error;
 
       if (data?.success) {
         toast.success(`${model.name} is working correctly!`);
       } else {
         toast.error(`${model.name} test failed: ${data?.error || "Unknown error"}`);
       }
     } catch (error) {
       console.error("Error testing model:", error);
       toast.error(`Failed to test ${model.name}`);
     } finally {
       setTesting(null);
     }
   };
 
   const resetForm = () => {
     setFormData({
       name: "",
       provider: "",
       apiEndpoint: "",
       apiKeyEnvVar: "",
       modelId: "",
       description: "",
       isEnabled: true,
       supportsStreaming: true,
       maxTokens: 4096,
       defaultTemperature: 0.7,
       costPer1kInput: 0,
       costPer1kOutput: 0,
     });
     setEditingModel(null);
     setDialogOpen(false);
   };
 
   const openEditDialog = (model: ExternalModel) => {
     setEditingModel(model);
     setFormData({
       name: model.name,
       provider: model.provider,
       apiEndpoint: model.apiEndpoint,
       apiKeyEnvVar: model.apiKeyEnvVar,
       modelId: model.modelId,
       description: model.description,
       isEnabled: model.isEnabled,
       supportsStreaming: model.supportsStreaming,
       maxTokens: model.maxTokens,
       defaultTemperature: model.defaultTemperature,
       costPer1kInput: model.costPer1kInput,
       costPer1kOutput: model.costPer1kOutput,
     });
     setDialogOpen(true);
   };
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Server className="w-5 h-5 text-accent" />
                 External AI Models
               </CardTitle>
               <CardDescription>
                 Add custom AI models from other providers (Anthropic, Cohere, local LLMs, etc.)
               </CardDescription>
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={fetchModels} disabled={loading}>
                 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                 Refresh
               </Button>
               <Button size="sm" onClick={() => setDialogOpen(true)}>
                 <Plus className="w-4 h-4 mr-2" />
                 Add Model
               </Button>
             </div>
           </div>
         </CardHeader>
         <CardContent>
           {loading ? (
             <div className="flex items-center justify-center py-8">
               <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             </div>
           ) : models.length === 0 ? (
             <div className="text-center py-8">
               <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
               <p className="text-muted-foreground">No external models configured</p>
               <p className="text-sm text-muted-foreground/70">
                 Add models from Anthropic, Cohere, local Ollama, or any OpenAI-compatible API
               </p>
             </div>
           ) : (
             <div className="rounded-md border">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Model</TableHead>
                     <TableHead>Provider</TableHead>
                     <TableHead className="text-center">Status</TableHead>
                     <TableHead className="text-center">Cost ($/1K tokens)</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {models.map((model) => (
                     <TableRow key={model.id}>
                       <TableCell>
                         <div>
                           <div className="font-medium flex items-center gap-2">
                             {model.name}
                             {model.supportsStreaming && (
                               <Badge variant="outline" className="text-xs">Stream</Badge>
                             )}
                           </div>
                           <div className="text-xs text-muted-foreground font-mono">
                             {model.modelId}
                           </div>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="secondary">{model.provider}</Badge>
                       </TableCell>
                       <TableCell className="text-center">
                         <Switch
                           checked={model.isEnabled}
                           onCheckedChange={(checked) => handleToggleEnabled(model.id, checked)}
                         />
                       </TableCell>
                       <TableCell className="text-center">
                         <div className="text-sm">
                           <span className="text-muted-foreground">In:</span> ${model.costPer1kInput.toFixed(4)}
                           <span className="mx-1">/</span>
                           <span className="text-muted-foreground">Out:</span> ${model.costPer1kOutput.toFixed(4)}
                         </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => testModel(model)}
                             disabled={testing === model.id}
                           >
                             {testing === model.id ? (
                               <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                             ) : (
                               <CheckCircle className="w-4 h-4" />
                             )}
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openEditDialog(model)}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             className="text-destructive hover:text-destructive"
                             onClick={() => handleDelete(model.id)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
 
           {/* Quick tips */}
           <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
             <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
               <Key className="w-4 h-4 text-accent" />
               API Key Setup
             </h4>
             <p className="text-xs text-muted-foreground">
               External models require API keys. Add them via Lovable Cloud secrets using the env var name you specify (e.g., ANTHROPIC_API_KEY, COHERE_API_KEY).
             </p>
           </div>
         </CardContent>
       </Card>
 
       {/* Add/Edit Dialog */}
       <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
         <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>
               {editingModel ? "Edit External Model" : "Add External Model"}
             </DialogTitle>
             <DialogDescription>
               Configure a custom AI model from any OpenAI-compatible API
             </DialogDescription>
           </DialogHeader>
 
           <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="name">Display Name</Label>
                 <Input
                   id="name"
                   placeholder="Claude 3.5 Sonnet"
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="provider">Provider</Label>
                 <Select
                   value={formData.provider}
                   onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select provider" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Anthropic">Anthropic</SelectItem>
                     <SelectItem value="Cohere">Cohere</SelectItem>
                     <SelectItem value="Mistral">Mistral</SelectItem>
                     <SelectItem value="Local">Local (Ollama)</SelectItem>
                     <SelectItem value="Azure">Azure OpenAI</SelectItem>
                     <SelectItem value="AWS">AWS Bedrock</SelectItem>
                     <SelectItem value="Custom">Custom</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="modelId">Model ID</Label>
               <Input
                 id="modelId"
                 placeholder="claude-3-5-sonnet-20241022"
                 value={formData.modelId}
                 onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
               />
               <p className="text-xs text-muted-foreground">
                 The exact model identifier to use in API calls
               </p>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="apiEndpoint">API Endpoint</Label>
               <Input
                 id="apiEndpoint"
                 placeholder="https://api.anthropic.com/v1/messages"
                 value={formData.apiEndpoint}
                 onChange={(e) => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
               />
               <p className="text-xs text-muted-foreground">
                 Full URL for the chat completions endpoint
               </p>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="apiKeyEnvVar">API Key Environment Variable</Label>
               <Input
                 id="apiKeyEnvVar"
                 placeholder="ANTHROPIC_API_KEY"
                 value={formData.apiKeyEnvVar}
                 onChange={(e) => setFormData(prev => ({ ...prev, apiKeyEnvVar: e.target.value.toUpperCase() }))}
               />
               <p className="text-xs text-muted-foreground">
                 The secret name in Lovable Cloud (must be added separately)
               </p>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="description">Description</Label>
               <Textarea
                 id="description"
                 placeholder="High-quality model for complex reasoning tasks..."
                 value={formData.description}
                 onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
               />
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="maxTokens">Max Tokens</Label>
                 <Input
                   id="maxTokens"
                   type="number"
                   value={formData.maxTokens}
                   onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="temperature">Default Temperature</Label>
                 <Input
                   id="temperature"
                   type="number"
                   step="0.1"
                   min="0"
                   max="2"
                   value={formData.defaultTemperature}
                   onChange={(e) => setFormData(prev => ({ ...prev, defaultTemperature: parseFloat(e.target.value) || 0.7 }))}
                 />
               </div>
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="costInput">Cost per 1K Input Tokens ($)</Label>
                 <Input
                   id="costInput"
                   type="number"
                   step="0.0001"
                   min="0"
                   value={formData.costPer1kInput}
                   onChange={(e) => setFormData(prev => ({ ...prev, costPer1kInput: parseFloat(e.target.value) || 0 }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="costOutput">Cost per 1K Output Tokens ($)</Label>
                 <Input
                   id="costOutput"
                   type="number"
                   step="0.0001"
                   min="0"
                   value={formData.costPer1kOutput}
                   onChange={(e) => setFormData(prev => ({ ...prev, costPer1kOutput: parseFloat(e.target.value) || 0 }))}
                 />
               </div>
             </div>
 
             <div className="flex items-center justify-between py-2">
               <div>
                 <Label htmlFor="streaming">Supports Streaming</Label>
                 <p className="text-xs text-muted-foreground">Enable real-time token streaming</p>
               </div>
               <Switch
                 id="streaming"
                 checked={formData.supportsStreaming}
                 onCheckedChange={(checked) => setFormData(prev => ({ ...prev, supportsStreaming: checked }))}
               />
             </div>
 
             <div className="flex items-center justify-between py-2">
               <div>
                 <Label htmlFor="enabled">Enabled</Label>
                 <p className="text-xs text-muted-foreground">Make available for selection</p>
               </div>
               <Switch
                 id="enabled"
                 checked={formData.isEnabled}
                 onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={resetForm}>
               Cancel
             </Button>
             <Button 
               onClick={handleAddEdit} 
               disabled={saving || !formData.name || !formData.modelId || !formData.apiEndpoint}
             >
               {saving ? "Saving..." : editingModel ? "Update Model" : "Add Model"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 };
 
 export default ExternalModelManager;