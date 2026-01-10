import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileBuffer = await file.arrayBuffer();
    let textContent = "";

    // Handle different file types
    if (fileType === "text/plain") {
      // Plain text - decode directly
      textContent = new TextDecoder().decode(fileBuffer);
    } else if (fileType === "application/pdf") {
      // For PDF, use the Lovable AI to extract text
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Convert to base64 for API
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text content from this resume PDF. Preserve the structure and formatting as much as possible. Return only the extracted text, no commentary.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("PDF parsing error:", await response.text());
        throw new Error("Failed to parse PDF");
      }

      const data = await response.json();
      textContent = data.choices?.[0]?.message?.content || "";
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // For DOCX, use the Lovable AI to extract text
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Convert to base64 for API
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text content from this resume document. Preserve the structure and formatting as much as possible. Return only the extracted text, no commentary.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("DOCX parsing error:", await response.text());
        throw new Error("Failed to parse DOCX");
      }

      const data = await response.json();
      textContent = data.choices?.[0]?.message?.content || "";
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload original file to storage
    const filePath = `${user.id}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, fileBuffer, {
        contentType: fileType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue anyway - the parsed content is more important
    }

    return new Response(
      JSON.stringify({
        fileName,
        content: textContent,
        filePath: uploadError ? null : filePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
