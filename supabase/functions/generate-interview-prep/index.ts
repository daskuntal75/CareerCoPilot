import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logUsage, createRateLimitResponse } from "../_shared/rate-limit-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 2; // Reduced for faster fallback
const INITIAL_DELAY_MS = 500; // Faster retry
const MAX_JOB_DESCRIPTION_LENGTH = 15000;
const MAX_RESUME_LENGTH = 50000;
const REQUEST_TIMEOUT_MS = 90000; // 90 seconds

// Simple in-memory request queue for load balancing
const activeRequests = { count: 0, maxConcurrent: 50 };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizeJson = (str: string): string => {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '');
};

const parseAIResponse = (content: string): any => {
  if (!content) throw new Error("Empty response from AI");

  let jsonString = content;
  
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
  }

  try {
    return JSON.parse(sanitizeJson(jsonString));
  } catch {
    const aggressiveCleanup = jsonString
      .replace(/[^\x20-\x7E\s]/g, '')
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    try {
      return JSON.parse(aggressiveCleanup);
    } catch {
      console.error("JSON parse failed. Length:", content.length);
      throw new Error("Failed to parse AI response as valid JSON");
    }
  }
};

const makeAIRequestWithRetry = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  isRegeneration = false
): Promise<any> => {
  let lastError: Error | null = null;
  
  // Use faster model for regeneration of single sections
  const model = isRegeneration ? "google/gemini-2.5-flash-lite" : "google/gemini-2.5-flash";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`AI request attempt ${attempt + 1}/${MAX_RETRIES} using ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7, // Slightly lower for faster, more deterministic responses
          max_tokens: isRegeneration ? 4000 : 8000, // Limit tokens for faster response
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${waitTime}ms`);
        await sleep(waitTime);
        continue;
      }

      if (response.status === 402) {
        throw new Error("AI credits depleted. Please add funds to continue.");
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`AI error ${response.status}:`, text);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = parseAIResponse(content);
      console.log(`Success on attempt ${attempt + 1}`);
      return parsed;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (lastError.message.includes("credits depleted")) throw lastError;
      if (lastError.name === "AbortError") throw new Error("Request timed out. Please try again.");

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
};

const makeStreamingAIRequest = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  isRegeneration = false
): Promise<Response> => {
  const model = isRegeneration ? "google/gemini-2.5-flash-lite" : "google/gemini-2.5-flash";
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: isRegeneration ? 4000 : 8000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limits exceeded, please try again later.");
    if (response.status === 402) throw new Error("AI credits depleted. Please add funds to continue.");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  return response;
};

