import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeContent, jobDescription, jobTitle, company, analysisData } = await req.json();
    
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

    const systemPrompt = `You are an expert interview coach. Generate predicted interview questions and STAR-format talking points.

Return JSON with this structure:
{
  "questions": [
    {
      "question": "string - the likely interview question",
      "category": "behavioral" | "technical" | "situational" | "cultural",
      "difficulty": "easy" | "medium" | "hard",
      "whyAsked": "string - why this question is likely given the job",
      "starAnswer": {
        "situation": "string - specific situation from resume",
        "task": "string - the task/challenge",
        "action": "string - actions taken",
        "result": "string - quantified outcome"
      },
      "tips": ["string - additional tips for answering"]
    }
  ],
  "keyStrengths": ["string - strengths to emphasize"],
  "potentialConcerns": ["string - potential concerns to address proactively"],
  "questionsToAsk": ["string - smart questions to ask the interviewer"]
}

Generate 8-10 likely questions. Be specific to the role and use actual resume content for STAR examples.`;

    const analysisContext = analysisData ? `
ANALYSIS SUMMARY:
Fit Score: ${analysisData.fitScore}%
${analysisData.requirements
  .map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`)
  .join("\n")}
` : "";

    const userPrompt = `Generate interview prep materials for the ${jobTitle} role at ${company}.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}
${analysisContext}

Focus on questions that would probe the candidate's fit for this specific role. Use their actual experience for STAR answers.`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    
    const interviewPrep = JSON.parse(jsonMatch[0]);

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
