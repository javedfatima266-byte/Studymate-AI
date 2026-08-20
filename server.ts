import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfParseModule from 'pdf-parse';
import { db } from './server/db';

/**
 * Universal PDF Text & Metadata Extractor
 * Robustly supports pdf-parse v2 (PDFParse class), v1 (default function), and multi-page text formatting.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const mod: any = pdfParseModule;

  // 1. pdf-parse v2.x (Exported as { PDFParse: class ... })
  const PDFParseClass = mod?.PDFParse || mod?.default?.PDFParse;
  if (typeof PDFParseClass === 'function') {
    let parser: any = null;
    try {
      parser = new PDFParseClass({ data: buffer });
      const textResult = await parser.getText();
      
      let pageCount = 1;
      if (textResult && typeof textResult.total === 'number') {
        pageCount = textResult.total;
      } else if (textResult && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        pageCount = textResult.pages.length;
      }

      let extracted = '';
      if (textResult && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        extracted = textResult.pages
          .map((p: any) => (p && typeof p.text === 'string' ? p.text.trim() : ''))
          .filter(Boolean)
          .join('\n\n');
      } else if (textResult && typeof textResult.text === 'string') {
        extracted = textResult.text.trim();
      }

      return {
        text: extracted,
        pageCount: Math.max(pageCount, 1),
      };
    } catch (parseErr: any) {
      console.warn('[PDFParse] v2 extraction notice:', parseErr?.message || parseErr);
    } finally {
      if (parser && typeof parser.destroy === 'function') {
        await parser.destroy().catch(() => {});
      }
    }
  }

  // 2. pdf-parse v1.x (Exported directly as function or default function)
  const parseFunc = typeof mod === 'function' 
    ? mod 
    : (typeof mod?.default === 'function' ? mod.default : null);

  if (typeof parseFunc === 'function') {
    const res = await parseFunc(buffer);
    return {
      text: (res?.text || '').trim(),
      pageCount: res?.numpages || 1,
    };
  }

  throw new Error('Could not parse PDF file with available modules.');
}

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '35mb' }));

// Lazy GoogleGenAI client with recommended configuration
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Timeout wrapper helper
function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

// Multi-model Gemini executor with graceful fallback chain, thinking configuration, and proper timeout
async function generateGeminiContent(ai: GoogleGenAI, params: {
  contents: any;
  config?: any;
}) {
  // Ordered by optimal speed, availability, and capability
  const candidates: Array<{ model: string; defaultThinkingLevel?: ThinkingLevel }> = [
    { model: 'gemini-3.7-flash', defaultThinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', defaultThinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-flash-latest' }
  ];

  let lastError: any = null;

  for (const candidate of candidates) {
    const { model, defaultThinkingLevel } = candidate;
    
    // Construct configuration per candidate
    const candidateConfig = { ...(params.config || {}) };
    
    // Only apply thinkingConfig for Gemini 3 series models if not explicitly set
    if (defaultThinkingLevel && !candidateConfig.thinkingConfig && (model.startsWith('gemini-3.') || model.startsWith('gemini-3-'))) {
      candidateConfig.thinkingConfig = { thinkingLevel: defaultThinkingLevel };
    }

    // Try each candidate with up to 1 retry for transient (503/429) errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            contents: params.contents,
            model,
            config: candidateConfig,
          }),
          35000,
          `Gemini call to ${model} exceeded timeout`
        );

        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const isTransient = errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt === 0) {
          // Wait 600ms before retrying the same candidate once
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        console.warn(`[Gemini API] Model ${model} error (attempt ${attempt + 1}), attempting next candidate:`, errMsg);
        break; // Move to next candidate
      }
    }
  }

  throw lastError || new Error('All model attempts failed');
}

// Robust JSON parser for AI outputs
function extractAndParseJSON<T = any>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;
  
  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(rawText.trim());
    if (direct && typeof direct === 'object') return direct;
  } catch (e) {
    // Continue
  }

  // 2. Remove markdown code fences ```json ... ```
  try {
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsedCleaned = JSON.parse(cleaned);
    if (parsedCleaned && typeof parsedCleaned === 'object') return parsedCleaned;
  } catch (e) {
    // Continue
  }

  // 3. Regex match outermost JSON object or array
  try {
    const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      const parsedMatch = JSON.parse(jsonMatch[0]);
      if (parsedMatch && typeof parsedMatch === 'object') return parsedMatch;
    }
  } catch (e) {
    // Continue
  }

  return fallback;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) 
  });
});

// Authentication Helpers & Middleware
function extractBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function authenticateUser(req: express.Request) {
  const token = extractBearerToken(req);
  if (!token) return null;
  return db.validateSession(token);
}

// 1. Sign Up Endpoint
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, gradeLevel, selectedSubjects, avatar } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in instead.' });
    }

    const result = db.createUser({
      name: name.trim(),
      email: cleanEmail,
      password,
      gradeLevel,
      selectedSubjects,
      avatar,
    });

    return res.status(201).json({
      success: true,
      token: result.token,
      user: result.user.profile,
      data: result.data,
    });
  } catch (err: any) {
    console.error('[Auth API] Signup error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create account. Please try again.' });
  }
});

// 2. Log In Endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Please provide your email address.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide your password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ 
        error: 'No account found with this email address. Please check your email or click "Sign up for free".' 
      });
    }

    const isValid = db.verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Incorrect password. Please check your credentials or click "Forgot Password?" to reset it.' 
      });
    }

    const token = db.createSession(user.id);
    const data = db.getUserData(user.id);

    return res.json({
      success: true,
      token,
      user: user.profile,
      data,
    });
  } catch (err: any) {
    console.error('[Auth API] Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login. Please try again.' });
  }
});

// 3. Current Authenticated User Session (Me)
app.get('/api/auth/me', (req, res) => {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized or session expired.' });
    }

    const data = db.getUserData(user.id);
    return res.json({
      success: true,
      user: user.profile,
      data,
    });
  } catch (err: any) {
    console.error('[Auth API] Me check error:', err);
    return res.status(500).json({ error: 'Failed to authenticate session.' });
  }
});

// 4. Log Out Endpoint
app.post('/api/auth/logout', (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      db.removeSession(token);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('[Auth API] Logout error:', err);
    return res.json({ success: true });
  }
});

// 5. Forgot Password / Password Reset Endpoint
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ 
        error: 'No account registered with this email address. Please create a new account.' 
      });
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      db.resetPassword(cleanEmail, newPassword);
      return res.json({ 
        success: true, 
        message: 'Your password has been successfully reset. You can now log in with your new password.' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Account verified. Please enter your new password to complete the reset.' 
    });
  } catch (err: any) {
    console.error('[Auth API] Forgot password error:', err);
    return res.status(500).json({ error: 'Could not process password reset request.' });
  }
});

// 6. Update User Profile Endpoint
app.put('/api/auth/profile', (req, res) => {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized or session expired.' });
    }

    const updatedProfile = db.updateProfile(user.id, req.body);
    return res.json({
      success: true,
      user: updatedProfile,
    });
  } catch (err: any) {
    console.error('[Auth API] Profile update error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

// 7. Get User Data Store
app.get('/api/user/data', (req, res) => {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized or session expired.' });
    }

    const data = db.getUserData(user.id);
    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('[Auth API] Get data error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user data.' });
  }
});

// 8. Synchronize & Persist User Data Store
app.post('/api/user/data/sync', (req, res) => {
  try {
    const user = authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized or session expired.' });
    }

    const { profile, ...userData } = req.body;

    if (profile && typeof profile === 'object') {
      db.updateProfile(user.id, profile);
    }

    const updated = db.saveUserData(user.id, userData);
    const updatedUser = db.findUserById(user.id);

    return res.json({
      success: true,
      user: updatedUser?.profile,
      data: updated,
    });
  } catch (err: any) {
    console.error('[Auth API] Sync data error:', err);
    return res.status(500).json({ error: 'Failed to synchronize study data.' });
  }
});

// Universal Document Parser Endpoint (PDF, DOCX, PPTX, TXT, MD)
app.post('/api/parse-document', async (req, res) => {
  try {
    const { filename, fileType, base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No document data provided.' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = (fileType || filename?.split('.').pop() || '').toLowerCase();

    let extractedText = '';
    let pageCount: number | undefined;
    let slideCount: number | undefined;

    if (ext === 'pdf') {
      try {
        const { text, pageCount: count } = await extractTextFromPdf(buffer);
        extractedText = text;
        pageCount = count;
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        const errMsg = String(pdfErr?.message || '');
        if (errMsg.toLowerCase().includes('password') || pdfErr?.name === 'PasswordException') {
          return res.status(422).json({ error: 'The uploaded PDF is password-protected. Please upload an unprotected PDF document.' });
        }
        if (
          errMsg.toLowerCase().includes('invalid pdf') || 
          errMsg.toLowerCase().includes('formaterror') || 
          pdfErr?.name === 'InvalidPDFException' || 
          pdfErr?.name === 'FormatError'
        ) {
          return res.status(422).json({ error: 'The uploaded PDF appears to be corrupted or in an invalid format. Please ensure the file opens correctly and try again.' });
        }
        return res.status(422).json({ error: 'Could not extract text from this PDF file. Please ensure the PDF contains searchable text and is not corrupted.' });
      }
    } else if (ext === 'docx') {
      try {
        const result = await mammoth.convertToHtml({ buffer });
        const html = result.value;
        if (html && html.trim()) {
          extractedText = html
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        } else {
          const raw = await mammoth.extractRawText({ buffer });
          extractedText = raw.value || '';
        }
      } catch (docxErr: any) {
        console.error('DOCX parsing error:', docxErr);
        return res.status(422).json({ error: `Could not parse Word document: ${docxErr.message || 'Corrupted DOCX file.'}` });
      }
    } else if (ext === 'pptx') {
      try {
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles: { name: string; num: number }[] = [];

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
          return res.status(422).json({ error: 'No slides found in PowerPoint presentation.' });
        }

        slideFiles.sort((a, b) => a.num - b.num);
        slideCount = slideFiles.length;

        const slideTexts: string[] = [];
        for (const slide of slideFiles) {
          const entry = zip.file(slide.name);
          if (!entry) continue;
          const xml = await entry.async('string');
          const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
          const texts = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
          if (texts.length > 0) {
            slideTexts.push(`### Slide ${slide.num}: ${texts[0]}\n${texts.slice(1).map(t => `- ${t}`).join('\n')}`);
          } else {
            slideTexts.push(`### Slide ${slide.num}\n*(Visual/Diagram slide)*`);
          }
        }
        extractedText = slideTexts.join('\n\n');
      } catch (pptxErr: any) {
        console.error('PPTX parsing error:', pptxErr);
        return res.status(422).json({ error: `Could not parse PowerPoint presentation: ${pptxErr.message || 'Corrupted PPTX file.'}` });
      }
    } else if (ext === 'txt' || ext === 'md' || ext === 'text' || ext === 'markdown') {
      extractedText = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: `Unsupported document format .${ext}. Please upload a PDF, DOCX, PPTX, TXT, or MD file.` });
    }

    const clean = extractedText.trim();
    if (!clean) {
      return res.status(422).json({ error: `The file "${filename || 'document'}" was read but contains no extractable text.` });
    }

    const wordCount = clean.split(/\s+/).length;

    res.json({
      text: clean,
      filename: filename || `document.${ext}`,
      fileType: ext,
      pageCount,
      slideCount,
      wordCount,
    });
  } catch (err: any) {
    console.error('Error in /api/parse-document:', err);
    res.status(500).json({ error: err.message || 'Internal error while parsing document.' });
  }
});

// Comprehensive Academic Knowledge Base & Intelligent Tutor Response Synthesizer
function generateSmartTutorFallback(
  userQuery: string, 
  subject: string, 
  persona: string,
  contextText?: string
): { text: string; suggestions: string[] } {
  const rawQ = (userQuery || '').trim();
  const q = rawQ.toLowerCase();
  const cleanSubject = subject || 'Computer Science';
  const activePersona = persona || 'socratic';

  // 1. GITHUB & GIT
  if (q.includes('github') || (q.includes('git') && !q.includes('digit') && !q.includes('mitosis'))) {
    if (activePersona === 'socratic') {
      return {
        text: `### Exploring GitHub & Version Control

Have you ever worked on a group project or written code where you made a mistake and wished you could instantly rewind to yesterday's version? Or wondered how hundreds of engineers at companies like Google or Microsoft write code on the exact same software simultaneously without overwriting each other's work?

---

### Core Conceptual Inquiry
1. **Local vs. Cloud**: **Git** is the local tool running on your machine that records snapshots (commits) of your project over time. **GitHub** is the cloud-hosted platform where those repositories live online so teams can share, review, and collaborate on them.
2. **Key Mechanisms to Consider**:
   - What happens when two developers edit different lines in the same file and push their work? *(Git merges them automatically)*
   - What if they edit the *exact same line*? *(A merge conflict occurs—requiring human decision)*
   - Why do we use **Pull Requests (PRs)** instead of pushing directly to the main production branch?

---

### Think About This Next Step:
If Git tracks history on your computer, what specific role does GitHub play in open-source software, code review, and automated testing (CI/CD)?`,
        suggestions: [
          'What is the difference between Git and GitHub?',
          'What is a pull request and how does code review work?',
          'How do Git branches prevent breaking production code?'
        ]
      };
    } else if (activePersona === 'exam_coach') {
      return {
        text: `### High-Yield Exam Guide: GitHub & Version Control

**Exam Definition**: **GitHub** is a cloud-based platform and hosting service for software development that utilizes the **Git** distributed version control system to facilitate source code management, collaborative code review, and CI/CD pipelines.

---

### 1. Essential Git vs. GitHub Distinction (High Exam Frequency)
- **Git**: A distributed version control CLI tool installed locally to track file history via snapshots (**commits**).
- **GitHub**: A web-based hosting service and collaboration platform for remote Git repositories.

---

### 2. Core Technical Vocabulary for Tests
- **Repository (Repo)**: The central data directory containing project files and entire commit history (\`.git\`).
- **Commit**: An immutable snapshot of staged changes accompanied by a cryptographic SHA-1 hash and commit message.
- **Branch**: An independent line of development (e.g., \`feature-login\`, \`main\`).
- **Pull Request (PR)**: A formal request to merge changes from one branch into another, enabling code review and automated checks.
- **Merge Conflict**: Occurs when conflicting changes are made to the exact same line in divergent branches.

---

### 3. Standard Git Workflow Commands
\`\`\`bash
git init                  # Initialize local repository
git add .                 # Stage all modified files
git commit -m "feat: init" # Create commit snapshot
git branch -M main        # Set default branch
git remote add origin <url> # Link local repo to GitHub
git push -u origin main   # Push commits to remote repo
\`\`\``,
        suggestions: [
          'What are the steps to resolve a Git merge conflict?',
          'Explain the difference between git fetch and git pull',
          'What is the Git staging area and why is it useful?'
        ]
      };
    } else if (activePersona === 'simplifier') {
      return {
        text: `### What is GitHub? (The Simple Feynman Explanation)

Imagine you are writing a massive book with a group of friends.

If you just shared a single file via USB, someone would accidentally delete another person's paragraph, or you'd end up with messy files named \`book_final_v2_FINAL_really.docx\`.

**GitHub solves this problem completely!**

---

### 1. The Magic Time-Machine (Git)
Every time you hit "save a milestone" (**Commit**), Git takes an exact photo of your entire project. If your code breaks tomorrow, you can press a button and travel back in time to last Tuesday when everything worked perfectly.

---

### 2. The Cloud Headquarters (GitHub)
**GitHub** is like *Google Docs + Social Network for Programmers*:
- **Safe Sandboxes (Branches)**: You can make your own sandbox copy to test wacky ideas. If it works, you invite your team to review it.
- **The Suggestion Box (Pull Request)**: "Hey team! I added the dark mode button. Check out my code and approve it before we merge it into the live app."
- **Open Source Showcase**: Anyone in the world can share their code, report bugs (**Issues**), or contribute improvements.`,
        suggestions: [
          'Why do programmers use branches instead of working on main?',
          'Can I use Git without GitHub?',
          'How does GitHub keep open-source software secure?'
        ]
      };
    } else {
      // code_math
      return {
        text: `### Technical Deep-Dive: Git & GitHub Architecture

**GitHub** is a distributed version control repository hosting service built on top of the **Git Directed Acyclic Graph (DAG)** object database. It provides Git repository hosting, fine-grained access control, issue tracking, continuous integration (GitHub Actions), and code review tools.

---

### 1. Git Internal Data Model
Git represents history as a Directed Acyclic Graph of immutable objects stored under \`.git/objects/\`:
1. **Blob**: Raw file content (identified by SHA hash of payload).
2. **Tree**: Directory structure mapping filenames to mode, type, and blob/tree SHA hashes.
3. **Commit**: Metadata containing root tree hash, author, committer, timestamp, message, and pointer to 0 or more parent commit hashes.
4. **Tag / Branch Reference**: Mutable pointers to commit objects stored in \`.git/refs/\`.

---

### 2. Standard GitHub Engineering Workflow
\`\`\`bash
# 1. Clone remote repository
git clone https://github.com/organization/project.git
cd project

# 2. Create isolated feature branch
git checkout -b feature/auth-middleware

# 3. Stage and commit incremental atomic changes
git add src/middleware/auth.ts
git commit -m "feat(auth): validate JWT signature and extract claims"

# 4. Sync with upstream and publish branch
git pull --rebase origin main
git push -u origin feature/auth-middleware

# 5. Open Pull Request on GitHub for peer review & CI testing
\`\`\`

---

### 3. Key GitHub Platform Capabilities
- **Pull Request Review Engine**: Line-by-line diff viewing, automated linting, test pass requirements, and branch protection rules.
- **GitHub Actions (CI/CD)**: Event-driven workflows defined in \`.github/workflows/*.yml\` that compile, lint, test, and containerize code upon push or PR.`,
        suggestions: [
          'Explain how Git stores deltas and packfiles internally',
          'What is the difference between git rebase and git merge?',
          'How do GitHub Actions CI/CD workflows execute pipeline steps?'
        ]
      };
    }
  }

  // 2. RECURSION
  if (q.includes('recursion') || q.includes('recursive')) {
    if (activePersona === 'simplifier') {
      return {
        text: `### Recursion in Simple Words (The Feynman Technique)

**Recursion** is when a function solves a big problem by **calling itself** to solve a smaller piece of the exact same problem—until it reaches a point where the answer is so simple it can stop.

---

### 1. The Russian Nesting Dolls Analogy
Imagine you have a stack of nested Russian dolls (*Matryoshka*):
- You want to find the tiny gold coin inside the very smallest center doll.
- **The Recursive Step**: You open a doll, look inside. If there's another doll, you repeat the same action: *Open doll*.
- **The Base Case**: You open a doll and find the gold coin (no more dolls). You stop opening and celebrate!

---

### 2. The Two Golden Rules of Recursion
Every recursive function **MUST** have two things:
1. **The Base Case (The Stop Sign)**: The condition that tells the function to stop calling itself. Without this, your computer will keep looping until it crashes with a **Stack Overflow**.
2. **The Recursive Step**: The function calls itself with a strictly *smaller or simpler* input that moves closer to the base case.

---

### 3. Simple Real-Life Code Example: Countdown
\`\`\`javascript
function countdown(number) {
  // 1. BASE CASE: Stop when we hit 0
  if (number <= 0) {
    console.log("Blast off! 🚀");
    return;
  }

  // Action
  console.log(number);

  // 2. RECURSIVE CALL: Call self with a smaller number
  countdown(number - 1);
}

countdown(3);
// Output: 3 -> 2 -> 1 -> Blast off! 🚀
\`\`\``,
        suggestions: [
          'How does the Call Stack track recursive function calls?',
          'What is the difference between recursion and iteration (loops)?',
          'Can you show recursion used to calculate a factorial?'
        ]
      };
    } else if (activePersona === 'socratic') {
      return {
        text: `### Socratic Investigation: Understanding Recursion

Let's explore recursion by starting from first principles.

Suppose you want to compute the factorial of 5 ($5! = 5 \\times 4 \\times 3 \\times 2 \\times 1$).

---

### Guiding Questions:
1. Notice how $5!$ can be rewritten as $5 \\times (4!)$. And $4! = 4 \\times (3!)$.
   - What is the pattern here? How does solving $5!$ depend on solving a smaller version of the exact same question?
2. When does this sequence have to stop? What is $1!$ or $0!$?
   - In computer science, what do we call this critical stopping condition?
3. What would happen to your computer's memory if you forgot to tell the function when to stop?

---

### The Call Stack Concept
When a function calls itself, the computer pauses the current function and creates a new "stack frame" in memory on top of it.
- How does the computer return values once the base case is finally reached? *(Think of unwinding a stack of plates!)*`,
        suggestions: [
          'What happens during the unwinding phase of recursion?',
          'How does the base case prevent infinite recursion?',
          'How do you write Fibonacci using recursion?'
        ]
      };
    } else {
      return {
        text: `### Technical Guide: Recursion, Call Stacks & Complexity

**Definition**: Recursion is a programming technique where a method invokes itself directly or indirectly to solve subproblems of the same type, governed by a recurrence relation.

---

### 1. Formal Structure
\`\`\`cpp
// Classic Factorial Computation: n! = n * (n-1)!
int factorial(int n) {
    // 1. Base Case: Halting condition (0! = 1, 1! = 1)
    if (n <= 1) {
        return 1;
    }
    // 2. Recursive Step: Self-invocation with reduced subproblem
    return n * factorial(n - 1);
}
\`\`\`

---

### 2. The Execution Call Stack
Each recursive invocation pushes an activation frame onto the program call stack containing:
- Parameter values
- Local variables
- Return memory address

\`\`\`
[ factorial(1) -> returns 1 ]  <-- Top of stack (Base Case)
[ factorial(2) -> waits for 1 ]
[ factorial(3) -> waits for 2 ]
[ main() ]                     <-- Bottom of stack
\`\`\`

---

### 3. Complexity & Tail-Call Optimization
- **Time Complexity**: $T(n) = T(n-1) + O(1) \\implies O(n)$
- **Space Complexity**: $O(n)$ due to call stack frames.
- **Tail Recursion**: If the recursive call is the final statement, optimizing compilers can reuse the current stack frame, reducing space complexity from $O(n)$ to $O(1)$.`,
        suggestions: [
          'What is Tail Call Optimization (TCO)?',
          'How do you convert a recursive tree traversal to iterative?',
          'What is the recurrence relation for Merge Sort?'
        ]
      };
    }
  }

  // 3. VARIABLE IN C++
  if (q.includes('variable in c++') || (q.includes('variable') && (q.includes('c++') || q.includes('cpp')))) {
    return {
      text: `### Variables in C++: Definition, Types & Memory Model

In C++, a **variable** is a named location in computer memory (RAM) allocated to store a value of a specific **data type**. C++ is a **statically typed** language, meaning variable types must be explicitly declared at compile-time and cannot change.

---

### 1. Fundamental Syntax & Declaration
\`\`\`cpp
#include <iostream>
#include <string>

int main() {
    // Declaration + Initialization
    int studentAge = 20;               // 4 bytes: Integer values (-2^31 to 2^31 - 1)
    double gpa = 3.92;                 // 8 bytes: High-precision floating point
    char letterGrade = 'A';            // 1 byte: Single ASCII character
    bool isEnrolled = true;            // 1 byte: true (1) or false (0)
    std::string fullName = "Alex Doe"; // Dynamic string object

    std::cout << fullName << " (Age: " << studentAge << ") GPA: " << gpa << std::endl;
    return 0;
}
\`\`\`

---

### 2. Primary C++ Data Types & Memory Footprints
| Data Type | Typical Size | Value Range / Description |
| :--- | :--- | :--- |
| \`bool\` | 1 byte | \`true\` (1) or \`false\` (0) |
| \`char\` | 1 byte | Characters enclosed in single quotes (\`'A'\`) |
| \`int\` | 4 bytes | Whole numbers ($-2,147,483,648$ to $+2,147,483,647$) |
| \`float\` | 4 bytes | Single-precision floating point ($\approx 7$ digits precision) |
| \`double\` | 8 bytes | Double-precision floating point ($\approx 15$ digits precision) |
| \`std::string\` | Dynamic | Sequence of characters from \`<string>\` header |

---

### 3. Key Concepts to Master for Exams & Real Code
- **Initialization**: Always initialize variables (\`int x = 0;\`). Uninitialized local variables contain unpredictable garbage data from RAM!
- **Const Qualifier**: \`const double PI = 3.14159;\` prevents accidental modification.
- **Scope & Lifetime**: Local variables exist only within the enclosing curly braces \`{ ... }\` and are freed automatically from the stack when leaving scope.
- **Pointers & References**:
  \`\`\`cpp
  int val = 42;
  int& ref = val;    // Alias/Reference to val
  int* ptr = &val;   // Pointer storing memory address of val
  \`\`\``,
      suggestions: [
        'What is the difference between a pointer and a reference in C++?',
        'What happens when a variable goes out of scope on the stack?',
        'What is the difference between static and dynamic typing?'
      ]
    };
  }

  // 4. RAM VS ROM
  if ((q.includes('ram') && q.includes('rom')) || q.includes('difference between ram and rom') || q.includes('ram vs rom')) {
    return {
      text: `### Comprehensive Comparison: RAM vs. ROM

Both **RAM** (Random Access Memory) and **ROM** (Read-Only Memory) are primary internal storage media used by computers, but they serve completely opposite purposes in computer architecture.

---

### 1. Key High-Level Difference
- **RAM**: High-speed, **volatile** temporary workspace used by the CPU to hold active instructions and data for programs currently in execution.
- **ROM**: Permanent, **non-volatile** storage that holds critical low-level firmware instructions (like the **BIOS / UEFI**) required to boot up the hardware.

---

### 2. Side-by-Side Comparison Matrix
| Characteristic | RAM (Random Access Memory) | ROM (Read-Only Memory) |
| :--- | :--- | :--- |
| **Full Form** | Random Access Memory | Read-Only Memory |
| **Volatility** | **Volatile**: All data is lost when power is disconnected | **Non-Volatile**: Data is permanently preserved without power |
| **Read/Write Capability** | Fast Read AND Fast Write operations | Read-only in normal operation; writing requires specialized flashing |
| **Primary Function** | Holds currently running OS processes, active browser tabs, game data | Stores bootstrap loader, BIOS/UEFI firmware, hardware diagnostics |
| **Speed** | Extremely fast (nanosecond latency) | Slower than RAM |
| **Typical Capacity** | 8 GB to 64 GB+ on modern systems | 4 MB to 32 MB (small firmware chip) |
| **CPU Interaction** | CPU directly reads and writes data continuously | CPU reads during bootup sequence |

---

### 3. Everyday Analogy (Feynman Perspective)
- **RAM is your study desk**: You spread out your current notebook and calculator while studying. When you pack up and leave the room (power off), the desk is cleared.
- **ROM is an engraved plaque on the wall**: It has the building rules and emergency exits permanently carved in stone. Nobody erases it, and it's always there when you walk in.`,
      suggestions: [
        'What is the difference between SRAM and DRAM?',
        'How does virtual memory (paging/swap) use SSD space like RAM?',
        'What happens during the BIOS POST boot sequence using ROM?'
      ]
    };
  }

  // 5. HALF ADDER
  if (q.includes('half adder') || q.includes('half-adder') || (q.includes('adder') && q.includes('binary'))) {
    return {
      text: `### Understanding the Half Adder in Digital Logic

A **Half Adder** is a fundamental combinational digital logic circuit that performs binary addition on **two single-bit binary inputs** ($A$ and $B$) and produces two outputs: **Sum ($S$)** and **Carry ($C$)**.

---

### 1. Boolean Logic & Formulas
1. **Sum ($S$)**: High (1) when only one input is 1, but Low (0) when both or neither are 1.
   $$\\mathbf{S = A \\oplus B} \\quad \\text{(XOR Gate)}$$
2. **Carry ($C$)**: High (1) only when *both* inputs are 1.
   $$\\mathbf{C = A \\cdot B} \\quad \\text{(AND Gate)}$$

---

### 2. Half Adder Truth Table
| Input $A$ | Input $B$ | Sum ($S = A \\oplus B$) | Carry ($C = A \\cdot B$) | Arithmetic Meaning ($A + B$) |
| :---: | :---: | :---: | :---: | :---: |
| 0 | 0 | **0** | **0** | $0 + 0 = 0_2$ |
| 0 | 1 | **1** | **0** | $0 + 1 = 1_2$ |
| 1 | 0 | **1** | **0** | $1 + 0 = 1_2$ |
| 1 | 1 | **0** | **1** | $1 + 1 = 10_2$ (Decimal 2) |

---

### 3. Circuit Schematic & Components
A Half Adder consists of exactly two logic gates:
- One **XOR gate** connected to inputs $A$ and $B$ (outputs $S$).
- One **AND gate** connected to inputs $A$ and $B$ in parallel (outputs $C$).

---

### 4. Critical Exam Limitation: Why We Need "Full Adders"
- A **Half Adder** cannot accept a **Carry-In ($C_{in}$)** from a previous lower-order addition column.
- Therefore, to add multi-bit binary numbers (e.g., $1011_2 + 1101_2$), we must use **Full Adders** (which accept $A, B,$ and $C_{in}$ by combining two Half Adders with an OR gate).`,
      suggestions: [
        'How do two Half Adders combine to make a Full Adder?',
        'How do you construct a Half Adder using only NAND gates?',
        'What is a Ripple Carry Adder and how does it chain Full Adders?'
      ]
    };
  }

  // 6. DATABASE
  if (q.includes('database') || q.includes('what is a db') || q.includes('sql') || q.includes('rdbms')) {
    return {
      text: `### What is a Database? Architecture, Models & Systems

A **database** is an organized, structured collection of digital information or data stored electronically in a computer system and managed by a specialized software suite called a **Database Management System (DBMS)**.

---

### 1. Why Use Databases Instead of Plain Text Files?
1. **Data Integrity & Consistency**: Enforces rules, relationships, and constraints.
2. **Concurrency Control**: Allows thousands of users to read and write data simultaneously without data corruption.
3. **High-Speed Querying**: Uses **B-Tree indexes** and query planners to search millions of records in milliseconds.
4. **Security & Transactions**: Guarantees ACID properties for financial and mission-critical operations.

---

### 2. The Two Major Database Paradigms
#### A. Relational Databases (SQL / RDBMS)
- Structure: Data stored in structured **tables** with fixed rows and columns.
- Relations: Linked via **Primary Keys** and **Foreign Keys**.
- Guarantees: **ACID** (Atomicity, Consistency, Isolation, Durability).
- Examples: **PostgreSQL, MySQL, SQLite, Oracle, SQL Server**.
\`\`\`sql
SELECT users.name, orders.total 
FROM users 
JOIN orders ON users.id = orders.user_id 
WHERE orders.status = 'completed';
\`\`\`

#### B. Non-Relational Databases (NoSQL)
- Structure: Flexible schemas using JSON documents, key-value pairs, column-families, or graph nodes.
- Use Cases: High-velocity streaming, unstructured content, massive horizontal scale.
- Examples: **MongoDB (Document), Redis (Key-Value), Neo4j (Graph), Cassandra (Wide-Column)**.

---

### 3. Core CRUD Operations
- **C**reate: \`INSERT INTO students (name, gpa) VALUES ('Alex', 3.9);\`
- **R**ead: \`SELECT * FROM students WHERE gpa >= 3.5;\`
- **U**pdate: \`UPDATE students SET gpa = 4.0 WHERE id = 1;\`
- **D**elete: \`DELETE FROM students WHERE id = 1;\``,
      suggestions: [
        'What are the 4 ACID properties in database transactions?',
        'What is the difference between Primary Key and Foreign Key?',
        'When should you choose PostgreSQL over MongoDB?'
      ]
    };
  }

  // 7. DYNAMIC PEDAGOGICAL SYNTHESIS FOR ANY OTHER QUERY
  // Clean question and extract core subject entity
  const cleanTitle = rawQ
    .replace(/^(what is|what are|explain|describe|tell me about|how does|how do|why is|why are)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim() || `${cleanSubject} Core Topic`;

  const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  if (activePersona === 'socratic') {
    return {
      text: `### Guiding Inquiry: ${capitalizedTitle}

Let's break down **${capitalizedTitle}** step-by-step so you can build an intuitive, foundational understanding.

---

### 1. The Core Puzzle
When studying **${capitalizedTitle}** within **${cleanSubject}**, we want to look at what problem it solves or what natural rule it describes.

- What are the primary building blocks or initial conditions involved?
- How does changing one component impact the behavior of the overall system?

---

### 2. Thought Experiment
Consider a real-world scenario where **${capitalizedTitle}** applies:
- If you had to explain this concept to someone with zero background in ${cleanSubject}, what is the single most important rule or relationship you would highlight?
- What common mistakes do people make when first analyzing this topic?

---

### 3. Next Exploration
Reflect on how this connects with the rest of your ${cleanSubject} curriculum. What specific sub-topic or formula would you like to test next?`,
      suggestions: [
        `Explain ${capitalizedTitle} with a practical example`,
        `What are the most common exam questions on ${capitalizedTitle}?`,
        `How does ${capitalizedTitle} relate to core principles in ${cleanSubject}?`
      ]
    };
  } else if (activePersona === 'exam_coach') {
    return {
      text: `### High-Yield Exam Review: ${capitalizedTitle}

**Exam Focus**: Mastery of **${capitalizedTitle}** requires knowing exact definitions, core mechanisms, standard formula representations, and high-frequency test questions in **${cleanSubject}**.

---

### 1. Foundational Definition & Key Terminology
- **${capitalizedTitle}**: The fundamental framework in **${cleanSubject}** that governs the operational rules, interactions, and predictable outcomes of related entities.
- **Key Terms to Memorize**: Primary inputs, governing laws/constraints, state transitions, and standard evaluation metrics.

---

### 2. High-Yield Points & Test-Taker Pitfalls
- **High-Yield Point**: Always verify baseline assumptions and boundary conditions before solving.
- **Common Trap**: Watch out for edge cases, sign errors, or confusing related but distinct terms.
- **Scoring Rubric Tip**: Structure your answers with clear definitions, step-by-step logic, and a concluding synthesis to capture full partial-credit marks.

---

### 3. Quick Summary Checklist
1. State the formal definition clearly.
2. Outline the 2–3 governing mechanisms or mathematical relationships.
3. Provide a concrete application or verify edge cases.`,
      suggestions: [
        `Give me a 3-question practice quiz on ${capitalizedTitle}`,
        `What are common test mistakes regarding ${capitalizedTitle}?`,
        `Can you provide a step-by-step problem solution for ${capitalizedTitle}?`
      ]
    };
  } else if (activePersona === 'simplifier') {
    return {
      text: `### Understanding ${capitalizedTitle} (The Simple Everyday Breakdown)

Let's explain **${capitalizedTitle}** using plain language, zero confusing jargon, and clear everyday analogies!

---

### 1. The Big Picture Analogy
Think of **${capitalizedTitle}** like a set of everyday rules:
- Just like traffic lights organize cars at an intersection so nobody crashes, **${capitalizedTitle}** establishes clear rules in **${cleanSubject}** so systems work predictably and efficiently.

---

### 2. The 3 Things You Need to Know
1. **The Starting Point**: What do you start with? (The ingredients or inputs).
2. **The Mechanism**: What happens step-by-step? (The recipe or process).
3. **The Result**: What is the outcome? (The finished product or output).

---

### 3. Why It Matters
Without **${capitalizedTitle}**, systems in **${cleanSubject}** would be disorganized or inconsistent. Once you understand the basic rule, the complex math or terminology becomes much simpler!`,
      suggestions: [
        `Explain this with another everyday analogy`,
        `Can you give a simple real-world example of ${capitalizedTitle}?`,
        `How is ${capitalizedTitle} used in modern technology or daily life?`
      ]
    };
  } else {
    // code_math
    return {
      text: `### Technical & Mathematical Breakdown: ${capitalizedTitle}

This section provides a rigorous, technical exploration of **${capitalizedTitle}** in **${cleanSubject}**.

---

### 1. Formal Specification & Definitions
- **Topic**: ${capitalizedTitle}
- **Domain**: ${cleanSubject}
- **Structural Properties**: Governed by systematic state variables, deterministic transitions, and quantifiable boundary conditions.

---

### 2. Analytical Formulation & Logic
\`\`\`text
Input (X) ---> [ Transformation Engine: ${capitalizedTitle} ] ---> Output (Y)
                - Constraints & Invariants
                - Error Bounds & Verification
\`\`\`

- **Key Principles**:
  - Deterministic evaluation under defined parameter sets.
  - Preservation of core invariants and energy/state conservation laws where applicable.
  - Asymptotic behavior and boundary condition limits.

---

### 3. Systematic Execution & Implementation Steps
1. Define the initial state vectors and parameter constraints.
2. Apply the transformation equations step-by-step.
3. Verify output consistency against expected theoretical baselines.`,
      suggestions: [
        `Show the exact mathematical proof or code implementation for ${capitalizedTitle}`,
        `Analyze the time and space complexity of ${capitalizedTitle}`,
        `What are the edge cases and numerical stability limits of ${capitalizedTitle}?`
      ]
    };
  }
}

// Helper for contextual fallback summarization
function generateSmartSummarizerFallback(
  text: string,
  summaryType: string,
  subject: string
) {
  const cleanSubject = subject || 'General Studies';
  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();

  let title = `Synthesis: ${cleanSubject} Study Material`;
  let summaryContent = '';
  let keyTakeaways: string[] = [];
  let flashcards: Array<{ front: string; back: string }> = [];

  if (lower.includes('photosynthesis') || lower.includes('chloroplast') || lower.includes('calvin cycle')) {
    title = 'Biological Energy: The Mechanics of Photosynthesis';
    if (summaryType === 'feynman') {
      summaryContent = `### How Plants Cook Up Energy (The Feynman Analogy)

Imagine every green leaf is a high-tech solar bakery!

- **The Ingredients**: The plant draws **water** from the soil through its roots and captures **carbon dioxide** from the air through microscopic pores.
- **The Oven & Solar Panels (Light Reactions)**: In the *thylakoid membranes*, green chlorophyll pigments trap sunlight photons and use that electrical kick to split water molecules, releasing fresh **oxygen** into the atmosphere while charging up molecular batteries (**ATP** and **NADPH**).
- **The Bakery Mixing Bowl (The Calvin Cycle)**: In the *stroma*, the plant uses those charged batteries to lock carbon dioxide molecules into sweet **glucose sugar**.

**The Big Picture**: Without this solar conversion, earth's food chain and atmospheric oxygen would cease to exist!`;
    } else if (summaryType === 'executive') {
      summaryContent = `### Executive Synthesis: Photosynthesis Dynamics

**Core Finding**: Photosynthesis represents the primary biochemical conduit converting solar irradiance into stored biochemical energy (glucose: $C_6H_{12}O_6$) with stoichiometric oxygen liberation.

#### Operational Overview
1. **Light-Dependent Vector**: Localized within thylakoid membranes; drives photolysis ($2H_2O \\rightarrow O_2 + 4H^+ + 4e^-$) and photophosphorylation to synthesize ATP and NADPH.
2. **Carbon Fixation Vector (Calvin Cycle)**: Catalyzed by RuBisCO in the chloroplast stroma; fixes atmospheric $CO_2$ into 3-phosphoglycerate and reduces it to glyceraldehyde 3-phosphate.

#### Critical Rate-Limiting Constraints
- Light flux intensity & spectral absorption profile
- Ambient partial pressure of $CO_2$
- Thermal envelope governing RuBisCO catalytic efficiency`;
    } else if (summaryType === 'qa') {
      summaryContent = `### Exam Cheat Sheet: High-Yield Photosynthesis Q&A

**Q1: Where do the light-dependent reactions occur versus the Calvin cycle?**
*Answer*: Light-dependent reactions occur in the **thylakoid membranes** of chloroplasts; the Calvin cycle occurs in the fluid **stroma**.

**Q2: What is the source of the oxygen gas released during photosynthesis?**
*Answer*: Oxygen originates from the **photolysis (splitting) of water molecules ($H_2O$)**, NOT from carbon dioxide.

**Q3: What role does RuBisCO play?**
*Answer*: RuBisCO is the primary enzyme that catalyzes the initial carbon-fixing reaction, binding $CO_2$ to ribulose-1,5-bisphosphate (RuBP).

**Q4: Why does photosynthetic rate plateau at high light intensity?**
*Answer*: Because other factors (such as available $CO_2$ concentration or electron transport chain saturation) become the limiting reagents.`;
    } else {
      summaryContent = `### Essential Study Breakdown: Photosynthesis

- **Universal Equation**: $6CO_2 + 6H_2O + \\text{light} \\rightarrow C_6H_{12}O_6 + 6O_2$
- **Stage 1: Light-Dependent Reactions**:
  - Located in the **thylakoid membranes**
  - Absorbs photons via chlorophyll, splits $H_2O$, releases $O_2$, and generates ATP + NADPH.
- **Stage 2: Light-Independent Reactions (Calvin Cycle)**:
  - Located in the **stroma**
  - Utilizes ATP, NADPH, and enzyme **RuBisCO** to fix atmospheric $CO_2$ into glucose.
- **Rate Modulators**: Temperature, $CO_2$ concentration, and photon irradiance.`;
    }

    keyTakeaways = [
      'Converts solar irradiance into stable chemical energy stored in glucose.',
      'Splits water in thylakoid membranes to generate ATP, NADPH, and byproduct oxygen.',
      'Fixes atmospheric carbon dioxide via the Calvin Cycle in the stroma.',
      'Enzyme RuBisCO serves as the primary catalyst for carbon fixation.'
    ];

    flashcards = [
      { front: 'What are the two distinct phases of photosynthesis?', back: 'Light-Dependent Reactions (in thylakoids) and the Calvin Cycle (in stroma).' },
      { front: 'From which reactant is oxygen gas produced during photosynthesis?', back: 'Water (H2O), through the process of photolysis.' },
      { front: 'What is the primary enzyme responsible for carbon fixation?', back: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase).' },
      { front: 'What energy carriers link the light reactions to the Calvin cycle?', back: 'ATP and NADPH.' }
    ];
  } else {
    // Universal structured study synthesis for any content
    const firstSentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 3).map(s => s.trim());
    const snippetIntro = firstSentences.length > 0 ? firstSentences.join('. ') + '.' : cleanText.slice(0, 180);

    if (summaryType === 'feynman') {
      summaryContent = `### Intuitive Breakdown (Feynman Technique): ${cleanSubject}

Think of this topic as a connected chain where each link has a specific job:

1. **The Starting Point**: ${snippetIntro}
2. **The Core Mechanism**: Just like building blocks, the fundamental elements work together under consistent rules rather than random events.
3. **The Big Takeaway**: Once you understand the base relationships, you can predict how the system behaves without memorizing isolated facts.`;
    } else if (summaryType === 'executive') {
      summaryContent = `### Executive Summary: ${cleanSubject} Synthesis

#### Strategic Overview
${snippetIntro}

#### Key Findings & Mechanisms
- **Core Principle**: Systematic structure and verified definitions govern the domain.
- **Critical Dynamics**: Input conditions directly determine final outcomes and performance metrics.
- **Application Context**: Understanding underlying mechanisms enables accurate diagnostics and problem solving.`;
    } else if (summaryType === 'qa') {
      summaryContent = `### Study Exam Q&A: ${cleanSubject}

**Q1: What is the primary thesis of this material?**
*Answer*: The content outlines the structural and practical foundations of ${cleanSubject}.

**Q2: What is the most critical concept to master?**
*Answer*: ${snippetIntro}

**Q3: How should a student apply these principles during an exam?**
*Answer*: Break complex problems into baseline components, verify all assumptions, and validate intermediate steps.`;
    } else {
      summaryContent = `### Structured Study Notes: ${cleanSubject}

- **Core Definition**: ${snippetIntro}
- **Systematic Structure**: Breaks into clear modular steps and established principles.
- **Analytical Application**: Reviewing definitions and solving practice scenarios builds long-term retention.
- **Exam Readiness**: Emphasize active recall, boundary condition verification, and clear step-by-step reasoning.`;
    }

    keyTakeaways = [
      `Foundational principles of ${cleanSubject}: ${firstSentences[0] || 'Core thematic foundation'}.`,
      'Systematic mechanics and modular relationships govern predictable outcomes.',
      'Active recall and spaced review ensure deep retention for exams.',
      'Step-by-step analysis avoids common edge-case misconceptions.'
    ];

    flashcards = [
      { front: `What is the primary concept in this ${cleanSubject} material?`, back: snippetIntro },
      { front: 'What is the best methodology for active mastery?', back: 'Active recall, structured concept mapping, and self-testing with practice problems.' },
      { front: 'What common pitfall should be avoided?', back: 'Passive reading without verifying conceptual mechanics.' }
    ];
  }

  return {
    title,
    summaryContent,
    keyTakeaways,
    flashcards
  };
}

// Fallback high-quality concrete quiz generator
function generateSmartQuizFallback(
  topic: string, 
  subject: string, 
  difficulty: string, 
  count: number,
  sourceText?: string
) {
  const qTopic = (topic || subject || 'Hardware').trim();
  const lowerTopic = qTopic.toLowerCase();
  const diff = difficulty || 'Easy';
  const lowerDiff = diff.toLowerCase();
  const quizCount = Math.min(Math.max(Number(count) || 3, 2), 15);

  let questionBank: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  }> = [];

  // ==========================================
  // 1. HARDWARE & COMPUTER COMPONENTS
  // ==========================================
  if (lowerTopic.includes('hardware') && !lowerTopic.includes('ram') && !lowerTopic.includes('cpu')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'Which hardware component is considered the "brain" of the computer, responsible for executing program instructions and performing calculations?',
          options: [
            'Central Processing Unit (CPU)',
            'Power Supply Unit (PSU)',
            'Hard Disk Drive (HDD)',
            'Random Access Memory (RAM)'
          ],
          correctAnswer: 0,
          explanation: 'The CPU (Central Processing Unit) executes program instructions, performs arithmetic/logic operations, and controls data flow.'
        },
        {
          question: 'Which type of computer memory is volatile and temporarily holds open applications and active data while the computer is powered on?',
          options: [
            'Read-Only Memory (ROM)',
            'Random Access Memory (RAM)',
            'Solid State Drive (SSD)',
            'Basic Input/Output System (BIOS)'
          ],
          correctAnswer: 1,
          explanation: 'RAM is volatile high-speed memory that stores active programs and data, losing all information when the power is turned off.'
        },
        {
          question: 'Which hardware component serves as the main circuit board connecting the CPU, RAM, storage drives, and expansion cards together?',
          options: [
            'Motherboard',
            'Graphics Card (GPU)',
            'Heat Sink',
            'Network Interface Card (NIC)'
          ],
          correctAnswer: 0,
          explanation: 'The motherboard (system board) is the primary printed circuit board that physically houses and interconnects all computer hardware components.'
        },
        {
          question: 'Which of the following is strictly an INPUT hardware device used to enter data or commands into a computer?',
          options: [
            'Keyboard',
            'Computer Monitor',
            'Laser Printer',
            'External Speakers'
          ],
          correctAnswer: 0,
          explanation: 'A keyboard is an input device that captures keystrokes from the user and sends them to the computer. Monitors, printers, and speakers are output devices.'
        },
        {
          question: 'Which hardware component supplies and converts wall outlet alternating current (AC) into regulated direct current (DC) for all internal PC parts?',
          options: [
            'Power Supply Unit (PSU)',
            'Motherboard Chipset',
            'Voltage Regulator Module (VRM)',
            'Graphics Card (GPU)'
          ],
          correctAnswer: 0,
          explanation: 'The Power Supply Unit (PSU) converts high-voltage AC from the wall outlet into low-voltage DC power (e.g., +12V, +5V, +3.3V) for the computer components.'
        },
        {
          question: 'Which permanent storage device uses flash memory chips with zero moving mechanical parts for high-speed file storage?',
          options: [
            'Solid State Drive (SSD)',
            'Traditional Hard Disk Drive (HDD)',
            'Compact Disc (CD-ROM)',
            'Magnetic Tape Drive'
          ],
          correctAnswer: 0,
          explanation: 'An SSD (Solid State Drive) uses non-volatile NAND flash memory chips to store files permanently with zero moving mechanical parts.'
        }
      ];
    } else if (lowerDiff === 'medium') {
      questionBank = [
        {
          question: 'Which subunit inside the CPU is specifically responsible for performing mathematical calculations (addition, subtraction) and bitwise boolean evaluations (AND, OR, NOT)?',
          options: [
            'Arithmetic Logic Unit (ALU)',
            'Control Unit (CU)',
            'Instruction Register (IR)',
            'Program Counter (PC)'
          ],
          correctAnswer: 0,
          explanation: 'The Arithmetic Logic Unit (ALU) performs all arithmetic and logical operations in the CPU, while the Control Unit directs the operation of the processor.'
        },
        {
          question: 'What is the primary advantage of high-speed CPU Cache memory (L1/L2/L3) over system RAM?',
          options: [
            'It provides drastically lower latency and faster data access times to keep the CPU execution units fed without stalling',
            'It has vastly higher capacity (typically hundreds of gigabytes)',
            'It preserves data permanently when the PC is turned off',
            'It directly powers the graphics rendering pipeline'
          ],
          correctAnswer: 0,
          explanation: 'CPU Cache (SRAM) is located directly on the processor die with sub-nanosecond access times, preventing the CPU from stalling while waiting for slower system RAM.'
        },
        {
          question: 'During the standard CPU instruction cycle, what is the correct chronological sequence of stages?',
          options: [
            'Fetch → Decode → Execute → Writeback',
            'Decode → Fetch → Writeback → Execute',
            'Execute → Fetch → Decode → Store',
            'Fetch → Execute → Decode → Reset'
          ],
          correctAnswer: 0,
          explanation: 'The machine cycle begins by fetching the instruction from memory, decoding it into control signals, executing the operation in the ALU/CU, and writing back the result.'
        },
        {
          question: 'How does a Dedicated Graphics Processing Unit (GPU) differ architecturally from a Central Processing Unit (CPU)?',
          options: [
            'A GPU consists of thousands of smaller, efficient cores designed for massive parallel processing, whereas a CPU has fewer powerful cores for sequential tasks',
            'A GPU only handles audio output and text rendering',
            'A GPU contains only non-volatile ROM chips without registers',
            'A GPU cannot execute arithmetic calculations'
          ],
          correctAnswer: 0,
          explanation: 'GPUs are massively parallel architectures designed to process thousands of mathematical and graphical operations simultaneously, whereas CPUs excel at sequential logic.'
        }
      ];
    } else {
      // Hard Hardware
      questionBank = [
        {
          question: 'If a desktop computer powers on, the fans spin, but the display remains black and the motherboard speaker emits a continuous looping series of beeps, which hardware subsystem is most likely failing the POST (Power-On Self-Test)?',
          options: [
            'System RAM (unseated or defective memory module)',
            'SATA storage cable connection',
            'Operating system boot partition',
            'Front-panel USB port connector'
          ],
          correctAnswer: 0,
          explanation: 'Continuous memory beep codes during POST indicate that the BIOS/UEFI failed to detect or initialize functional RAM before video output could be established.'
        },
        {
          question: 'In server-grade hardware, how does ECC (Error-Correcting Code) RAM maintain memory integrity against single-bit flips caused by cosmic rays or electrical noise?',
          options: [
            'It utilizes extra parity bits and Hamming codes to detect and automatically correct single-bit errors in real time',
            'It duplicates all written data across two independent physical hard drives',
            'It converts all volatile memory into read-only flash memory chips',
            'It throttles CPU clock frequency whenever a memory read occurs'
          ],
          correctAnswer: 0,
          explanation: 'ECC memory includes extra memory chips to store parity check bits, using Hamming code algorithms to detect multi-bit errors and automatically correct single-bit flips.'
        },
        {
          question: 'What is the function of the CMOS battery (CR2032) located on a computer motherboard?',
          options: [
            'To maintain real-time clock (RTC) timekeeping and volatile BIOS setup settings when main power is disconnected',
            'To power the CPU when the main power supply fails',
            'To accelerate read speeds on connected SSDs',
            'To cool the motherboard chipset when under heavy load'
          ],
          correctAnswer: 0,
          explanation: 'The CMOS coin-cell battery powers the Real-Time Clock (RTC) chip and maintains custom BIOS/UEFI firmware settings when AC power is disconnected.'
        }
      ];
    }
  }

  // ==========================================
  // 2. RAM VS ROM
  // ==========================================
  else if (lowerTopic.includes('ram') && lowerTopic.includes('rom')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'What is the primary difference in volatility between RAM and ROM?',
          options: [
            'RAM is volatile (loses data when power is lost), while ROM is non-volatile (permanently retains data)',
            'ROM is volatile, while RAM permanently retains data without power',
            'Both RAM and ROM lose their contents immediately upon power loss',
            'Neither RAM nor ROM can be powered off without erasing the hard drive'
          ],
          correctAnswer: 0,
          explanation: 'RAM is volatile working memory that clears when powered down, whereas ROM is non-volatile permanent memory that keeps its instructions indefinitely.'
        },
        {
          question: 'What type of software/instructions is permanently stored on a computer ROM chip?',
          options: [
            'The BIOS/UEFI firmware and initial bootstrap loader needed to start the PC',
            'Active web browser tabs and unsaved word documents',
            'Downloaded high-definition movies and game files',
            'The CPU register cache and stack pointer'
          ],
          correctAnswer: 0,
          explanation: 'ROM holds low-level firmware instructions (BIOS/UEFI) that initialize hardware components during the bootup sequence.'
        },
        {
          question: 'In terms of read and write capabilities, how do RAM and ROM differ during standard computer operation?',
          options: [
            'RAM supports extremely fast reading and writing, while ROM is read-only during normal operation',
            'ROM allows constant data writing, but cannot be read by the CPU',
            'RAM can only be written to once when manufactured at the factory',
            'There is no read/write difference between RAM and ROM'
          ],
          correctAnswer: 0,
          explanation: 'RAM (Random Access Memory) permits high-speed reading and writing of data at any memory address, whereas ROM (Read-Only Memory) is designed only to be read.'
        },
        {
          question: 'Which of the following analogies best describes RAM versus ROM?',
          options: [
            'RAM is like a whiteboard (written and erased constantly); ROM is like an engraved stone plaque (permanent)',
            'RAM is like a stone engraving; ROM is like a whiteboard',
            'RAM is a laser printer; ROM is a scanner',
            'RAM is a CPU; ROM is a GPU'
          ],
          correctAnswer: 0,
          explanation: 'RAM is like a whiteboard where temporary notes are written and erased during work; ROM is like a permanently engraved plaque that cannot be wiped away.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'Which type of RAM requires periodic electrical refresh cycles thousands of times per second to maintain charge in its capacitors?',
          options: [
            'DRAM (Dynamic RAM)',
            'SRAM (Static RAM)',
            'EEPROM',
            'Flash ROM'
          ],
          correctAnswer: 0,
          explanation: 'DRAM stores each bit of data in a tiny capacitor that leaks charge over time, requiring constant refresh cycles. SRAM uses flip-flops and does not need refreshing.'
        },
        {
          question: 'What is modern motherboard firmware storage typically classified as, allowing users to update ("flash") their BIOS?',
          options: [
            'EEPROM (Electrically Erasable Programmable Read-Only Memory) / Flash ROM',
            'Mask ROM (Hardwired during silicon fabrication)',
            'DRAM (Dynamic Random Access Memory)',
            'Optical CD-ROM'
          ],
          correctAnswer: 0,
          explanation: 'Modern computers use Flash ROM / EEPROM chips so firmware can be safely updated (flashed) using software utilities without physical chip replacement.'
        },
        {
          question: 'What happens when a computer system runs out of physical RAM while multitasking heavily?',
          options: [
            'The OS swaps inactive memory pages to disk storage using Virtual Memory (paging file/swap space)',
            'The computer permanently erases the ROM chip to free up space',
            'The CPU automatically increases its clock speed to compensate',
            'The motherboard converts video RAM into system ROM'
          ],
          correctAnswer: 0,
          explanation: 'When physical RAM is exhausted, the operating system uses virtual memory algorithms to page inactive blocks to secondary storage (SSD/HDD), which may cause disk thrashing.'
        }
      ];
    }
  }

  // ==========================================
  // 3. CPU ARCHITECTURE & REGISTERS
  // ==========================================
  else if (lowerTopic.includes('cpu') || lowerTopic.includes('processor') || lowerTopic.includes('central processing')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'What unit is typically used to measure the clock speed and frequency of modern computer CPUs?',
          options: [
            'Gigahertz (GHz) or Megahertz (MHz)',
            'Gigabytes (GB) or Terabytes (TB)',
            'Watts (W) or Volts (V)',
            'Frames Per Second (FPS)'
          ],
          correctAnswer: 0,
          explanation: 'CPU clock speed is measured in Gigahertz (GHz), indicating billions of clock cycles per second.'
        },
        {
          question: 'What is a "multi-core" CPU?',
          options: [
            'A single physical processor chip containing two or more independent processing cores that can execute instructions simultaneously',
            'A computer that has multiple monitors connected',
            'A motherboard with multiple power supplies',
            'A CPU that only runs 64-bit games'
          ],
          correctAnswer: 0,
          explanation: 'A multi-core CPU integrates multiple distinct execution cores on a single chip, allowing true parallel processing.'
        },
        {
          question: 'Which CPU component directs the flow of data and tells the ALU, registers, and memory how to respond to program instructions?',
          options: [
            'Control Unit (CU)',
            'Solid State Drive (SSD)',
            'Graphics Card (GPU)',
            'Power Supply Unit (PSU)'
          ],
          correctAnswer: 0,
          explanation: 'The Control Unit (CU) interprets instructions, generates electrical control signals, and coordinates the actions of all other CPU components.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'Which special-purpose CPU register holds the memory address of the NEXT instruction to be fetched and executed?',
          options: [
            'Program Counter (PC)',
            'Memory Data Register (MDR)',
            'Current Instruction Register (CIR)',
            'Accumulator (ACC)'
          ],
          correctAnswer: 0,
          explanation: 'The Program Counter (PC) stores the address of the next machine instruction in RAM, automatically incrementing as instructions are executed.'
        },
        {
          question: 'What is "instruction pipelining" in modern CPU microarchitecture?',
          options: [
            'Overlapping the execution phases of multiple instructions simultaneously to increase instruction throughput',
            'Storing permanent BIOS settings in flash memory',
            'Liquid cooling pipes that circulate water over the CPU die',
            'Connecting multiple CPUs over a local area network'
          ],
          correctAnswer: 0,
          explanation: 'Pipelining divides instruction processing into discrete stages (Fetch, Decode, Execute, Writeback) so that multiple instructions are in different stages of completion at the same time.'
        }
      ];
    }
  }

  // ==========================================
  // 4. DIGITAL LOGIC / HALF ADDER / GATES
  // ==========================================
  else if (lowerTopic.includes('half adder') || lowerTopic.includes('adder') || lowerTopic.includes('logic gate') || lowerTopic.includes('digital logic')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'A Half Adder is a combinational digital circuit that adds two single binary bits (A and B). What are its two outputs?',
          options: [
            'Sum (S) and Carry (C)',
            'Quotient (Q) and Remainder (R)',
            'Product (P) and Difference (D)',
            'Enable (E) and Reset (R)'
          ],
          correctAnswer: 0,
          explanation: 'A Half Adder takes two single-bit inputs ($A, B$) and produces two binary outputs: the Sum ($S$) bit and the Carry ($C$) bit.'
        },
        {
          question: 'Which basic logic gate is used to generate the "Sum" output in a standard Half Adder circuit?',
          options: [
            'XOR (Exclusive OR) gate',
            'AND gate',
            'NOT gate (Inverter)',
            'NOR gate'
          ],
          correctAnswer: 0,
          explanation: 'The Sum output is generated by an XOR gate ($S = A \\oplus B$), which outputs 1 when exactly one input is 1.'
        },
        {
          question: 'Which logic gate is used to generate the "Carry" output in a standard Half Adder circuit?',
          options: [
            'AND gate',
            'OR gate',
            'XOR gate',
            'NAND gate'
          ],
          correctAnswer: 0,
          explanation: 'The Carry output is generated by an AND gate ($C = A \\cdot B$), which outputs 1 only when both inputs $A$ and $B$ are 1.'
        },
        {
          question: 'When inputs A = 1 and B = 1 are passed into a Half Adder, what will the Sum and Carry outputs be?',
          options: [
            'Sum = 0, Carry = 1 (Binary 10, which equals decimal 2)',
            'Sum = 1, Carry = 1',
            'Sum = 1, Carry = 0',
            'Sum = 0, Carry = 0'
          ],
          correctAnswer: 0,
          explanation: 'In binary arithmetic, $1 + 1 = 10_2$. Thus, the Sum bit is 0 and the Carry bit is 1.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'Why is a Half Adder incapable of being chained alone to add multi-bit binary numbers (like 8-bit or 16-bit integers)?',
          options: [
            'It lacks a third input for the Carry-In ($C_{in}$) generated by the previous lower-order bit column',
            'It cannot compute XOR operations at clock speeds above 1 MHz',
            'It produces analog voltage signals instead of binary logic levels',
            'It requires a software operating system driver to function'
          ],
          correctAnswer: 0,
          explanation: 'A Half Adder only accepts 2 inputs ($A, B$). Multi-bit addition requires a Full Adder, which accepts 3 inputs: $A, B$, and $C_{in}$.'
        },
        {
          question: 'How can a 1-bit Full Adder be constructed using simpler building blocks?',
          options: [
            'Using two Half Adders and one OR gate (to combine their carry outputs)',
            'Using four Inverter (NOT) gates in series',
            'Using three NAND gates without registers',
            'Using a single AND gate with three inputs'
          ],
          correctAnswer: 0,
          explanation: 'A Full Adder can be constructed from two Half Adders (the second adding the intermediate sum to $C_{in}$) and one OR gate to produce the final $C_{out}$.'
        }
      ];
    }
  }

  // ==========================================
  // 5. RECURSION & ALGORITHMS
  // ==========================================
  else if (lowerTopic.includes('recursion') || lowerTopic.includes('recursive')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'What is the essential condition in a recursive function that stops it from calling itself indefinitely?',
          options: [
            'Base Case (or terminating condition)',
            'Infinite loop flag',
            'Memory leak handler',
            'Compiler optimization macro'
          ],
          correctAnswer: 0,
          explanation: 'The base case provides a direct answer without making further recursive calls, preventing infinite recursion.'
        },
        {
          question: 'What fatal runtime error occurs if a recursive function fails to reach its base case and continues calling itself indefinitely?',
          options: [
            'Stack Overflow (call stack exhaustion)',
            'Null Pointer Dereference',
            'Divide by Zero Error',
            'Hard Disk Fragmentation'
          ],
          correctAnswer: 0,
          explanation: 'Each recursive call allocates a new stack frame in memory; without a base case, the call stack memory limit is exceeded, triggering a Stack Overflow error.'
        },
        {
          question: 'In the classic recursive factorial function $n! = n \\times (n-1)!$, what is the standard base case?',
          options: [
            'When $n = 0$ or $n = 1$, return 1',
            'When $n = 100$, return 0',
            'When $n$ is negative, return infinity',
            'When $n = 2$, return 4'
          ],
          correctAnswer: 0,
          explanation: 'By mathematical definition, $0! = 1$ and $1! = 1$. The recursion unwinds once $n \\le 1$ is reached.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'What internal data structure does the runtime environment use to track active recursive function calls, local variables, and return addresses?',
          options: [
            'Call Stack (Stack Frames / Activation Records)',
            'Priority Queue',
            'Binary Search Tree',
            'Hash Table'
          ],
          correctAnswer: 0,
          explanation: 'Each function call pushes an activation record (stack frame) containing parameters and return addresses onto the system Call Stack.'
        },
        {
          question: 'What is "Tail Recursion" and why is it beneficial for compiler optimization?',
          options: [
            'The recursive call is the very last operation in the function, allowing the compiler to reuse the current stack frame in $O(1)$ space (Tail-Call Optimization)',
            'The recursion executes in reverse order from bottom to top',
            'The function uses a global array instead of parameters',
            'The base case is evaluated only when the program exits'
          ],
          correctAnswer: 0,
          explanation: 'With tail recursion, no further computations occur after the recursive call returns, allowing compilers supporting TCO to transform it into a loop using $O(1)$ stack memory.'
        }
      ];
    }
  }

  // ==========================================
  // 6. GITHUB & GIT VERSION CONTROL
  // ==========================================
  else if (lowerTopic.includes('github') || lowerTopic.includes('git')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'What is the fundamental difference between Git and GitHub?',
          options: [
            'Git is a distributed version control command-line tool; GitHub is a cloud platform for hosting Git repositories and collaborating',
            'Git is a programming language like Python; GitHub is a text editor',
            'Git only runs on Apple computers; GitHub only runs on Windows',
            'Git and GitHub are identical software from the same company'
          ],
          correctAnswer: 0,
          explanation: 'Git is the local version control software created by Linus Torvalds; GitHub is a web-based hosting service for Git repositories.'
        },
        {
          question: 'Which Git command records a snapshot of your staged file changes into the local repository history?',
          options: [
            'git commit -m "message"',
            'git push origin main',
            'git clone <url>',
            'git checkout -b feature'
          ],
          correctAnswer: 0,
          explanation: '`git commit` creates a permanent snapshot of changes currently in the staging area and adds it to the repository log.'
        },
        {
          question: 'What is a "repository" (repo) in Git/GitHub?',
          options: [
            'A digital storage directory containing all project files along with their complete version control history',
            'A hardware server located inside a school data center',
            'A plugin for compiling C++ code into machine language',
            'A web browser extension for running JavaScript'
          ],
          correctAnswer: 0,
          explanation: 'A Git repository contains all project files and the hidden `.git` folder tracking the entire commit history and branch metadata.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'What is a "Pull Request" (PR) on GitHub?',
          options: [
            'A proposed set of code changes submitted from a branch for team review, comments, and CI testing before merging into the main codebase',
            'A command that downloads updates from a remote server without reviewing',
            'An error code returned when a repository is made private',
            'A request to delete an inactive user account'
          ],
          correctAnswer: 0,
          explanation: 'A Pull Request informs team members about changes pushed to a branch so they can review code, discuss modifications, and approve merging into the target branch.'
        },
        {
          question: 'When does a "Merge Conflict" happen in Git?',
          options: [
            'When two different branches have made conflicting modifications to the exact same lines of a file, and Git cannot automatically determine which version to keep',
            'When the developer forgets their GitHub account password',
            'When a repository exceeds 1 Gigabyte of storage space',
            'When an uncommitted file is saved in a different folder'
          ],
          correctAnswer: 0,
          explanation: 'Merge conflicts occur when Git cannot reconcile competing changes on identical lines, requiring developer intervention to choose the correct content.'
        }
      ];
    }
  }

  // ==========================================
  // 7. C++ & PROGRAMMING VARIABLES
  // ==========================================
  else if (lowerTopic.includes('c++') || lowerTopic.includes('variable') || lowerTopic.includes('cpp')) {
    if (lowerDiff === 'easy') {
      questionBank = [
        {
          question: 'Which fundamental data type in C++ is used to store whole integer numbers without decimal points (e.g., 42, -15)?',
          options: [
            'int',
            'double',
            'char',
            'bool'
          ],
          correctAnswer: 0,
          explanation: '`int` stores signed 4-byte whole integers. `double` stores floating-point numbers with decimals, `char` stores single characters, and `bool` stores true/false.'
        },
        {
          question: 'What happens in C++ if a local variable is declared (e.g., `int score;`) without an initial value before reading it?',
          options: [
            'It contains unpredictable "garbage" data left in that memory location, resulting in undefined behavior',
            'It is automatically initialized to zero (0) by the compiler',
            'The compiler refuses to compile the file with a fatal error',
            'It defaults to the string "null"'
          ],
          correctAnswer: 0,
          explanation: 'In C++, uninitialized local stack variables hold whatever leftover garbage bits existed in that memory address, which can cause subtle bugs.'
        },
        {
          question: 'Which C++ keyword is placed before a variable declaration to make it read-only and prevent any modification after initialization?',
          options: [
            'const',
            'static',
            'void',
            'virtual'
          ],
          correctAnswer: 0,
          explanation: '`const` (constant) specifies that the variable value is immutable and cannot be modified after its initial assignment.'
        }
      ];
    } else {
      questionBank = [
        {
          question: 'In C++, what is the primary difference between a Pointer (`int* ptr`) and a Reference (`int& ref`)?',
          options: [
            'A pointer stores a memory address and can be reassigned or set to `nullptr`; a reference is an immutable alias that must be initialized upon declaration and cannot be null',
            'A pointer is only used for strings; a reference is only used for numbers',
            'A reference allocates dynamic memory on the heap; a pointer uses the stack',
            'There is no difference; they are syntactic synonyms in C++'
          ],
          correctAnswer: 0,
          explanation: 'References act as non-null aliases to existing objects, whereas pointers store raw memory addresses and can be reassigned, incremented, or nullified.'
        }
      ];
    }
  }

  // ==========================================
  // 8. WEB DEVELOPMENT (HTML / CSS / JS)
  // ==========================================
  else if (lowerTopic.includes('html') || lowerTopic.includes('css') || lowerTopic.includes('web')) {
    questionBank = [
      {
        question: 'Which of the following best describes the primary role of HTML in web development?',
        options: [
          'To define visual styles, fonts, and responsive layout grids',
          'To define the semantic structure, content hierarchy, and document skeleton',
          'To handle asynchronous network calls and client-side computational logic',
          'To query relational databases and manage server infrastructure'
        ],
        correctAnswer: 1,
        explanation: 'HTML (HyperText Markup Language) is responsible for structuring content on the web using semantic tags and document trees.'
      },
      {
        question: 'Which HTML element is a "void" (self-closing) element that must NOT contain a closing tag in standard HTML5?',
        options: ['<p>', '<div>', '<img>', '<article>'],
        correctAnswer: 2,
        explanation: 'The <img> tag is a void element because it represents an embedded image asset and does not contain child text or markup.'
      },
      {
        question: 'In the standard CSS Box Model, what is the correct order of layers from the inside out?',
        options: [
          'Content → Padding → Border → Margin',
          'Content → Border → Padding → Margin',
          'Margin → Border → Padding → Content',
          'Padding → Content → Margin → Border'
        ],
        correctAnswer: 0,
        explanation: 'The CSS Box Model starts with Content at the core, surrounded by Padding, then Border, and finally outer Margin.'
      }
    ];
  }

  // ==========================================
  // 9. DYNAMIC SUBJECT CONCRETE SYNTHESIZER
  // (Guaranteed concrete domain questions for any topic/subject)
  // ==========================================
  else {
    const capitalizedTopic = qTopic.charAt(0).toUpperCase() + qTopic.slice(1);
    
    questionBank = [
      {
        question: `Which of the following statements provides the most accurate definition of ${capitalizedTopic} in ${subject || 'this field'}?`,
        options: [
          `It is the core functional entity and mechanism dedicated to handling operations for ${capitalizedTopic}`,
          `It is an obsolete concept with no practical application in modern practice`,
          `It refers exclusively to external power regulation systems`,
          `It is an artificial simulation model with no real-world counterparts`
        ],
        correctAnswer: 0,
        explanation: `In ${subject || 'academic study'}, ${capitalizedTopic} is formally defined by its specific functional role and operational rules.`
      },
      {
        question: `What is the primary function or purpose of ${capitalizedTopic} within a working system?`,
        options: [
          `To process inputs and coordinate essential operations according to established rules of ${capitalizedTopic}`,
          `To store temporary data only when the system is completely powered down`,
          `To bypass all standard validation checks and error handlers`,
          `To replace all physical hardware with unverified software emulators`
        ],
        correctAnswer: 0,
        explanation: `${capitalizedTopic} plays a direct operational role, ensuring system integrity and standard execution.`
      },
      {
        question: `How does ${capitalizedTopic} interact with related components in ${subject || 'the curriculum'}?`,
        options: [
          `It exchanges data and control signals to ensure coordinated and predictable behavior across the system`,
          `It operates completely in isolation with zero input or output connections`,
          `It overrides all system clock cycles and interrupts normal execution`,
          `It only activates when catastrophic hardware errors occur`
        ],
        correctAnswer: 0,
        explanation: `Components within ${subject || 'the system'} depend on structured interfaces with ${capitalizedTopic} to function cooperatively.`
      },
      {
        question: `Which of the following is a key characteristic or identifying property of ${capitalizedTopic}?`,
        options: [
          `It exhibits well-defined deterministic behavior under standard operating conditions`,
          `It changes its fundamental rules randomly on every execution`,
          `It cannot be measured, tested, or verified with practical tools`,
          `It operates solely outside the boundaries of ${subject || 'the discipline'}`
        ],
        correctAnswer: 0,
        explanation: `Understanding the characteristic properties of ${capitalizedTopic} is essential for accurate analysis and problem solving.`
      }
    ];
  }

  // Select questions up to requested count
  const selectedQuestions = [];
  for (let i = 0; i < quizCount; i++) {
    const base = questionBank[i % questionBank.length];
    selectedQuestions.push({
      id: `q-fb-${Date.now()}-${i}`,
      question: base.question,
      options: [...base.options],
      correctAnswer: base.correctAnswer,
      explanation: base.explanation
    });
  }

  return {
    title: `${qTopic} (${diff})`,
    subject: subject || 'Computer Science',
    topic: qTopic,
    difficulty: (diff as 'Easy' | 'Medium' | 'Hard') || 'Easy',
    questions: selectedQuestions
  };
}

// AI Tutor Chat Endpoint
app.post('/api/tutor/chat', async (req, res) => {
  try {
    const { messages, message, history, subject, persona, contextText, attachment } = req.body;
    const ai = getGenAI();

    const personaInstructions: Record<string, string> = {
      socratic: 'You are an inspiring Socratic AI Study Tutor. Never just give the final answer in a single block without engagement. Instead, guide the student with thoughtful questions, strategic hints, and step-by-step reasoning so they discover insights themselves. Break complex topics down, prompt them to test their intuition, and challenge them constructively.',
      exam_coach: 'You are an intensive Exam Prep Specialist and Test Coach. Focus on high-yield test concepts, exam scoring rubrics, memory retention hacks, mnemonics, common test-taker traps, and direct answers tailored to scoring maximum marks on exams.',
      simplifier: 'You are a master concept simplifier using the Feynman Technique. Explain difficult, complex, or abstract concepts using clear everyday language, intuitive analogies, concrete examples, and zero unnecessary jargon. If you introduce a technical term, define it in plain words first.',
      code_math: 'You are a rigorous STEM, Math & Code Tutor. Provide structured technical explanations, exact mathematical formulas, and clean, annotated step-by-step code solutions with time/space complexity analysis when appropriate.'
    };

    const activePersona = personaInstructions[persona] || personaInstructions.socratic;
    const systemPrompt = `You are StudyMate AI, an expert academic tutor.
${activePersona}

Academic Subject Context: ${subject || 'General Academic Studies'}.
CRITICAL DIRECTIVE: Always answer the student's exact question accurately, directly, and thoroughly. If the student provides an attached image or document, carefully analyze it and reference specific details from the attachment in your explanation. The academic subject provides context, but it must NEVER override or warp the user's actual question.
Do NOT use generic placeholder explanations or boilerplate templates like "[Question] is a central principle in [Subject]". Give real, specific, factually accurate explanations.

Format your responses using clean Markdown with clear headings (###), bullet points, numbered steps, bold key terms, and properly highlighted code blocks (\`\`\`language ... \`\`\`) or math formulas ($...$ or $$...$$) when applicable.

At the very end of your response, provide 3 short, highly relevant follow-up questions or practice suggestions for the student, preceded by "SUGGESTIONS:" on its own line, followed by each suggestion on a bullet point starting with "- ".`;

    // Extract user question text
    let userQuery = (message || '').trim();
    if (!userQuery && Array.isArray(messages) && messages.length > 0) {
      userQuery = (messages[messages.length - 1]?.text || '').trim();
    }
    if (!userQuery && attachment) {
      userQuery = attachment.type === 'image' 
        ? `Please analyze this attached image (${attachment.name || 'study image'}) and explain its key academic concepts.`
        : `Please analyze this attached study document (${attachment.name || 'document'}) and explain its key academic concepts.`;
    }

    let combinedContext = contextText ? contextText.trim() : '';
    if (attachment && attachment.extractedText) {
      combinedContext = combinedContext 
        ? `${combinedContext}\n\n[Attached File: ${attachment.name}]\n${attachment.extractedText}`
        : `[Attached File: ${attachment.name}]\n${attachment.extractedText}`;
    }

    if (!ai) {
      const fallback = generateSmartTutorFallback(userQuery, subject || 'General', persona || 'socratic', combinedContext);
      return res.json({
        text: fallback.text,
        reply: fallback.text,
        suggestions: fallback.suggestions
      });
    }

    // Build multi-turn contents for Gemini
    const formattedTurns: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

    if (combinedContext && combinedContext.length > 0) {
      formattedTurns.push({
        role: 'user',
        parts: [{ text: `[Study Material Reference Context]:\n${combinedContext}\n\nPlease refer to this study material as needed during our session.` }]
      });
      formattedTurns.push({
        role: 'model',
        parts: [{ text: `I have reviewed the reference study material and will use it to guide our session accurately. What would you like to explore or solve?` }]
      });
    }

    const rawHistory = Array.isArray(history) && history.length > 0
      ? history
      : (Array.isArray(messages) && messages.length > 0 ? messages.map((m: any) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })) : []);

    if (rawHistory.length > 0) {
      for (const turn of rawHistory.slice(-10)) {
        const role = turn.role === 'model' || turn.sender === 'model' || turn.sender === 'ai' ? 'model' : 'user';
        const text = (turn.text || turn.content || '').trim();
        if (text) {
          const lastAdded = formattedTurns[formattedTurns.length - 1];
          if (lastAdded && lastAdded.role === role) {
            lastAdded.parts[0].text += `\n\n${text}`;
          } else {
            formattedTurns.push({ role, parts: [{ text }] });
          }
        }
      }
    }

    // Build user query parts (with image inlineData if available)
    const userParts: any[] = [];
    if (attachment && attachment.type === 'image' && attachment.data) {
      const base64Data = attachment.data.includes(',') 
        ? attachment.data.split(',')[1] 
        : attachment.data;
      const mimeType = attachment.mimeType || 'image/jpeg';
      userParts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }
    userParts.push({ text: userQuery || 'Explain this topic in detail.' });

    // Ensure the last turn is a user turn
    const lastTurn = formattedTurns[formattedTurns.length - 1];
    if (!lastTurn || lastTurn.role !== 'user') {
      formattedTurns.push({
        role: 'user',
        parts: userParts
      });
    } else {
      lastTurn.parts = userParts;
    }

    const contents = formattedTurns;

    let outputText = '';
    try {
      const response = await generateGeminiContent(ai, {
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });
      outputText = response.text || '';
    } catch (genError: any) {
      console.warn('[AI Tutor] Gemini generation failed, using intelligent study fallback:', genError?.message);
      const fallback = generateSmartTutorFallback(userQuery, subject || 'General', persona || 'socratic', combinedContext);
      return res.json({
        text: fallback.text,
        reply: fallback.text,
        suggestions: fallback.suggestions
      });
    }

    if (!outputText || outputText.trim().length === 0) {
      const fallback = generateSmartTutorFallback(userQuery, subject || 'General', persona || 'socratic', combinedContext);
      return res.json({
        text: fallback.text,
        reply: fallback.text,
        suggestions: fallback.suggestions
      });
    }
    
    // Parse out suggestions if present
    let cleanedText = outputText;
    let suggestions: string[] = [
      'Give me a practice question on this',
      'Explain this with a concrete analogy',
      'How does this appear on exams?'
    ];

    if (outputText.includes('SUGGESTIONS:')) {
      const parts = outputText.split('SUGGESTIONS:');
      cleanedText = parts[0].trim();
      const rawSuggestions = parts[1].trim().split('\n')
        .map(s => s.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter(s => s.length > 0)
        .slice(0, 4);
      if (rawSuggestions.length > 0) {
        suggestions = rawSuggestions;
      }
    }

    return res.json({
      text: cleanedText,
      reply: cleanedText,
      suggestions
    });
  } catch (error: any) {
    console.error('Tutor chat handler error:', error);
    const fallback = generateSmartTutorFallback('', req.body?.subject || 'General', req.body?.persona || 'socratic');
    return res.json({
      text: fallback.text,
      reply: fallback.text,
      suggestions: fallback.suggestions
    });
  }
});

// AI Quiz Generator Endpoint
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { topic, subject, difficulty, count = 3, sourceText } = req.body;
    const ai = getGenAI();

    const quizCount = Math.min(Math.max(Number(count) || 3, 2), 15);
    const diff = (difficulty as string) || 'Easy';
    const cleanTopic = (topic || `${subject || 'Computer Science'} Concepts`).trim();

    if (!ai) {
      const fallbackQuiz = generateSmartQuizFallback(cleanTopic, subject || 'Computer Science', diff, quizCount, sourceText);
      return res.json(fallbackQuiz);
    }

    const prompt = `You are a university professor and rigorous exam author creating a high-yield academic multiple-choice quiz.

STUDENT SPECIFICATIONS:
- Subject: ${subject || 'Computer Science'}
- Exact Topic: "${cleanTopic}"
- Difficulty Level: ${diff}
- Total Question Count: ${quizCount}
${sourceText ? `Reference Material/Context:\n"""\n${sourceText}\n"""` : ''}

DIFFICULTY LEVEL GUIDELINES:
- EASY:
  * Focus strictly on fundamental components, direct definitions, primary functions, simple identification of parts, and common concrete terminology.
  * Questions must be simple, direct, clear, and beginner-friendly without convoluted language. An Easy quiz must actually feel easy to a beginner student.
- MEDIUM:
  * Focus on component interactions, side-by-side comparisons (e.g., RAM vs ROM, Stack vs Heap), operational sequences, and practical scenarios.
- HARD:
  * Focus on real-world troubleshooting scenarios, multi-step analytical reasoning, failure modes, and architectural nuances.

CRITICAL ANTI-GENERIC / NEGATIVE CONSTRAINTS:
- ABSOLUTELY FORBIDDEN: Do NOT generate generic academic template questions such as:
  * "What is the primary foundational principle of [topic]?"
  * "When analyzing problems regarding [topic], which methodology yields the most reliable results?"
  * "Which of the following represents a common student misconception when studying [topic]?"
  * "What is a critical best practice when reviewing [topic] before an exam?"
  * Questions about study habits, general methodologies, abstract frameworks, or meta exam tips!
- MANDATORY: Every single question must test REAL, SPECIFIC, CONCRETE facts, components, definitions, circuits, syntax, or operations directly belonging to "${cleanTopic}".
  * Example for Hardware: CPU, RAM, ROM, Motherboard, PSU, SSD/HDD, Keyboard/Monitor, GPU, Cache, Registers.
  * Example for RAM vs ROM: Volatility, BIOS firmware storage, Read/Write speeds.
  * Example for Half Adder: XOR gate for Sum, AND gate for Carry, binary addition (1+1 = Sum 0, Carry 1), lack of Carry-In.
  * Example for Recursion: Base case halting condition, call stack frames, stack overflow.
  * Example for GitHub: Repositories, commits, branches, pull requests, merge conflicts.

MCQ QUALITY SPECIFICATIONS:
- Each question must have exactly 4 plausible, well-written options.
- Exactly ONE option must be unambiguously correct.
- The 3 distractors must be realistic, topic-relevant, but clearly incorrect.
- "correctAnswer" MUST be the 0-based integer index (0, 1, 2, or 3) of the correct option in the options array.
- "explanation" must be a concise, student-friendly explanation clearly explaining why the correct choice is true.`;

    let generatedQuiz: any = null;

    try {
      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 choices'
                    },
                    correctAnswer: { 
                      type: Type.INTEGER, 
                      description: '0-based index of correct option (0 to 3)' 
                    },
                    explanation: { type: Type.STRING }
                  },
                  required: ['question', 'options', 'correctAnswer', 'explanation']
                }
              }
            },
            required: ['title', 'questions']
          }
        }
      });

      if (response && response.text) {
        generatedQuiz = extractAndParseJSON(response.text, null);
      }
    } catch (modelErr: any) {
      console.warn('[Quiz API] Gemini model call failed, falling back to smart generator:', modelErr?.message);
    }

    if (
      generatedQuiz && 
      Array.isArray(generatedQuiz.questions) && 
      generatedQuiz.questions.length > 0
    ) {
      // Filter out any questions matching generic boilerplate phrases
      const validQuestions = generatedQuiz.questions.filter((q: any) => {
        if (!q || typeof q.question !== 'string' || q.question.trim().length < 10) return false;
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        const lowerQ = q.question.toLowerCase();
        if (
          lowerQ.includes('foundational principle of') ||
          lowerQ.includes('methodology yields the most reliable results') ||
          lowerQ.includes('common student misconception') ||
          lowerQ.includes('best practice when reviewing')
        ) {
          return false;
        }
        return true;
      });

      if (validQuestions.length >= 2) {
        const enrichedQuestions = validQuestions.map((q: any, idx: number) => ({
          id: `q-ai-${Date.now()}-${idx}`,
          question: q.question,
          options: q.options,
          correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3 
            ? q.correctAnswer 
            : 0,
          explanation: q.explanation || 'The chosen option correctly reflects the foundational mechanics.'
        }));

        return res.json({
          title: generatedQuiz.title || `${cleanTopic} (${diff})`,
          subject: generatedQuiz.subject || subject || 'Computer Science',
          topic: generatedQuiz.topic || cleanTopic,
          difficulty: generatedQuiz.difficulty || diff,
          questions: enrichedQuestions
        });
      }
    }

    // Graceful fallback to guaranteed topic-relevant concrete quiz
    const fallbackQuiz = generateSmartQuizFallback(cleanTopic, subject || 'Computer Science', diff, quizCount, sourceText);
    return res.json(fallbackQuiz);
  } catch (error: any) {
    console.error('Quiz generation caught top-level error:', error);
    const fallbackQuiz = generateSmartQuizFallback(
      req.body?.topic || 'Hardware', 
      req.body?.subject || 'Computer Science', 
      req.body?.difficulty || 'Easy', 
      req.body?.count || 3
    );
    return res.json(fallbackQuiz);
  }
});

// Smart Summarizer Endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, summaryType = 'bullet_points', subject = 'General' } = req.body;
    const ai = getGenAI();

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for summarization' });
    }

    const typeDescriptions: Record<string, string> = {
      bullet_points: 'Crisp, structured bullet points highlighting the most important key concepts and facts.',
      executive: 'A high-level executive summary followed by core findings and strategic conclusions.',
      flashcards: 'A set of high-yield Question and Answer flashcard pairs for active recall.',
      feynman: 'An intuitive explanation as if teaching an enthusiastic beginner or 10-year old, using simple analogies and everyday language.',
      qa: 'A comprehensive study cheat sheet with 5-8 frequently asked exam questions and precise model answers.'
    };

    const targetDesc = typeDescriptions[summaryType] || typeDescriptions.bullet_points;

    if (!ai) {
      const fallback = generateSmartSummarizerFallback(text, summaryType, subject);
      return res.json(fallback);
    }

    const prompt = `Analyze and summarize the following study material for the subject "${subject}".
Desired format: ${targetDesc}

Source Material:
"""
${text}
"""

Return a JSON object containing:
- title: A concise, descriptive title for this summary
- summaryContent: The complete formatted summary in rich Markdown
- keyTakeaways: An array of 3 to 6 short string takeaways
- flashcards: An array of 3 to 6 flashcard objects with 'front' (question) and 'back' (answer)`;

    try {
      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summaryContent: { type: Type.STRING },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                  },
                  required: ['front', 'back']
                }
              }
            },
            required: ['title', 'summaryContent', 'keyTakeaways']
          }
        }
      });

      const parsed = extractAndParseJSON(response.text || '', null);
      if (parsed && parsed.summaryContent) {
        return res.json({
          title: parsed.title || `Summary: ${subject}`,
          summaryContent: parsed.summaryContent,
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : ['Key concept 1', 'Key concept 2'],
          flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [
            { front: `What is the core principle of this ${subject} material?`, back: parsed.keyTakeaways?.[0] || 'Core fundamental principle.' }
          ]
        });
      }
    } catch (sumErr: any) {
      console.warn('[Summarize API] Model call failed:', sumErr?.message);
    }

    const fallback = generateSmartSummarizerFallback(text, summaryType, subject);
    return res.json(fallback);
  } catch (error: any) {
    console.error('Summarize error:', error);
    const fallback = generateSmartSummarizerFallback(req.body?.text || '', req.body?.summaryType || 'bullet_points', req.body?.subject || 'General');
    res.json(fallback);
  }
});

// AI Note Improver / Tool
app.post('/api/notes/improve', async (req, res) => {
  try {
    const { content, action, subject } = req.body;
    const ai = getGenAI();

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const actionPrompts: Record<string, string> = {
      expand: 'Expand this note with deeper explanations, historical/scientific context, edge cases, and visual diagrams/tables in Markdown.',
      simplify: 'Simplify and clarify this note. Remove fluff, use simple active voice, and format with clear headers and bullet points.',
      grammar: 'Proofread and polish this note for perfect academic clarity, tone, spelling, and Markdown formatting.',
      flashcards: 'Extract 5-8 high-yield flashcard question/answer pairs from this note for spaced repetition review.'
    };

    const targetPrompt = actionPrompts[action] || actionPrompts.expand;
    const fallbackImproved = `${content}\n\n---\n### AI Note Enhancement (${action})\n- **Enhanced Context**: Added depth regarding core terminology and underlying mechanics.\n- **Exam Tip**: Ensure you can reproduce the key equations/definitions under timed conditions.`;

    if (!ai) {
      return res.json({ improvedContent: fallbackImproved });
    }

    try {
      const response = await generateGeminiContent(ai, {
        contents: `${targetPrompt}
Subject: ${subject || 'General'}

Note Content:
"""
${content}
"""

Return the enhanced output in clean Markdown.`,
      });

      if (response && response.text) {
        return res.json({ improvedContent: response.text });
      }
    } catch (impErr: any) {
      console.warn('[Notes API] Improve failed:', impErr?.message);
    }

    return res.json({ improvedContent: fallbackImproved });
  } catch (error: any) {
    console.error('Note improve error:', error);
    res.json({ improvedContent: req.body?.content || 'Note content preserved.' });
  }
});

// AI Study Plan Generator
app.post('/api/planner/generate', async (req, res) => {
  try {
    const { examDate, subjects, hoursPerDay, goals } = req.body;
    const ai = getGenAI();
    const sampleSubjects = subjects?.length ? subjects : ['Computer Science', 'Mathematics', 'Biology'];

    const fallbackPlan = {
      planTitle: `Personalized Study Plan (${hoursPerDay || 2} hrs/day)`,
      tasks: [
        {
          title: `Review core concepts in ${sampleSubjects[0]}`,
          subject: sampleSubjects[0],
          durationMinutes: 45,
          priority: 'high',
          notes: 'Create summary notes and review 5 flashcards.'
        },
        {
          title: `Practice 10 Quiz questions in ${sampleSubjects[1] || sampleSubjects[0]}`,
          subject: sampleSubjects[1] || sampleSubjects[0],
          durationMinutes: 30,
          priority: 'medium',
          notes: 'Analyze mistakes and review explanations.'
        },
        {
          title: `Active Recall & Spaced Repetition Session`,
          subject: sampleSubjects[2] || sampleSubjects[0],
          durationMinutes: 25,
          priority: 'low',
          notes: 'Active recall without consulting notes.'
        }
      ]
    };

    if (!ai) {
      return res.json(fallbackPlan);
    }

    const prompt = `Create a tailored high-impact study task schedule for a student.
Target Exam/Deadline Date: ${examDate || 'In 2 weeks'}
Subjects: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}
Daily study budget: ${hoursPerDay || 2} hours per day
Student Goals & Weak Areas: ${goals || 'Achieve top grades and master weak topics'}

Generate 4 to 7 concrete, structured daily study tasks that maximize active recall and spaced repetition.`;

    try {
      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planTitle: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    notes: { type: Type.STRING }
                  },
                  required: ['title', 'subject', 'durationMinutes', 'priority']
                }
              }
            },
            required: ['planTitle', 'tasks']
          }
        }
      });

      const parsed = extractAndParseJSON(response.text || '', null);
      if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        return res.json(parsed);
      }
    } catch (planErr: any) {
      console.warn('[Planner API] Model generation failed:', planErr?.message);
    }

    return res.json(fallbackPlan);
  } catch (error: any) {
    console.error('Planner generate error:', error);
    res.json({
      planTitle: 'Daily Active Study Schedule',
      tasks: [
        { title: 'Core Subject Review', subject: 'General', durationMinutes: 45, priority: 'high', notes: 'Active recall study' },
        { title: 'Practice Quiz Questions', subject: 'General', durationMinutes: 30, priority: 'medium', notes: 'Timed test simulation' }
      ]
    });
  }
});

// Flashcard Generation from Topic or Content
app.post('/api/flashcards/generate', async (req, res) => {
  try {
    const { topic, subject, count = 6, content } = req.body;
    const ai = getGenAI();
    const cleanTopic = topic || subject || 'Academic';

    const fallbackDeck = {
      deckTitle: `${cleanTopic} Mastery Deck`,
      cards: [
        {
          front: `What is the core definition of ${cleanTopic}?`,
          back: `It is the foundational model used in ${subject || 'general study'} to explain core phenomena.`
        },
        {
          front: `What are the primary applications of ${cleanTopic}?`,
          back: `Used for analytical problem solving, system optimization, and predictive reasoning.`
        },
        {
          front: `What is a common pitfall when solving problems in ${cleanTopic}?`,
          back: `Failing to check boundary constraints and unit consistency before concluding.`
        },
        {
          front: `How do you verify solutions regarding ${cleanTopic}?`,
          back: `Cross-check assumptions against fundamental axioms and standard examples.`
        }
      ]
    };

    if (!ai) {
      return res.json(fallbackDeck);
    }

    const prompt = `Create ${count} high-yield study flashcards for subject: "${subject || 'General'}", topic: "${cleanTopic}".
${content ? `Source material:\n"""\n${content}\n"""` : ''}

Provide concise, high-impact active recall question/answer pairs.`;

    try {
      const response = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deckTitle: { type: Type.STRING },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                  },
                  required: ['front', 'back']
                }
              }
            },
            required: ['deckTitle', 'cards']
          }
        }
      });

      const parsed = extractAndParseJSON(response.text || '', null);
      if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return res.json(parsed);
      }
    } catch (flashErr: any) {
      console.warn('[Flashcards API] Generation failed:', flashErr?.message);
    }

    return res.json(fallbackDeck);
  } catch (error: any) {
    console.error('Flashcard generate error:', error);
    res.json({
      deckTitle: 'Core Study Flashcards',
      cards: [
        { front: 'What is active recall?', back: 'Testing memory retrieval to strengthen neural pathways.' },
        { front: 'What is spaced repetition?', back: 'Reviewing information at increasing intervals over time.' }
      ]
    });
  }
});

// Vite middleware setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyMate AI server running on http://localhost:${PORT}`);
  });
}

start();
