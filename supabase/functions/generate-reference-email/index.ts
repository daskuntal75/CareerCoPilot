import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const SYSTEM_PROMPT = `You are a professional career coach helping craft polite, professional reference request emails.
Your emails should be:
- Warm and appreciative
- Clear about the opportunity being pursued
- Specific about what kind of reference is needed
- Easy for the recipient to respond to
- Professional yet personable`;

const USER_PROMPT_TEMPLATE = `Generate a professional reference request email for a job application.

JOB DETAILS:
- Position: {jobTitle}
- Company: {company}

{referenceContext}

COVER LETTER CONTEXT (use this to understand what skills/achievements to highlight):
{coverLetterExcerpt}

REQUIREMENTS:
1. Start with a warm, personalized greeting
2. Remind them briefly of your relationship/work together
3. Mention the specific opportunity you're pursuing
4. Explain why you thought of them as a reference
5. List 2-3 key skills or projects they could speak to
6. Be clear about what you're asking (phone call, written letter, etc.)
7. Provide timeline if urgent
8. Express gratitude
9. End professionally

OUTPUT FORMAT:
Subject: [Email subject line]

[Email body]

Keep the email concise but complete (200-300 words).`;

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await req.json();
    const { 
      jobTitle, 
      company, 
      coverLetterContent, 
      referenceName,
      referenceRelationship,
      applicationId, 
      userId 
    } = body;

    if (!jobTitle || !company || !coverLetterContent) {
      return new Response(
        JSON.stringify({ error: "Job title, company, and cover letter content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log usage if userId provided
    if (userId) {
      await supabase.from("usage_logs").insert({
        user_id: userId,
        action: "generate_reference_email",
        metadata: { applicationId, company, jobTitle },
      });
    }

    // Build reference context
    let referenceContext = "";
    if (referenceName || referenceRelationship) {
      referenceContext = "REFERENCE DETAILS:";
      if (referenceName) referenceContext += `\n- Name: ${referenceName}`;
      if (referenceRelationship) referenceContext += `\n- Relationship: ${referenceRelationship}`;
    }

    // Extract key parts from cover letter (first 500 chars for context)
    const coverLetterExcerpt = coverLetterContent.slice(0, 1500);

    // Build user prompt
    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{jobTitle}", jobTitle)
      .replace("{company}", company)
      .replace("{referenceContext}", referenceContext)
      .replace("{coverLetterExcerpt}", coverLetterExcerpt);

    // Call Lovable AI
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const email = aiData.choices?.[0]?.message?.content;

    if (!email) throw new Error("Empty AI response");

    return new Response(
      JSON.stringify({ email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
