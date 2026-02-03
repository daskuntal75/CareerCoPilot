/**
 * Lazy-loaded DOCX Export Utility with Professional Table Formatting
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

// Professional theme colors (converted to hex for docx)
const THEME = {
  accent: "2563EB", // Blue accent
  accentLight: "DBEAFE", // Light blue background
  headerBg: "1E40AF", // Dark blue for headers
  headerText: "FFFFFF", // White text
  borderColor: "CBD5E1", // Light gray border
  mutedText: "64748B", // Muted gray
};

/**
 * Export content to DOCX format with professional table formatting
 * Dynamically imports the docx library to reduce bundle size
 */
export async function exportToDocx(options: DocxExportOptions): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = await import('docx');

  const { content, title = '', company = '', type } = options;
  const lines = content.split('\n');
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  // Document title with styled header table
  const docTitle = type === 'cover-letter'
    ? `Cover Letter - ${title} at ${company}`
    : `Interview Preparation - ${title} at ${company}`;

  // Title header table with accent background
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: docTitle, bold: true, size: 32, color: THEME.headerText })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: THEME.headerBg, type: ShadingType.SOLID, color: THEME.headerBg },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
          }),
        ],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: THEME.headerBg },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.headerBg },
      left: { style: BorderStyle.SINGLE, size: 1, color: THEME.headerBg },
      right: { style: BorderStyle.SINGLE, size: 1, color: THEME.headerBg },
    },
  }));

  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  // Process content lines
  let currentSection: string[] = [];
  let inTable = false;

  const flushSection = () => {
    if (currentSection.length > 0) {
      // Create a bordered content section
      const sectionParagraphs = currentSection.map(line => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return new Paragraph({
            children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true, size: 24 })],
            spacing: { after: 120 },
          });
        }
        return new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
          spacing: { after: 100 },
        });
      });
      
      children.push(...sectionParagraphs);
      currentSection = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushSection();
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }
    
    // H1 Header - Create styled table header
    if (line.startsWith('# ')) {
      flushSection();
      const headerText = line.replace('# ', '');
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: headerText, bold: true, size: 28, color: THEME.headerText })],
                  }),
                ],
                shading: { fill: THEME.accent, type: ShadingType.SOLID, color: THEME.accent },
                margins: { top: 150, bottom: 150, left: 200, right: 200 },
              }),
            ],
          }),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: THEME.accent },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: THEME.accent },
          left: { style: BorderStyle.SINGLE, size: 2, color: THEME.accent },
          right: { style: BorderStyle.SINGLE, size: 2, color: THEME.accent },
        },
      }));
      children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
      continue;
    }
    
    // H2 Header - Accent background
    if (line.startsWith('## ')) {
      flushSection();
      const headerText = line.replace('## ', '');
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: headerText, bold: true, size: 26 })],
                  }),
                ],
                shading: { fill: THEME.accentLight, type: ShadingType.SOLID, color: THEME.accentLight },
                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                borders: {
                  left: { style: BorderStyle.SINGLE, size: 12, color: THEME.accent },
                },
              }),
            ],
          }),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 12, color: THEME.accent },
          right: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        },
      }));
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }
    
    // H3 Header
    if (line.startsWith('### ')) {
      flushSection();
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace('### ', ''), bold: true, size: 24, color: THEME.accent })],
        spacing: { before: 200, after: 100 },
      }));
      continue;
    }
    
    // Bullet point
    if (line.match(/^[•\-\*]\s/)) {
      flushSection();
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^[•\-\*]\s*/, ''), size: 24 })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
      continue;
    }
    
    // Bold text line
    if (line.match(/^\*\*.*\*\*$/)) {
      currentSection.push(line);
      continue;
    }
    
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

    if (runs.length > 0) {
      children.push(new Paragraph({
        children: runs,
        spacing: { after: 120 },
      }));
    }
  }

  flushSection();

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
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
// Interview Prep Export (Structured Data) with Professional Tables
// ============================================================================

export interface InterviewPrepExportOptions {
  jobData: { title: string; company: string };
  data: {
    applicationContext?: string;
    uniqueValueProposition?: string;
    keyStrengths?: string[];
    potentialConcerns?: string[];
    questions?: Array<{
      question: string;
      category: string;
      difficulty: string;
      whyAsked?: string;
      starAnswer?: {
        situation: string;
        task: string;
        action: string;
        result: string;
      };
      tips?: string[];
    }>;
    questionsToAsk?: {
      forRecruiter?: string[];
      forHiringManager?: string[];
      forPeer?: string[];
      forTechnicalLead?: string[];
      forVP?: string[];
    } | string[];
  };
}

/**
 * Export interview prep data to DOCX with professional table formatting
 * Dynamically imports docx library
 */
