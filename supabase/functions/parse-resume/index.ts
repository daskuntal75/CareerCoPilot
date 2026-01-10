import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File size limits in bytes
const FILE_SIZE_LIMITS = {
  "application/pdf": 3 * 1024 * 1024, // 3MB for PDFs
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 2 * 1024 * 1024, // 2MB for DOCX
  "text/plain": 1 * 1024 * 1024, // 1MB for TXT
};

// Chunk text into overlapping segments
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): { content: string; index: number }[] {
  const chunks: { content: string; index: number }[] = [];
  const words = text.split(/\s+/);
  
  let index = 0;
  let startWord = 0;
  
  while (startWord < words.length) {
    const wordsPerChunk = Math.floor(chunkSize * 1.3);
    const endWord = Math.min(startWord + wordsPerChunk, words.length);
    
    const chunkWords = words.slice(startWord, endWord);
    const content = chunkWords.join(' ').trim();
    
    if (content.length > 50) {
      chunks.push({ content, index });
      index++;
    }
    
    const overlapWords = Math.floor(overlap * 1.3);
    startWord = endWord - overlapWords;
    
    if (startWord >= endWord - 1) {
      startWord = endWord;
    }
  }
  
  return chunks;
}

// Detect chunk type based on content
function detectChunkType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('experience') || lowerContent.includes('worked at') || 
      lowerContent.includes('position') || lowerContent.includes('role') ||
      /\d{4}\s*[-–—]\s*(present|\d{4})/i.test(content)) {
    return 'experience';
  }
  
  if (lowerContent.includes('education') || lowerContent.includes('university') || 
      lowerContent.includes('degree') || lowerContent.includes('bachelor') ||
      lowerContent.includes('master') || lowerContent.includes('phd')) {
    return 'education';
  }
  
  if (lowerContent.includes('skills') || lowerContent.includes('technologies') ||
      lowerContent.includes('proficient') || lowerContent.includes('expertise')) {
    return 'skills';
  }
  
  if (lowerContent.includes('certif') || lowerContent.includes('award') ||
      lowerContent.includes('achievement')) {
    return 'achievements';
  }
  
  return 'general';
}

// Estimate token count
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length / 1.3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const resumeType = formData.get("resumeType") as string || "detailed"; // 'detailed' | 'abridged' | 'cover-letter-template'
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const fileType = file.type;
    const validTypes = Object.keys(FILE_SIZE_LIMITS);
    if (!validTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size BEFORE reading into memory
    const maxSize = FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS];
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return new Response(
        JSON.stringify({ 
          error: `File too large. Maximum size for ${fileType.split('/').pop()?.toUpperCase()} files is ${maxSizeMB}MB. Please upload a smaller file.` 
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
    let filePath: string | null = null;

    // Handle different file types
    if (fileType === "text/plain") {
      const fileBuffer = await file.arrayBuffer();
      textContent = new TextDecoder().decode(fileBuffer);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Dynamically import JSZip only for DOCX files to save memory
      const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
      
      try {
        const fileBuffer = await file.arrayBuffer();
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
        
        console.log("Successfully extracted text from DOCX using JSZip");
      } catch (zipError) {
        console.error("JSZip extraction error:", zipError);
        throw new Error("Failed to parse DOCX file. Please ensure it's a valid Word document.");
      }
    } else if (fileType === "application/pdf") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      // Read file and encode to base64
      const fileBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      const base64 = base64Encode(bytes.buffer);
      
      // Clear bytes reference to free memory
      // @ts-ignore - allowing null assignment for memory optimization
      const clearedBytes = null;
      
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
                  text: "Extract ALL text content from this resume document. Preserve the structure and formatting as much as possible. Include all sections like Experience, Education, Skills, etc. Return only the extracted text, no commentary.",
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
        const errorText = await response.text();
        console.error("PDF parsing error:", errorText);
        throw new Error("Failed to parse PDF. Please try a different file or a smaller PDF.");
      }

      const data = await response.json();
      textContent = data.choices?.[0]?.message?.content || "";
      console.log("Successfully extracted text from PDF using AI");
    }

    // Skip storage upload for memory optimization - store content directly in DB
    // Optional: Upload file for smaller files only
    if (file.size < 1 * 1024 * 1024) { // Only upload files under 1MB
      try {
        const fileBuffer = await file.arrayBuffer();
        filePath = `${user.id}/${resumeType}/${Date.now()}_${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, fileBuffer, {
            contentType: fileType,
            upsert: true,
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          filePath = null;
        }
      } catch (uploadErr) {
        console.error("File upload skipped due to memory constraints");
        filePath = null;
      }
    }

    // Store in appropriate table based on resumeType
    if (resumeType === "cover-letter-template") {
      // Store in user_cover_letter_templates
      const { error: upsertError } = await supabase
        .from("user_cover_letter_templates")
        .upsert({
          user_id: user.id,
          file_name: fileName,
          file_path: filePath,
          content: textContent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (upsertError) {
        console.error("Error storing cover letter template:", upsertError);
        throw new Error("Failed to store cover letter template");
      }

      return new Response(
        JSON.stringify({
          fileName,
          content: textContent,
          filePath,
          type: "cover-letter-template",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store resume in user_resumes table (detailed or abridged)
    const { error: upsertError } = await supabase
      .from("user_resumes")
      .upsert({
        user_id: user.id,
        resume_type: resumeType,
        file_name: fileName,
        file_path: filePath,
        content: textContent,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,resume_type",
      });

    if (upsertError) {
      console.error("Error storing resume:", upsertError);
      throw new Error("Failed to store resume");
    }

    // Chunk the resume content
    const chunks = chunkText(textContent, 500, 100);
    
    // Delete existing chunks for this user and resume type
    await supabase
      .from("resume_chunks")
      .delete()
      .eq("user_id", user.id)
      .eq("resume_type", resumeType);

    // Store chunks in database
    const chunksToInsert = chunks.map(chunk => ({
      user_id: user.id,
      application_id: null,
      resume_type: resumeType,
      chunk_index: chunk.index,
      content: chunk.content,
      chunk_type: detectChunkType(chunk.content),
      token_count: estimateTokens(chunk.content),
      metadata: {},
    }));

    if (chunksToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("resume_chunks")
        .insert(chunksToInsert);

      if (insertError) {
        console.error("Error inserting chunks:", insertError);
      }
    }

    console.log(`Parsed ${resumeType} resume into ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        fileName,
        content: textContent,
        filePath,
        resumeType,
        chunksCount: chunks.length,
        chunks: chunks.map(c => ({
          index: c.index,
          type: detectChunkType(c.content),
          preview: c.content.substring(0, 100) + "...",
        })),
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