// Load balancing check
const canAcceptRequest = (): boolean => {
  return activeRequests.count < activeRequests.maxConcurrent;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      resumeContent, 
      jobDescription, 
      jobTitle, 
      company,
      interviewGuidance,
      analysisData, 
      sectionToRegenerate,
      userFeedback,
      selectedTips,
      existingData,
      stream = false,
    } = await req.json();
    
    // Load balancing check
    if (!canAcceptRequest()) {
      return new Response(
        JSON.stringify({ 
          error: "Server is busy",
          message: "High demand detected. Please try again in a few seconds.",
          retryAfter: 5,
        }),
        { 
          status: 503, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "5",
          } 
        }
      );
    }
    
    activeRequests.count++;
    
    try {
      if (!resumeContent || !jobDescription) {
        return new Response(
          JSON.stringify({ error: "Resume content and job description are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate input lengths
      if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Job description too long. Maximum ${MAX_JOB_DESCRIPTION_LENGTH} characters allowed.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (resumeContent.length > MAX_RESUME_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Resume too long. Maximum ${MAX_RESUME_LENGTH} characters allowed.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.error("Failed to get user from token:", e);
      }
    }

    // Check rate limit if user is authenticated
    if (userId) {
      const rateLimitResult = await checkRateLimit(supabase, userId, "generate_interview_prep");
      
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult, corsHeaders);
      }

      // Log usage
      await logUsage(supabase, userId, "generate_interview_prep", {
        company,
        jobTitle,
        sectionToRegenerate: sectionToRegenerate || null,
      });
    }

    // Fetch custom prompts from admin_settings
    let customSystemPrompt: string | null = null;
    let customUserPromptTemplate: string | null = null;

    try {
      
      const { data: promptSettings } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["ai_interview_prep_system_prompt", "ai_interview_prep_user_prompt"]);

      promptSettings?.forEach((setting: { setting_key: string; setting_value: { prompt?: string } }) => {
        if (setting.setting_key === "ai_interview_prep_system_prompt" && setting.setting_value?.prompt) {
          customSystemPrompt = setting.setting_value.prompt;
        }
        if (setting.setting_key === "ai_interview_prep_user_prompt" && setting.setting_value?.prompt) {
          customUserPromptTemplate = setting.setting_value.prompt;
        }
      });
    } catch (err) {
      console.error("Failed to fetch custom prompts:", err);
    }

    const defaultSystemPrompt = `You are a senior professional preparing for an interview. Your task is to create comprehensive interview preparation materials.

# CRITICAL RULES
- Base ALL responses ONLY on actual experiences from the provided resume
- DO NOT fabricate metrics, outcomes, or experiences
- Maintain complete accuracy to resume content

# OUTPUT FORMAT
Return a JSON object with this structure:
{
  "applicationContext": "Brief summary of role at company",
  "companyIntelligence": {
    "visionMission": "Company vision/mission",
    "industryMarket": "Sector, position, ~size",
    "financialPerformance": "Recent performance if known",
    "productsServices": "Key offerings"
  },
  "keyDomainConcepts": ["Relevant technical concepts"],
  "strategicAnalysis": {
    "strengths": ["3-5 company strengths"],
    "criticalStrength": "#1 strength",
    "weaknesses": ["3-5 weaknesses"],
    "criticalWeakness": "#1 weakness",
    "opportunities": ["3-5 opportunities"],
    "criticalOpportunity": "#1 opportunity",
    "threats": ["3-5 threats"],
    "criticalThreat": "#1 threat",
    "competitors": ["Main competitors"],
    "competitivePosition": "Market positioning"
  },
  "cultureAndBenefits": {
    "cultureInsights": ["Key cultural attributes"],
    "standoutBenefits": ["Unique benefits"]
  },
  "interviewStructure": {
    "coreRequirements": ["3-5 critical requirements"],
    "keyCompetencies": ["Traits sought"],
    "predictedFormat": "Interview format prediction"
  },
  "uniqueValueProposition": "Candidate's unique value for this role based on resume",
  "whyThisCompany": "Compelling reason for choosing this company",
  "whyLeavingCurrent": "Professional reason for seeking new opportunity",
  "questions": [
    {
      "question": "Interview question",
      "category": "recruiter|hiring_manager|peer|technical|vp|panel",
      "difficulty": "easy|medium|hard",
      "whyAsked": "Why this question is likely",
      "starAnswer": {
        "situation": "Context from resume",
        "task": "Challenge from resume",
        "action": "Actions from resume",
        "result": "SMART outcome from resume"
      },
      "tips": ["Additional tips"]
    }
  ],
  "questionsToAsk": {
    "forRecruiter": ["3 questions"],
    "forHiringManager": ["3 questions"],
    "forPeer": ["3 questions"],
    "forTechnicalLead": ["3 questions"],
    "forVP": ["3 questions"]
  },
  "keyStrengths": ["5-7 strengths to emphasize"],
  "potentialConcerns": ["3-5 concerns to address"],
  "followUpTemplates": {
    "afterRecruiter": "Email template",
    "afterHiringManager": "Email template",
    "afterVP": "Email template",
    "afterTechnical": "Email template"
  }
}

Generate 10-12 interview questions across different interviewer types.
Return ONLY valid JSON, no markdown.`;

    const systemPrompt = customSystemPrompt || defaultSystemPrompt;

    const analysisContext = analysisData ? `
ANALYSIS:
Fit Score: ${analysisData.fitScore}%
${analysisData.requirements?.map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`).join("\n") || ""}
` : "";

    const guidanceContext = interviewGuidance ? `
