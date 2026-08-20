import JSZip from 'jszip';
import mammoth from 'mammoth';
import { Subject } from '../types';

export interface ParsedDocumentResult {
  text: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'md';
  pageCount?: number;
  slideCount?: number;
  wordCount: number;
  detectedSubject?: Subject;
}

/**
 * Detects likely subject category from filename or document content
 */
export function detectSubjectFromTextAndName(filename: string, textSample: string): Subject {
  const lowerName = filename.toLowerCase();
  const lowerSample = textSample.slice(0, 3000).toLowerCase();
  const combined = `${lowerName} ${lowerSample}`;

  if (
    combined.includes('algorithm') || 
    combined.includes('python') || 
    combined.includes('javascript') || 
    combined.includes('data structure') || 
    combined.includes('database') || 
    combined.includes('software') ||
    combined.includes('binary tree') ||
    combined.includes('big-o') ||
    combined.includes('html') ||
    combined.includes('css')
  ) {
    return 'Computer Science';
  }

  if (
    combined.includes('integral') || 
    combined.includes('derivative') || 
    combined.includes('calculus') || 
    combined.includes('matrix') || 
    combined.includes('algebra') || 
    combined.includes('geometry') ||
    combined.includes('theorem') ||
    combined.includes('equation') ||
    combined.includes('polynomial')
  ) {
    return 'Mathematics';
  }

  if (
    combined.includes('physics') || 
    combined.includes('thermodynamics') || 
    combined.includes('kinematics') || 
    combined.includes('quantum') || 
    combined.includes('gravity') || 
    combined.includes('electromagnetism') ||
    combined.includes('entropy') ||
    combined.includes('newton') ||
    combined.includes('velocity')
  ) {
    return 'Physics';
  }

  if (
    combined.includes('photosynthesis') || 
    combined.includes('cellular') || 
    combined.includes('dna') || 
    combined.includes('rna') || 
    combined.includes('genetics') || 
    combined.includes('mitosis') || 
    combined.includes('organism') ||
    combined.includes('species') ||
    combined.includes('biology') ||
    combined.includes('ecology')
  ) {
    return 'Biology';
  }

  if (
    combined.includes('chemistry') || 
    combined.includes('stoichiometry') || 
    combined.includes('periodic table') || 
    combined.includes('covalent') || 
    combined.includes('acid') || 
    combined.includes('base') ||
    combined.includes('molecule') ||
    combined.includes('reaction')
  ) {
    return 'Chemistry';
  }

  if (
    combined.includes('history') || 
    combined.includes('revolution') || 
    combined.includes('century') || 
    combined.includes('war') || 
    combined.includes('empire') || 
    combined.includes('civilization') ||
    combined.includes('treaty') ||
    combined.includes('dynasty')
  ) {
    return 'History';
  }

  if (
    combined.includes('literature') || 
    combined.includes('novel') || 
    combined.includes('poetry') || 
    combined.includes('shakespeare') || 
    combined.includes('metaphor') || 
    combined.includes('narrative') ||
    combined.includes('protagonist')
  ) {
    return 'Literature';
  }

  return 'General';
}

/**
 * Extracts plain text and slide structure from PPTX presentation archive
 */
async function parsePptxArrayBuffer(arrayBuffer: ArrayBuffer, filename: string): Promise<ParsedDocumentResult> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles: { name: string; num: number }[] = [];

  // Find all slide XML files inside ppt/slides/
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideFiles.push({
        name: relativePath,
        num: parseInt(match[1], 10),
      });
    }
  });

  if (slideFiles.length === 0) {
    throw new Error('No slides found in the PowerPoint presentation.');
  }

  // Sort slides in natural numerical order
  slideFiles.sort((a, b) => a.num - b.num);

  const slideTexts: string[] = [];

  for (const slide of slideFiles) {
    const zipEntry = zip.file(slide.name);
    if (!zipEntry) continue;
    const xmlContent = await zipEntry.async('string');

    // Parse slide XML text nodes <a:t>
    const textMatches: string[] = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

    // Check for paragraphs <a:p>
    const paragraphs = xmlDoc.getElementsByTagName('a:p');
    if (paragraphs && paragraphs.length > 0) {
      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const p = paragraphs[pIdx];
        const textNodes = p.getElementsByTagName('a:t');
        const paragraphTextParts: string[] = [];
        for (let tIdx = 0; tIdx < textNodes.length; tIdx++) {
          const textVal = textNodes[tIdx].textContent || '';
          if (textVal) paragraphTextParts.push(textVal);
        }
        const fullP = paragraphTextParts.join('').trim();
        if (fullP) {
          textMatches.push(fullP);
        }
      }
    } else {
      // Fallback regex match for <a:t>...</a:t>
      const regexMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      for (const m of regexMatches) {
        const clean = m.replace(/<[^>]+>/g, '').trim();
        if (clean) textMatches.push(clean);
      }
    }

    // Check for slide notes if available
    let notesText = '';
    const noteEntry = zip.file(`ppt/notesSlides/notesSlide${slide.num}.xml`);
    if (noteEntry) {
      try {
        const noteXml = await noteEntry.async('string');
        const noteDoc = parser.parseFromString(noteXml, 'application/xml');
        const noteParagraphs = noteDoc.getElementsByTagName('a:p');
        const noteParts: string[] = [];
        for (let i = 0; i < noteParagraphs.length; i++) {
          const nText = noteParagraphs[i].textContent?.trim();
          // Filter out automatic slide number placeholders
          if (nText && nText !== `${slide.num}` && nText.length > 2) {
            noteParts.push(nText);
          }
        }
        if (noteParts.length > 0) {
          notesText = `\n*Slide Notes*: ${noteParts.join(' ')}`;
        }
      } catch {
        // Ignore note parsing failure
      }
    }

    if (textMatches.length > 0) {
      const slideTitle = textMatches[0];
      const bodyItems = textMatches.slice(1);
      
      let slideFormatted = `### Slide ${slide.num}: ${slideTitle}`;
      if (bodyItems.length > 0) {
        slideFormatted += `\n${bodyItems.map(b => `- ${b}`).join('\n')}`;
      }
      if (notesText) {
        slideFormatted += notesText;
      }
      slideTexts.push(slideFormatted);
    } else {
      slideTexts.push(`### Slide ${slide.num}\n*(Visual/Diagram slide)*`);
    }
  }

  const fullText = slideTexts.join('\n\n');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  const detectedSubject = detectSubjectFromTextAndName(filename, fullText);

  return {
    text: fullText,
    filename,
    fileType: 'pptx',
    slideCount: slideFiles.length,
    wordCount,
    detectedSubject,
  };
}

