import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  Search,
  Zap,
  Mic,
  Settings,
  Menu,
  Send,
  Paperclip,
  Languages,
  Brain,
  Globe,
  Loader as Loader2,
  Check,
  Sparkles,
  FileText,
  Link as LinkIcon,
  Image,
  Pencil,
  Trash2,
  Cpu,
  Eye,
  Lightbulb,
  ArrowRight,
  User,
  LogOut,
} from "lucide-react";

type ModelMode = "auto" | "fast" | "think" | "deepsearch";

interface Message {
  id: string;
  text: string;
  sender: "user" | "grok";
  timestamp?: Date;
  mode?: ModelMode;
  isStreaming?: boolean;
  thoughtChain?: ThoughtStep[];
  searchSteps?: SearchStep[];
  autoAnalysis?: AutoAnalysisStep;
}

interface ThoughtStep {
  id: string;
  text: string;
  completed: boolean;
  active: boolean;
}

interface SearchStep {
  id: string;
  type: "query" | "browsing" | "reading" | "analyzing" | "synthesizing";
  text: string;
  detail?: string;
  completed: boolean;
  active: boolean;
}

interface AutoAnalysisStep {
  phase: "analyzing" | "routing" | "processing" | "responding";
  detectedComplexity: string;
  selectedMode: string;
  reasoning: string;
  completed: boolean;
}

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

const SIMULATED_RESPONSES: Record<ModelMode, string> = {
  auto: "I analyzed your question and determined the best approach. Here's a well-balanced response that covers the key points with appropriate depth. The answer draws on relevant context and provides practical, actionable information you can use right away.",
  fast: "Quick answer: the key point is straightforward. Here's the concise response you need. Let me know if you'd like more detail.",
  think: "After careful analysis, I can break this down into several key components. First, the fundamental principle at work here involves the relationship between the core variables. Second, when we consider the constraints, the optimal approach becomes clear. Third, applying this framework to your specific case, the answer follows logically from the premises established. The reasoning chain connects each step, ensuring the conclusion is well-supported.",
  deepsearch: "Based on extensive research across multiple sources, here is a comprehensive analysis. I found that current evidence strongly supports the following conclusions, drawn from peer-reviewed research, authoritative databases, and expert consensus. The key findings are consistent across independent sources, which strengthens confidence in these results.",
};

const THOUGHT_CHAIN_STEPS = [
  "Understanding the question and identifying key concepts",
  "Breaking down the problem into components",
  "Evaluating possible approaches and constraints",
  "Applying logical reasoning step by step",
  "Verifying the conclusion against the premises",
];

const SEARCH_STEPS_DATA: Array<{ type: SearchStep["type"]; text: string; detail: string }> = [
  { type: "query", text: "Searching for relevant information", detail: "Querying multiple knowledge bases" },
  { type: "browsing", text: "Browsing authoritative sources", detail: "Found 12 relevant documents" },
  { type: "reading", text: "Reading and extracting key data", detail: "Analyzing 8 primary sources" },
  { type: "analyzing", text: "Cross-referencing findings", detail: "Verifying across 5 independent sources" },
  { type: "synthesizing", text: "Synthesizing comprehensive answer", detail: "Compiling evidence-based response" },
];

const AUTO_COMPLEXITY_MAP: Record<string, { complexity: string; mode: string; reasoning: string }> = {
  simple: { complexity: "Simple", mode: "Fast", reasoning: "Direct factual query detected" },
  moderate: { complexity: "Moderate", mode: "Standard", reasoning: "Requires contextual understanding" },
  complex: { complexity: "Complex", mode: "Expert", reasoning: "Multi-step reasoning required" },
};

