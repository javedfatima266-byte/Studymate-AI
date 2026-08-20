import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserProfile, Note, Quiz, FlashcardDeck, StudyTask, Achievement, TutorMessage, SummaryResult, StudySessionLog } from '../src/types';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  profile: UserProfile;
}

export interface UserDataStore {
  userId: string;
  notes: Note[];
  quizzes: Quiz[];
  flashcardDecks: FlashcardDeck[];
  tasks: StudyTask[];
  achievements: Achievement[];
  tutorMessages: TutorMessage[];
  summaries: SummaryResult[];
  sessions: StudySessionLog[];
  summarizerState?: any;
  tutorSessionState?: any;
  updatedAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  users: Record<string, StoredUser>; // keyed by email
  sessions: Record<string, Session>; // keyed by token
  userData: Record<string, UserDataStore>; // keyed by userId
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'studymate_db.json');

// Default starter achievements template for new users
export const DEFAULT_ACHIEVEMENTS_TEMPLATE: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Step to Mastery',
    description: 'Create your first study note or save an AI summary.',
    iconName: 'GraduationCap',
    category: 'notes',
    progress: 0,
    maxProgress: 1,
    xpReward: 100,
  },
  {
    id: 'ach-2',
    title: 'Consistent Scholar',
    description: 'Maintain a 3-day active study streak.',
    iconName: 'Flame',
    category: 'streak',
    progress: 1,
    maxProgress: 3,
    xpReward: 250,
  },
  {
    id: 'ach-3',
    title: 'Quiz Prodigy',
    description: 'Score 80% or higher on 3 quizzes.',
    iconName: 'Trophy',
    category: 'quiz',
    progress: 0,
    maxProgress: 3,
    xpReward: 300,
  },
  {
    id: 'ach-4',
    title: 'Socratic Thinker',
    description: 'Exchange 20+ messages with the AI Tutor.',
    iconName: 'Brain',
    category: 'tutor',
    progress: 0,
    maxProgress: 20,
    xpReward: 200,
  },
  {
    id: 'ach-5',
    title: 'Deep Focus Master',
    description: 'Complete 5 Pomodoro focus sessions.',
    iconName: 'Clock',
    category: 'planner',
    progress: 0,
    maxProgress: 5,
    xpReward: 350,
  },
  {
    id: 'ach-6',
    title: 'Knowledge Synthesizer',
    description: 'Generate 5 smart summaries or flashcard decks.',
    iconName: 'Sparkles',
    category: 'notes',
    progress: 0,
    maxProgress: 5,
    xpReward: 250,
  },
];

