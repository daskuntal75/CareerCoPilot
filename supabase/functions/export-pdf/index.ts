import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PDF Generation with proper formatting
function generatePDF(pages: { title: string; content: string }[], mainTitle: string): Uint8Array {
  // Build PDF structure
  let pdf = "%PDF-1.4\n";
  let objects: string[] = [];
  let objectOffsets: number[] = [];
  
  const addObject = (content: string): number => {
    const objNum = objects.length + 1;
    objectOffsets.push(pdf.length + objects.join("").length);
    objects.push(`${objNum} 0 obj\n${content}\nendobj\n`);
    return objNum;
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E\n]/g, ""); // Keep printable ASCII and newlines
  };

  const wrapText = (text: string, maxChars: number): string[] => {
    if (!text) return [];
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

  // Content streams for each page
  const pageContentRefs: number[] = [];
  const pageRefs: number[] = [];
  
  // Generate content stream for each page
  for (const page of pages) {
    let stream = "BT\n";
    let y = 750;
    const lineHeight = 14;
    const headerHeight = 20;
    const leftMargin = 72;
    const maxChars = 85;
    
    // Page title - bold and larger
    stream += `/F2 16 Tf\n`;
    stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
    stream += `(${escapeText(page.title)}) Tj\n`;
    y -= 30;
    
    // Underline for title
    stream += `ET\n`;
    stream += `q\n0.8 0.8 0.8 RG\n1 w\n${leftMargin} ${y + 5} m ${540} ${y + 5} l S\nQ\n`;
    stream += `BT\n`;
    y -= 20;
    
    // Switch to regular font
    stream += `/F1 11 Tf\n`;
    
    // Process content lines
    const lines = page.content.split("\n");
    
    for (const line of lines) {
      if (y < 60) {
        // Would need a new page - for now just stop
        break;
      }
      
      if (line.trim() === '') {
        y -= 8;
        continue;
      }
      
      // Section headers (##)
      if (line.startsWith("## ")) {
        y -= 10; // Extra space before header
        stream += `/F2 13 Tf\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(line.replace("## ", ""))}) Tj\n`;
        stream += `/F1 11 Tf\n`;
        y -= headerHeight;
        continue;
      }
      
      // Main headers (#)
      if (line.startsWith("# ")) {
        y -= 12;
        stream += `/F2 14 Tf\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(line.replace("# ", ""))}) Tj\n`;
        stream += `/F1 11 Tf\n`;
        y -= headerHeight + 4;
        continue;
      }
      
      // Sub-headers (###)
      if (line.startsWith("### ")) {
        y -= 6;
        stream += `/F2 12 Tf\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(line.replace("### ", ""))}) Tj\n`;
        stream += `/F1 11 Tf\n`;
        y -= lineHeight + 4;
        continue;
      }
      
      // STAR labels (SITUATION:, TASK:, etc.)
      if (/^(SITUATION|TASK|ACTION|RESULT):/.test(line)) {
        y -= 4;
        const [label, ...rest] = line.split(": ");
        stream += `/F2 11 Tf\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(label + ":")}) Tj\n`;
        stream += `/F1 11 Tf\n`;
        
        // Wrap the rest of the content
        const restText = rest.join(": ");
        const wrappedLines = wrapText(restText, maxChars - 12);
        y -= lineHeight;
        for (const wrappedLine of wrappedLines) {
          if (y < 60) break;
          stream += `1 0 0 1 ${leftMargin + 80} ${y} Tm\n`;
          stream += `(${escapeText(wrappedLine)}) Tj\n`;
          y -= lineHeight;
        }
        continue;
      }
      
      // Bullet points
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
      const bulletText = isBullet ? line.trim().replace(/^[•\-\*]\s*/, "") : null;
      
      if (bulletText) {
        const wrappedLines = wrapText(bulletText, maxChars - 4);
        for (let i = 0; i < wrappedLines.length; i++) {
          if (y < 60) break;
          if (i === 0) {
            stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
            stream += `(\\267 ${escapeText(wrappedLines[i])}) Tj\n`; // \\267 is bullet character
          } else {
            stream += `1 0 0 1 ${leftMargin + 12} ${y} Tm\n`;
            stream += `(${escapeText(wrappedLines[i])}) Tj\n`;
          }
          y -= lineHeight;
        }
        continue;
      }
      
      // Category/Difficulty line
      if (line.includes("Category:") && line.includes("Difficulty:")) {
        stream += `/F1 10 Tf\n0.4 0.4 0.4 rg\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(line)}) Tj\n`;
        stream += `0 0 0 rg\n/F1 11 Tf\n`;
        y -= lineHeight;
        continue;
      }
      
      // Separator line
      if (line.trim() === "---") {
        stream += `ET\n`;
        stream += `q\n0.85 0.85 0.85 RG\n0.5 w\n${leftMargin} ${y} m ${540} ${y} l S\nQ\n`;
        stream += `BT\n/F1 11 Tf\n`;
        y -= 15;
        continue;
      }
      
      // Bold text (**text**)
      if (line.startsWith("**") && line.endsWith("**")) {
        stream += `/F2 11 Tf\n`;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(line.replace(/\*\*/g, ""))}) Tj\n`;
        stream += `/F1 11 Tf\n`;
        y -= lineHeight;
        continue;
      }
      
      // Regular paragraph - wrap text
      const wrappedLines = wrapText(line.trim(), maxChars);
      for (const wrappedLine of wrappedLines) {
        if (y < 60) break;
        stream += `1 0 0 1 ${leftMargin} ${y} Tm\n`;
        stream += `(${escapeText(wrappedLine)}) Tj\n`;
        y -= lineHeight;
      }
    }
    
    stream += "ET";
    
    const contentRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageContentRefs.push(contentRef);
  }
  
  // Font objects - Helvetica (regular) and Helvetica-Bold
  const font1Ref = addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  const font2Ref = addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  
  // Create page objects
  const pagesRef = objects.length + pages.length + 2; // Reserve for pages object
  for (let i = 0; i < pages.length; i++) {
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 612 792] ` +
      `/Contents ${pageContentRefs[i]} 0 R ` +
      `/Resources << /Font << /F1 ${font1Ref} 0 R /F2 ${font2Ref} 0 R >> >> >>`
    );
    pageRefs.push(pageRef);
  }
  
  // Pages object
  const pagesObjRef = addObject(
    `<< /Type /Pages /Kids [${pageRefs.map(r => `${r} 0 R`).join(" ")}] /Count ${pages.length} >>`
  );
  
  // Catalog
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesObjRef} 0 R >>`);
  
  // Build final PDF
  pdf += objects.join("");
  
  // Cross-reference table
  const xrefOffset = pdf.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  
  let offset = 9; // After %PDF-1.4\n
  for (const obj of objects) {
    xref += offset.toString().padStart(10, "0") + " 00000 n \n";
    offset += obj.length;
  }
  
  // Trailer
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  
  return new TextEncoder().encode(pdf + xref + trailer);
}

// Format cover letter content into pages
function formatCoverLetterPages(content: string, jobTitle: string, company: string): { title: string; content: string }[] {
  return [{
    title: `Cover Letter: ${jobTitle} at ${company}`,
    content: content
  }];
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
  if (page1) {
    pages.push({ title: `Interview Prep: ${jobTitle} at ${company}`, content: page1 });
  }
  
  // Page 2: Company Intelligence
  if (data.companyIntelligence || data.strategicAnalysis) {
    let page2 = "";
    if (data.companyIntelligence) {
      const ci = data.companyIntelligence;
      if (ci.visionMission) page2 += `## Vision & Mission\n${ci.visionMission}\n\n`;
      if (ci.industryMarket) page2 += `## Industry & Market\n${ci.industryMarket}\n\n`;
      if (ci.financialPerformance) page2 += `## Financial Performance\n${ci.financialPerformance}\n\n`;
      if (ci.productsServices) page2 += `## Products & Services\n${ci.productsServices}\n\n`;
    }
    if (data.strategicAnalysis) {
      const sa = data.strategicAnalysis;
      page2 += `## SWOT Analysis\n\n`;
      if (sa.strengths && sa.strengths.length > 0) {
        page2 += `### Strengths\n`;
        sa.strengths.forEach((s: string) => { page2 += `• ${s}\n`; });
        if (sa.criticalStrength) page2 += `Key: ${sa.criticalStrength}\n`;
        page2 += "\n";
      }
      if (sa.weaknesses && sa.weaknesses.length > 0) {
        page2 += `### Weaknesses\n`;
        sa.weaknesses.forEach((w: string) => { page2 += `• ${w}\n`; });
        if (sa.criticalWeakness) page2 += `Key: ${sa.criticalWeakness}\n`;
        page2 += "\n";
      }
      if (sa.opportunities && sa.opportunities.length > 0) {
        page2 += `### Opportunities\n`;
        sa.opportunities.forEach((o: string) => { page2 += `• ${o}\n`; });
        if (sa.criticalOpportunity) page2 += `Key: ${sa.criticalOpportunity}\n`;
        page2 += "\n";
      }
      if (sa.threats && sa.threats.length > 0) {
        page2 += `### Threats\n`;
        sa.threats.forEach((t: string) => { page2 += `• ${t}\n`; });
        if (sa.criticalThreat) page2 += `Key: ${sa.criticalThreat}\n`;
      }
    }
    if (page2) {
      pages.push({ title: "Company Research & Analysis", content: page2 });
    }
  }
  
  // Pages for questions (2-3 questions per page)
  if (data.questions && data.questions.length > 0) {
    const questionsPerPage = 2;
    for (let i = 0; i < data.questions.length; i += questionsPerPage) {
      let pageContent = "";
      const pageQuestions = data.questions.slice(i, i + questionsPerPage);
      
      pageQuestions.forEach((q: any, idx: number) => {
        pageContent += `## Q${i + idx + 1}: ${q.question}\n\n`;
        pageContent += `Category: ${q.category || 'General'} | Difficulty: ${q.difficulty || 'Medium'}\n\n`;
        
        if (q.whyAsked) {
          pageContent += `### Why This Question\n${q.whyAsked}\n\n`;
        }
        
        if (q.starAnswer) {
          pageContent += `### STAR Answer\n`;
          pageContent += `SITUATION: ${q.starAnswer.situation || ''}\n\n`;
          pageContent += `TASK: ${q.starAnswer.task || ''}\n\n`;
          pageContent += `ACTION: ${q.starAnswer.action || ''}\n\n`;
          pageContent += `RESULT: ${q.starAnswer.result || ''}\n\n`;
        }
        
        if (q.tips && q.tips.length > 0) {
          pageContent += `### Tips\n`;
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
      if (qta.forRecruiter && qta.forRecruiter.length > 0) {
        qtaContent += `## For Recruiter\n`;
        qta.forRecruiter.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forHiringManager && qta.forHiringManager.length > 0) {
        qtaContent += `## For Hiring Manager\n`;
        qta.forHiringManager.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forPeer && qta.forPeer.length > 0) {
        qtaContent += `## For Peer/Director\n`;
        qta.forPeer.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forTechnicalLead && qta.forTechnicalLead.length > 0) {
        qtaContent += `## For Technical Lead\n`;
        qta.forTechnicalLead.forEach((q: string) => { qtaContent += `• ${q}\n`; });
        qtaContent += "\n";
      }
      if (qta.forVP && qta.forVP.length > 0) {
        qtaContent += `## For VP/Executive\n`;
        qta.forVP.forEach((q: string) => { qtaContent += `• ${q}\n`; });
      }
    }
    
    if (qtaContent) {
      pages.push({ title: "Questions to Ask Interviewers", content: qtaContent });
    }
  }
  
  // Culture & interview structure page
  if (data.cultureAndBenefits || data.interviewStructure) {
    let page = "";
    
    if (data.interviewStructure) {
      const is = data.interviewStructure;
      if (is.predictedFormat) {
        page += `## Predicted Interview Format\n${is.predictedFormat}\n\n`;
      }
      if (is.coreRequirements && is.coreRequirements.length > 0) {
        page += `## Core Requirements\n`;
        is.coreRequirements.forEach((r: string) => { page += `• ${r}\n`; });
        page += "\n";
      }
      if (is.keyCompetencies && is.keyCompetencies.length > 0) {
        page += `## Key Competencies\n`;
        is.keyCompetencies.forEach((c: string) => { page += `• ${c}\n`; });
        page += "\n";
      }
    }
    
    if (data.cultureAndBenefits) {
      const cb = data.cultureAndBenefits;
      if (cb.cultureInsights && cb.cultureInsights.length > 0) {
        page += `## Culture Insights\n`;
        cb.cultureInsights.forEach((i: string) => { page += `• ${i}\n`; });
        page += "\n";
      }
      if (cb.standoutBenefits && cb.standoutBenefits.length > 0) {
        page += `## Standout Benefits\n`;
        cb.standoutBenefits.forEach((b: string) => { page += `• ${b}\n`; });
      }
    }
    
    if (page) {
      pages.push({ title: "Interview Structure & Culture", content: page });
    }
  }
  
  return pages;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, company, jobTitle, interviewPrepData, type } = await req.json();
    
    console.log("Export PDF request:", { type, hasContent: !!content, hasInterviewPrepData: !!interviewPrepData });
    
    let pdfBytes: Uint8Array;
    let filename: string;
    
    if (type === "interview-prep" && interviewPrepData) {
      // Generate multi-page interview prep PDF
      const pages = formatInterviewPrepPages(interviewPrepData, jobTitle || "Position", company || "Company");
      console.log("Generated interview prep pages:", pages.length);
      pdfBytes = generatePDF(pages, `Interview Prep - ${jobTitle} at ${company}`);
      filename = `InterviewPrep_${(company || "Company").replace(/\s+/g, "_")}_${(jobTitle || "Position").replace(/\s+/g, "_")}.pdf`;
    } else if (type === "cover-letter" && content) {
      // Cover letter PDF
      const pages = formatCoverLetterPages(content, jobTitle || "Position", company || "Company");
      console.log("Generated cover letter pages:", pages.length, "Content length:", content.length);
      pdfBytes = generatePDF(pages, `Cover Letter - ${jobTitle} at ${company}`);
      filename = `CoverLetter_${(company || "Company").replace(/\s+/g, "_")}_${(jobTitle || "Position").replace(/\s+/g, "_")}.pdf`;
    } else if (content) {
      // Generic content PDF (fallback)
      const pages = [{ title: title || "Document", content }];
      pdfBytes = generatePDF(pages, title || "Document");
      filename = `Document_${(company || "Export").replace(/\s+/g, "_")}.pdf`;
    } else {
      console.error("No content or interview prep data provided");
      return new Response(
        JSON.stringify({ error: "Content or interview prep data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("PDF generated, bytes:", pdfBytes.length);
    
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
