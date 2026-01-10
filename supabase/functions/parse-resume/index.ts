import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Chunk text into overlapping segments
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): { content: string; index: number }[] {
  const chunks: { content: string; index: number }[] = [];
  const words = text.split(/\s+/);
  
  let index = 0;
  let startWord = 0;
  
  while (startWord < words.length) {
    // Get approximately chunkSize tokens worth of words (estimate ~1.3 words per token)
    const wordsPerChunk = Math.floor(chunkSize * 1.3);
    const endWord = Math.min(startWord + wordsPerChunk, words.length);
    
    const chunkWords = words.slice(startWord, endWord);
    const content = chunkWords.join(' ').trim();
    
    if (content.length > 50) { // Only add meaningful chunks
      chunks.push({ content, index });
      index++;
    }
    
    // Move forward with overlap
    const overlapWords = Math.floor(overlap * 1.3);
    startWord = endWord - overlapWords;
    
    // Prevent infinite loop
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

// Estimate token count (rough approximation)
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
    const applicationId = formData.get("applicationId") as string | null;
    
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
      textContent = new TextDecoder().decode(fileBuffer);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Extract text from DOCX (it's a ZIP containing XML)
      // Import JSZip for DOCX parsing
      const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
      
      try {
        const zip = await JSZip.loadAsync(fileBuffer);
        const documentXml = await zip.file("word/document.xml")?.async("string");
        
        if (!documentXml) {
          throw new Error("Invalid DOCX file - no document.xml found");
        }
        
        // Extract text from XML by removing tags and cleaning up
        textContent = documentXml
          .replace(/<w:p[^>]*>/g, '\n') // Paragraph breaks
          .replace(/<w:br[^>]*>/g, '\n') // Line breaks
          .replace(/<w:tab[^>]*>/g, '\t') // Tabs
          .replace(/<[^>]+>/g, '') // Remove all XML tags
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
          .trim();
        
        console.log("Successfully extracted text from DOCX");
      } catch (docxError) {
        console.error("DOCX parsing error:", docxError);
        throw new Error("Failed to parse DOCX file. Please try a PDF or TXT file.");
      }
    } else if (fileType === "application/pdf") {
      // Use AI to extract text from PDF (vision model can read PDFs)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      
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
        console.error("PDF parsing error:", await response.text());
        throw new Error("Failed to parse PDF. Please try a DOCX or TXT file.");
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
    }

    // Chunk the resume content (500 tokens, 100 overlap as per PRD)
    const chunks = chunkText(textContent, 500, 100);
    
    // Delete existing chunks for this user (if re-uploading)
    if (applicationId) {
      await supabase
        .from("resume_chunks")
        .delete()
        .eq("application_id", applicationId);
    }

    // Store chunks in database
    const chunksToInsert = chunks.map(chunk => ({
      user_id: user.id,
      application_id: applicationId || null,
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

    console.log(`Parsed resume into ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        fileName,
        content: textContent,
        filePath: uploadError ? null : filePath,
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
