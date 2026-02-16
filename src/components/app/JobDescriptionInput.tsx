import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, AlertCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import type { JobData } from "@/pages/App";

interface JobDescriptionInputProps {
  onSubmit: (data: JobData) => void;
  initialData?: JobData | null;
}

const JobDescriptionInput = ({ onSubmit, initialData }: JobDescriptionInputProps) => {
  const [company, setCompany] = useState(initialData?.company || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errors, setErrors] = useState<{ company?: string; title?: string; description?: string }>({});

  const charCount = description.length;
  const minChars = 100;
  const maxChars = 15000;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!company.trim()) {
      newErrors.company = "Company name is required";
    }
    if (!title.trim()) {
      newErrors.title = "Job title is required";
    }
    if (charCount < minChars) {
      newErrors.description = `Job description must be at least ${minChars} characters`;
    } else if (charCount > maxChars) {
      newErrors.description = `Job description must be under ${maxChars} characters`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsAnalyzing(true);
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onSubmit({
      company: company.trim(),
      title: title.trim(),
      description: description.trim(),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Paste the Job Description
        </h1>
        <p className="text-muted-foreground">
          We'll extract requirements and match them to your experience
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6 space-y-6"
      >
        {/* Security Banner */}
        <div className="flex items-center justify-center gap-3 p-2.5 rounded-lg bg-success/5 border border-success/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-success" />
            <span>Your data is encrypted and never stored by AI</span>
          </div>
        </div>
        {/* Company and Title */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              placeholder="e.g., Stripe"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                if (errors.company) setErrors({ ...errors, company: undefined });
              }}
              className={errors.company ? "border-destructive" : ""}
            />
            {errors.company && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.company}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Product Manager"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Full Job Description *</Label>
            <span className={`text-xs ${
              charCount < minChars ? 'text-warning' : 
              charCount > maxChars ? 'text-destructive' : 
              'text-muted-foreground'
            }`}>
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>
          </div>
          <Textarea
            id="description"
            placeholder="Paste the complete job description here..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            className={`min-h-[300px] resize-y ${errors.description ? "border-destructive" : ""}`}
          />
          {errors.description && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.description}
            </p>
          )}
          {charCount > 0 && charCount < 500 && !errors.description && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Short descriptions may result in less accurate matching
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button
            variant="hero"
            size="lg"
            onClick={handleSubmit}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                Analyzing & Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Fit & Generate Cover Letter
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default JobDescriptionInput;