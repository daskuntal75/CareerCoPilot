import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Briefcase,
  Search,
  Building,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Application {
  id: string;
  company: string;
  job_title: string;
  status: string;
  fit_score: number | null;
  fit_level: string | null;
  created_at: string;
  user_id: string;
  applied_at: string | null;
}

interface ApplicationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ApplicationDetailsModal = ({
  open,
  onOpenChange,
}: ApplicationDetailsModalProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (open) {
      fetchApplications();
    }
  }, [open, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select("id, company, job_title, status, fit_score, fit_level, created_at, user_id, applied_at")
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (searchTerm) {
        query = query.or(`company.ilike.%${searchTerm}%,job_title.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "analyzing":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Analyzing</Badge>;
      case "ready":
        return <Badge variant="outline" className="text-green-600 border-green-600">Ready</Badge>;
      case "applied":
        return <Badge className="bg-accent text-accent-foreground">Applied</Badge>;
      case "interview":
        return <Badge className="bg-purple-500 text-white">Interview</Badge>;
      case "offer":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">Offer</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFitBadge = (fitLevel: string | null, fitScore: number | null) => {
    if (!fitLevel && !fitScore) return null;
    
    const score = fitScore ? `${fitScore}%` : "";
    
    switch (fitLevel?.toLowerCase()) {
      case "excellent":
        return <Badge className="bg-green-500 text-white">{fitLevel} {score}</Badge>;
      case "good":
        return <Badge className="bg-blue-500 text-white">{fitLevel} {score}</Badge>;
      case "moderate":
        return <Badge className="bg-yellow-500 text-white">{fitLevel} {score}</Badge>;
      case "low":
        return <Badge variant="destructive">{fitLevel} {score}</Badge>;
      default:
        return fitScore ? <Badge variant="outline">{score}</Badge> : null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent" />
            All Applications
          </DialogTitle>
          <DialogDescription>
            View all job applications created by users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              Search
            </Button>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mb-4 opacity-50" />
                <p>No applications found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fit Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{app.company}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{app.job_title}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(app.status)}
                      </TableCell>
                      <TableCell>
                        {getFitBadge(app.fit_level, app.fit_score)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(app.created_at), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {app.applied_at ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(app.applied_at), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {applications.length} applications
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={applications.length < pageSize}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationDetailsModal;
