import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Section-specific prompts for individual regeneration
const sectionPrompts: Record<string, string> = {
  questions: `Generate 15-25 highly probable, role-specific interview questions segmented by interviewer type:
- Recruiter screen (3-5 questions)
- Hiring Manager (3-5 questions)
- Product Director/Peer (3-5 questions)
- Technical Lead/Engineering Manager/Architect (3-5 questions)
- VP (assessing culture fit) (3-5 questions)
- Group/Panel (2-3 questions)

For EACH question, draft the best possible answer using STAR + SMART format:
- Situation: Set context from actual resume experience
- Task: Describe the challenge from resume
- Action: Detail specific actions taken (from resume only)
- Result: Provide concrete outcomes using SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound) - from resume only

Return JSON with only a 'questions' array in this format:
{
  "questions": [{
    "question": "",
    "category": "recruiter|hiring_manager|peer|technical|vp|panel",
    "difficulty": "easy|medium|hard",
    "whyAsked": "",
    "starAnswer": { "situation": "", "task": "", "action": "", "result": "" },
    "tips": []
  }]
}
Return ONLY valid JSON, no markdown.`,

  companyIntelligence: `Research and provide detailed company intelligence. Return JSON with only 'companyIntelligence' and 'interviewPractices':
{
  "companyIntelligence": {
    "visionMission": "Current vision/mission statement",
    "industryMarket": "Industry sector, market position, specific employee count",
    "financialPerformance": "Recent revenue/profit with specific timeframes",
    "productsServices": "Key offerings and customer segments"
  },
  "interviewPractices": "Typical interview format and expectations for this level/company"
}
Return ONLY valid JSON, no markdown.`,

  strategicAnalysis: `Conduct comprehensive SWOT analysis and competitive landscape mapping. Return JSON with only 'strategicAnalysis':
{
  "strategicAnalysis": {
    "strengths": ["3-5 key strengths"],
    "criticalStrength": "The #1 most critical strength",
    "weaknesses": ["3-5 key weaknesses"],
    "criticalWeakness": "The #1 most critical weakness",
    "opportunities": ["3-5 key opportunities"],
    "criticalOpportunity": "The #1 most critical opportunity",
    "threats": ["3-5 key threats"],
    "criticalThreat": "The #1 most critical threat",
    "competitors": ["Main competitors"],
    "marketResearchPositioning": "Gartner/Forrester/IDC positioning if applicable",
    "competitivePosition": "Clear positioning statement"
  }
}
Return ONLY valid JSON, no markdown.`,

  keyTechnologyConcepts: `Identify key technology and domain concepts relevant to this specific role and company. Return JSON:
{
  "keyTechnologyConcepts": [
    { "concept": "Concept name", "description": "Single paragraph defining it and how it applies to this company and role" }
  ],
  "securityConcerns": [
    { "useCase": "", "risk": "", "scenario": "", "pmTakeaway": "" }
  ],
  "aiUseCases": [
    { "useCase": "", "howAIWins": "", "valueForCompany": "" }
  ],
  "threatModeling": [
    { "scope": "", "threatScenario": "", "attackVector": "", "strideFocus": "", "keyQuestions": [], "mitigationControls": [] }
  ]
}
Return ONLY valid JSON, no markdown.`,

  cultureAndBenefits: `Research company culture and benefits. Return JSON with only 'cultureAndBenefits':
{
  "cultureAndBenefits": {
    "cultureInsights": ["Key cultural attributes relevant to director-level PM roles"],
    "standoutBenefits": ["Unique benefits package elements"]
  }
}
Return ONLY valid JSON, no markdown.`,

  keyPositioning: `Create key positioning statements. Return JSON:
{
  "uniqueValueProposition": "Statement based on candidate's experience and skills, showing alignment with company vision",
  "whyThisCompany": "Statement explaining why the candidate is interested in this specific company",
  "whyLeavingCurrent": "Professional reason for seeking new opportunity"
}
Return ONLY valid JSON, no markdown.`,

  questionsToAsk: `Develop 3 insightful, strategic questions for the candidate to ask at each stage. Return JSON:
{
  "questionsToAsk": {
    "forRecruiter": ["3 strategic questions"],
    "forHiringManager": ["3 strategic questions"],
    "forPeer": ["3 strategic questions"],
    "forTechnicalLead": ["3 strategic questions"],
    "forVP": ["3 strategic questions"]
  }
}
Return ONLY valid JSON, no markdown.`,

  followUpTemplates: `Create follow-up email templates for after each interview round. Return JSON:
{
  "followUpTemplates": {
    "afterRecruiter": "Professional email template",
    "afterHiringManager": "Professional email template referencing specific discussion points",
    "afterVP": "Professional email template referencing strategic discussions",
    "afterTechnical": "Professional email template referencing technical discussions"
  }
}
Return ONLY valid JSON, no markdown.`,

  interviewStructure: `Define core role requirements, key competencies, and predicted interview structure. Return JSON:
{
  "interviewStructure": {
    "coreRequirements": ["3-5 critical requirements from job description"],
    "keyCompetencies": ["Specific traits and skills the company is looking for"],
    "predictedFormat": "Format prediction: behavioral, product sense, technical, case studies"
  }
}
Return ONLY valid JSON, no markdown.`,

  keyStrengths: `Analyze the candidate's key strengths for this specific role. Return JSON with only 'keyStrengths' array (5-7 items):
{ "keyStrengths": ["strength1", "strength2"] }
Return ONLY valid JSON, no markdown.`,

  potentialConcerns: `Identify potential concerns an interviewer might have. Return JSON with only 'potentialConcerns' array (3-5 items):
{ "potentialConcerns": ["concern1", "concern2"] }
Return ONLY valid JSON, no markdown.`,
};

