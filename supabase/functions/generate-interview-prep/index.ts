import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Sleep utility for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sanitize JSON string to fix common AI formatting issues
const sanitizeJson = (str: string): string => {
  return str
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix trailing commas before closing brackets
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix single quotes used as string delimiters (common AI mistake)
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    // Remove any BOM or zero-width characters
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '');
};

// Parse AI response with multiple fallback strategies
const parseAIResponse = (content: string): any => {
  if (!content) {
    throw new Error("Empty response from AI");
  }

  // Extract JSON from response - handle markdown code blocks
  let jsonString = content;
  
  // Remove markdown code blocks if present
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    // Try to find raw JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
  }

  // Try parsing with sanitization
  try {
    return JSON.parse(sanitizeJson(jsonString));
  } catch (parseError) {
    console.error("Initial parse failed, attempting recovery:", parseError);
    
    // Try more aggressive cleanup
    const aggressiveCleanup = jsonString
      // Remove all non-printable characters except whitespace
      .replace(/[^\x20-\x7E\s]/g, '')
      // Fix any remaining issues with quotes
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    try {
      return JSON.parse(aggressiveCleanup);
    } catch (secondError) {
      console.error("JSON parsing failed after cleanup. Raw content length:", content.length);
      console.error("First 500 chars:", content.substring(0, 500));
      console.error("Last 500 chars:", content.substring(content.length - 500));
      throw new Error("Failed to parse AI response as valid JSON");
    }
  }
};

