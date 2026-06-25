import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, HealthScore } from '@/types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ToolConversation {
  messages: Message[];
  inputText: string;
  outputText: string;
}

interface EditorState {
  inputText: string;
  outputText: string;
  activeJobId: string | null;
  isProcessing: boolean;
  setInputText: (text: string) => void;
  setOutputText: (text: string) => void;
  setActiveJobId: (id: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  clearAll: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      inputText: '',
      outputText: '',
      activeJobId: null,
      isProcessing: false,
      setInputText: (text) => set({ inputText: text }),
      setOutputText: (text) => set({ outputText: text }),
      setActiveJobId: (id) => set({ activeJobId: id }),
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      clearAll: () => set({ inputText: '', outputText: '', activeJobId: null, isProcessing: false }),
    }),
    { name: 'paraflow-editor' }
  )
);

interface UserState {
  user: User | null;
  token: string | null;
  credits: number;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCredits: (credits: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      credits: 100,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setCredits: (credits) => set({ credits }),
      logout: () => set({ user: null, token: null, credits: 0 }),
    }),
    { name: 'paraflow-user' }
  )
);

interface AgentState {
  sessionId: string | null;
  activeAgents: string[];
  iterations: number;
  messages: Array<{ agent: string; message: string; timestamp: number }>;
  currentScore: number;
  setSessionId: (id: string | null) => void;
  setActiveAgents: (agents: string[]) => void;
  incrementIterations: () => void;
  addMessage: (agent: string, message: string) => void;
  setCurrentScore: (score: number) => void;
  resetSession: () => void;
}

export const useAgentStore = create<AgentState>()((set) => ({
  sessionId: null,
  activeAgents: ['grammar', 'seo', 'humanizer', 'tone', 'fact_checker'],
  iterations: 0,
  messages: [],
  currentScore: 0,
  setSessionId: (id) => set({ sessionId: id }),
  setActiveAgents: (agents) => set({ activeAgents: agents }),
  incrementIterations: () => set((state) => ({ iterations: state.iterations + 1 })),
  addMessage: (agent, message) =>
    set((state) => ({
      messages: [...state.messages, { agent, message, timestamp: Date.now() }],
    })),
  setCurrentScore: (score) => set({ currentScore: score }),
  resetSession: () =>
    set({
      sessionId: null,
      iterations: 0,
      messages: [],
      currentScore: 0,
    }),
}));

interface ConversationState {
  conversations: Record<string, ToolConversation>;
  getConversation: (toolId: string) => ToolConversation;
  addMessage: (toolId: string, message: Message) => void;
  clearConversation: (toolId: string) => void;
  setInputText: (toolId: string, text: string) => void;
  setOutputText: (toolId: string, text: string) => void;
}

export const useConversationStore = create<ConversationState>()((set, get) => ({
  conversations: {},
  getConversation: (toolId: string) => {
    const state = get();
    if (!state.conversations[toolId]) {
      set((s) => ({
        conversations: {
          ...s.conversations,
          [toolId]: { messages: [], inputText: '', outputText: '' },
        },
      }));
      return { messages: [], inputText: '', outputText: '' };
    }
    return state.conversations[toolId];
  },
  addMessage: (toolId: string, message: Message) => {
    set((state) => {
      const conv = state.conversations[toolId] || { messages: [], inputText: '', outputText: '' };
      return {
        conversations: {
          ...state.conversations,
          [toolId]: {
            ...conv,
            messages: [...conv.messages, message],
          },
        },
      };
    });
  },
  clearConversation: (toolId: string) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [toolId]: { messages: [], inputText: '', outputText: '' },
      },
    }));
  },
  setInputText: (toolId: string, text: string) => {
    set((state) => {
      const conv = state.conversations[toolId] || { messages: [], inputText: '', outputText: '' };
      return {
        conversations: {
          ...state.conversations,
          [toolId]: { ...conv, inputText: text },
        },
      };
    });
  },
  setOutputText: (toolId: string, text: string) => {
    set((state) => {
      const conv = state.conversations[toolId] || { messages: [], inputText: '', outputText: '' };
      return {
        conversations: {
          ...state.conversations,
          [toolId]: { ...conv, outputText: text },
        },
      };
    });
  },
}));

interface AppState {
  sidebarOpen: boolean;
  activeTool: string | null;
  theme: 'light' | 'dark' | 'system';
  healthScore: HealthScore | null;
  toggleSidebar: () => void;
  setActiveTool: (tool: string | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHealthScore: (score: HealthScore | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: true,
  activeTool: null,
  theme: 'system',
  healthScore: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setTheme: (theme) => set({ theme }),
  setHealthScore: (score) => set({ healthScore: score }),
}));