INTERVIEW GUIDANCE FROM COMPANY:
${interviewGuidance}
` : "";

    const tipInstructions: Record<string, string> = {
      more_specific: "Include more specific examples with concrete details.",
      shorter: "Make content more concise - reduce word count.",
      longer: "Expand with more detail and elaboration.",
      formal: "Use a more formal, professional tone.",
      conversational: "Use a more conversational, friendly tone.",
      quantify: "Add more metrics and quantifiable achievements.",
      passion: "Express more enthusiasm and passion for the role.",
      unique: "Emphasize unique differentiating factors.",
    };

    const sectionPrompts: Record<string, string> = {
      questions: `Generate 10-12 interview questions with STAR answers. Return JSON with only "questions" array.`,
      keyStrengths: `Analyze key strengths. Return JSON with only "keyStrengths" array (5-7 items).`,
      potentialConcerns: `Identify concerns. Return JSON with only "potentialConcerns" array (3-5 items).`,
      questionsToAsk: `Generate strategic questions to ask. Return JSON with only "questionsToAsk" object.`,
      companyIntelligence: `Research company. Return JSON with only "companyIntelligence" object.`,
      strategicAnalysis: `SWOT analysis. Return JSON with only "strategicAnalysis" object.`,
      uniqueValueProposition: `Craft value proposition. Return JSON with "uniqueValueProposition" and "whyThisCompany".`,
    };

    // Build improvement instructions from user feedback and tips
    let improvementInstructions = "";
    if (sectionToRegenerate) {
      if (userFeedback) {
        improvementInstructions += `\nUser Feedback: ${userFeedback}`;
      }
      if (selectedTips && selectedTips.length > 0) {
        improvementInstructions += "\nImprovement Guidelines:";
        for (const tip of selectedTips) {
          if (tipInstructions[tip]) {
            improvementInstructions += `\n- ${tipInstructions[tip]}`;
          }
        }
      }
    }

    const userPrompt = sectionToRegenerate && sectionPrompts[sectionToRegenerate] 
      ? `<resume>${resumeContent}</resume>
<job_description>${jobDescription}</job_description>
<job_title>${jobTitle}</job_title>
<company_name>${company}</company_name>
${analysisContext}
${guidanceContext}

# TASK
${sectionPrompts[sectionToRegenerate]}
${improvementInstructions}

Base ALL content on actual resume experiences.`
      : `<resume>${resumeContent}</resume>
<job_description>${jobDescription}</job_description>
<job_title>${jobTitle}</job_title>
<company_name>${company}</company_name>
${analysisContext}
${guidanceContext}

# TASK

Create comprehensive interview preparation:

## Phase 1: Company Research
- Vision/mission, industry position, products/services
- Research culture via Glassdoor, LinkedIn insights

## Phase 2: Strategic Analysis
- SWOT analysis with critical factors
- Competitive landscape

## Phase 3: Interview Preparation
- Core requirements and competencies
- Unique Value Proposition based on resume
- Why this company / Why leaving current role
- Predict interview structure

## Phase 4: Interview Questions (10-12 total)
Generate role-specific questions by interviewer type:
- Recruiter (2-3)
- Hiring Manager (2-3)
- Peer (2-3)
- Technical Lead (2-3)
- VP/Culture (2-3)

For EACH question, provide STAR answer:
- Situation: Context from resume
- Task: Challenge from resume
- Action: Specific actions from resume
- Result: SMART outcome with metrics from resume

## Phase 5: Questions to Ask
3 strategic questions per interviewer type

## Phase 6: Follow-up Templates
Brief professional email templates for each round

Return complete JSON following system prompt structure.`;

    const isRegeneration = !!sectionToRegenerate;
    
    if (stream) {
      try {
        const streamResponse = await makeStreamingAIRequest(LOVABLE_API_KEY, systemPrompt, userPrompt, isRegeneration);
        activeRequests.count--;
        return new Response(streamResponse.body, {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (error) {
        activeRequests.count--;
        const errorMessage = error instanceof Error ? error.message : "Streaming failed";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { 
            status: errorMessage.includes("Rate limits") ? 429 : 
                   errorMessage.includes("credits depleted") ? 402 : 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    const interviewPrep = await makeAIRequestWithRetry(LOVABLE_API_KEY, systemPrompt, userPrompt, isRegeneration);
    activeRequests.count--;

    return new Response(JSON.stringify(interviewPrep), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
    } finally {
      // Ensure count is decremented on any error path
      if (activeRequests.count > 0) {
        // Already decremented in success paths above
      }
    }
  } catch (error) {
    activeRequests.count = Math.max(0, activeRequests.count - 1);
    console.error("Error in generate-interview-prep:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
