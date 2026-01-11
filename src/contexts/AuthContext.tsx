import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatus, SubscriptionTier } from "@/lib/stripe-config";
import { DEMO_SUBSCRIPTION } from "@/lib/demo-config";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionStatus;
  refreshSubscription: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const defaultSubscription: SubscriptionStatus = {
  subscribed: false,
  tier: "free",
  subscription_end: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription);

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(defaultSubscription);
      return;
    }

    try {
      // First check if demo mode is enabled
      const { data: demoData } = await supabase.functions.invoke("check-demo-mode");
      
      if (demoData?.demo_mode && !demoData?.stripe_enabled) {
        // Demo mode is on and Stripe is off - give everyone Pro
        setSubscription(DEMO_SUBSCRIPTION);
        return;
      }

      // Only check Stripe subscription if Stripe is enabled
      if (demoData?.stripe_enabled) {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("Error checking subscription:", error);
          // Fall back to demo mode if enabled
          if (demoData?.demo_mode) {
            setSubscription(DEMO_SUBSCRIPTION);
          }
          return;
        }

        if (data) {
          setSubscription({
            subscribed: data.subscribed || false,
            tier: (data.tier as SubscriptionTier) || "free",
            subscription_end: data.subscription_end || null,
            price_id: data.price_id,
          });
          return;
        }
      }

      // If demo mode is on but Stripe check failed, still give Pro
      if (demoData?.demo_mode) {
        setSubscription(DEMO_SUBSCRIPTION);
      } else {
        setSubscription(defaultSubscription);
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
      // Try to give demo subscription on error if we can
      try {
        const { data: demoData } = await supabase.functions.invoke("check-demo-mode");
        if (demoData?.demo_mode) {
          setSubscription(DEMO_SUBSCRIPTION);
          return;
        }
      } catch {
        // Ignore
      }
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      refreshSubscription();
    } else {
      setSubscription(defaultSubscription);
    }
  }, [session, refreshSubscription]);

  // Periodically refresh subscription (every 60 seconds)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // Notify admin of new signup and send welcome email (fire and forget)
    if (data?.user && !error) {
      // Notify admin
      supabase.functions.invoke("notify-admin-signup", {
        body: {
          userId: data.user.id,
          email: data.user.email,
          fullName,
          signupMethod: "email",
        },
      }).catch(console.error);

      // Send welcome email to the new user
      supabase.functions.invoke("send-welcome-email", {
        body: {
          email: data.user.email,
          firstName: fullName.split(" ")[0],
          fullName,
        },
      }).catch(console.error);
    }

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription(defaultSubscription);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      subscription,
      refreshSubscription,
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