class StudyMateDatabase {
  private db: DatabaseSchema = {
    users: {},
    sessions: {},
    userData: {},
  };
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.reloadFromDisk();
  }

  public reloadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.db = {
              users: parsed.users || {},
              sessions: parsed.sessions || {},
              userData: parsed.userData || {},
            };
          }
        }
      } else {
        this.saveSync();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('[Database] Failed to initialize file storage, using memory store:', err);
      this.isLoaded = true;
    }
  }

  private ensureLoaded() {
    if (!this.isLoaded) {
      this.reloadFromDisk();
    }
  }

  public saveSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[Database] Failed to write database to disk:', err);
    }
  }

  public queueSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveSync();
      this.saveTimeout = null;
    }, 100);
  }

  // Password Security Helpers
  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  public verifyPassword(password: string, salt: string, storedHash: string): boolean {
    if (!password || !salt || !storedHash) return false;
    const hash = this.hashPassword(password, salt);
    try {
      const a = Buffer.from(hash, 'hex');
      const b = Buffer.from(storedHash, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  public generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // User Operations
  public findUserByEmail(email: string): StoredUser | null {
    if (!email || typeof email !== 'string') return null;
    this.ensureLoaded();
    const key = email.trim().toLowerCase();
    if (this.db.users[key]) return this.db.users[key];

    // Case-insensitive fallback across all stored users
    for (const u of Object.values(this.db.users)) {
      if (u && u.email && u.email.trim().toLowerCase() === key) {
        return u;
      }
    }
    return null;
  }

  public findUserById(id: string): StoredUser | null {
    if (!id || typeof id !== 'string') return null;
    this.ensureLoaded();
    for (const user of Object.values(this.db.users)) {
      if (user && user.id === id) return user;
    }
    return null;
  }

  public createUser(params: {
    name: string;
    email: string;
    password: string;
    gradeLevel?: string;
    selectedSubjects?: any[];
    avatar?: string;
  }): { user: StoredUser; token: string; data: UserDataStore } {
    this.ensureLoaded();
    const cleanEmail = params.email.trim().toLowerCase();
    if (this.findUserByEmail(cleanEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(params.password, salt);
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const today = new Date().toISOString().split('T')[0];

    const profile: UserProfile = {
      id: userId,
      name: params.name.trim(),
      email: cleanEmail,
      avatar: params.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      gradeLevel: params.gradeLevel || 'Undergraduate (Year 1-2)',
      targetDailyMinutes: 60,
      streakDays: 1,
      lastActiveDate: today,
      xp: 0,
      level: 1,
      selectedSubjects: Array.isArray(params.selectedSubjects) && params.selectedSubjects.length > 0
        ? params.selectedSubjects
        : ['Computer Science', 'Mathematics', 'Physics', 'Biology'],
      soundEnabled: true,
      theme: 'light',
      onboarded: true,
    };

    const storedUser: StoredUser = {
      id: userId,
      email: cleanEmail,
      name: params.name.trim(),
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      profile,
    };

    // Initialize fresh, empty user data store
    const initialUserData: UserDataStore = {
      userId,
      notes: [],
      quizzes: [],
      flashcardDecks: [],
      tasks: [],
      achievements: JSON.parse(JSON.stringify(DEFAULT_ACHIEVEMENTS_TEMPLATE)),
      tutorMessages: [],
      summaries: [],
      sessions: [],
      summarizerState: null,
      tutorSessionState: null,
      updatedAt: new Date().toISOString(),
    };

    this.db.users[cleanEmail] = storedUser;
    this.db.userData[userId] = initialUserData;

    const token = this.createSession(userId);
    this.saveSync();

    return { user: storedUser, token, data: initialUserData };
  }

  public createSession(userId: string): string {
    this.ensureLoaded();
    const token = this.generateToken();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    this.db.sessions[token] = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    this.saveSync();
    return token;
  }

  public validateSession(token: string): StoredUser | null {
    if (!token) return null;
    this.ensureLoaded();
    const session = this.db.sessions[token];
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      delete this.db.sessions[token];
      this.saveSync();
      return null;
    }

    return this.findUserById(session.userId);
  }

  public removeSession(token: string): boolean {
    if (!token) return false;
    this.ensureLoaded();
    if (this.db.sessions[token]) {
      delete this.db.sessions[token];
      this.saveSync();
      return true;
    }
    return false;
  }

  public resetPassword(email: string, newPassword: string): boolean {
    this.ensureLoaded();
    const cleanEmail = email.trim().toLowerCase();
    const user = this.findUserByEmail(cleanEmail);
    if (!user) return false;

    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = this.hashPassword(newPassword, salt);
    this.saveSync();
    return true;
  }

  public updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    this.ensureLoaded();
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const updatedProfile: UserProfile = {
      ...user.profile,
      ...updates,
      id: user.id,
      email: user.email, // email is immutable through profile update
    };

    user.profile = updatedProfile;
    if (updates.name) {
      user.name = updates.name.trim();
    }

    this.saveSync();
    return updatedProfile;
  }

  // User Data Operations
  public getUserData(userId: string): UserDataStore {
    this.ensureLoaded();
    let data = this.db.userData[userId];
    if (!data) {
      data = {
        userId,
        notes: [],
        quizzes: [],
        flashcardDecks: [],
        tasks: [],
        achievements: JSON.parse(JSON.stringify(DEFAULT_ACHIEVEMENTS_TEMPLATE)),
        tutorMessages: [],
        summaries: [],
        sessions: [],
        summarizerState: null,
        tutorSessionState: null,
        updatedAt: new Date().toISOString(),
      };
      this.db.userData[userId] = data;
      this.saveSync();
    }
    return data;
  }

  public saveUserData(userId: string, incoming: Partial<UserDataStore>): UserDataStore {
    this.ensureLoaded();
    const existing = this.getUserData(userId);
    const updated: UserDataStore = {
      ...existing,
      ...incoming,
      userId,
      updatedAt: new Date().toISOString(),
    };
    this.db.userData[userId] = updated;
    this.queueSave();
    return updated;
  }
}

export const db = new StudyMateDatabase();
