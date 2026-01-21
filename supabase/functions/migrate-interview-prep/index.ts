import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Transform legacy phase_X format to modern format
function normalizeInterviewPrepData(data: any): any | null {
  if (!data) return null;
  
  // If data already has the expected structure, return it
  if (data.questions && Array.isArray(data.questions)) {
    return data;
  }
  
  // Transform legacy phase_X format to expected format
  const phase1 = data.phase_1_company_research || {};
  const phase2 = data.phase_2_strategic_analysis || {};
  const phase3 = data.phase_3_interview_preparation || {};
  const phase4 = data.phase_4_interview_questions || [];
  
  // If no legacy data found, return original data
  if (!phase1.vision_mission && !phase3.core_requirements && phase4.length === 0) {
    if (Object.keys(data).length === 0) return null;
    return data; // Return as-is if not legacy format
  }
  
  // Transform questions from legacy format
  const questions = Array.isArray(phase4) ? phase4.map((q: any) => ({
    question: q.question || "",
    category: q.interviewer_type?.toLowerCase()?.replace(/\s+/g, "_") || "behavioral",
    difficulty: "medium" as const,
    whyAsked: "Based on job requirements and your experience",
    starAnswer: q.answer ? {
      situation: q.answer.situation || "",
      task: q.answer.task || "",
      action: q.answer.action || "",
      result: q.answer.result || "",
    } : { situation: "", task: "", action: "", result: "" },
    tips: [],
  })) : [];
  
  // Transform SWOT analysis
  const swot = phase2.swot_analysis || {};
  const strategicAnalysis = {
    strengths: swot.strengths || [],
    criticalStrength: swot.strengths?.[0] || "",
    weaknesses: swot.weaknesses || [],
    criticalWeakness: swot.weaknesses?.[0] || "",
    opportunities: swot.opportunities || [],
    criticalOpportunity: swot.opportunities?.[0] || "",
    threats: swot.threats || [],
    criticalThreat: swot.threats?.[0] || "",
    competitors: phase2.competitive_landscape || [],
    competitivePosition: "",
  };
  
  // Build normalized data
  const normalizedData = {
    questions,
    keyStrengths: phase3.core_requirements || [],
    potentialConcerns: [],
    questionsToAsk: [],
    applicationContext: `Interview preparation for ${phase3.interview_structure || "this role"}`,
    companyIntelligence: {
      visionMission: phase1.vision_mission || "",
      industryMarket: phase1.industry_position || "",
      financialPerformance: "",
      productsServices: phase1.products_services || "",
    },
    keyDomainConcepts: [],
    strategicAnalysis,
    cultureAndBenefits: {
      cultureInsights: phase1.culture ? [phase1.culture] : [],
      standoutBenefits: [],
    },
    interviewStructure: {
      coreRequirements: phase3.core_requirements || [],
      keyCompetencies: [],
      predictedFormat: phase3.interview_structure || "",
    },
    uniqueValueProposition: phase3.unique_value_proposition || "",
    whyThisCompany: phase3.why_company_why_leaving?.why_company || "",
    // Preserve original for reference
    _legacyData: data,
    _migratedAt: new Date().toISOString(),
  };
  
  return normalizedData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for migration
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Verify admin access via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { dryRun = true, limit = 100 } = await req.json().catch(() => ({}));
    
    console.log(`Starting migration - dryRun: ${dryRun}, limit: ${limit}`);
    
    // Fetch applications with legacy interview_prep
    const { data: applications, error: fetchError } = await supabase
      .from("applications")
      .select("id, user_id, interview_prep")
      .not("interview_prep", "is", null)
      .limit(limit);
    
    if (fetchError) {
      throw new Error(`Failed to fetch applications: ${fetchError.message}`);
    }
    
    const results = {
      total: applications?.length || 0,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[],
    };
    
    for (const app of applications || []) {
      try {
        const interviewPrep = app.interview_prep as any;
        
        // Check if already in new format
        if (interviewPrep?.questions && Array.isArray(interviewPrep.questions)) {
          results.skipped++;
          results.details.push({
            id: app.id,
            status: "skipped",
            reason: "Already in new format",
          });
          continue;
        }
        
        // Check if it's legacy format
        if (!interviewPrep?.phase_1_company_research && !interviewPrep?.phase_4_interview_questions) {
          results.skipped++;
          results.details.push({
            id: app.id,
            status: "skipped",
            reason: "Not legacy format",
          });
          continue;
        }
        
        // Normalize the data
        const normalized = normalizeInterviewPrepData(interviewPrep);
        
        if (!normalized) {
          results.skipped++;
          results.details.push({
            id: app.id,
            status: "skipped",
            reason: "Normalization returned null",
          });
          continue;
        }
        
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("applications")
            .update({ interview_prep: normalized })
            .eq("id", app.id);
          
          if (updateError) {
            results.errors.push(`${app.id}: ${updateError.message}`);
            results.details.push({
              id: app.id,
              status: "error",
              error: updateError.message,
            });
            continue;
          }
        }
        
        results.migrated++;
        results.details.push({
          id: app.id,
          status: dryRun ? "would_migrate" : "migrated",
          questionsCount: normalized.questions?.length || 0,
        });
        
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`${app.id}: ${message}`);
      }
    }
    
    console.log(`Migration complete: ${results.migrated} migrated, ${results.skipped} skipped, ${results.errors.length} errors`);
    
    return new Response(JSON.stringify({
      success: true,
      dryRun,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error: unknown) {
    console.error("Migration error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
