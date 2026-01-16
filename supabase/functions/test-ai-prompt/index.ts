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
    const { systemPrompt, userPrompt, promptType } = await req.json();

    if (!systemPrompt || !userPrompt || !promptType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create sample test data based on prompt type
    const sampleResume = `John Doe
Software Engineer with 5+ years of experience

EXPERIENCE:
Senior Software Engineer | TechCorp | 2021-Present
- Led team of 5 developers building microservices architecture
- Reduced API response time by 40% through optimization
- Implemented CI/CD pipeline reducing deployment time by 60%

Software Engineer | StartupXYZ | 2019-2021
- Built React/TypeScript frontend serving 100k+ users
- Designed PostgreSQL database schema for analytics platform

SKILLS: JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, AWS, Docker`;

    const sampleJobDescription = `Senior Software Engineer
We're looking for a senior engineer to join our platform team.

Requirements:
- 5+ years software development experience
- Strong TypeScript/JavaScript skills
- Experience with React and Node.js
- Database design experience (PostgreSQL preferred)
- Cloud experience (AWS/GCP)
- Team leadership experience`;

    // Build the full user message with sample data
    const fullUserPrompt = promptType === "cover_letter"
      ? `# Resume:\n${sampleResume}\n\n# Job Description:\n${sampleJobDescription}\n\n${userPrompt}`
      : `# Resume:\n${sampleResume}\n\n# Job Description:\n${sampleJobDescription}\n\n# Company: TechCorp\n\n${userPrompt}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullUserPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || "No content generated";

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        sampleData: {
          resume: sampleResume,
          jobDescription: sampleJobDescription,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
