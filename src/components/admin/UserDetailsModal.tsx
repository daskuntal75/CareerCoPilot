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
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Search,
  Mail,
  Calendar,
  FileText,
  Crown,
  Shield,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface UserWithDetails {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  subscription_end: string | null;
  total_applications: number;
  cover_letters_used: number;
  apps_with_cover_letter: number;
  submitted_applications: number;
  user_type: string;
  is_admin: boolean;
  is_whitelisted: boolean;
  last_activity: string;
}

interface UserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filterType: "all" | "new_this_month" | "with_applications" | "active";
}

const UserDetailsModal = ({
  open,
  onOpenChange,
  title,
  filterType,
}: UserDetailsModalProps) => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, currentPage, filterType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_users_with_subscriptions", {
        page_number: currentPage,
        page_size: pageSize,
        search_term: searchTerm || null,
      });

      if (error) throw error;

      let filteredData = (data || []) as UserWithDetails[];

      // Apply additional filtering based on filterType
      if (filterType === "new_this_month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        filteredData = filteredData.filter(
          (u) => new Date(u.created_at) >= startOfMonth
        );
      } else if (filterType === "with_applications") {
        filteredData = filteredData.filter(
          (u) => u.total_applications > 0
        );
      } else if (filterType === "active") {
        filteredData = filteredData.filter(
          (u) => u.subscription_status === "active"
        );
      }

      setUsers(filteredData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const getUserTypeBadge = (user: UserWithDetails) => {
    if (user.is_admin) {
      return (
        <Badge variant="destructive">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }
    if (user.user_type === "paid" || (user.subscription_status === "active" && user.subscription_tier !== "free")) {
      const tierLabel = user.subscription_tier === "premium" ? "Premium" : "Pro";
      return (
        <Badge className="bg-accent text-accent-foreground">
          <Crown className="w-3 h-3 mr-1" />
          {tierLabel}
        </Badge>
      );
    }
    if (user.is_whitelisted) {
      return (
        <Badge variant="outline" className="border-accent text-accent">
          <Sparkles className="w-3 h-3 mr-1" />
          VIP Demo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Demo
      </Badge>
    );
  };

  const getApplicationDistribution = (user: UserWithDetails) => {
    const total = user.total_applications;
    if (total === 0) return null;
    
    const submitted = user.submitted_applications;
    const withCover = user.apps_with_cover_letter;
    const draft = total - submitted;
    
    const submittedPercent = (submitted / total) * 100;
    const withCoverPercent = (withCover / total) * 100;
    
    return (
      <div className="space-y-2 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Draft</span>
          <span className="font-medium">{draft}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">With Cover Letter</span>
          <span className="font-medium">{withCover}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Submitted</span>
          <span className="font-medium">{submitted}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
          <div 
            className="bg-muted-foreground/30 h-full" 
            style={{ width: `${100 - submittedPercent}%` }}
          />
          <div 
            className="bg-accent h-full" 
            style={{ width: `${submittedPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {submittedPercent.toFixed(0)}% completion rate
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Detailed view of users matching the selected criteria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
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
          <ScrollArea className="h-[450px]">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Applications</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <>
                      <TableRow 
                        key={user.user_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedUser(expandedUser === user.user_id ? null : user.user_id)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {user.full_name || "—"}
                              </span>
                              {user.subscription_tier === "premium" && (
                                <Crown className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getUserTypeBadge(user)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{user.total_applications}</span>
                            </div>
                            {user.submitted_applications > 0 && (
                              <span className="text-xs text-accent flex items-center gap-1">
                                <Send className="w-3 h-3" />
                                {user.submitted_applications} submitted
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded details row */}
                      {expandedUser === user.user_id && (
                        <TableRow key={`${user.user_id}-details`}>
                          <TableCell colSpan={5} className="bg-muted/30 border-l-4 border-accent">
                            <div className="grid grid-cols-3 gap-6 py-2 px-4">
                              {/* User Info */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-foreground">User Details</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-muted-foreground">Full Name:</span> {user.full_name || "Not set"}</p>
                                  <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                                  <p><span className="text-muted-foreground">User ID:</span> <code className="text-xs bg-secondary px-1 rounded">{user.user_id.slice(0, 8)}...</code></p>
                                </div>
                              </div>
                              
                              {/* Subscription */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-foreground">Subscription</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-muted-foreground">Status:</span> {user.subscription_status || "inactive"}</p>
                                  <p><span className="text-muted-foreground">Tier:</span> {user.subscription_tier || "free"}</p>
                                  {user.subscription_end && user.subscription_status === "active" && (
                                    <p><span className="text-muted-foreground">Renews:</span> {format(new Date(user.subscription_end), "MMM d, yyyy")}</p>
                                  )}
                                  {user.is_whitelisted && (
                                    <Badge variant="outline" className="mt-1">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Whitelisted
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Application Stats */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-foreground">Application Distribution</h4>
                                {user.total_applications > 0 ? (
                                  getApplicationDistribution(user)
                                ) : (
                                  <p className="text-sm text-muted-foreground">No applications yet</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {users.length} users • Click a row for details
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
                disabled={users.length < pageSize}
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

export default UserDetailsModal;