// Make AI request with retry logic
const makeAIRequestWithRetry = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`AI request attempt ${attempt + 1}/${MAX_RETRIES}`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      // Don't retry on client errors (4xx) except rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await sleep(waitTime);
        continue;
      }

      if (response.status === 402) {
        throw new Error("AI credits depleted. Please add funds to continue.");
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`AI gateway error (status ${response.status}):`, text);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      // Try to parse the response
      const parsed = parseAIResponse(content);
      console.log(`Successfully parsed response on attempt ${attempt + 1}`);
      return parsed;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on certain errors
      if (lastError.message.includes("credits depleted")) {
        throw lastError;
      }

      // Exponential backoff before retry
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeContent, jobDescription, jobTitle, company, analysisData, sectionToRegenerate, existingData } = await req.json();
    
    if (!resumeContent || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Resume content and job description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are acting as a senior professional preparing for an interview at a new company. Your task is to conduct comprehensive research, strategic analysis, and interview preparation for a specific role.

# CRITICAL RULES

## Accuracy Requirements:
- Base ALL interview question responses ONLY on actual experiences, achievements, and metrics from the provided resume
- DO NOT fabricate, embellish, or invent any metrics, outcomes, or experiences not present in the resume
- DO NOT combine metrics or details from different projects into a single response
- Maintain complete accuracy and truthfulness to the resume content

## Response Behavior:
- Answer directly using your best judgment
- Do not ask clarifying questions unless absolutely necessary
- If the job description is empty, missing, or inaccessible, immediately state: "I need the full job description text to proceed."

## CRITICAL: JSON Output Format
- You MUST return ONLY a valid JSON object, no markdown, no explanation
- Ensure all strings are properly escaped (use \\" for quotes inside strings)
- Do not use trailing commas
- All property names must be double-quoted

Return your response as a JSON object with this structure:
{
  "applicationContext": "string - brief summary of the role at company",
  "companyIntelligence": {
    "visionMission": "string - company vision and mission",
    "industryMarket": "string - sector, position, size",
    "financialPerformance": "string - recent revenue/performance if known",
    "productsServices": "string - key offerings"
  },
  "keyDomainConcepts": ["string - relevant technical/domain concepts to understand"],
  "strategicAnalysis": {
    "strengths": ["string - company strengths"],
    "criticalStrength": "string - #1 critical strength",
    "weaknesses": ["string - company weaknesses"],
    "criticalWeakness": "string - #1 critical weakness",
    "opportunities": ["string - company opportunities"],
    "criticalOpportunity": "string - #1 critical opportunity",
    "threats": ["string - company threats"],
    "criticalThreat": "string - #1 critical threat",
    "competitors": ["string - main competitors"],
    "competitivePosition": "string - market positioning"
  },
  "cultureAndBenefits": {
    "cultureInsights": ["string - key cultural attributes"],
    "standoutBenefits": ["string - unique benefits"]
  },
  "interviewStructure": {
    "coreRequirements": ["string - 3-5 critical requirements"],
    "keyCompetencies": ["string - traits and skills sought"],
    "predictedFormat": "string - format prediction"
  },
  "uniqueValueProposition": "string - candidate's unique value prop for this role",
  "whyThisCompany": "string - compelling reason for choosing this company",
  "questions": [
    {
      "question": "string - the interview question",
      "category": "recruiter" | "hiring_manager" | "peer" | "technical" | "vp" | "panel",
      "difficulty": "easy" | "medium" | "hard",
      "whyAsked": "string - why this question is likely",
      "starAnswer": {
        "situation": "string - specific situation from resume",
        "task": "string - the challenge from resume",
        "action": "string - actions taken from resume",
        "result": "string - SMART outcome (Specific, Measurable, Achievable, Relevant, Time-bound) from resume"
      },
      "tips": ["string - additional tips"]
    }
  ],
  "questionsToAsk": {
    "forRecruiter": ["string - 3 strategic questions"],
    "forHiringManager": ["string - 3 strategic questions"],
    "forPeer": ["string - 3 strategic questions"],
    "forTechnicalLead": ["string - 3 strategic questions"],
    "forVP": ["string - 3 strategic questions"]
  },
  "keyStrengths": ["string - strengths to emphasize based on resume"],
  "potentialConcerns": ["string - concerns to address proactively"]
}

Generate 8-12 interview questions covering different interviewer types (recruiter, hiring manager, peer, technical, VP, panel).
For EACH question, use the STAR + SMART format with content ONLY from the resume.`;

    const analysisContext = analysisData ? `
ANALYSIS SUMMARY:
Fit Score: ${analysisData.fitScore}%
${analysisData.requirements
  .map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`)
  .join("\n")}
` : "";

    // Section-specific prompts for regeneration
    const sectionPrompts: Record<string, string> = {
      questions: `Focus ONLY on generating interview questions. Generate 8-12 highly probable, role-specific interview questions segmented by interviewer type with STAR + SMART answers. Return JSON with only the "questions" array.`,
      keyStrengths: `Focus ONLY on analyzing key strengths to highlight during the interview. Return JSON with only the "keyStrengths" array (5-7 items).`,
      potentialConcerns: `Focus ONLY on identifying potential concerns the interviewer might have and how to address them. Return JSON with only the "potentialConcerns" array (3-5 items).`,
      questionsToAsk: `Focus ONLY on generating strategic questions for the candidate to ask interviewers. Return JSON with only the "questionsToAsk" object containing arrays for forRecruiter, forHiringManager, forPeer, forTechnicalLead, forVP.`,
      companyIntelligence: `Focus ONLY on company intelligence research. Return JSON with only the "companyIntelligence" object.`,
      strategicAnalysis: `Focus ONLY on SWOT strategic analysis. Return JSON with only the "strategicAnalysis" object.`,
      uniqueValueProposition: `Focus ONLY on crafting a unique value proposition and why this company statement. Return JSON with "uniqueValueProposition" and "whyThisCompany" fields.`,
    };

    const userPrompt = sectionToRegenerate && sectionPrompts[sectionToRegenerate] 
      ? `Here is the resume containing actual skills, experiences, and achievements:

<resume>
${resumeContent}
</resume>

Here is the job description for this role:

<job_description>
${jobDescription}
</job_description>

<job_title>
${jobTitle}
</job_title>

<company_name>
${company}
</company_name>
${analysisContext}

# YOUR TASK

${sectionPrompts[sectionToRegenerate]}

Base ALL content ONLY on actual experiences from the resume. Do not fabricate or embellish.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`
      : `Here is the resume containing actual skills, experiences, and achievements:

<resume>
${resumeContent}
</resume>

Here is the job description for this role:

<job_description>
${jobDescription}
</job_description>

<job_title>
${jobTitle}
</job_title>

<company_name>
${company}
</company_name>
${analysisContext}

# YOUR TASK

Complete a comprehensive interview preparation covering five phases:

## Phase 1: Information Gathering & Validation
- Acknowledge the application context (job title at company)
- Review and validate the job description is complete
- Research concrete company data:
  - Current vision/mission statement
  - Industry sector and market position
  - Specific employee count if available
  - Recent financial performance (revenue, profit with timeframes)
  - Key products/services and customer segments

## Phase 2: Strategic Analysis
- Conduct comprehensive SWOT analysis:
  - List key items in each quadrant (Strengths, Weaknesses, Opportunities, Threats)
  - Identify the #1 most critical factor in each quadrant
- Map competitive landscape

## Phase 3: Cultural & Benefits Research
- Research company culture and work environment insights
- Focus on insights relevant to director-level or senior roles
- Identify unique or standout employee benefits

## Phase 4: Interview Preparation
- Define core role requirements and key competencies the company seeks
- Create a Unique Value Proposition statement based on resume experience and how it helps with the company's vision
- Prepare a statement about why this company would be chosen
- Predict interview structure (behavioral, product sense, technical, case studies)
- Generate 8-12 highly probable, role-specific interview questions segmented by interviewer type:
  - Recruiter Screen (2-3 questions)
  - Hiring Manager (2-3 questions)
  - Product Director/Peer (2-3 questions)
  - Technical Lead/Engineering mgr (2-3 questions)
  - VP (assessing culture fit) (2-3 questions)
  - Group/Panel (1-2 questions)

For EACH question, draft the best possible answer using STAR + SMART format:
- Situation: Set context from actual resume experience
- Task: Describe the challenge from resume
- Action: Detail specific actions taken (from resume only)
- Result: Provide concrete outcomes using SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound) - from resume only

## Phase 5: Question Generation
Develop 3 insightful, strategic questions for the candidate to ask at each stage:
- Questions for Recruiter
- Questions for Hiring Manager
- Questions for Product Director/Peer
- Questions for Technical Lead/Engineering mgr
- Questions for VP (assessing culture fit)

Return the complete analysis as a JSON object following the structure in the system prompt.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    // Use retry logic for the AI request
    const interviewPrep = await makeAIRequestWithRetry(LOVABLE_API_KEY, systemPrompt, userPrompt);

    return new Response(JSON.stringify(interviewPrep), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-interview-prep:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
