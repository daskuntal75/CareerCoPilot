 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { toast } from "sonner";
 import { Slider } from "@/components/ui/slider";
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
   RotateCcw, 
   Plus, 
   Minus, 
   Search, 
   User, 
   FileText,
   RefreshCw,
   Settings
 } from "lucide-react";
 
 interface DemoUser {
   user_id: string;
   email: string;
   full_name: string | null;
   application_count: number;
   is_whitelisted: boolean;
 }
 
 interface DemoUserAppManagerProps {
   refreshTrigger?: number;
 }
 
 const DEMO_APP_LIMIT = 3;
 
 const DemoUserAppManager = ({ refreshTrigger }: DemoUserAppManagerProps) => {
   const [users, setUsers] = useState<DemoUser[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [newLimit, setNewLimit] = useState(DEMO_APP_LIMIT);
   const [processing, setProcessing] = useState(false);
   const [globalLimit, setGlobalLimit] = useState(DEMO_APP_LIMIT);
   const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
 
   const fetchUsers = useCallback(async () => {
     setLoading(true);
     try {
       // Get all users with their application counts
       const { data: profiles, error: profilesError } = await supabase
         .from("profiles")
         .select("user_id, full_name");
 
       if (profilesError) throw profilesError;
 
       // Get application counts per user
       const { data: appCounts, error: appError } = await supabase
         .from("applications")
         .select("user_id");
 
       if (appError) throw appError;
 
       // Get whitelist entries
       const { data: whitelist, error: wlError } = await supabase
         .from("demo_whitelist")
         .select("email, user_id");
 
       if (wlError) throw wlError;
 
       // Count applications per user
       const countMap = new Map<string, number>();
       appCounts?.forEach(app => {
         countMap.set(app.user_id, (countMap.get(app.user_id) || 0) + 1);
       });
 
       // Map whitelist user_ids
       const whitelistSet = new Set(whitelist?.map(w => w.user_id) || []);
 
       // Get emails - we'll need to fetch from auth context or use email from whitelist
       const whitelistEmails = new Map<string, string>();
       whitelist?.forEach(w => {
         whitelistEmails.set(w.user_id, w.email);
       });
 
       // Build user list (only users with applications for demo relevance)
       const usersWithApps = profiles
         ?.filter(p => countMap.has(p.user_id))
         .map(p => ({
           user_id: p.user_id,
           email: whitelistEmails.get(p.user_id) || `User ${p.user_id.slice(0, 8)}...`,
           full_name: p.full_name,
           application_count: countMap.get(p.user_id) || 0,
           is_whitelisted: whitelistSet.has(p.user_id),
         }))
         .sort((a, b) => b.application_count - a.application_count) || [];
 
       setUsers(usersWithApps);
     } catch (error) {
       console.error("Error fetching users:", error);
       toast.error("Failed to load demo users");
     } finally {
       setLoading(false);
     }
   }, []);
 
   const fetchGlobalLimit = useCallback(async () => {
     try {
       const { data } = await supabase
         .from("admin_settings")
         .select("setting_value")
         .eq("setting_key", "demo_app_limit")
         .maybeSingle();
 
       if (data?.setting_value) {
         const limit = typeof data.setting_value === 'number' 
           ? data.setting_value 
           : (data.setting_value as { limit?: number })?.limit || DEMO_APP_LIMIT;
         setGlobalLimit(limit);
       }
     } catch (error) {
       console.error("Error fetching global limit:", error);
     }
   }, []);
 
   useEffect(() => {
     fetchUsers();
     fetchGlobalLimit();
   }, [fetchUsers, fetchGlobalLimit, refreshTrigger]);
 
   const handleAdjustApps = (user: DemoUser) => {
     setSelectedUser(user);
     setNewLimit(user.application_count);
     setDialogOpen(true);
   };
 
   const deleteApplications = async (count: number) => {
     if (!selectedUser || count <= 0) return;
 
     setProcessing(true);
     try {
       // Get applications to delete (oldest first)
       const { data: apps, error: fetchError } = await supabase
         .from("applications")
         .select("id")
         .eq("user_id", selectedUser.user_id)
         .order("created_at", { ascending: true })
         .limit(count);
 
       if (fetchError) throw fetchError;
 
       if (apps && apps.length > 0) {
         const idsToDelete = apps.map(a => a.id);
         const { error: deleteError } = await supabase
           .from("applications")
           .delete()
           .in("id", idsToDelete);
 
         if (deleteError) throw deleteError;
       }
 
       toast.success(`Deleted ${count} application(s) for ${selectedUser.full_name || selectedUser.email}`);
       setDialogOpen(false);
       fetchUsers();
     } catch (error) {
       console.error("Error deleting applications:", error);
       toast.error("Failed to delete applications");
     } finally {
       setProcessing(false);
     }
   };
 
   const resetUserApplications = async () => {
     if (!selectedUser) return;
 
     setProcessing(true);
     try {
       const { error } = await supabase
         .from("applications")
         .delete()
         .eq("user_id", selectedUser.user_id);
 
       if (error) throw error;
 
       toast.success(`Reset all applications for ${selectedUser.full_name || selectedUser.email}`);
       setDialogOpen(false);
       fetchUsers();
     } catch (error) {
       console.error("Error resetting applications:", error);
       toast.error("Failed to reset applications");
     } finally {
       setProcessing(false);
     }
   };
 
   const saveGlobalLimit = async () => {
     setProcessing(true);
     try {
       const { error } = await supabase
         .from("admin_settings")
         .upsert({
           setting_key: "demo_app_limit",
           setting_value: { limit: globalLimit },
           description: "Global demo mode application limit for non-whitelisted users",
         }, { onConflict: "setting_key" });
 
       if (error) throw error;
 
       toast.success(`Global demo limit updated to ${globalLimit}`);
       setGlobalSettingsOpen(false);
     } catch (error) {
       console.error("Error saving global limit:", error);
       toast.error("Failed to save global limit");
     } finally {
       setProcessing(false);
     }
   };
 
   const filteredUsers = users.filter(
     (u) =>
       u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
   );
 
   const usersAtLimit = users.filter(u => !u.is_whitelisted && u.application_count >= globalLimit);
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <FileText className="w-5 h-5 text-accent" />
                 Demo User Application Limits
               </CardTitle>
               <CardDescription>
                 Manage application counts for demo users. Current global limit: {globalLimit}
               </CardDescription>
             </div>
             <div className="flex items-center gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setGlobalSettingsOpen(true)}
               >
                 <Settings className="w-4 h-4 mr-2" />
                 Global Limit
               </Button>
               <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                 Refresh
               </Button>
             </div>
           </div>
         </CardHeader>
         <CardContent>
           {/* Stats */}
           <div className="grid grid-cols-3 gap-4 mb-4">
             <div className="p-3 rounded-lg bg-secondary/30 border border-border">
               <div className="text-2xl font-bold">{users.length}</div>
               <div className="text-sm text-muted-foreground">Users with Apps</div>
             </div>
             <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
               <div className="text-2xl font-bold text-warning">{usersAtLimit.length}</div>
               <div className="text-sm text-muted-foreground">At Limit</div>
             </div>
             <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
               <div className="text-2xl font-bold text-accent">{globalLimit}</div>
               <div className="text-sm text-muted-foreground">Global Limit</div>
             </div>
           </div>
 
           {/* Search */}
           <div className="mb-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search by email or name..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 max-w-sm"
               />
             </div>
           </div>
 
           {/* Table */}
           {loading ? (
             <div className="flex items-center justify-center py-8">
               <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             </div>
           ) : filteredUsers.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               {searchTerm ? "No matching users found" : "No demo users with applications yet"}
             </div>
           ) : (
             <div className="rounded-md border">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>User</TableHead>
                     <TableHead className="text-center">Applications</TableHead>
                     <TableHead className="text-center">Status</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredUsers.map((user) => (
                     <TableRow key={user.user_id}>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <User className="w-4 h-4 text-muted-foreground" />
                           <div>
                             <div className="font-medium">{user.full_name || "Unknown"}</div>
                             <div className="text-xs text-muted-foreground">{user.email}</div>
                           </div>
                         </div>
                       </TableCell>
                       <TableCell className="text-center">
                         <Badge 
                           variant={user.application_count >= globalLimit ? "destructive" : "secondary"}
                         >
                           {user.application_count} / {user.is_whitelisted ? "∞" : globalLimit}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-center">
                         {user.is_whitelisted ? (
                           <Badge variant="outline" className="text-accent border-accent">
                             Whitelisted
                           </Badge>
                         ) : user.application_count >= globalLimit ? (
                           <Badge variant="destructive">At Limit</Badge>
                         ) : (
                           <Badge variant="secondary">Active</Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-right">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleAdjustApps(user)}
                         >
                           <Settings className="w-4 h-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* User Adjustment Dialog */}
       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Adjust Application Count</DialogTitle>
             <DialogDescription>
               Manage applications for {selectedUser?.full_name || selectedUser?.email}
             </DialogDescription>
           </DialogHeader>
 
           {selectedUser && (
             <div className="space-y-6 py-4">
               {/* Current stats */}
               <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                 <span className="text-sm">Current Applications:</span>
                 <Badge variant="secondary" className="text-lg">
                   {selectedUser.application_count}
                 </Badge>
               </div>
 
               {/* Quick actions */}
               <div className="space-y-3">
                 <Label>Quick Actions</Label>
                 <div className="grid grid-cols-3 gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => deleteApplications(1)}
                     disabled={processing || selectedUser.application_count < 1}
                   >
                     <Minus className="w-4 h-4 mr-1" />
                     Remove 1
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => deleteApplications(2)}
                     disabled={processing || selectedUser.application_count < 2}
                   >
                     <Minus className="w-4 h-4 mr-1" />
                     Remove 2
                   </Button>
                   <Button
                     variant="destructive"
                     size="sm"
                     onClick={resetUserApplications}
                     disabled={processing || selectedUser.application_count < 1}
                   >
                     <RotateCcw className="w-4 h-4 mr-1" />
                     Reset All
                   </Button>
                 </div>
               </div>
 
               {/* Custom delete */}
               <div className="space-y-3">
                 <Label>Delete Specific Number</Label>
                 <div className="flex items-center gap-4">
                   <Slider
                     value={[newLimit]}
                     onValueChange={([v]) => setNewLimit(v)}
                     max={selectedUser.application_count}
                     min={0}
                     step={1}
                     className="flex-1"
                   />
                   <Badge variant="outline" className="min-w-[3rem] justify-center">
                     {newLimit}
                   </Badge>
                 </div>
                 <Button
                   onClick={() => deleteApplications(newLimit)}
                   disabled={processing || newLimit === 0}
                   className="w-full"
                 >
                   Delete {newLimit} Application{newLimit !== 1 ? "s" : ""}
                 </Button>
               </div>
             </div>
           )}
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setDialogOpen(false)}>
               Close
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Global Settings Dialog */}
       <Dialog open={globalSettingsOpen} onOpenChange={setGlobalSettingsOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Global Demo Limit Settings</DialogTitle>
             <DialogDescription>
               Set the maximum number of applications for demo users
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-6 py-4">
             <div className="space-y-3">
               <Label>Application Limit</Label>
               <div className="flex items-center gap-4">
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setGlobalLimit(Math.max(1, globalLimit - 1))}
                 >
                   <Minus className="w-4 h-4" />
                 </Button>
                 <div className="flex-1 text-center">
                   <div className="text-4xl font-bold">{globalLimit}</div>
                   <div className="text-sm text-muted-foreground">applications per user</div>
                 </div>
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => setGlobalLimit(globalLimit + 1)}
                 >
                   <Plus className="w-4 h-4" />
                 </Button>
               </div>
             </div>
 
             {/* Preset buttons */}
             <div className="flex justify-center gap-2">
               {[3, 5, 10, 25].map((preset) => (
                 <Button
                   key={preset}
                   variant={globalLimit === preset ? "default" : "outline"}
                   size="sm"
                   onClick={() => setGlobalLimit(preset)}
                 >
                   {preset}
                 </Button>
               ))}
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setGlobalSettingsOpen(false)}>
               Cancel
             </Button>
             <Button onClick={saveGlobalLimit} disabled={processing}>
               {processing ? "Saving..." : "Save Limit"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 };
 
 export default DemoUserAppManager;