/**
 * Extracts formatted text, headings, and lists from Word .docx document
 */
async function parseDocxArrayBuffer(arrayBuffer: ArrayBuffer, filename: string): Promise<ParsedDocumentResult> {
  try {
    // Mammoth converts DOCX to clean HTML or raw text while preserving headings
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    if (html && html.trim()) {
      // Convert HTML elements into structured Markdown
      let md = html
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const wordCount = md.trim() ? md.trim().split(/\s+/).length : 0;
      const detectedSubject = detectSubjectFromTextAndName(filename, md);

      return {
        text: md,
        filename,
        fileType: 'docx',
        wordCount,
        detectedSubject,
      };
    }
  } catch (mammothErr) {
    console.warn('Mammoth HTML conversion fallback to raw text:', mammothErr);
  }

  // Fallback to raw text extraction
  const rawResult = await mammoth.extractRawText({ arrayBuffer });
  const rawText = rawResult.value.trim();
  if (!rawText) {
    throw new Error('The DOCX document contains no readable text.');
  }

  const wordCount = rawText.split(/\s+/).length;
  const detectedSubject = detectSubjectFromTextAndName(filename, rawText);

  return {
    text: rawText,
    filename,
    fileType: 'docx',
    wordCount,
    detectedSubject,
  };
}

/**
 * Server-assisted parser endpoint call for PDF and fallback handling
 */
async function parseDocumentViaServer(file: File): Promise<ParsedDocumentResult> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileType: file.name.split('.').pop()?.toLowerCase(),
      fileSize: file.size,
      base64Data,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    let rawError = errData.error || `Server failed to process ${file.name}`;
    if (rawError.includes('is not a function') || rawError.includes('Cannot find module')) {
      rawError = `Could not extract text from "${file.name}". Please ensure it is a valid, readable file.`;
    }
    throw new Error(rawError);
  }

  const data = await response.json();
  return {
    text: data.text,
    filename: file.name,
    fileType: data.fileType || 'pdf',
    pageCount: data.pageCount,
    slideCount: data.slideCount,
    wordCount: data.wordCount || (data.text.trim().split(/\s+/).length),
    detectedSubject: data.detectedSubject || detectSubjectFromTextAndName(file.name, data.text),
  };
}

/**
 * Universal Master Document Parser Supporting:
 * - PDF (.pdf)
 * - DOCX (.docx)
 * - PPTX (.pptx)
 * - TXT (.txt, .text)
 * - Markdown (.md, .markdown)
 */
export async function parseStudyDocument(file: File): Promise<ParsedDocumentResult> {
  if (!file) {
    throw new Error('No file provided.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Text & Markdown Files (.txt, .md, .text, .markdown)
  if (ext === 'txt' || ext === 'text' || ext === 'md' || ext === 'markdown') {
    const text = await file.text();
    if (!text || !text.trim()) {
      throw new Error(`The file "${file.name}" is empty.`);
    }

    const cleanText = text.trim();
    const wordCount = cleanText.split(/\s+/).length;
    const detectedSubject = detectSubjectFromTextAndName(file.name, cleanText);

    return {
      text: cleanText,
      filename: file.name,
      fileType: ext === 'md' || ext === 'markdown' ? 'md' : 'txt',
      wordCount,
      detectedSubject,
    };
  }

  // 2. PowerPoint Presentations (.pptx)
  if (ext === 'pptx') {
    try {
      const buffer = await file.arrayBuffer();
      return await parsePptxArrayBuffer(buffer, file.name);
    } catch (clientPptxErr: any) {
      console.warn('Client PPTX parsing failed, falling back to server parser:', clientPptxErr);
      return await parseDocumentViaServer(file);
    }
  }

  // 3. Microsoft Word Documents (.docx)
  if (ext === 'docx') {
    try {
      const buffer = await file.arrayBuffer();
      return await parseDocxArrayBuffer(buffer, file.name);
    } catch (clientDocxErr: any) {
      console.warn('Client DOCX parsing failed, falling back to server parser:', clientDocxErr);
      return await parseDocumentViaServer(file);
    }
  }

  // 4. PDF Documents (.pdf)
  if (ext === 'pdf') {
    // Uses server-side pdf-parse for high fidelity, text flow, and multi-page support
    return await parseDocumentViaServer(file);
  }

  // Legacy .doc or .ppt binary formats
  if (ext === 'doc' || ext === 'ppt') {
    throw new Error(`Legacy .${ext} format detected. Please save or export your file as modern .docx or .pptx before uploading.`);
  }

  throw new Error(`Unsupported file type ".${ext}". Please upload a PDF (.pdf), Word (.docx), PowerPoint (.pptx), Plain Text (.txt), or Markdown (.md) document.`);
}
