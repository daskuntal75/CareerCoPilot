import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, FileCheck, AlertCircle, Check, ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DocumentType = "detailed" | "abridged" | "cover-letter-template";

interface UploadState {
  isUploading: boolean;
  error: string | null;
}

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { detailedResume, abridgedResume, coverLetterTemplate, isProfileComplete, refreshProfile, isLoading } = useUserProfile();
  
  const [uploadStates, setUploadStates] = useState<Record<DocumentType, UploadState>>({
    detailed: { isUploading: false, error: null },
    abridged: { isUploading: false, error: null },
    "cover-letter-template": { isUploading: false, error: null },
  });

  const handleFileUpload = async (file: File, type: DocumentType) => {
    if (!user) {
      toast.error("Please sign in to upload documents");
      return;
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    
    if (!validTypes.includes(file.type)) {
      setUploadStates(prev => ({
        ...prev,
        [type]: { isUploading: false, error: "Please upload a PDF, DOCX, or TXT file" },
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStates(prev => ({
        ...prev,
        [type]: { isUploading: false, error: "File size must be under 5MB" },
      }));
      return;
    }

    setUploadStates(prev => ({
      ...prev,
      [type]: { isUploading: true, error: null },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resumeType", type);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("parse-resume", {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to process file");
      }

      await refreshProfile();
      
      const typeLabels: Record<DocumentType, string> = {
        detailed: "Detailed resume",
        abridged: "Abridged resume",
        "cover-letter-template": "Cover letter template",
      };
      
      toast.success(`${typeLabels[type]} uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStates(prev => ({
        ...prev,
        [type]: { 
          isUploading: false, 
          error: error instanceof Error ? error.message : "Failed to upload file" 
        },
      }));
    } finally {
      setUploadStates(prev => ({
        ...prev,
        [type]: { ...prev[type], isUploading: false },
      }));
    }
  };

  const handleDrop = (e: React.DragEvent, type: DocumentType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  const completionCount = [detailedResume, abridgedResume, coverLetterTemplate].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Career Documents
              </h1>
              <Badge variant={isProfileComplete ? "default" : "secondary"}>
                {completionCount}/3 Complete
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Upload your career documents once. They'll be used for all your job applications.
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Detailed Resume - Required */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={detailedResume ? "border-success/50 bg-success/5" : "border-warning/50"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {detailedResume ? (
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-success" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-warning" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Detailed Resume
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </CardTitle>
                        <CardDescription>
                          Your comprehensive resume with full work history and achievements
                        </CardDescription>
                      </div>
                    </div>
                    {detailedResume && (
                      <Check className="w-6 h-6 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {detailedResume ? (
                    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{detailedResume.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(detailedResume.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => handleFileInput(e, "detailed")}
                          disabled={uploadStates.detailed.isUploading}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            {uploadStates.detailed.isUploading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Update"
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        uploadStates.detailed.isUploading 
                          ? "border-accent bg-accent/5" 
                          : "border-border hover:border-accent/50"
                      }`}
                      onDrop={(e) => handleDrop(e, "detailed")}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {uploadStates.detailed.isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-sm text-muted-foreground">Processing resume...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Drag and drop your detailed resume
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            PDF, DOCX, or TXT (max 5MB)
                          </p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.txt"
                              onChange={(e) => handleFileInput(e, "detailed")}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>Browse Files</span>
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  {uploadStates.detailed.error && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {uploadStates.detailed.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Abridged Resume - Optional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className={abridgedResume ? "border-success/50 bg-success/5" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {abridgedResume ? (
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-success" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Abridged Resume
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </CardTitle>
                        <CardDescription>
                          A 1-2 page version typically used for actual applications
                        </CardDescription>
                      </div>
                    </div>
                    {abridgedResume && (
                      <Check className="w-6 h-6 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {abridgedResume ? (
                    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{abridgedResume.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(abridgedResume.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => handleFileInput(e, "abridged")}
                          disabled={uploadStates.abridged.isUploading}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            {uploadStates.abridged.isUploading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Update"
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        uploadStates.abridged.isUploading 
                          ? "border-accent bg-accent/5" 
                          : "border-border hover:border-accent/50"
                      }`}
                      onDrop={(e) => handleDrop(e, "abridged")}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {uploadStates.abridged.isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-sm text-muted-foreground">Processing resume...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Drag and drop your abridged resume
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            PDF, DOCX, or TXT (max 5MB)
                          </p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.txt"
                              onChange={(e) => handleFileInput(e, "abridged")}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>Browse Files</span>
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  {uploadStates.abridged.error && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {uploadStates.abridged.error}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Cover Letter Template - Optional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className={coverLetterTemplate ? "border-success/50 bg-success/5" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {coverLetterTemplate ? (
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-success" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Cover Letter Template
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </CardTitle>
                        <CardDescription>
                          A sample cover letter to match your writing style
                        </CardDescription>
                      </div>
                    </div>
                    {coverLetterTemplate && (
                      <Check className="w-6 h-6 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {coverLetterTemplate ? (
                    <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{coverLetterTemplate.file_name || "Cover Letter Template"}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(coverLetterTemplate.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.txt"
                          onChange={(e) => handleFileInput(e, "cover-letter-template")}
                          disabled={uploadStates["cover-letter-template"].isUploading}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            {uploadStates["cover-letter-template"].isUploading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Update"
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        uploadStates["cover-letter-template"].isUploading 
                          ? "border-accent bg-accent/5" 
                          : "border-border hover:border-accent/50"
                      }`}
                      onDrop={(e) => handleDrop(e, "cover-letter-template")}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {uploadStates["cover-letter-template"].isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-sm text-muted-foreground">Processing template...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Drag and drop a cover letter sample
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            PDF, DOCX, or TXT (max 5MB)
                          </p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.txt"
                              onChange={(e) => handleFileInput(e, "cover-letter-template")}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <span>Browse Files</span>
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                  {uploadStates["cover-letter-template"].error && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                      <AlertCircle className="w-4 h-4" />
                      {uploadStates["cover-letter-template"].error}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Continue Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-end pt-4"
            >
              <Button
                variant="hero"
                size="lg"
                disabled={!isProfileComplete}
                onClick={() => navigate("/app")}
              >
                {isProfileComplete ? (
                  <>
                    Start Applying
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  "Upload detailed resume to continue"
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfileSetup;