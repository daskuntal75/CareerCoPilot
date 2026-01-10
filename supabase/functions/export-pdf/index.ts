import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple PDF generation for cover letters
function generatePDF(content: string, title: string): Uint8Array {
  // PDF structure
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];
  
  // Helper to add object
  const addObject = (content: string): number => {
    objectCount++;
    offsets[objectCount] = objects.join("").length;
    objects.push(`${objectCount} 0 obj\n${content}\nendobj\n`);
    return objectCount;
  };

  // Clean and prepare text
  const lines = content.split("\n");
  const escapedLines = lines.map(line => 
    line.replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
  );

  // Header
  objects.push("%PDF-1.4\n");

  // Catalog
  const catalogRef = addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
  
  // Pages
  addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  
  // Page
  addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`);
  
  // Content stream
  let streamContent = "BT\n/F1 11 Tf\n";
  let y = 750; // Start near top
  const lineHeight = 14;
  const leftMargin = 72; // 1 inch margin
  const maxWidth = 468; // Page width minus margins
  
  // Add title
  streamContent += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
  streamContent += `/F1 14 Tf\n`;
  streamContent += `(${title}) Tj\n`;
  y -= 30;
  streamContent += `/F1 11 Tf\n`;
  
  // Add content lines
  for (const line of escapedLines) {
    if (y < 72) break; // Stop if we reach bottom margin
    
    streamContent += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
    
    // Wrap long lines
    const words = line.split(" ");
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Rough character width estimate
      if (testLine.length * 6 > maxWidth) {
        if (currentLine) {
          streamContent += `(${currentLine}) Tj\n`;
          y -= lineHeight;
          if (y < 72) break;
          streamContent += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine && y >= 72) {
      streamContent += `(${currentLine}) Tj\n`;
      y -= lineHeight;
    }
    
    if (y < 72) break;
  }
  
  streamContent += "ET";
  
  addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
  
  // Font
  addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  
  // Cross-reference table
  const xrefOffset = objects.join("").length;
  let xref = `xref\n0 ${objectCount + 1}\n`;
  xref += "0000000000 65535 f \n";
  
  let offset = objects[0].length;
  for (let i = 1; i <= objectCount; i++) {
    xref += offset.toString().padStart(10, "0") + " 00000 n \n";
    offset += objects[i].length;
  }
  
  // Trailer
  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  
  const pdfContent = objects.join("") + xref + trailer;
  return new TextEncoder().encode(pdfContent);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, company, jobTitle } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfTitle = `Cover Letter - ${jobTitle} at ${company}`;
    const pdfBytes = generatePDF(content, pdfTitle);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ 
        pdf: base64,
        filename: `CoverLetter_${company.replace(/\s+/g, "_")}_${jobTitle.replace(/\s+/g, "_")}.pdf`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in export-pdf:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
