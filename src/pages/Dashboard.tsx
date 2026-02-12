import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, FileText, Briefcase, Calendar, 
  ChevronRight, MoreHorizontal, Trash2,
  Clock, CheckCircle, XCircle, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useNotifications } from "@/hooks/useNotifications";
import { EmailVerificationRequired } from "@/components/auth/EmailVerificationRequired";
import UsageWidget from "@/components/dashboard/UsageWidget";

interface Application {
  id: string;
  company: string;
  job_title: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: "Draft", icon: FileText, color: "text-muted-foreground bg-secondary" },
  applied: { label: "Applied", icon: Clock, color: "text-blue-600 bg-blue-100" },
  interviewing: { label: "Interviewing", icon: MessageSquare, color: "text-purple-600 bg-purple-100" },
  offer: { label: "Offer", icon: CheckCircle, color: "text-success bg-success/10" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-destructive bg-destructive/10" },
  withdrawn: { label: "Withdrawn", icon: XCircle, color: "text-muted-foreground bg-secondary" },
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackPageView, trackApplicationEvent } = useAnalytics();
  const { notifyStatusChange } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchApplications();
      trackPageView("dashboard", { application_count: applications.length });
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      // Use decrypted RPC to read encrypted cover_letter/resume_content
      const { data, error } = await supabase
        .rpc("get_user_applications_decrypted");

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (id: string) => {
    const app = applications.find(a => a.id === id);
    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setApplications(prev => prev.filter(app => app.id !== id));
      toast.success("Application deleted");
      trackApplicationEvent("deleted", { 
        application_id: id,
        company: app?.company,
        job_title: app?.job_title,
      });
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Failed to delete application");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const app = applications.find(a => a.id === id);
    const oldStatus = app?.status;
    
    try {
      const updateData: any = { status };
      if (status === "applied") {
        updateData.applied_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      setApplications(prev => 
        prev.map(a => a.id === id ? { ...a, status } : a)
      );
      toast.success("Status updated");
      
      // Track analytics
      trackApplicationEvent("status_changed", {
        application_id: id,
        old_status: oldStatus,
        new_status: status,
        company: app?.company,
        job_title: app?.job_title,
      });
      
      // Send email notification for status changes
      if (app && oldStatus !== status) {
        notifyStatusChange(id, app.company, app.job_title, oldStatus || "draft", status);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if email is verified
  if (!user.email_confirmed_at) {
    return <EmailVerificationRequired email={user.email || ""} />;
  }

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === "applied").length,
    interviewing: applications.filter(a => a.status === "interviewing").length,
    offers: applications.filter(a => a.status === "offer").length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-foreground">Job Applications</h1>
              <p className="text-muted-foreground">Track and manage your job applications</p>
            </div>
            <Button variant="hero" onClick={() => navigate("/app")}>
              <Plus className="w-4 h-4" />
              New Job Application
            </Button>
          </motion.div>

          {/* Stats and Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8"
          >
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Job Applications</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
                <div className="text-sm text-muted-foreground">Applied</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.interviewing}</div>
                <div className="text-sm text-muted-foreground">Interviewing</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-success">{stats.offers}</div>
                <div className="text-sm text-muted-foreground">Offers</div>
              </div>
            </div>

            {/* Usage Widget */}
            <div className="lg:col-span-1">
              <UsageWidget />
            </div>
          </motion.div>

          {/* Applications List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No job applications yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start by uploading your resume and adding a job description
                </p>
                <Button variant="hero" onClick={() => navigate("/app")}>
                  <Plus className="w-4 h-4" />
                  Create Your First Job Application
                </Button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-secondary/50 text-sm font-medium text-muted-foreground">
                  <div className="col-span-4">Position</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Fit Score</div>
                  <div className="col-span-3">Last Updated</div>
                  <div className="col-span-1"></div>
                </div>
                
                <AnimatePresence>
                  {applications.map((app, index) => {
                    const status = statusConfig[app.status] || statusConfig.draft;
                    const StatusIcon = status.icon;
                    
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/app/${app.id}`)}
                      >
                        <div className="col-span-4">
                          <div className="font-medium text-foreground">{app.job_title}</div>
                          <div className="text-sm text-muted-foreground">{app.company}</div>
                        </div>
                        
                        <div className="col-span-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                status.color
                              )}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {status.label}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([key, value]) => (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(app.id, key);
                                  }}
                                >
                                  <value.icon className="w-4 h-4 mr-2" />
                                  {value.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="col-span-2">
                          {app.fit_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    app.fit_score >= 75 ? "bg-success" :
                                    app.fit_score >= 60 ? "bg-success/70" :
                                    app.fit_score >= 40 ? "bg-warning" : "bg-destructive"
                                  )}
                                  style={{ width: `${app.fit_score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{app.fit_score}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                        
                        <div className="col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(app.updated_at).toLocaleDateString()}
                        </div>
                        
                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/app/${app.id}`);
                              }}>
                                <ChevronRight className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteApplication(app.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
