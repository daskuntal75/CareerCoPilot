import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  User,
  Mail,
  Calendar,
  FileText,
  Crown,
  AlertTriangle,
  RefreshCw,
  Shield,
  ShieldOff,
  Download,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserWithSubscription {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  subscription_end: string | null;
  total_applications: number;
  cover_letters_used: number;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface UserManagementProps {
  refreshTrigger?: number;
}

const UserManagement = ({ refreshTrigger }: UserManagementProps) => {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    action: "grant" | "revoke";
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_users_with_subscriptions", {
        page_number: currentPage,
        page_size: pageSize,
        search_term: searchTerm || null,
      });

      if (error) throw error;

      setUsers(data || []);
      
      // Fetch roles for these users
      if (data && data.length > 0) {
        const userIds = data.map((u: UserWithSubscription) => u.user_id);
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        if (!rolesError && rolesData) {
          const rolesMap = new Map<string, string[]>();
          rolesData.forEach((r: UserRole) => {
            const existing = rolesMap.get(r.user_id) || [];
            existing.push(r.role);
            rolesMap.set(r.user_id, existing);
          });
          setUserRoles(rolesMap);
        }
      }

      if (data && data.length === pageSize) {
        setTotalPages(Math.max(totalPages, currentPage + 1));
      } else if (data && data.length < pageSize && currentPage === 1) {
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleRoleAction = async () => {
    if (!confirmDialog) return;
    
    const { userId, action } = confirmDialog;
    setRoleActionLoading(userId);
    
    try {
      if (action === "grant") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        
        if (error) throw error;
        
        // Update local state
        const existing = userRoles.get(userId) || [];
        userRoles.set(userId, [...existing, "admin"]);
        setUserRoles(new Map(userRoles));
        toast.success("Admin access granted");
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        
        if (error) throw error;
        
        // Update local state
        const existing = userRoles.get(userId) || [];
        userRoles.set(userId, existing.filter(r => r !== "admin"));
        setUserRoles(new Map(userRoles));
        toast.success("Admin access revoked");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(`Failed to ${action} admin access`);
    } finally {
      setRoleActionLoading(null);
      setConfirmDialog(null);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Fetch all users for export (up to 1000)
      const { data, error } = await supabase.rpc("get_admin_users_with_subscriptions", {
        page_number: 1,
        page_size: 1000,
        search_term: null,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No users to export");
        return;
      }

      // Create CSV content
      const headers = [
        "User ID",
        "Email",
        "Full Name",
        "Subscription Status",
        "Subscription Tier",
        "Subscription End",
        "Total Applications",
        "Cover Letters Used",
        "Created At"
      ];

      const rows = data.map((user: UserWithSubscription) => [
        user.user_id,
        user.email,
        user.full_name || "",
        user.subscription_status || "free",
        user.subscription_tier || "free",
        user.subscription_end ? format(new Date(user.subscription_end), "yyyy-MM-dd") : "",
        user.total_applications,
        user.cover_letters_used,
        format(new Date(user.created_at), "yyyy-MM-dd HH:mm:ss")
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `users_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${data.length} users to CSV`);
    } catch (error) {
      console.error("Error exporting users:", error);
      toast.error("Failed to export users");
    } finally {
      setExporting(false);
    }
  };

  const isAdmin = (userId: string) => {
    const roles = userRoles.get(userId) || [];
    return roles.includes("admin");
  };

  const getTierBadge = (tier: string | null, status: string | null) => {
    if (!tier || tier === "free" || status !== "active") {
      return <Badge variant="secondary">Free</Badge>;
    }
    if (tier === "pro") {
      return <Badge className="bg-accent text-accent-foreground">Pro</Badge>;
    }
    if (tier === "premium") {
      return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">Premium</Badge>;
    }
    return <Badge variant="outline">{tier}</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "inactive") {
      return null;
    }
    if (status === "active") {
      return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
    }
    if (status === "canceled") {
      return <Badge variant="outline" className="text-red-600 border-red-600">Canceled</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage user accounts, subscriptions, and admin access
              </CardDescription>
            </div>
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-6">
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
            <Button onClick={fetchUsers} variant="outline" size="icon">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <p>No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead className="text-center">Applications</TableHead>
                      <TableHead className="text-center">Cover Letters</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {user.full_name || "—"}
                              </span>
                              {user.subscription_tier === "premium" && (
                                <Crown className="w-4 h-4 text-amber-500" />
                              )}
                              {isAdmin(user.user_id) && (
                                <Shield className="w-4 h-4 text-accent" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {getTierBadge(user.subscription_tier, user.subscription_status)}
                              {getStatusBadge(user.subscription_status)}
                            </div>
                            {user.subscription_end && user.subscription_status === "active" && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Renews {format(new Date(user.subscription_end), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{user.total_applications}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{user.cover_letters_used}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={isAdmin(user.user_id) ? "destructive" : "outline"}
                            size="sm"
                            disabled={roleActionLoading === user.user_id}
                            onClick={() => setConfirmDialog({
                              open: true,
                              userId: user.user_id,
                              userName: user.full_name || user.email,
                              action: isAdmin(user.user_id) ? "revoke" : "grant"
                            })}
                          >
                            {roleActionLoading === user.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isAdmin(user.user_id) ? (
                              <>
                                <ShieldOff className="w-4 h-4 mr-1" />
                                Revoke
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-1" />
                                Grant
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "grant" ? "Grant Admin Access" : "Revoke Admin Access"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "grant" 
                ? `Are you sure you want to grant admin access to ${confirmDialog?.userName}? They will have full access to the admin dashboard.`
                : `Are you sure you want to revoke admin access from ${confirmDialog?.userName}? They will no longer be able to access the admin dashboard.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleAction}
              className={confirmDialog?.action === "revoke" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmDialog?.action === "grant" ? "Grant Access" : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;