const tipInstructions: Record<string, string> = {
  more_specific: "Include more specific examples from the resume.",
  shorter: "Make content more concise.",
  longer: "Expand with more detail.",
  formal: "Use a more formal tone.",
  conversational: "Use a conversational tone.",
  quantify: "Add more metrics from the resume.",
  passion: "Express more enthusiasm.",
  unique: "Emphasize unique factors.",
  deeper_research: "Provide deeper company and industry research.",
  harder_questions: "Include more challenging interview questions.",
  different_angle: "Try a different perspective or approach.",
  more_metrics: "Add more quantifiable metrics from the resume.",
  simpler: "Simplify the language for easier recall.",
  leadership_focus: "Focus more on leadership and management aspects.",
  technical_depth: "Add more technical depth and detail.",
};

const SYSTEM_PROMPT = `You will act as an interview preparation assistant helping a candidate prepare for a job interview. Your task is to conduct comprehensive research, strategic analysis, and create detailed interview preparation materials.

# CRITICAL RULES

## Accuracy Requirements
- Base ALL interview question responses ONLY on actual experiences, achievements, and metrics from the provided resume
- DO NOT fabricate, embellish, or invent any metrics, outcomes, or experiences not present in the resume
- DO NOT combine metrics or details from different projects into a single response
- Maintain complete accuracy and truthfulness to the resume content

## Response Behavior
- Answer directly using your best judgment
- Do not ask clarifying questions unless absolutely necessary
- If the job description is empty, missing, or inaccessible, immediately state: "I need the full job description text to proceed."

## Relevancy and Non-Duplication Requirements
- Ensure all research, analysis, and preparation materials are directly relevant and applicable to the specific role, company, and domain
- Avoid redundancy and duplication of information across all sections
- Every piece of analysis should tie back to the specific job requirements and company context

# OUTPUT FORMAT
Return a JSON object with this structure:
{
  "applicationContext": "Brief summary of role at company",
  "companyIntelligence": {
    "visionMission": "Current vision/mission statement",
    "industryMarket": "Industry sector, market position, specific employee count",
    "financialPerformance": "Recent revenue/profit with specific timeframes",
    "productsServices": "Key offerings and customer segments"
  },
  "interviewPractices": "Typical interview format and expectations for this level/company",
  "keyTechnologyConcepts": [
    { "concept": "Concept name", "description": "Single paragraph defining it and how it applies" }
  ],
  "securityConcerns": [
    { "useCase": "", "risk": "", "scenario": "", "pmTakeaway": "" }
  ],
  "aiUseCases": [
    { "useCase": "", "howAIWins": "", "valueForCompany": "" }
  ],
  "threatModeling": [
    { "scope": "", "threatScenario": "", "attackVector": "", "strideFocus": "", "keyQuestions": [], "mitigationControls": [] }
  ],
  "strategicAnalysis": {
    "strengths": [], "criticalStrength": "",
    "weaknesses": [], "criticalWeakness": "",
    "opportunities": [], "criticalOpportunity": "",
    "threats": [], "criticalThreat": "",
    "competitors": [], "marketResearchPositioning": "", "competitivePosition": ""
  },
  "cultureAndBenefits": {
    "cultureInsights": ["Key cultural attributes relevant to director-level PM roles"],
    "standoutBenefits": ["Unique benefits"]
  },
  "interviewStructure": {
    "coreRequirements": ["3-5 critical requirements"],
    "keyCompetencies": ["Specific traits and skills"],
    "predictedFormat": "Format prediction"
  },
  "uniqueValueProposition": "Candidate's unique value statement",
  "whyThisCompany": "Why the candidate is interested in this company",
  "whyLeavingCurrent": "Professional reason for seeking new opportunity",
  "questions": [{
    "question": "",
    "category": "recruiter|hiring_manager|peer|technical|vp|panel",
    "difficulty": "easy|medium|hard",
    "whyAsked": "",
    "starAnswer": { "situation": "", "task": "", "action": "", "result": "" },
    "tips": []
  }],
  "questionsToAsk": {
    "forRecruiter": [], "forHiringManager": [], "forPeer": [], "forTechnicalLead": [], "forVP": []
  },
  "keyStrengths": ["5-7 strengths"],
  "potentialConcerns": ["3-5 concerns"],
  "followUpTemplates": {
    "afterRecruiter": "", "afterHiringManager": "", "afterVP": "", "afterTechnical": ""
  },
  "resumeValidationChecklist": "All metrics, outcomes, and experiences referenced in STAR responses are sourced directly from the provided resume."
}

# CONTENT REQUIREMENTS
- Generate 15-25 interview questions distributed across: recruiter(3-5), hiring_manager(3-5), peer(3-5), technical(3-5), vp(3-5), panel(2-3)
- For EACH question, use STAR + SMART format with answers grounded ONLY in resume content
- Generate EXACTLY 3 questions for EACH interviewer type in questionsToAsk
- Include 3 security concerns, 3 AI use cases, and 3 threat modeling exercises relevant to the company/role
- Create follow-up email templates for each interview round

# TONE & STYLE
- Professional, analytical, and strategic tone
- Thorough yet concise
- Present findings as actionable intelligence
- Ensure every piece of information is relevant to the specific role, company, and domain

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
    const analysisContext = analysisData ? `\n\nANALYSIS DATA:\nFit Score: ${analysisData.fitScore}%\n${analysisData.requirements?.map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`).join("\n") || ""}` : "";
    const guidanceContext = interviewGuidance ? `\n\nINTERVIEW GUIDANCE:\n${interviewGuidance}` : "";
    
    let improvementInstructions = "";
    if (sectionToRegenerate) {
      if (userFeedback) improvementInstructions += `\nUser Feedback: ${userFeedback}`;
      if (selectedTips?.length) improvementInstructions += `\nGuidelines: ${selectedTips.map((t: string) => tipInstructions[t]).filter(Boolean).join("; ")}`;
    }

    const isTargeted = !!(interviewerType && interviewerType.trim());
    const isRegen = !!sectionToRegenerate;
    const model = (isRegen || isTargeted) ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview";
    
    let userPrompt: string;
    const baseContext = `<resume>${resumeContent}</resume>
<job_description>${jobDescription}</job_description>
<job_title>${jobTitle}</job_title>
<company_name>${company}</company_name>
<interview_guidance>${interviewGuidance || ""}</interview_guidance>${analysisContext}${guidanceContext}`;

    if (isTargeted) {
      userPrompt = `${baseContext}

# TASK
Generate 8-10 interview questions specifically for an interview with a **${interviewerType}**.
${targetedGuidance ? `\nInterview Focus/Topic: ${targetedGuidance}` : ""}

The questions should be tailored to what a ${interviewerType} would specifically ask, considering their perspective and priorities.
Include STAR + SMART format answers based ONLY on the resume content provided.

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
      userPrompt = `${baseContext}\n\n# TASK\n${sectionPrompts[sectionToRegenerate]}${improvementInstructions}`;
    } else {
      userPrompt = `${baseContext}\n\n# TASK\nCreate comprehensive interview preparation following ALL sections defined in the system prompt. Cover all 6 phases thoroughly.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        stream,
        ...(model.startsWith("openai/") ? { max_completion_tokens: isRegen ? 4000 : 12000 } : { temperature: 0.7, max_tokens: isRegen ? 4000 : 12000 }),
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
