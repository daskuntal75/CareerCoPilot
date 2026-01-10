import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeInput, hashString } from "../_shared/security-utils.ts";
import { logSecurityThreat } from "../_shared/audit-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Section-specific prompts for regeneration
const sectionPrompts: Record<string, string> = {
  opening: `Focus ONLY on regenerating the opening paragraph. Create an attention-grabbing, professional yet engaging introduction. Return ONLY the new opening paragraph text.`,
  skills: `Focus ONLY on regenerating the skills and experience section. Highlight relevant skills using STAR format. Return ONLY the skills/experience paragraphs.`,
  achievements: `Focus ONLY on regenerating achievements. Emphasize quantifiable results with SMART metrics. Return ONLY the achievements content.`,
  motivation: `Focus ONLY on regenerating the "why this company" section. Express genuine interest and alignment. Return ONLY the motivation paragraph.`,
  closing: `Focus ONLY on regenerating the closing. Create a strong call-to-action. Return ONLY the closing paragraph.`,
  full: `Regenerate the ENTIRE cover letter package including the requirements mapping table and fit calculation.`,
};

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
      coverLetterTemplate,
      analysisData, 
      applicationId, 
      userId,
      sectionToRegenerate,
      userFeedback,
      selectedTips,
      existingCoverLetter,
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Security: Sanitize inputs
    const { sanitized: sanitizedJD, threats, hasMaliciousContent } = sanitizeInput(jobDescription);
    
    if (hasMaliciousContent && userId) {
      await logSecurityThreat(supabase, userId, 'cover_letter_injection', {
        hash: hashString(jobDescription),
        threats: threats.map(t => t.type),
      });
    }

    // RAG: Retrieve verified resume chunks
    let verifiedExperience = "";
    
    if (applicationId && userId) {
      const { data: matches } = await supabase
        .from("requirement_matches")
        .select(`
          similarity_score,
          match_evidence,
          requirement:job_requirements!inner(requirement_text, application_id),
          chunk:resume_chunks!inner(content, chunk_type)
        `)
        .eq("requirement.application_id", applicationId)
        .gte("similarity_score", 0.5)
        .order("similarity_score", { ascending: false });

      if (matches && matches.length > 0) {
        const uniqueChunks = new Map<string, string>();
        const verifiedRequirements: string[] = [];

        for (const match of matches) {
          const chunk = match.chunk as any;
          const requirement = match.requirement as any;
          
          if (chunk?.content && !uniqueChunks.has(chunk.content)) {
            uniqueChunks.set(chunk.content, chunk.content);
          }
          
          if (requirement?.requirement_text && match.match_evidence) {
            verifiedRequirements.push(`- ${requirement.requirement_text}: ${match.match_evidence}`);
          }
        }

        verifiedExperience = `
VERIFIED EXPERIENCE (USE ONLY THIS):
${Array.from(uniqueChunks.values()).join('\n\n')}

VERIFIED MATCHES:
${verifiedRequirements.slice(0, 10).join('\n')}
`;
      }
    }

    // Build analysis context
    const analysisContext = analysisData ? `
KEY MATCHES:
${analysisData.requirements
  .filter((r: any) => r.status === "yes")
  .map((r: any) => `- ${r.requirement}: ${r.evidence}`)
  .join("\n")}

GAPS:
${analysisData.requirements
  .filter((r: any) => r.status === "no" || r.status === "partial")
  .map((r: any) => `- ${r.requirement}: ${r.evidence}`)
  .join("\n")}
` : "";

    // Build regeneration context
    let regenerationContext = "";
    if (sectionToRegenerate && sectionPrompts[sectionToRegenerate]) {
      regenerationContext = `\n# REGENERATION REQUEST\nSection: ${sectionToRegenerate.toUpperCase()}\n${sectionPrompts[sectionToRegenerate]}\n`;
      
      if (userFeedback) {
        regenerationContext += `\nUser Feedback:\n${userFeedback}\n`;
      }
      
      if (selectedTips?.length > 0) {
        regenerationContext += `\nImprovement Guidelines:\n`;
        for (const tip of selectedTips) {
          if (tipInstructions[tip]) {
            regenerationContext += `- ${tipInstructions[tip]}\n`;
          }
        }
      }
      
      if (existingCoverLetter) {
        regenerationContext += `\nExisting Cover Letter:\n${existingCoverLetter}\n`;
      }
    }

    // Cover letter template context
    const templateContext = coverLetterTemplate ? `
COVER LETTER TEMPLATE (use as style reference):
${coverLetterTemplate}
` : "";

    const systemPrompt = `You are a senior professional analyzing a job posting against resume materials to create a compelling cover letter with requirements mapping.

# TRUTHFULNESS CONSTRAINT
Do not invent or embellish experience not in the resume. If a requirement has no match, state "No direct match" in the mapping table.`;

    const userPrompt = sectionToRegenerate && sectionToRegenerate !== "full" 
      ? `<job_posting>${sanitizedJD}</job_posting>
<job_title>${jobTitle} at ${company}</job_title>
${verifiedExperience || `<resume>${resumeContent}</resume>`}
${analysisContext}
${regenerationContext}

Return ONLY the regenerated section.`
      : `<job_posting>${sanitizedJD}</job_posting>
<job_title>${jobTitle} at ${company}</job_title>
${verifiedExperience || `<resume>${resumeContent}</resume>`}
${templateContext}
${analysisContext}
${regenerationContext}

# TASK

## Step 1: Extract Top 10 Job Requirements
Focus on decision-critical requirements (ownership scope, leadership, domain expertise). Exclude generic skills.

## Step 2: Map Experience to Requirements
For each requirement, find matching resume evidence. Use "No direct match" if none found.

## Step 3: Calculate Fit Score
Count requirements genuinely met, divide by 10, multiply by 100.

## Step 4: Write Cover Letter

**Opening**: Professional yet attention-grabbing, stand out from typical letters.

**Body** (2-3 paragraphs): Focus on top 3 requirements using STAR format (Situation, Task, Action, Result) with specific metrics. Keep narratives flowing naturally.

**Fit Statement**: Reference your calculated fit percentage.

**Closing**: Polite, professional, impactful call-to-action.

**Tone**: Professional yet engaging, ATS-friendly with relevant keywords.

## OUTPUT FORMAT

Provide your response in this exact format:

---

[COVER LETTER]

[Full cover letter text here]

---

[REQUIREMENTS MAPPING TABLE]

| # | Job Requirement | Your Experience | Evidence |
|---|-----------------|-----------------|----------|
| 1 | [Requirement] | [Match or "No direct match"] | [Brief evidence] |
| 2 | ... | ... | ... |
[Continue for all 10 requirements]

---

[FIT SCORE CALCULATION]

Requirements Met: X out of 10
**Fit Score: XX%**

Methodology: [Brief explanation of how score was calculated]

---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: stream,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    const coverLetter = data.choices?.[0]?.message?.content;
    
    if (!coverLetter) {
      throw new Error("Empty response from AI");
    }

    return new Response(JSON.stringify({ 
      coverLetter,
      regeneratedSection: sectionToRegenerate || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-cover-letter:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
