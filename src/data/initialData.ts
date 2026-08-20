import { Note, Quiz, FlashcardDeck, StudyTask, Achievement, UserProfile, Subject } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'user_profile',
  name: '',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  gradeLevel: 'Undergraduate (Year 1-2)',
  targetDailyMinutes: 60,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  xp: 0,
  level: 1,
  selectedSubjects: ['Computer Science', 'Mathematics', 'Physics', 'Biology'],
  soundEnabled: true,
  theme: 'light',
  onboarded: false,
};

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Data Structures: Hash Tables & Collision Resolution',
    subject: 'Computer Science',
    tags: ['Algorithms', 'Data Structures', 'Hashing'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isPinned: true,
    content: `# Hash Tables & Collision Resolution

A **Hash Table** is a data structure that implements an associative array abstract data type, a structure that can map keys to values.

## Key Concepts
- **Hash Function**: $h(k) \to [0 \dots m-1]$ maps large key spaces into table slots.
- **Uniform Hashing Assumption**: Each key is equally likely to hash to any slot.

## Collision Resolution Techniques
1. **Separate Chaining**:
   - Each bucket holds a linked list of entries that hash to the same slot.
   - *Worst case search*: $O(n)$ if all keys collide.
   - *Average case search*: $O(1 + \alpha)$ where load factor $\alpha = n/m$.

2. **Open Addressing**:
   - All elements stored directly in the hash table.
   - **Linear Probing**: $h(k, i) = (h'(k) + i) \bmod m$ (suffers from primary clustering).
   - **Quadratic Probing**: $h(k, i) = (h'(k) + c_1 i + c_2 i^2) \bmod m$.
   - **Double Hashing**: $h(k, i) = (h_1(k) + i \cdot h_2(k)) \bmod m$.

## Complexity Summary
| Operation | Average Case | Worst Case |
| :--- | :--- | :--- |
| Insertion | $O(1)$ | $O(n)$ |
| Lookup | $O(1)$ | $O(n)$ |
| Deletion | $O(1)$ | $O(n)$ |
`
  },
  {
    id: 'note-2',
    title: 'Cellular Respiration & ATP Synthesis',
    subject: 'Biology',
    tags: ['Biochemistry', 'Metabolism', 'Mitochondria'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isPinned: false,
    content: `# Cellular Respiration & ATP Synthesis

Cellular respiration is the metabolic pathway by which cells convert biochemical energy from nutrients into adenosine triphosphate (ATP).

## 4 Major Stages
1. **Glycolysis** (Cytoplasm)
   - Glucose $\to$ 2 Pyruvate + 2 Net ATP + 2 NADH
   - Anaerobic (does not require $O_2$).
2. **Pyruvate Oxidation** (Mitochondrial Matrix)
   - 2 Pyruvate $\to$ 2 Acetyl-CoA + 2 $CO_2$ + 2 NADH.
3. **Citric Acid (Krebs) Cycle** (Mitochondrial Matrix)
   - Acetyl-CoA oxidized to yield 2 ATP, 6 NADH, 2 $FADH_2$, and 4 $CO_2$.
4. **Oxidative Phosphorylation & ETC** (Inner Mitochondrial Membrane)
   - Electron Transport Chain creates proton gradient across inner membrane.
   - ATP Synthase utilizes Chemiosmosis to produce ~26-28 ATP.

**Total Net ATP Output**: Approx. 30–32 ATP per glucose molecule.
`
  },
  {
    id: 'note-3',
    title: 'Newtonian Mechanics: Conservation of Momentum',
    subject: 'Physics',
    tags: ['Mechanics', 'Momentum', 'Collisions'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    isPinned: false,
    content: `# Conservation of Linear Momentum

## Principle
In an isolated system (no external net force $\Sigma \vec{F}_{ext} = 0$), the total linear momentum remains constant over time:
$$\Sigma \vec{p}_{initial} = \Sigma \vec{p}_{final}$$

## Types of Collisions
- **Elastic Collision**: Both total momentum AND total kinetic energy are conserved.
  $$m_1 v_{1i} + m_2 v_{2i} = m_1 v_{1f} + m_2 v_{2f}$$
  $$\frac{1}{2}m_1 v_{1i}^2 + \frac{1}{2}m_2 v_{2i}^2 = \frac{1}{2}m_1 v_{1f}^2 + \frac{1}{2}m_2 v_{2f}^2$$
- **Inelastic Collision**: Momentum is conserved, but kinetic energy is converted into heat/sound/deformation.
- **Perfect Inelastic Collision**: Objects stick together post-collision:
  $$m_1 v_{1i} + m_2 v_{2i} = (m_1 + m_2) v_f$$
`
  }
];

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-1',
    title: 'Computer Science: Data Structures Mastery',
    subject: 'Computer Science',
    topic: 'Hash Tables, Trees & Graphs',
    difficulty: 'Medium',
    totalQuestions: 5,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    timeLimitMinutes: 10,
    lastScore: 80,
    questions: [
      {
        id: 'q1',
        question: 'What is the average time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 1,
        explanation: 'In a balanced BST (like an AVL or Red-Black tree), the height is O(log n), so search operations take O(log n) time.'
      },
      {
        id: 'q2',
        question: 'Which collision resolution method in Hash Tables stores all collided elements directly inside the table array using a probe sequence?',
        options: ['Separate Chaining', 'Open Addressing', 'B-Tree Indexing', 'Radix Sorting'],
        correctAnswer: 1,
        explanation: 'Open addressing stores all elements inside the table slots without auxiliary linked lists, using linear, quadratic, or double hashing probes.'
      },
      {
        id: 'q3',
        question: 'What graph traversal algorithm uses a Queue data structure (FIFO)?',
        options: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Dijkstra with Priority Queue only', 'Topological Sort with Stack'],
        correctAnswer: 1,
        explanation: 'BFS uses a FIFO Queue to visit all neighbor vertices at the present depth level before moving on to vertices at the next depth level.'
      },
      {
        id: 'q4',
        question: 'Which of the following is a self-balancing binary search tree?',
        options: ['Heap', 'Red-Black Tree', 'Trie', 'Segment Tree'],
        correctAnswer: 1,
        explanation: 'A Red-Black Tree is a self-balancing binary search tree where each node has a color bit ensuring no path is more than twice as long as any other.'
      },
      {
        id: 'q5',
        question: 'What is the worst-case time complexity of standard Quicksort without randomized pivots?',
        options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'],
        correctAnswer: 2,
        explanation: 'When the partition is consistently unbalanced (e.g. already sorted array with first element as pivot), Quicksort degrades to O(n²).'
      }
    ]
  },
  {
    id: 'quiz-2',
    title: 'Cellular Biology: Bioenergetics',
    subject: 'Biology',
    topic: 'Glycolysis, Krebs Cycle & ATP Synthase',
    difficulty: 'Easy',
    totalQuestions: 4,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    timeLimitMinutes: 8,
    questions: [
      {
        id: 'q1-bio',
        question: 'Where does Glycolysis occur within the eukaryotic cell?',
        options: ['Mitochondrial Matrix', 'Cytoplasm (Cytosol)', 'Inner Mitochondrial Membrane', 'Nucleus'],
        correctAnswer: 1,
        explanation: 'Glycolysis occurs in the cytoplasm and does not require oxygen.'
      },
      {
        id: 'q2-bio',
        question: 'What is the net ATP yield produced directly by Glycolysis per molecule of glucose?',
        options: ['1 ATP', '2 ATP', '4 ATP', '32 ATP'],
        correctAnswer: 1,
        explanation: 'Glycolysis consumes 2 ATP and produces 4 ATP, yielding a net gain of 2 ATP.'
      },
      {
        id: 'q3-bio',
        question: 'What serves as the final electron acceptor in aerobic cellular respiration?',
        options: ['Carbon Dioxide (CO₂)', 'Water (H₂O)', 'Oxygen (O₂)', 'NAD+'],
        correctAnswer: 2,
        explanation: 'Oxygen (O₂) accepts low-energy electrons and protons at complex IV of the electron transport chain to form water (H₂O).'
      },
      {
        id: 'q4-bio',
        question: 'Which enzyme synthesizes ATP using the electrochemical proton gradient across the inner mitochondrial membrane?',
        options: ['Hexokinase', 'ATP Synthase', 'Pyruvate Dehydrogenase', 'DNA Polymerase'],
        correctAnswer: 1,
        explanation: 'ATP Synthase acts as a molecular rotor powered by the proton motive force to phosphorylate ADP into ATP.'
      }
    ]
  }
];

