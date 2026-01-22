/**
 * Lazy-loaded DOCX Export Utility
 *
 * This module dynamically imports the docx library (~400KB) only when
 * the user actually requests a DOCX export, reducing initial bundle size.
 */

export interface DocxExportOptions {
  content: string;
  title?: string;
  company?: string;
  type: 'cover-letter' | 'interview-prep';
}

/**
 * Export content to DOCX format
 * Dynamically imports the docx library to reduce bundle size
 */
export async function exportToDocx(options: DocxExportOptions): Promise<Blob> {
  // Dynamic import of heavy docx library (~400KB)
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  const { content, title = '', company = '', type } = options;
  const lines = content.split('\n');
  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  // Add title based on document type
  const docTitle = type === 'cover-letter'
    ? `Cover Letter - ${title} at ${company}`
    : `Interview Preparation - ${title} at ${company}`;

  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: docTitle,
        bold: true,
        size: 32
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // Process content lines
  for (const line of lines) {
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    } else if (line.startsWith('### ')) {
      // H3 header
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.replace('### ', ''),
            bold: true,
            size: 26
          })
        ],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 250, after: 120 },
      }));
    } else if (line.startsWith('## ')) {
      // H2 header
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.replace('## ', ''),
            bold: true,
            size: 28
          })
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      }));
    } else if (line.startsWith('# ')) {
      // H1 header
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.replace('# ', ''),
            bold: true,
            size: 32
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }));
    } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^[•\-\*]\s*/, ''), size: 24 })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
    } else if (line.match(/^\*\*.*\*\*$/)) {
      // Bold text line
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true, size: 24 })],
        spacing: { after: 120 },
      }));
    } else {
      // Regular paragraph - handle inline bold and italic
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      const runs: InstanceType<typeof TextRun>[] = [];

      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({ text: part.replace(/\*\*/g, ''), bold: true, size: 24 }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
          runs.push(new TextRun({ text: part.replace(/\*/g, ''), italics: true, size: 24 }));
        } else if (part) {
          runs.push(new TextRun({ text: part, size: 24 }));
        }
      }

      paragraphs.push(new Paragraph({
        children: runs,
        spacing: { after: 120 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch in twips
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: paragraphs,
    }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate filename for DOCX export
 */
export function generateDocxFilename(company: string, type: 'cover-letter' | 'interview-prep'): string {
  const sanitizedCompany = company.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const prefix = type === 'cover-letter' ? 'CoverLetter' : 'InterviewPrep';
  return `${prefix}_${sanitizedCompany}.docx`;
}

/**
 * Download content as DOCX file
 */
export async function downloadAsDocx(options: DocxExportOptions): Promise<void> {
  const blob = await exportToDocx(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateDocxFilename(options.company || 'Document', options.type);
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Interview Prep Export (Structured Data)
// ============================================================================

export interface InterviewPrepExportOptions {
  jobData: { title: string; company: string };
  data: {
    applicationContext?: string;
    uniqueValueProposition?: string;
    keyStrengths?: string[];
    questions?: Array<{
      question: string;
      category: string;
      difficulty: string;
      starAnswer?: {
        situation: string;
        task: string;
        action: string;
        result: string;
      };
    }>;
  };
}

/**
 * Export interview prep data to DOCX
 * Dynamically imports docx library
 */
export async function exportInterviewPrepToDocx(options: InterviewPrepExportOptions): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  const { jobData, data } = options;
  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  // Title
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `Interview Prep: ${jobData.title} at ${jobData.company}`, bold: true, size: 36 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // Overview section
  if (data.applicationContext) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: "Application Context", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: data.applicationContext, size: 24 })],
      spacing: { after: 200 },
    }));
  }

  if (data.uniqueValueProposition) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: "Your Unique Value Proposition", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: data.uniqueValueProposition, size: 24 })],
      spacing: { after: 200 },
    }));
  }

  // Key Strengths
  if (data.keyStrengths && data.keyStrengths.length > 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: "Key Strengths to Highlight", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    }));
    data.keyStrengths.forEach(s => {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: s, size: 24 })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
    });
  }

  // Interview Questions
  if (data.questions && data.questions.length > 0) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: "Interview Questions", bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));

    data.questions.forEach((q, i) => {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Q${i + 1}: ${q.question}`, bold: true, size: 26 })],
        spacing: { before: 250, after: 100 },
      }));

      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Category: ${q.category} | Difficulty: ${q.difficulty}`, italics: true, size: 22 })],
        spacing: { after: 100 },
      }));

      if (q.starAnswer) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "SITUATION: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.situation, size: 24 })],
          spacing: { after: 100 },
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "TASK: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.task, size: 24 })],
          spacing: { after: 100 },
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "ACTION: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.action, size: 24 })],
          spacing: { after: 100 },
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "RESULT: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.result, size: 24 })],
          spacing: { after: 150 },
        }));
      }
    });
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: paragraphs,
    }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Download interview prep as DOCX file
 */
export async function downloadInterviewPrepAsDocx(options: InterviewPrepExportOptions): Promise<void> {
  const blob = await exportInterviewPrepToDocx(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateDocxFilename(options.jobData.company, 'interview-prep');
  a.click();
  URL.revokeObjectURL(url);
}
