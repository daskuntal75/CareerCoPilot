import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const { user, signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    if (user && !authLoading) {
      checkAdminAndRedirect();
    } else if (!authLoading) {
      checkSetupAvailable();
    }
  }, [user, authLoading]);

  const checkSetupAvailable = async () => {
    try {
      const { data } = await supabase.functions.invoke("check-admin-exists");
      setSetupAvailable(data?.setup_available ?? false);
    } catch {
      // Ignore errors
    }
  };

  const checkAdminAndRedirect = async () => {
    if (!user) return;
    
    setCheckingAdmin(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        navigate("/admin");
      } else {
        setError("You don't have admin access. Please contact an administrator.");
      }
    } catch (err) {
      console.error("Error checking admin:", err);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // After sign in, the useEffect will check admin status
      toast.success("Signed in successfully");
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">
            {checkingAdmin ? "Verifying admin access..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription>
                  Sign in with your admin credentials to access the dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Sign In to Admin
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  {setupAvailable && (
                    <Button
                      variant="outline"
                      className="w-full border-accent/50 text-accent hover:bg-accent/10"
                      onClick={() => navigate("/admin/setup")}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      First-Time Admin Setup
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    Not an admin?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-accent"
                      onClick={() => navigate("/auth")}
                    >
                      Go to regular login
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLogin;
