import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  User,
  Mail,
  Calendar,
  CreditCard,
  FileText,
  Crown,
  AlertTriangle,
  RefreshCw
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

interface UserManagementProps {
  refreshTrigger?: number;
}

const UserManagement = ({ refreshTrigger }: UserManagementProps) => {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, refreshTrigger]);

  useEffect(() => {
    // Reset to page 1 when search changes
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
      // Estimate total pages based on whether we got a full page
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Management
        </CardTitle>
        <CardDescription>
          View and manage user accounts and subscriptions
        </CardDescription>
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
  );
};

export default UserManagement;
