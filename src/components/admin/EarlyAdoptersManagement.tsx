import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Building, Target, Download, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface EarlyAdopter {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  purpose: string | null;
  zip_code: string | null;
  created_at: string;
  application_count: number;
}

interface EarlyAdoptersManagementProps {
  refreshTrigger?: number;
}

const EarlyAdoptersManagement = ({ refreshTrigger }: EarlyAdoptersManagementProps) => {
  const [earlyAdopters, setEarlyAdopters] = useState<EarlyAdopter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchEarlyAdopters();
  }, [refreshTrigger, currentPage, searchTerm]);

  const fetchEarlyAdopters = async () => {
    setLoading(true);
    try {
      // Build query for profiles with early adopter info
      let query = supabase
        .from("profiles")
        .select(`
          user_id,
          first_name,
          last_name,
          full_name,
          company,
          purpose,
          zip_code,
          created_at,
          is_early_adopter
        `, { count: "exact" })
        .eq("is_early_adopter", true)
        .order("created_at", { ascending: false });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      // Get email addresses from auth.users via admin function or join
      // For now, we'll fetch application counts separately
      const adoptersWithDetails: EarlyAdopter[] = [];

      for (const profile of profiles || []) {
        // Get application count for each user
        const { count: appCount } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.user_id);

        // Get email from auth - we'll use a workaround
        const { data: userData } = await supabase.rpc("get_admin_users_with_subscriptions", {
          search_term: "",
          page_number: 1,
          page_size: 1000
        });

        const userEmail = userData?.find((u: any) => u.user_id === profile.user_id)?.email || "Unknown";

        adoptersWithDetails.push({
          user_id: profile.user_id,
          email: userEmail,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          company: profile.company,
          purpose: profile.purpose,
          zip_code: profile.zip_code,
          created_at: profile.created_at,
          application_count: appCount || 0,
        });
      }

      setEarlyAdopters(adoptersWithDetails);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching early adopters:", error);
      toast.error("Failed to load early adopters");
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const headers = ["Name", "Email", "Company", "Purpose", "Zip Code", "Signed Up", "Applications"];
    const rows = earlyAdopters.map(adopter => [
      adopter.first_name && adopter.last_name 
        ? `${adopter.first_name} ${adopter.last_name}` 
        : adopter.full_name || "N/A",
      adopter.email,
      adopter.company || "N/A",
      `"${(adopter.purpose || "N/A").replace(/"/g, '""')}"`,
      adopter.zip_code || "N/A",
      new Date(adopter.created_at).toLocaleDateString(),
      adopter.application_count.toString(),
    ]);

    const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `early-adopters-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Early Adopters
            </CardTitle>
            <CardDescription>
              Users who signed up for demo access with detailed information
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalCount} total
            </Badge>
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or company..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : earlyAdopters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No early adopters found</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        Company
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Purpose
                      </div>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Apps</TableHead>
                    <TableHead>Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earlyAdopters.map((adopter) => (
                    <TableRow key={adopter.user_id}>
                      <TableCell className="font-medium">
                        {adopter.first_name && adopter.last_name 
                          ? `${adopter.first_name} ${adopter.last_name}` 
                          : adopter.full_name || "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {adopter.email}
                      </TableCell>
                      <TableCell>
                        {adopter.company || (
                          <span className="text-muted-foreground text-sm">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate text-sm" title={adopter.purpose || undefined}>
                          {adopter.purpose || (
                            <span className="text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {adopter.zip_code || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={adopter.application_count > 0 ? "default" : "secondary"}>
                          {adopter.application_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(adopter.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EarlyAdoptersManagement;