import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a professional career coach helping craft polite follow-up emails for job applications.
Your emails should be:
- Professional and respectful
- Show continued interest without being pushy
- Provide a reason for reaching out
- Offer value or updates when possible
- Concise and to the point`;

const USER_PROMPT_TEMPLATE = `Generate a professional follow-up email for a job application.

JOB DETAILS:
- Position: {jobTitle}
- Company: {company}

FOLLOW-UP CONTEXT:
{followUpContext}

COVER LETTER CONTEXT (use this to understand the candidate's background):
{coverLetterExcerpt}

REQUIREMENTS:
1. Start with a polite greeting
2. Reference the original application
3. Express continued interest in the position
4. If provided, mention any updates or new qualifications
5. Ask about the timeline or next steps
6. Professional closing

OUTPUT FORMAT:
Subject: [Email subject line]

[Email body]

Keep the email brief and professional (120-180 words).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      jobTitle, 
      company, 
      coverLetterContent, 
      recipientName,
      applicationDate,
      additionalContext,
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

    if (userId) {
      await supabase.from("usage_logs").insert({
        user_id: userId,
        action: "generate_follow_up_email",
        metadata: { applicationId, company, jobTitle },
      });
    }

    let followUpContext = "";
    if (recipientName || applicationDate || additionalContext) {
      followUpContext = "FOLLOW-UP DETAILS:";
      if (recipientName) followUpContext += `\n- Recipient: ${recipientName}`;
      if (applicationDate) followUpContext += `\n- Applied: ${applicationDate}`;
      if (additionalContext) followUpContext += `\n- Updates: ${additionalContext}`;
    }

    const coverLetterExcerpt = coverLetterContent.slice(0, 1500);

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{jobTitle}", jobTitle)
      .replace("{company}", company)
      .replace("{followUpContext}", followUpContext)
      .replace("{coverLetterExcerpt}", coverLetterExcerpt);

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