export async function exportInterviewPrepToDocx(options: InterviewPrepExportOptions): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = await import('docx');

  const { jobData, data } = options;
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  // Helper to create a styled header table
  const createHeader = (text: string, level: 1 | 2 | 3 = 1) => {
    const bgColor = level === 1 ? THEME.headerBg : level === 2 ? THEME.accent : THEME.accentLight;
    const textColor = level === 3 ? THEME.accent : THEME.headerText;
    const fontSize = level === 1 ? 32 : level === 2 ? 26 : 24;
    
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text, bold: true, size: fontSize, color: textColor })],
                  alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
                }),
              ],
              shading: { fill: bgColor, type: ShadingType.SOLID, color: bgColor },
              margins: { top: level === 1 ? 200 : 120, bottom: level === 1 ? 200 : 120, left: 200, right: 200 },
            }),
          ],
        }),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: bgColor === THEME.accentLight ? THEME.accent : bgColor },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: bgColor === THEME.accentLight ? THEME.accent : bgColor },
        left: { style: BorderStyle.SINGLE, size: level === 3 ? 12 : 2, color: THEME.accent },
        right: { style: BorderStyle.SINGLE, size: 2, color: bgColor === THEME.accentLight ? THEME.borderColor : bgColor },
      },
    });
  };

  // Helper to create a bordered content table
  const createBorderedContent = (contentParagraphs: InstanceType<typeof Paragraph>[]) => {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: contentParagraphs,
              margins: { top: 150, bottom: 150, left: 200, right: 200 },
            }),
          ],
        }),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        left: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        right: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
      },
    });
  };

  // Helper to create STAR table
  const createSTARTable = (star: { situation: string; task: string; action: string; result: string }) => {
    const starItems = [
      { label: 'SITUATION', content: star.situation, color: '3B82F6' },
      { label: 'TASK', content: star.task, color: '8B5CF6' },
      { label: 'ACTION', content: star.action, color: '10B981' },
      { label: 'RESULT', content: star.result, color: 'F59E0B' },
    ];

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: starItems.map(item => 
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.label, bold: true, size: 22, color: THEME.headerText })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { fill: item.color, type: ShadingType.SOLID, color: item.color },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: item.content || '—', size: 22 })],
                }),
              ],
              width: { size: 85, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
            }),
          ],
        })
      ),
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        left: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        right: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
      },
    });
  };

  // Title
  children.push(createHeader(`Interview Prep: ${jobData.title} at ${jobData.company}`, 1));
  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  // Application Context
  if (data.applicationContext) {
    children.push(createHeader('Application Context', 2));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    children.push(createBorderedContent([
      new Paragraph({
        children: [new TextRun({ text: data.applicationContext, size: 24 })],
      }),
    ]));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Unique Value Proposition
  if (data.uniqueValueProposition) {
    children.push(createHeader('Your Unique Value Proposition', 2));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    children.push(createBorderedContent([
      new Paragraph({
        children: [new TextRun({ text: data.uniqueValueProposition, size: 24 })],
      }),
    ]));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Key Strengths
  if (data.keyStrengths && data.keyStrengths.length > 0) {
    children.push(createHeader('Key Strengths to Highlight', 2));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    const strengthParagraphs = data.keyStrengths.map(s => 
      new Paragraph({
        children: [new TextRun({ text: s, size: 24 })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
    children.push(createBorderedContent(strengthParagraphs));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Interview Questions
  if (data.questions && data.questions.length > 0) {
    children.push(createHeader('Interview Questions', 1));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    data.questions.forEach((q, i) => {
      // Question header
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Q${i + 1}: `, bold: true, size: 26, color: THEME.accent }),
                      new TextRun({ text: q.question, bold: true, size: 26 }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${q.category} • ${q.difficulty}`, size: 20, color: THEME.mutedText, italics: true }),
                    ],
                    spacing: { before: 50 },
                  }),
                ],
                shading: { fill: THEME.accentLight, type: ShadingType.SOLID, color: THEME.accentLight },
                margins: { top: 150, bottom: 150, left: 200, right: 200 },
              }),
            ],
          }),
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: THEME.accent },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
          left: { style: BorderStyle.SINGLE, size: 4, color: THEME.accent },
          right: { style: BorderStyle.SINGLE, size: 1, color: THEME.borderColor },
        },
      }));

      // Why they ask this
      if (q.whyAsked) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Why they ask this: ', bold: true, size: 22, color: THEME.accent }),
            new TextRun({ text: q.whyAsked, size: 22, italics: true, color: THEME.mutedText }),
          ],
          spacing: { before: 100, after: 100 },
          indent: { left: 200 },
        }));
      }

      // STAR Answer
      if (q.starAnswer) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'STAR Answer Framework', bold: true, size: 24 })],
          spacing: { before: 150, after: 100 },
        }));
        children.push(createSTARTable(q.starAnswer));
      }

      // Tips
      if (q.tips && q.tips.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: 'Tips', bold: true, size: 22, color: THEME.accent })],
          spacing: { before: 150, after: 80 },
        }));
        q.tips.forEach(tip => {
          children.push(new Paragraph({
            children: [new TextRun({ text: tip, size: 22 })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          }));
        });
      }

      children.push(new Paragraph({ text: '', spacing: { after: 250 } }));
    });
  }

  // Questions to Ask
  if (data.questionsToAsk) {
    children.push(createHeader('Questions to Ask Interviewers', 2));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    
    if (Array.isArray(data.questionsToAsk)) {
      const qParagraphs = data.questionsToAsk.map(q => 
        new Paragraph({
          children: [new TextRun({ text: q, size: 24 })],
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
      children.push(createBorderedContent(qParagraphs));
    } else {
      const categories = [
        { key: 'forRecruiter', label: 'For Recruiter' },
        { key: 'forHiringManager', label: 'For Hiring Manager' },
        { key: 'forPeer', label: 'For Peer' },
        { key: 'forTechnicalLead', label: 'For Technical Lead' },
        { key: 'forVP', label: 'For VP/Executive' },
      ];
      
      for (const cat of categories) {
        const questions = (data.questionsToAsk as Record<string, string[]>)[cat.key];
        if (questions && questions.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: cat.label, bold: true, size: 24, color: THEME.accent })],
            spacing: { before: 150, after: 80 },
          }));
          questions.forEach(q => {
            children.push(new Paragraph({
              children: [new TextRun({ text: q, size: 22 })],
              bullet: { level: 0 },
              spacing: { after: 60 },
            }));
          });
        }
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children,
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