export const INITIAL_FLASHCARDS: FlashcardDeck[] = [
  {
    id: 'deck-1',
    title: 'Computer Science: Core Algorithms',
    subject: 'Computer Science',
    description: 'Essential Big-O notations, sorting algorithms, and graph paradigms.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastStudied: new Date(Date.now() - 86400000 * 1).toISOString(),
    cards: [
      {
        id: 'fc-1',
        deckId: 'deck-1',
        front: 'What is the average and worst-case time complexity of Merge Sort?',
        back: 'Average: O(n log n)\nWorst-case: O(n log n)\nSpace complexity: O(n) auxiliary memory.',
        subject: 'Computer Science',
        repetitions: 3,
        intervalDays: 4,
        difficulty: 'medium'
      },
      {
        id: 'fc-2',
        deckId: 'deck-1',
        front: 'What property differentiates Dijkstra\'s Algorithm from the Bellman-Ford Algorithm?',
        back: 'Dijkstra works with non-negative edge weights in O((V + E) log V).\nBellman-Ford can handle negative weights and detect negative cycles in O(V · E).',
        subject: 'Computer Science',
        repetitions: 2,
        intervalDays: 2,
        difficulty: 'hard'
      },
      {
        id: 'fc-3',
        deckId: 'deck-1',
        front: 'What is Dynamic Programming (DP) and what two properties must a problem have to use DP?',
        back: '1. Optimal Substructure (optimal solution formed from optimal sub-problems).\n2. Overlapping Subproblems (same subproblems solved multiple times).',
        subject: 'Computer Science',
        repetitions: 4,
        intervalDays: 6,
        difficulty: 'easy'
      },
      {
        id: 'fc-4',
        deckId: 'deck-1',
        front: 'What is the difference between BFS and DFS in terms of space complexity on a tree of branching factor b and depth d?',
        back: 'BFS space: O(bᵈ) (keeps entire level in memory).\nDFS space: O(b · d) (only stores current recursion stack).',
        subject: 'Computer Science',
        repetitions: 2,
        intervalDays: 3,
        difficulty: 'medium'
      }
    ]
  },
  {
    id: 'deck-2',
    title: 'Calculus: Derivatives & Integration Rules',
    subject: 'Mathematics',
    description: 'Standard differentiation formulas, chain rule, integration by parts.',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    cards: [
      {
        id: 'fc-calc-1',
        deckId: 'deck-2',
        front: 'State the Integration by Parts formula.',
        back: '∫ u dv = u·v - ∫ v du\nUseful mnemonic: LIATE for picking u (Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential).',
        subject: 'Mathematics',
        repetitions: 2,
        intervalDays: 3,
        difficulty: 'medium'
      },
      {
        id: 'fc-calc-2',
        deckId: 'deck-2',
        front: 'What is the derivative of f(x) = ln(x) and f(x) = e^(kx)?',
        back: 'd/dx [ln(x)] = 1/x (for x > 0)\nd/dx [e^(kx)] = k · e^(kx)',
        subject: 'Mathematics',
        repetitions: 5,
        intervalDays: 8,
        difficulty: 'easy'
      }
    ]
  }
];

