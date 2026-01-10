import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multi-page PDF generation
function generatePDF(pages: { title: string; content: string }[], mainTitle: string): Uint8Array {
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];
  const pageRefs: number[] = [];
  
  const addObject = (content: string): number => {
    objectCount++;
    offsets[objectCount] = objects.join("").length;
    objects.push(`${objectCount} 0 obj\n${content}\nendobj\n`);
    return objectCount;
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, ""); // Remove non-printable chars
  };

  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Header
  objects.push("%PDF-1.4\n");

  // Catalog (will reference Pages object)
  const catalogRef = addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
  
  // Generate content for each page
  const pageContents: number[] = [];
  
  for (const page of pages) {
    let streamContent = "BT\n/F1 11 Tf\n";
    let y = 750;
    const lineHeight = 14;
    const leftMargin = 72;
    const maxChars = 80;
    
    // Page title
    streamContent += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
    streamContent += `/F1 14 Tf\n`;
    streamContent += `(${escapeText(page.title)}) Tj\n`;
    y -= 25;
    streamContent += `/F1 11 Tf\n`;
    
    // Content
    const lines = page.content.split("\n");
    
    for (const line of lines) {
      if (y < 72) break;
      
      // Handle section headers (lines starting with ##)
      if (line.startsWith("## ")) {
        y -= 10; // Extra spacing before header
        streamContent += `/F1 12 Tf\n`;
        streamContent += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        streamContent += `(${escapeText(line.replace("## ", ""))}) Tj\n`;
        streamContent += `/F1 11 Tf\n`;
        y -= lineHeight + 5;
        continue;
      }
      
      // Handle bullet points
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
      const indent = isBullet ? 20 : 0;
      
      // Wrap long lines
      const wrappedLines = wrapText(line.trim(), maxChars - (indent / 6));
      
      for (const wrappedLine of wrappedLines) {
        if (y < 72) break;
        streamContent += `1 0 0 1 ${leftMargin + indent} ${y} Tm\n`;
        streamContent += `(${escapeText(wrappedLine)}) Tj\n`;
        y -= lineHeight;
      }
    }
    
    streamContent += "ET";
    const contentRef = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
    pageContents.push(contentRef);
  }
  
  // Font
  const fontRef = addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  
  // Create page objects
  for (let i = 0; i < pages.length; i++) {
    const pageRef = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pageContents[i]} 0 R /Resources << /Font << /F1 ${fontRef} 0 R >> >> >>`);
    pageRefs.push(pageRef);
  }
  
  // Update Pages object (object 2) with page refs
  const pagesContent = `<< /Type /Pages /Kids [${pageRefs.map(r => `${r} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  // We need to insert this as object 2
  const pagesInsert = `2 0 obj\n${pagesContent}\nendobj\n`;
  
  // Rebuild with pages object in correct position
  const header = "%PDF-1.4\n";
  const catalogObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const pagesObj = pagesInsert;
  
  let allContent = header + catalogObj + pagesObj;
  
  // Re-add remaining objects with adjusted numbering
  for (let i = 3; i <= objectCount; i++) {
    const obj = objects.find(o => o.startsWith(`${i} 0 obj`));
    if (obj) allContent += obj;
  }
  
  // Cross-reference table
  const xrefOffset = allContent.length;
  let xref = `xref\n0 ${objectCount + 1}\n`;
  xref += "0000000000 65535 f \n";
  
  let offset = header.length;
  const objOrder = [catalogObj, pagesObj];
  for (let i = 3; i <= objectCount; i++) {
    const obj = objects.find(o => o.startsWith(`${i} 0 obj`));
    if (obj) objOrder.push(obj);
  }
  
  for (const obj of objOrder) {
    xref += offset.toString().padStart(10, "0") + " 00000 n \n";
    offset += obj.length;
  }
  
  // Trailer
  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  
  return new TextEncoder().encode(allContent + xref + trailer);
}

// Format interview prep data into pages
function formatInterviewPrepPages(data: any, jobTitle: string, company: string): { title: string; content: string }[] {
  const pages: { title: string; content: string }[] = [];
  
  // Page 1: Overview & Strategy
  let page1 = "";
  if (data.applicationContext) {
    page1 += `## Application Context\n${data.applicationContext}\n\n`;
  }
  if (data.uniqueValueProposition) {
    page1 += `## Your Unique Value Proposition\n${data.uniqueValueProposition}\n\n`;
  }
  if (data.whyThisCompany) {
    page1 += `## Why This Company\n${data.whyThisCompany}\n\n`;
  }
  if (data.keyStrengths && data.keyStrengths.length > 0) {
    page1 += `## Key Strengths to Highlight\n`;
    data.keyStrengths.forEach((s: string) => { page1 += `• ${s}\n`; });
    page1 += "\n";
  }
  if (data.potentialConcerns && data.potentialConcerns.length > 0) {
    page1 += `## Concerns to Address\n`;
    data.potentialConcerns.forEach((c: string) => { page1 += `• ${c}\n`; });
  }
  pages.push({ title: `Interview Prep: ${jobTitle} at ${company}`, content: page1 });
  
  // Page 2: Company Intelligence
  if (data.companyIntelligence || data.strategicAnalysis) {
    let page2 = "";
    if (data.companyIntelligence) {
      const ci = data.companyIntelligence;
      if (ci.visionMission) page2 += `## Vision & Mission\n${ci.visionMission}\n\n`;
      if (ci.industryMarket) page2 += `## Industry & Market\n${ci.industryMarket}\n\n`;
      if (ci.productsServices) page2 += `## Products & Services\n${ci.productsServices}\n\n`;
    }
    if (data.strategicAnalysis) {
      const sa = data.strategicAnalysis;
      page2 += `## SWOT Analysis\n\n`;
      if (sa.strengths) {
        page2 += `Strengths:\n`;
        sa.strengths.forEach((s: string) => { page2 += `• ${s}\n`; });
        page2 += "\n";
      }
      if (sa.weaknesses) {
        page2 += `Weaknesses:\n`;
        sa.weaknesses.forEach((w: string) => { page2 += `• ${w}\n`; });
        page2 += "\n";
      }
      if (sa.opportunities) {
        page2 += `Opportunities:\n`;
        sa.opportunities.forEach((o: string) => { page2 += `• ${o}\n`; });
        page2 += "\n";
      }
      if (sa.threats) {
        page2 += `Threats:\n`;
        sa.threats.forEach((t: string) => { page2 += `• ${t}\n`; });
      }
    }
    pages.push({ title: "Company Research", content: page2 });
  }
  
  // Pages for questions (2-3 questions per page)
  if (data.questions && data.questions.length > 0) {
    const questionsPerPage = 2;
    for (let i = 0; i < data.questions.length; i += questionsPerPage) {
      let pageContent = "";
      const pageQuestions = data.questions.slice(i, i + questionsPerPage);
      
      pageQuestions.forEach((q: any, idx: number) => {
        pageContent += `## Q${i + idx + 1}: ${q.question}\n\n`;
        pageContent += `Category: ${q.category} | Difficulty: ${q.difficulty}\n\n`;
        if (q.starAnswer) {
          pageContent += `SITUATION: ${q.starAnswer.situation}\n\n`;
          pageContent += `TASK: ${q.starAnswer.task}\n\n`;
          pageContent += `ACTION: ${q.starAnswer.action}\n\n`;
          pageContent += `RESULT: ${q.starAnswer.result}\n\n`;
        }
        if (q.tips && q.tips.length > 0) {
          pageContent += `Tips:\n`;
          q.tips.forEach((t: string) => { pageContent += `• ${t}\n`; });
        }
        pageContent += "\n---\n\n";
      });
      
      pages.push({ 
        title: `Interview Questions (${i + 1}-${Math.min(i + questionsPerPage, data.questions.length)})`, 
        content: pageContent 
      });
    }
  }
  
  // Questions to ask page
  if (data.questionsToAsk) {
    let qtaContent = "";
    const qta = data.questionsToAsk;
    
    if (Array.isArray(qta)) {
      qta.forEach((q: string) => { qtaContent += `• ${q}\n`; });
    } else {
      if (qta.forRecruiter) {
        qtaContent += `## For Recruiter\n`;
        qta.forRecruiter.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forHiringManager) {
        qtaContent += `## For Hiring Manager\n`;
        qta.forHiringManager.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forPeer) {
        qtaContent += `## For Peer/Director\n`;
        qta.forPeer.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forTechnicalLead) {
        qtaContent += `## For Technical Lead\n`;
        qta.forTechnicalLead.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forVP) {
        qtaContent += `## For VP/Executive\n`;
        qta.forVP.forEach((q: string) => { qtaContent += `• ${q}\n`; });
      }
    }
    
    pages.push({ title: "Questions to Ask Them", content: qtaContent });
  }
  
  return pages;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, company, jobTitle, interviewPrepData, type } = await req.json();
    
    let pdfBytes: Uint8Array;
    let filename: string;
    
    if (type === "interview-prep" && interviewPrepData) {
      // Generate multi-page interview prep PDF
      const pages = formatInterviewPrepPages(interviewPrepData, jobTitle, company);
      pdfBytes = generatePDF(pages, `Interview Prep - ${jobTitle} at ${company}`);
      filename = `InterviewPrep_${company.replace(/\s+/g, "_")}_${jobTitle.replace(/\s+/g, "_")}.pdf`;
    } else if (content) {
      // Single page cover letter PDF
      const pages = [{ title: `Cover Letter - ${jobTitle} at ${company}`, content }];
      pdfBytes = generatePDF(pages, `Cover Letter - ${jobTitle} at ${company}`);
      filename = `CoverLetter_${company.replace(/\s+/g, "_")}_${jobTitle.replace(/\s+/g, "_")}.pdf`;
    } else {
      return new Response(
        JSON.stringify({ error: "Content or interview prep data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ pdf: base64, filename }),
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
