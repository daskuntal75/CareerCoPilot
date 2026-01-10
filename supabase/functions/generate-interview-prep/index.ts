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

// Make AI request with retry logic - non-streaming
const makeAIRequestWithRetry = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`AI request attempt ${attempt + 1}/${MAX_RETRIES}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
      
      const parsed = parseAIResponse(content);
      console.log(`Successfully parsed response on attempt ${attempt + 1}`);
      return parsed;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (lastError.message.includes("credits depleted")) {
        throw lastError;
      }
      
      if (lastError.name === "AbortError") {
        throw new Error("Request timed out after 120 seconds. Please try again.");
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
};

// Make streaming AI request
const makeStreamingAIRequest = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<Response> => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limits exceeded, please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits depleted. Please add funds to continue.");
    }
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  return response;
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
      analysisData, 
      sectionToRegenerate, 
      existingData,
      stream = false,
    } = await req.json();
    
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
- Maintain complete accuracy and truthfulness to the resume content

## Response Behavior:
- Answer directly using your best judgment
- Do not ask clarifying questions

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
        "result": "string - SMART outcome from resume"
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

Generate 8-12 interview questions covering different interviewer types.`;

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
      potentialConcerns: `Focus ONLY on identifying potential concerns the interviewer might have. Return JSON with only the "potentialConcerns" array (3-5 items).`,
      questionsToAsk: `Focus ONLY on generating strategic questions for the candidate to ask. Return JSON with only the "questionsToAsk" object.`,
      companyIntelligence: `Focus ONLY on company intelligence research. Return JSON with only the "companyIntelligence" object.`,
      strategicAnalysis: `Focus ONLY on SWOT strategic analysis. Return JSON with only the "strategicAnalysis" object.`,
      uniqueValueProposition: `Focus ONLY on crafting a unique value proposition. Return JSON with "uniqueValueProposition" and "whyThisCompany" fields.`,
    };

    const userPrompt = sectionToRegenerate && sectionPrompts[sectionToRegenerate] 
      ? `Resume:
<resume>
${resumeContent}
</resume>

Job Description:
<job_description>
${jobDescription}
</job_description>

<job_title>${jobTitle}</job_title>
<company_name>${company}</company_name>
${analysisContext}

# YOUR TASK
${sectionPrompts[sectionToRegenerate]}

Base ALL content ONLY on actual experiences from the resume.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`
      : `Resume:
<resume>
${resumeContent}
</resume>

Job Description:
<job_description>
${jobDescription}
</job_description>

<job_title>${jobTitle}</job_title>
<company_name>${company}</company_name>
${analysisContext}

# YOUR TASK

Complete comprehensive interview preparation covering:

1. Company research (vision, market, products)
2. SWOT strategic analysis
3. Culture and benefits research
4. Interview structure prediction
5. Generate 8-12 interview questions with STAR answers
6. Strategic questions to ask interviewers
7. Key strengths and potential concerns

Return the complete analysis as a JSON object following the structure in the system prompt.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    // Handle streaming request
    if (stream) {
      try {
        const streamResponse = await makeStreamingAIRequest(LOVABLE_API_KEY, systemPrompt, userPrompt);
        return new Response(streamResponse.body, {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (error) {
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

    // Non-streaming request with retry logic
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
