import { create } from 'zustand';

interface QuantumState {
  id: string;
  message: string;
  timestamp: string;
  collapsed: boolean;
  probability: number;
}

interface CommandHistoryEntry {
  command: string;
  output: string;
  timestamp: string;
}

interface TerminalState {
  isOpen: boolean;
  isUnlocked: boolean;
  history: QuantumState[];
  commandHistory: CommandHistoryEntry[];
  blurEnabled: boolean;
  sequenceProgress: string[]; // Track trigger sequence progress

  // Actions
  open: () => void;
  close: () => void;
  unlock: () => void;
  addCommand: (command: string, output: string) => void;
  addLog: (message: string) => void;
  clear: () => void;
  toggleBlur: () => void;
  collapseState: (id: string) => void;
  addSequenceStep: (step: string) => void;
  resetSequence: () => void;
}

// Load unlock state from localStorage
const loadUnlockState = (): boolean => {
  try {
    const stored = localStorage.getItem('observer-terminal-unlocked');
    return stored === 'true';
  } catch {
    return false;
  }
};

// Save unlock state to localStorage
const saveUnlockState = (unlocked: boolean): void => {
  try {
    localStorage.setItem('observer-terminal-unlocked', String(unlocked));
  } catch {
    // Ignore localStorage errors
  }
};

export const useTerminalStore = create<TerminalState>(set => ({
  isOpen: false,
  isUnlocked: loadUnlockState(),
  history: [],
  commandHistory: [],
  blurEnabled: false,
  sequenceProgress: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  unlock: () => {
    set({ isUnlocked: true });
    saveUnlockState(true);
  },
  addCommand: (command, output) =>
    set(s => ({
      commandHistory: [
        ...s.commandHistory,
        {
          command,
          output,
          timestamp: new Date().toISOString(),
        },
      ],
    })),
  addLog: message =>
    set(s => ({
      history: [
        ...s.history,
        {
          id: crypto.randomUUID(),
          message,
          timestamp: new Date().toISOString(),
          collapsed: false,
          probability: Math.random(),
        },
      ],
    })),
  clear: () => set({ history: [], commandHistory: [] }),
  toggleBlur: () => set(s => ({ blurEnabled: !s.blurEnabled })),
  collapseState: id =>
    set(s => ({
      history: s.history.map(state => (state.id === id ? { ...state, collapsed: true } : state)),
    })),
  addSequenceStep: step =>
    set(s => {
      const newProgress = [...s.sequenceProgress, step];
      // Check if sequence is complete: Heisenberg → Schrödinger → Bohr
      const requiredSequence = ['heisenberg', 'schrödinger', 'bohr'];
      const normalizedProgress = newProgress.map(s => s.toLowerCase().trim());
      const isComplete =
        normalizedProgress.length >= 3 &&
        normalizedProgress.slice(-3).every((step, idx) => step === requiredSequence[idx]);

      if (isComplete && !s.isUnlocked) {
        saveUnlockState(true);
        return {
          sequenceProgress: [],
          isUnlocked: true,
        };
      }
      return { sequenceProgress: newProgress };
    }),
  resetSequence: () => set({ sequenceProgress: [] }),
}));
