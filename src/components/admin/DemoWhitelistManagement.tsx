import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, RefreshCw, Shield, Search } from "lucide-react";

interface WhitelistEntry {
  id: string;
  user_id: string;
  email: string;
  reason: string | null;
  created_at: string;
}

interface DemoWhitelistManagementProps {
  refreshTrigger?: number;
}

const DemoWhitelistManagement = ({ refreshTrigger }: DemoWhitelistManagementProps) => {
  const { user } = useAuth();
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchWhitelist();
  }, [refreshTrigger]);

  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("demo_whitelist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWhitelist(data || []);
    } catch (error) {
      console.error("Error fetching whitelist:", error);
      toast.error("Failed to load whitelist");
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSearching(true);
    setFoundUser(null);

    try {
      // Search for user by email in profiles via a lookup
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .limit(100);

      if (error) throw error;

      // We need to get the email from auth.users, but we can't directly access it
      // Instead, we'll use the email the admin provided and verify it exists
      // by checking if adding to whitelist works
      
      // For now, just confirm the email format is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }

      setFoundUser({ id: "pending", email: newEmail });
      toast.info("Email format valid. Click 'Add to Whitelist' to add this user.");
    } catch (error) {
      console.error("Error searching user:", error);
      toast.error("Failed to search for user");
    } finally {
      setIsSearching(false);
    }
  };

  const addToWhitelist = async () => {
    if (!user) return;
    
    // Allow adding without search validation - just validate email format
    const emailToAdd = newEmail.trim().toLowerCase();
    if (!emailToAdd) {
      toast.error("Please enter an email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsAdding(true);
    try {
      // Check if user already exists in whitelist
      const { data: existing } = await supabase
        .from("demo_whitelist")
        .select("id")
        .eq("email", emailToAdd)
        .maybeSingle();

      if (existing) {
        toast.error("This email is already in the whitelist");
        setIsAdding(false);
        return;
      }

      // For now, we'll store the email and use a placeholder user_id
      // The actual user_id will be matched when the user logs in
      const { error } = await supabase
        .from("demo_whitelist")
        .insert({
          user_id: crypto.randomUUID(), // Temporary - will be updated when user matches
          email: emailToAdd,
          reason: newReason || null,
          whitelisted_by: user.id,
        });

      if (error) throw error;

      toast.success(`Added ${emailToAdd} to whitelist`);
      setIsAddDialogOpen(false);
      setNewEmail("");
      setNewReason("");
      setFoundUser(null);
      fetchWhitelist();
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      toast.error("Failed to add user to whitelist");
    } finally {
      setIsAdding(false);
    }
  };

  const removeFromWhitelist = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from("demo_whitelist")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(`Removed ${email} from whitelist`);
      fetchWhitelist();
    } catch (error) {
      console.error("Error removing from whitelist:", error);
      toast.error("Failed to remove user from whitelist");
    }
  };

  const filteredWhitelist = whitelist.filter(entry =>
    entry.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Demo Mode Whitelist
            </CardTitle>
            <CardDescription>
              Users in this list can bypass the 3-application demo limit
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWhitelist} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User to Whitelist</DialogTitle>
                  <DialogDescription>
                    Enter the email of the user you want to grant unlimited demo access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">User Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          setFoundUser(null);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        onClick={searchUser}
                        disabled={isSearching}
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    {foundUser && (
                      <p className="text-sm text-green-600">
                        ✓ Ready to add: {foundUser.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Beta tester, VIP customer, etc."
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={addToWhitelist} 
                    disabled={!newEmail.trim() || isAdding}
                  >
                    {isAdding ? "Adding..." : "Add to Whitelist"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredWhitelist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchEmail ? "No matching users found" : "No users in whitelist yet"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWhitelist.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>
                      {entry.reason ? (
                        <span className="text-muted-foreground">{entry.reason}</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">No reason</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove from Whitelist</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {entry.email} from the whitelist?
                              They will be subject to the 3-application demo limit again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeFromWhitelist(entry.id, entry.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <Badge variant="outline">
            {whitelist.length} user{whitelist.length !== 1 ? 's' : ''} whitelisted
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoWhitelistManagement;
