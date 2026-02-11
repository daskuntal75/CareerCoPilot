import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sectionPrompts: Record<string, string> = {
  questions: "Generate 10-12 interview questions with STAR answers. Return JSON with only 'questions' array.",
  keyStrengths: "Analyze key strengths. Return JSON with only 'keyStrengths' array (5-7 items).",
  potentialConcerns: "Identify concerns. Return JSON with only 'potentialConcerns' array (3-5 items).",
  questionsToAsk: "Generate strategic questions to ask. Return JSON with only 'questionsToAsk' object.",
  companyIntelligence: "Research company. Return JSON with only 'companyIntelligence' object.",
  strategicAnalysis: "SWOT analysis. Return JSON with only 'strategicAnalysis' object.",
  uniqueValueProposition: "Craft value proposition. Return JSON with 'uniqueValueProposition' and 'whyThisCompany'.",
};

const tipInstructions: Record<string, string> = {
  more_specific: "Include more specific examples.",
  shorter: "Make content more concise.",
  longer: "Expand with more detail.",
  formal: "Use a more formal tone.",
  conversational: "Use a conversational tone.",
  quantify: "Add more metrics.",
  passion: "Express more enthusiasm.",
  unique: "Emphasize unique factors.",
};

const SYSTEM_PROMPT = `You are a senior professional preparing for an interview. Create comprehensive interview preparation materials.

# CRITICAL RULES
- Base ALL responses ONLY on actual experiences from the provided resume
- DO NOT fabricate metrics, outcomes, or experiences
- Generate COMPLETE content for ALL sections

# OUTPUT FORMAT
Return a JSON object with this structure:
{
  "applicationContext": "Brief summary of role at company",
  "companyIntelligence": { "visionMission": "", "industryMarket": "", "financialPerformance": "", "productsServices": "" },
  "keyDomainConcepts": ["Relevant technical concepts"],
  "strategicAnalysis": { "strengths": [], "criticalStrength": "", "weaknesses": [], "criticalWeakness": "", "opportunities": [], "criticalOpportunity": "", "threats": [], "criticalThreat": "", "competitors": [], "competitivePosition": "" },
  "cultureAndBenefits": { "cultureInsights": [], "standoutBenefits": [] },
  "interviewStructure": { "coreRequirements": [], "keyCompetencies": [], "predictedFormat": "" },
  "uniqueValueProposition": "Candidate's unique value",
  "whyThisCompany": "Compelling reason for choosing this company",
  "whyLeavingCurrent": "Professional reason for seeking new opportunity",
  "questions": [{ "question": "", "category": "recruiter|hiring_manager|peer|technical|vp", "difficulty": "easy|medium|hard", "whyAsked": "", "starAnswer": { "situation": "", "task": "", "action": "", "result": "" }, "tips": [] }],
  "questionsToAsk": { "forRecruiter": [], "forHiringManager": [], "forPeer": [], "forTechnicalLead": [], "forVP": [] },
  "keyStrengths": ["5-7 strengths"],
  "potentialConcerns": ["3-5 concerns"],
  "followUpTemplates": { "afterRecruiter": "", "afterHiringManager": "", "afterVP": "", "afterTechnical": "" }
}

# CONTENT REQUIREMENTS
- Generate EXACTLY 12 interview questions distributed across: recruiter(2-3), hiring_manager(2-3), peer(2-3), technical(2-3), vp(2)
- Generate EXACTLY 3 questions for EACH interviewer type in questionsToAsk

Return ONLY valid JSON, no markdown.`;

// Rate limiting
async function checkRateLimit(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: sub } = await supabase.from("subscriptions").select("tier, status").eq("user_id", userId).eq("status", "active").maybeSingle();
  const tier = sub?.tier || "free";
  const limits: Record<string, number> = { free: 10, basic: 50, pro: 200, premium: 500, enterprise: -1 };
  const maxReq = limits[tier] ?? 10;
  if (maxReq === -1) return true;
  
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", oneHourAgo);
  return (count || 0) < maxReq;
}