export default function Home() {
  const { t, isRTL, toggleLanguage, language } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ModelMode>("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { return () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); }; }, []);

  const createNewChat = useCallback(() => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setIsProcessing(false);
    const newConv: Conversation = { id: Date.now().toString(), title: t.newChat, timestamp: new Date(), messages: [] };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setInput("");
  }, [t.newChat]);

  const deleteConversation = useCallback((convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) setActiveConvId(null);
  }, [activeConvId]);

  const updateConvMessages = useCallback((convId: string, updater: (msgs: Message[]) => Message[]) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return { ...c, messages: updater(c.messages) };
      })
    );
  }, []);

  const streamAutoResponse = useCallback((msgId: string, convId: string) => {
    let phase: "analyzing" | "routing" | "processing" | "responding" = "analyzing";
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.auto;
    let stepTimer = 0;

    streamIntervalRef.current = setInterval(() => {
      if (phase === "analyzing") {
        stepTimer++;
        if (stepTimer === 1) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => m.id === msgId ? { ...m, autoAnalysis: { phase: "analyzing" as const, detectedComplexity: "...", selectedMode: "...", reasoning: "Evaluating query...", completed: false } } : m)
          );
        }
        if (stepTimer === 4) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => m.id === msgId ? { ...m, autoAnalysis: { phase: "analyzing" as const, detectedComplexity: "Moderate", selectedMode: "Standard", reasoning: "Requires contextual understanding", completed: false } } : m)
          );
        }
        if (stepTimer === 6) {
          phase = "routing";
          stepTimer = 0;
        }
      } else if (phase === "routing") {
        stepTimer++;
        if (stepTimer === 1) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => m.id === msgId ? { ...m, autoAnalysis: { ...m.autoAnalysis!, phase: "routing" as const } } : m)
          );
        }
        if (stepTimer === 3) {
          phase = "processing";
          stepTimer = 0;
        }
      } else if (phase === "processing") {
        stepTimer++;
        if (stepTimer === 1) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => m.id === msgId ? { ...m, autoAnalysis: { ...m.autoAnalysis!, phase: "processing" as const } } : m)
          );
        }
        if (stepTimer === 3) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => m.id === msgId ? { ...m, autoAnalysis: { ...m.autoAnalysis!, completed: true } } : m)
          );
          phase = "responding";
        }
      } else {
        charIndex += 3;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        }
        updateConvMessages(convId, (msgs) =>
          msgs.map((m) => m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m)
        );
      }
    }, 200);
  }, [updateConvMessages]);

  const streamFastResponse = useCallback((msgId: string, convId: string) => {
    const fullText = SIMULATED_RESPONSES.fast;
    let charIndex = 0;

    streamIntervalRef.current = setInterval(() => {
      charIndex += 4;
      if (charIndex >= fullText.length) {
        charIndex = fullText.length;
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      }
      updateConvMessages(convId, (msgs) =>
        msgs.map((m) => m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m)
      );
    }, 10);
  }, [updateConvMessages]);

  const streamThinkResponse = useCallback((msgId: string, convId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.think;
    let phase: "thinking" | "responding" = "thinking";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "thinking") {
        if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => {
              if (m.id !== msgId) return m;
              const newChain = [...(m.thoughtChain || [])];
              if (stepIndex > 0) newChain[stepIndex - 1] = { ...newChain[stepIndex - 1], completed: true, active: false };
              if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
                newChain[stepIndex] = { id: `step-${stepIndex}`, text: THOUGHT_CHAIN_STEPS[stepIndex], completed: false, active: true };
              }
              return { ...m, thoughtChain: newChain };
            })
          );
          stepIndex++;
        } else {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => {
              if (m.id !== msgId) return m;
              return { ...m, thoughtChain: (m.thoughtChain || []).map((s) => ({ ...s, completed: true, active: false })) };
            })
          );
          phase = "responding";
        }
      } else {
        charIndex += 2;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        }
        updateConvMessages(convId, (msgs) =>
          msgs.map((m) => m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m)
        );
      }
    }, 600);
  }, [updateConvMessages]);

  const streamDeepSearchResponse = useCallback((msgId: string, convId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.deepsearch;
    let phase: "searching" | "responding" = "searching";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "searching") {
        if (stepIndex < SEARCH_STEPS_DATA.length) {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => {
              if (m.id !== msgId) return m;
              const newSteps = [...(m.searchSteps || [])];
              if (stepIndex > 0) newSteps[stepIndex - 1] = { ...newSteps[stepIndex - 1], completed: true, active: false };
              const stepData = SEARCH_STEPS_DATA[stepIndex];
              newSteps[stepIndex] = { id: `search-${stepIndex}`, type: stepData.type, text: stepData.text, detail: stepData.detail, completed: false, active: true };
              return { ...m, searchSteps: newSteps };
            })
          );
          stepIndex++;
        } else {
          updateConvMessages(convId, (msgs) =>
            msgs.map((m) => {
              if (m.id !== msgId) return m;
              return { ...m, searchSteps: (m.searchSteps || []).map((s) => ({ ...s, completed: true, active: false })) };
            })
          );
          phase = "responding";
        }
      } else {
        charIndex += 2;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        }
        updateConvMessages(convId, (msgs) =>
          msgs.map((m) => m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m)
        );
      }
    }, 800);
  }, [updateConvMessages]);

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isProcessing) return;

    let convId = activeConvId;
    if (!convId) {
      const newConv: Conversation = { id: Date.now().toString(), title: input.slice(0, 40), timestamp: new Date(), messages: [] };
      setConversations((prev) => [newConv, ...prev]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: "user", timestamp: new Date() };
    const grokMsg: Message = {
      id: (Date.now() + 1).toString(), text: "", sender: "grok", timestamp: new Date(),
      mode: selectedMode, isStreaming: true,
      thoughtChain: selectedMode === "think" ? [] : undefined,
      searchSteps: selectedMode === "deepsearch" ? [] : undefined,
      autoAnalysis: selectedMode === "auto" ? { phase: "analyzing", detectedComplexity: "", selectedMode: "", reasoning: "", completed: false } : undefined,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updated = { ...c, messages: [...c.messages, userMsg, grokMsg] };
        if (c.messages.length === 0) updated.title = input.slice(0, 40);
        return updated;
      })
    );

    setInput("");
    setIsProcessing(true);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    const msgId = grokMsg.id;
    if (selectedMode === "auto") {
      streamAutoResponse(msgId, convId!);
      setTimeout(() => setIsProcessing(false), 5000);
    } else if (selectedMode === "fast") {
      setTimeout(() => streamFastResponse(msgId, convId!), 500);
      setTimeout(() => setIsProcessing(false), 2000);
    } else if (selectedMode === "think") {
      streamThinkResponse(msgId, convId!);
      setTimeout(() => setIsProcessing(false), 8000);
    } else {
      streamDeepSearchResponse(msgId, convId!);
      setTimeout(() => setIsProcessing(false), 8000);
    }
  }, [input, selectedMode, isProcessing, activeConvId, streamAutoResponse, streamFastResponse, streamThinkResponse, streamDeepSearchResponse]);

  const modeConfig: Record<ModelMode, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    auto: { label: t.modeAuto, icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-white", desc: t.modeAutoDesc },
    fast: { label: t.modeFast, icon: <Zap className="w-3.5 h-3.5" />, color: "text-emerald-400", desc: t.modeFastDesc },
    think: { label: t.modeThink, icon: <Brain className="w-3.5 h-3.5" />, color: "text-amber-400", desc: t.modeThinkDesc },
    deepsearch: { label: t.modeDeepSearch, icon: <Globe className="w-3.5 h-3.5" />, color: "text-blue-400", desc: t.modeDeepSearchDesc },
  };

  const todayConvs = conversations.filter((c) => new Date(c.timestamp).toDateString() === new Date().toDateString());
  const olderConvs = conversations.filter((c) => new Date(c.timestamp).toDateString() !== new Date().toDateString());

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} bg-sidebar transition-all duration-300 flex flex-col overflow-hidden border-${isRTL ? "l" : "r"} border-sidebar-border`}>
        <div className="p-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={createNewChat} className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors" title={t.newChat}>
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button onClick={createNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            {t.newChat}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          {todayConvs.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.today}</div>
              {todayConvs.map((conv) => (
                <ConversationItem key={conv.id} conv={conv} isActive={conv.id === activeConvId} isHovered={conv.id === hoveredConv}
                  onHover={setHoveredConv} onClick={() => { setActiveConvId(conv.id); if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); setIsProcessing(false); }}
                  onDelete={() => deleteConversation(conv.id)} isRTL={isRTL} />
              ))}
            </div>
          )}
          {olderConvs.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.previous}</div>
              {olderConvs.map((conv) => (
                <ConversationItem key={conv.id} conv={conv} isActive={conv.id === activeConvId} isHovered={conv.id === hoveredConv}
                  onHover={setHoveredConv} onClick={() => { setActiveConvId(conv.id); if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); setIsProcessing(false); }}
                  onDelete={() => deleteConversation(conv.id)} isRTL={isRTL} />
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-sidebar-border/50 space-y-0.5 flex-shrink-0">
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.display_name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <button onClick={toggleLanguage} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <Languages className="w-4 h-4" /><span>{language === "en" ? "العربية" : "English"}</span>
          </button>
          <a href="/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <Settings className="w-4 h-4" /><span>{t.settings}</span>
          </a>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" /><span>{t.signOut}</span>
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <>
                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-card rounded-lg transition-colors"><Menu className="w-5 h-5" /></button>
                <button onClick={createNewChat} className="p-2 hover:bg-card rounded-lg transition-colors"><Plus className="w-5 h-5" /></button>
              </>
            )}
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-0.5 bg-card/50 rounded-full px-1 py-0.5 border border-border/60">
            {(["auto", "fast", "think", "deepsearch"] as ModelMode[]).map((mode) => {
              const cfg = modeConfig[mode];
              return (
                <button key={mode} onClick={() => setSelectedMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedMode === mode ? `${cfg.color} bg-foreground/10 shadow-sm` : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <div className="w-20" />
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="mb-8">
                <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground/90 mb-2 text-center">{t.welcomeTitle}</h1>
              <p className="text-muted-foreground text-sm text-center max-w-md mb-10">{t.welcomeSubtitle}</p>

              {/* Mode Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mb-8">
                {(["auto", "fast", "think", "deepsearch"] as ModelMode[]).map((mode) => {
                  const cfg = modeConfig[mode];
                  return (
                    <button key={mode} onClick={() => setSelectedMode(mode)}
                      className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                        selectedMode === mode ? "border-foreground/20 bg-foreground/5" : "border-border/40 hover:border-foreground/10 hover:bg-card/30"
                      }`}>
                      <div className={`${cfg.color} mb-2`}>{cfg.icon}</div>
                      <div className="text-sm font-medium text-foreground mb-0.5">{cfg.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">{cfg.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {t.suggestions.map((suggestion, i) => (
                  <button key={i} onClick={() => setInput(suggestion)}
                    className="px-3.5 py-2 rounded-full text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-card/50 transition-all duration-200">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {msg.sender === "user" && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-foreground/60">U</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  )}

                  {msg.sender === "grok" && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-foreground/60">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        {msg.mode && <div className="mb-2"><ModeBadge mode={msg.mode} /></div>}

                        {/* AUTO MODE - Adaptive Analysis Panel */}
                        {msg.mode === "auto" && msg.autoAnalysis && !msg.autoAnalysis.completed && (
                          <div className="mb-3 p-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
                            <div className="flex items-center gap-2 mb-2.5">
                              <Sparkles className="w-3.5 h-3.5 text-foreground/60 auto-spin" />
                              <span className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider">{t.autoAnalyzing}</span>
                            </div>
                            <div className="space-y-2">
                              {/* Analyzing Phase */}
                              <div className={`flex items-center gap-2 transition-all duration-300 ${msg.autoAnalysis.phase === "analyzing" ? "opacity-100" : "opacity-40"}`}>
                                <div className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                                  {msg.autoAnalysis.phase === "analyzing" ? (
                                    <Eye className="w-2.5 h-2.5 text-foreground/60 auto-pulse" />
                                  ) : (
                                    <Check className="w-2.5 h-2.5 text-foreground/40" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground/70 font-medium">{t.autoAnalyzing}</p>
                                  {msg.autoAnalysis.phase === "analyzing" && msg.autoAnalysis.detectedComplexity && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-muted-foreground">{t.complexity}:</span>
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-foreground/5 text-foreground/70">
                                        <Cpu className="w-2.5 h-2.5" />
                                        {msg.autoAnalysis.detectedComplexity}
                                      </span>
                                    </div>
                                  )}
                                  {msg.autoAnalysis.phase === "analyzing" && msg.autoAnalysis.reasoning && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{msg.autoAnalysis.reasoning}</p>
                                  )}
                                </div>
                              </div>

                              {/* Routing Phase */}
                              <div className={`flex items-center gap-2 transition-all duration-300 ${msg.autoAnalysis.phase === "routing" ? "opacity-100" : msg.autoAnalysis.phase === "analyzing" ? "opacity-20" : "opacity-40"}`}>
                                <div className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                                  {msg.autoAnalysis.phase === "routing" ? (
                                    <ArrowRight className="w-2.5 h-2.5 text-foreground/60 auto-pulse" />
                                  ) : msg.autoAnalysis.phase === "processing" || msg.autoAnalysis.phase === "responding" ? (
                                    <Check className="w-2.5 h-2.5 text-foreground/40" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                                  )}
                                </div>
                                <p className="text-xs text-foreground/70 font-medium">{t.autoRouting}</p>
                                {msg.autoAnalysis.phase === "routing" && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <div className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                                  </div>
                                )}
                              </div>

                              {/* Processing Phase */}
                              <div className={`flex items-center gap-2 transition-all duration-300 ${msg.autoAnalysis.phase === "processing" ? "opacity-100" : msg.autoAnalysis.phase === "responding" ? "opacity-40" : "opacity-20"}`}>
                                <div className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                                  {msg.autoAnalysis.phase === "processing" ? (
                                    <Cpu className="w-2.5 h-2.5 text-foreground/60 auto-pulse" />
                                  ) : msg.autoAnalysis.phase === "responding" ? (
                                    <Check className="w-2.5 h-2.5 text-foreground/40" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                                  )}
                                </div>
                                <p className="text-xs text-foreground/70 font-medium">{t.autoProcessing}</p>
                                {msg.autoAnalysis.phase === "processing" && (
                                  <div className="ml-auto h-1 w-16 bg-foreground/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-foreground/20 rounded-full auto-progress" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* FAST MODE - Instant flash */}
                        {msg.mode === "fast" && msg.isStreaming && !msg.text && (
                          <div className="mb-2 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-emerald-400 fast-blink" />
                            <span className="text-[11px] font-medium text-emerald-400">{t.fastThinkingLabel}</span>
                          </div>
                        )}

                        {/* THINK MODE - Thought Chain */}
                        {msg.mode === "think" && msg.thoughtChain && msg.thoughtChain.length > 0 && (
                          <div className="mb-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">{t.thinkingLabel}</span>
                              {msg.isStreaming && msg.thoughtChain.some((s) => s.active) && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                            </div>
                            <div className="space-y-1.5">
                              {msg.thoughtChain.map((step) => (
                                <div key={step.id} className={`flex items-center gap-2 transition-all duration-500 ${step.completed ? "opacity-60" : step.active ? "opacity-100" : "opacity-30"}`}>
                                  {step.completed ? (
                                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  ) : step.active ? (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 think-pulse-ring rounded-full bg-amber-500/20 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    </div>
                                  ) : (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-muted/30" />
                                  )}
                                  <p className={`text-xs leading-relaxed ${step.active ? "text-amber-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                                    {step.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* DEEPSEARCH MODE - Search Steps */}
                        {msg.mode === "deepsearch" && msg.searchSteps && msg.searchSteps.length > 0 && (
                          <div className="mb-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">{t.searchLabel}</span>
                              {msg.isStreaming && msg.searchSteps.some((s) => s.active) && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                            </div>
                            <div className="space-y-1.5">
                              {msg.searchSteps.map((step) => (
                                <div key={step.id} className={`flex items-center gap-2 transition-all duration-500 ${step.completed ? "opacity-60" : step.active ? "opacity-100" : "opacity-30"}`}>
                                  {step.completed ? (
                                    <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                  ) : step.active ? (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 search-pulse-ring rounded-full bg-blue-500/20 flex items-center justify-center">
                                      {step.type === "query" && <Search className="w-2 h-2 text-blue-400" />}
                                      {step.type === "browsing" && <Globe className="w-2 h-2 text-blue-400 animate-pulse" />}
                                      {step.type === "reading" && <FileText className="w-2 h-2 text-blue-400" />}
                                      {step.type === "analyzing" && <LinkIcon className="w-2 h-2 text-blue-400 animate-spin" />}
                                      {step.type === "synthesizing" && <Sparkles className="w-2 h-2 text-blue-400" />}
                                    </div>
                                  ) : (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-muted/30" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed ${step.active ? "text-blue-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                                      {step.text}
                                    </p>
                                    {step.active && step.detail && <p className="text-[10px] text-blue-400/50 mt-0.5">{step.detail}</p>}
                                    {step.active && (
                                      <div className="mt-1 h-0.5 w-20 bg-blue-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full search-progress-bar" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Response Text */}
                        {msg.text && (
                          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap" dir={isRTL ? "rtl" : "ltr"}>
                            {msg.text}
                            {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-foreground/60 ml-0.5 streaming-cursor" />}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-card border border-border/60 rounded-2xl px-4 py-3 focus-within:border-foreground/20 transition-all duration-200">
              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mb-0.5">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder={t.messagePlaceholder}
                className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm md:text-base leading-relaxed max-h-32"
                dir={isRTL ? "rtl" : "ltr"} rows={1} disabled={isProcessing}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 128) + "px"; }}
              />
              <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">
                  <Mic className="w-5 h-5" />
                </button>
                <button onClick={handleSendMessage} disabled={!input.trim() || isProcessing}
                  className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-foreground text-background hover:bg-foreground/90">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">{t.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: ModelMode }) {
  const { t } = useLanguage();
  const config: Record<ModelMode, { label: string; icon: React.ReactNode; className: string }> = {
    auto: { label: t.modeAuto, icon: <Sparkles className="w-3 h-3" />, className: "text-foreground/70 bg-foreground/5 border-foreground/10" },
    fast: { label: t.modeFast, icon: <Zap className="w-3 h-3" />, className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    think: { label: t.modeThink, icon: <Brain className="w-3 h-3" />, className: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    deepsearch: { label: t.modeDeepSearch, icon: <Globe className="w-3 h-3" />, className: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  };
  const cfg = config[mode];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ConversationItem({ conv, isActive, isHovered, onHover, onClick, onDelete, isRTL }: {
  conv: Conversation; isActive: boolean; isHovered: boolean; onHover: (id: string | null) => void;
  onClick: () => void; onDelete: () => void; isRTL: boolean;
}) {
  return (
    <div className={`relative group rounded-lg transition-colors duration-150 ${isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"}`}
      onMouseEnter={() => onHover(conv.id)} onMouseLeave={() => onHover(null)}>
      <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <span className="text-sm text-sidebar-foreground/80 truncate flex-1">{conv.title}</span>
      </button>
      {(isHovered || isActive) && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 transition-colors ${isRTL ? "left-2" : "right-2"}`}>
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}