export const INITIAL_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    title: 'Review Hash Tables Collision Resolution notes',
    subject: 'Computer Science',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    durationMinutes: 30,
    isCompleted: false,
    priority: 'high',
    aiSuggested: false,
    notes: 'Focus on Double Hashing vs Quadratic Probing.'
  },
  {
    id: 'task-2',
    title: 'Take Biology Cellular Bioenergetics Quiz',
    subject: 'Biology',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    durationMinutes: 20,
    isCompleted: true,
    priority: 'medium',
    aiSuggested: true,
    notes: 'Review ATP synthase step explanation.'
  },
  {
    id: 'task-3',
    title: '25-minute Pomodoro on Calculus Integration by Parts',
    subject: 'Mathematics',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    durationMinutes: 25,
    isCompleted: false,
    priority: 'medium',
    aiSuggested: true
  },
  {
    id: 'task-4',
    title: 'AI Tutor Socratic Session: Newton\'s 3rd Law Paradoxes',
    subject: 'Physics',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '15:30',
    durationMinutes: 45,
    isCompleted: false,
    priority: 'low',
    aiSuggested: true
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Step to Mastery',
    description: 'Complete your first study session or note.',
    iconName: 'GraduationCap',
    category: 'notes',
    unlockedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    progress: 1,
    maxProgress: 1,
    xpReward: 100
  },
  {
    id: 'ach-2',
    title: 'Streak Starter',
    description: 'Maintain a 3-day active study streak.',
    iconName: 'Flame',
    category: 'streak',
    unlockedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    progress: 4,
    maxProgress: 3,
    xpReward: 250
  },
  {
    id: 'ach-3',
    title: 'Quiz Prodigy',
    description: 'Score 80% or higher on 3 quizzes.',
    iconName: 'Trophy',
    category: 'quiz',
    progress: 1,
    maxProgress: 3,
    xpReward: 300
  },
  {
    id: 'ach-4',
    title: 'Socratic Thinker',
    description: 'Exchange 20+ messages with the AI Tutor.',
    iconName: 'Brain',
    category: 'tutor',
    progress: 8,
    maxProgress: 20,
    xpReward: 200
  },
  {
    id: 'ach-5',
    title: 'Deep Focus Master',
    description: 'Complete 5 Pomodoro focus sessions.',
    iconName: 'Clock',
    category: 'planner',
    progress: 3,
    maxProgress: 5,
    xpReward: 350
  },
  {
    id: 'ach-6',
    title: 'Knowledge Synthesizer',
    description: 'Generate 5 smart summaries or flashcard decks.',
    iconName: 'Sparkles',
    category: 'notes',
    progress: 2,
    maxProgress: 5,
    xpReward: 250
  }
];

export const STUDY_TIPS: { quote: string; author: string; tip: string }[] = [
  {
    quote: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    tip: "Use the Feynman Technique: Try explaining difficult concepts in simple terms to your AI Tutor."
  },
  {
    quote: "Small disciplines repeated with consistency every day lead to great achievements.",
    author: "John C. Maxwell",
    tip: "Spaced repetition (reviewing cards right before you forget them) boosts long-term recall by over 200%."
  },
  {
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    tip: "Active recall via quizzes creates stronger neural pathways than passive re-reading."
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    tip: "Take a 5-minute break every 25 minutes (Pomodoro) to let your diffuse thinking consolidate information."
  }
];
