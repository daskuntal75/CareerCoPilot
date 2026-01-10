import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { sanitizeResumeForStorage, redactPII, hashString } from "../_shared/security-utils.ts";
import { createAuditLog } from "../_shared/audit-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File size limits for edge function memory constraints
const FILE_SIZE_LIMITS = {
  "application/pdf": 2 * 1024 * 1024, // 2MB for PDFs
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 1.5 * 1024 * 1024, // 1.5MB for DOCX
  "text/plain": 500 * 1024, // 500KB for TXT
};

// Simple chunking with minimal memory usage
function chunkText(text: string, maxChunkChars: number = 1500): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChunkChars, text.length);
    
    // Try to break at a sentence or paragraph
    if (end < text.length) {
      const breakPoints = ['\n\n', '\n', '. ', ', '];
      for (const bp of breakPoints) {
        const lastBreak = text.lastIndexOf(bp, end);
        if (lastBreak > start + maxChunkChars / 2) {
          end = lastBreak + bp.length;
          break;
        }
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start = end;
  }
  
  return chunks;
}

// Simple chunk type detection
function detectChunkType(content: string): string {
  const lower = content.toLowerCase();
  if (/experience|worked at|position|role|\d{4}\s*[-–]\s*(present|\d{4})/i.test(content)) return 'experience';
  if (lower.includes('education') || lower.includes('university') || lower.includes('degree')) return 'education';
  if (lower.includes('skills') || lower.includes('technologies')) return 'skills';
  return 'general';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const resumeType = formData.get("resumeType") as string || "detailed";
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileType = file.type;
    const validTypes = Object.keys(FILE_SIZE_LIMITS);
    if (!validTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxSize = FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS];
    if (file.size > maxSize) {
      const maxSizeKB = Math.round(maxSize / 1024);
      return new Response(
        JSON.stringify({ 
          error: `File too large (${Math.round(file.size / 1024)}KB). Maximum: ${maxSizeKB}KB. Please compress or use a smaller file.` 
        }),
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileName = file.name;
    let textContent = "";

    // Handle different file types - read buffer once
    const fileBuffer = await file.arrayBuffer();

    if (fileType === "text/plain") {
      textContent = new TextDecoder().decode(fileBuffer);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
      
      const zip = await JSZip.loadAsync(fileBuffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      
      if (!documentXml) {
        throw new Error("Could not find document.xml in DOCX file");
      }
      
      textContent = documentXml
        .replace(/<w:p[^>]*>/g, "\n")
        .replace(/<w:br[^>]*>/g, "\n")
        .replace(/<w:tab[^>]*>/g, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .trim();
      
      console.log("Extracted DOCX text, length:", textContent.length);
    } else if (fileType === "application/pdf") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const base64 = base64Encode(fileBuffer);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text content from this resume. Preserve structure. Return only extracted text.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${base64}` },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse PDF");
      }

      const data = await response.json();
      textContent = data.choices?.[0]?.message?.content || "";
      console.log("Extracted PDF text, length:", textContent.length);
    }

    // Store in appropriate table based on resumeType
    if (resumeType === "cover-letter-template") {
      const { error: upsertError } = await supabase
        .from("user_cover_letter_templates")
        .upsert({
          user_id: user.id,
          file_name: fileName,
          file_path: null,
          content: textContent,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) throw new Error("Failed to store cover letter template");

      return new Response(
        JSON.stringify({ fileName, content: textContent, type: "cover-letter-template" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store resume
    const { error: upsertError } = await supabase
      .from("user_resumes")
      .upsert({
        user_id: user.id,
        resume_type: resumeType,
        file_name: fileName,
        file_path: null,
        content: textContent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,resume_type" });

    if (upsertError) throw new Error("Failed to store resume");

    // Simple chunking with PII redaction for vector storage
    const chunks = chunkText(textContent);
    
    // Delete existing chunks
    await supabase
      .from("resume_chunks")
      .delete()
      .eq("user_id", user.id)
      .eq("resume_type", resumeType);

    // Insert chunks in smaller batches with PII redaction
    const batchSize = 5;
    let totalPiiRedacted = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize).map((content, idx) => {
        // PRIVACY: Redact PII before vector storage (GDPR Data Minimization)
        const { redacted, piiTypes, originalHash } = redactPII(content);
        
        if (piiTypes.length > 0) {
          totalPiiRedacted++;
          console.log(`PII redacted from chunk ${i + idx}: ${piiTypes.join(', ')}`);
        }
        
        return {
          user_id: user.id,
          application_id: null,
          resume_type: resumeType,
          chunk_index: i + idx,
          content: redacted, // Store redacted content for vector search
          chunk_type: detectChunkType(content),
          token_count: Math.ceil(redacted.split(/\s+/).length / 1.3),
          metadata: {},
          pii_redacted: piiTypes.length > 0,
          original_pii_hash: piiTypes.length > 0 ? originalHash : null,
        };
      });

      await supabase.from("resume_chunks").insert(batch);
    }

    console.log(`Stored ${chunks.length} chunks for ${resumeType}, ${totalPiiRedacted} with PII redacted`);
    
    // AUDIT: Log resume parsing action
    await createAuditLog(supabase, {
      user_id: user.id,
      action_type: 'resume_parsed',
      action_target: fileName,
      action_data: {
        resumeType,
        chunksCount: chunks.length,
        piiRedactedChunks: totalPiiRedacted,
      },
      approval_status: 'approved',
    });

    return new Response(
      JSON.stringify({
        fileName,
        content: textContent.substring(0, 500) + "...",
        resumeType,
        chunksCount: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