// Parse AI response with multiple strategies
function parseAIResponse(content: string): any {
  if (!content) throw new Error("Empty response from AI");
  let jsonStr = content;
  
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  else {
    const start = content.indexOf('{'), end = content.lastIndexOf('}');
    if (start !== -1 && end > start) jsonStr = content.substring(start, end + 1);
  }
  
  try { return JSON.parse(jsonStr.replace(/,(\s*[}\]])/g, '$1')); }
  catch { throw new Error("Failed to parse AI response as valid JSON"); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeContent, jobDescription, jobTitle, company, interviewGuidance, analysisData,
      sectionToRegenerate, userFeedback, selectedTips, interviewerType, targetedGuidance, stream = false } = await req.json();

    if (!resumeContent || !jobDescription) {
      return new Response(JSON.stringify({ error: "Resume and job description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get user ID and check rate limit
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      } catch { /* ignore */ }
    }

    if (userId) {
      const allowed = await checkRateLimit(supabase, userId);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfter: 3600 }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("usage_logs").insert({ user_id: userId, action: "generate_interview_prep", metadata: { company, jobTitle, sectionToRegenerate } });
    }

    // Build contexts
    const analysisContext = analysisData ? `\nANALYSIS:\nFit Score: ${analysisData.fitScore}%\n${analysisData.requirements?.map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`).join("\n") || ""}` : "";
    const guidanceContext = interviewGuidance ? `\nINTERVIEW GUIDANCE:\n${interviewGuidance}` : "";
    
    let improvementInstructions = "";
    if (sectionToRegenerate) {
      if (userFeedback) improvementInstructions += `\nUser Feedback: ${userFeedback}`;
      if (selectedTips?.length) improvementInstructions += `\nGuidelines: ${selectedTips.map((t: string) => tipInstructions[t]).filter(Boolean).join("; ")}`;
    }

    const isTargeted = !!(interviewerType && interviewerType.trim());
    const isRegen = !!sectionToRegenerate;
    const model = (isRegen || isTargeted) ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview";
    
    let userPrompt: string;

    if (isTargeted) {
      // Targeted interview prep: only regenerate questions for specific interviewer type
      userPrompt = `<resume>${resumeContent}</resume>
<job_description>${jobDescription}</job_description>
<job_title>${jobTitle} at ${company}</job_title>${analysisContext}${guidanceContext}

# TASK
Generate 8-10 interview questions specifically for an interview with a **${interviewerType}**.
${targetedGuidance ? `\nInterview Focus/Topic: ${targetedGuidance}` : ""}

The questions should be tailored to what a ${interviewerType} would specifically ask, considering their perspective and priorities.
Include STAR-format answers based ONLY on the resume content provided.

Return JSON with only a 'questions' array in this format:
{
  "questions": [{
    "question": "",
    "category": "${interviewerType.toLowerCase().replace(/\s+/g, '_')}",
    "difficulty": "easy|medium|hard",
    "whyAsked": "Why a ${interviewerType} would ask this",
    "starAnswer": { "situation": "", "task": "", "action": "", "result": "" },
    "tips": []
  }]
}

Return ONLY valid JSON, no markdown.`;
    } else if (isRegen && sectionPrompts[sectionToRegenerate]) {
      userPrompt = `<resume>${resumeContent}</resume>\n<job_description>${jobDescription}</job_description>\n<job_title>${jobTitle} at ${company}</job_title>${analysisContext}${guidanceContext}\n\n# TASK\n${sectionPrompts[sectionToRegenerate]}${improvementInstructions}`;
    } else {
      userPrompt = `<resume>${resumeContent}</resume>\n<job_description>${jobDescription}</job_description>\n<job_title>${jobTitle} at ${company}</job_title>${analysisContext}${guidanceContext}\n\n# TASK\nCreate comprehensive interview preparation following the system prompt structure.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        stream,
        ...(model.startsWith("openai/") ? { max_completion_tokens: isRegen ? 4000 : 8000 } : { temperature: 0.7, max_tokens: isRegen ? 4000 : 8000 }),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const interviewPrep = parseAIResponse(content);

    return new Response(JSON.stringify(interviewPrep), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
