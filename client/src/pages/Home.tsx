import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Search, Zap, Mic, Settings, LogOut, Menu, Send, Paperclip, MessageCircle, Clock, X, Languages, Brain, Globe, Loader as Loader2, Check, Sparkles, FileText, Link as LinkIcon, ChevronDown, Image, ChevronRight, MoveHorizontal as MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type ModelMode = "fast" | "think" | "deepsearch";

interface Message {
  id: string;
  text: string;
  sender: "user" | "grok";
  timestamp?: Date;
  mode?: ModelMode;
  isStreaming?: boolean;
  thoughtChain?: ThoughtStep[];
  searchSteps?: SearchStep[];
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

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

const SIMULATED_RESPONSES: Record<ModelMode, string> = {
  fast: "Here's a quick answer to your question. I've analyzed the key points and provided a concise response. Let me know if you need more details on any specific aspect.",
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

export default function Home() {
  const { t, isRTL, toggleLanguage, language } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ModelMode>("fast");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  const createNewChat = useCallback(() => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setIsProcessing(false);
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: t.newChat,
      timestamp: new Date(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setInput("");
  }, [t.newChat]);

  const deleteConversation = useCallback((convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
    }
  }, [activeConvId]);

  const streamFastResponse = useCallback((msgId: string, convId: string) => {
    const fullText = SIMULATED_RESPONSES.fast;
    let charIndex = 0;

    streamIntervalRef.current = setInterval(() => {
      charIndex += 3;
      if (charIndex >= fullText.length) {
        charIndex = fullText.length;
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msgId
                ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length }
                : m
            ),
          };
        })
      );
    }, 15);
  }, []);

  const streamThinkResponse = useCallback((msgId: string, convId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.think;
    let phase: "thinking" | "responding" = "thinking";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "thinking") {
        if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== msgId) return m;
                  const newChain = [...(m.thoughtChain || [])];
                  if (stepIndex > 0) newChain[stepIndex - 1] = { ...newChain[stepIndex - 1], completed: true, active: false };
                  if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
                    newChain[stepIndex] = { id: `step-${stepIndex}`, text: THOUGHT_CHAIN_STEPS[stepIndex], completed: false, active: true };
                  }
                  return { ...m, thoughtChain: newChain };
                }),
              };
            })
          );
          stepIndex++;
        } else {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== msgId) return m;
                  const newChain = (m.thoughtChain || []).map((s) => ({ ...s, completed: true, active: false }));
                  return { ...m, thoughtChain: newChain };
                }),
              };
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
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m
              ),
            };
          })
        );
      }
    }, 600);
  }, []);

  const streamDeepSearchResponse = useCallback((msgId: string, convId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.deepsearch;
    let phase: "searching" | "responding" = "searching";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "searching") {
        if (stepIndex < SEARCH_STEPS_DATA.length) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== msgId) return m;
                  const newSteps = [...(m.searchSteps || [])];
                  if (stepIndex > 0) newSteps[stepIndex - 1] = { ...newSteps[stepIndex - 1], completed: true, active: false };
                  const stepData = SEARCH_STEPS_DATA[stepIndex];
                  newSteps[stepIndex] = { id: `search-${stepIndex}`, type: stepData.type, text: stepData.text, detail: stepData.detail, completed: false, active: true };
                  return { ...m, searchSteps: newSteps };
                }),
              };
            })
          );
          stepIndex++;
        } else {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== msgId) return m;
                  const newSteps = (m.searchSteps || []).map((s) => ({ ...s, completed: true, active: false }));
                  return { ...m, searchSteps: newSteps };
                }),
              };
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
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m
              ),
            };
          })
        );
      }
    }, 800);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isProcessing) return;

    let convId = activeConvId;
    if (!convId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: input.slice(0, 40),
        timestamp: new Date(),
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    const grokMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: "",
      sender: "grok",
      timestamp: new Date(),
      mode: selectedMode,
      isStreaming: true,
      thoughtChain: selectedMode === "think" ? [] : undefined,
      searchSteps: selectedMode === "deepsearch" ? [] : undefined,
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

    if (selectedMode === "fast") {
      setTimeout(() => streamFastResponse(grokMsg.id, convId!), 1000);
      setTimeout(() => setIsProcessing(false), 2500);
    } else if (selectedMode === "think") {
      streamThinkResponse(grokMsg.id, convId!);
      setTimeout(() => setIsProcessing(false), 8000);
    } else {
      streamDeepSearchResponse(grokMsg.id, convId!);
      setTimeout(() => setIsProcessing(false), 8000);
    }
  }, [input, selectedMode, isProcessing, activeConvId, streamFastResponse, streamThinkResponse, streamDeepSearchResponse]);

  const handleDeleteMessage = (convId: string, msgId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return { ...c, messages: c.messages.filter((m) => m.id !== msgId) };
      })
    );
  };

  const modeConfig: Record<ModelMode, { label: string; icon: React.ReactNode; color: string }> = {
    fast: { label: t.modeFast, icon: <Zap className="w-3.5 h-3.5" />, color: "text-emerald-400" },
    think: { label: t.modeThink, icon: <Brain className="w-3.5 h-3.5" />, color: "text-amber-400" },
    deepsearch: { label: t.modeDeepSearch, icon: <Globe className="w-3.5 h-3.5" />, color: "text-blue-400" },
  };

  const todayConvs = conversations.filter((c) => {
    const d = new Date(c.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const olderConvs = conversations.filter((c) => {
    const d = new Date(c.timestamp);
    const now = new Date();
    return d.toDateString() !== now.toDateString();
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } bg-sidebar transition-all duration-300 flex flex-col overflow-hidden border-${isRTL ? "l" : "r"} border-sidebar-border`}
      >
        {/* Sidebar Header */}
        <div className="p-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={createNewChat}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
            title={t.newChat}
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.newChat}
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          {todayConvs.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.today}
              </div>
              {todayConvs.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  isHovered={conv.id === hoveredConv}
                  onHover={setHoveredConv}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
                    setIsProcessing(false);
                  }}
                  onDelete={() => deleteConversation(conv.id)}
                  isRTL={isRTL}
                />
              ))}
            </div>
          )}
          {olderConvs.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.previous}
              </div>
              {olderConvs.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  isHovered={conv.id === hoveredConv}
                  onHover={setHoveredConv}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
                    setIsProcessing(false);
                  }}
                  onDelete={() => deleteConversation(conv.id)}
                  isRTL={isRTL}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-sidebar-border/50 space-y-0.5 flex-shrink-0">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <Languages className="w-4 h-4" />
            <span>{language === "en" ? "العربية" : "English"}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <Settings className="w-4 h-4" />
            <span>{t.settings}</span>
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {!sidebarOpen && (
              <button
                onClick={createNewChat}
                className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Model Selector - Center */}
          <div className="flex items-center gap-1 bg-card/50 rounded-full px-1 py-0.5 border border-border/60">
            {(["fast", "think", "deepsearch"] as ModelMode[]).map((mode) => {
              const cfg = modeConfig[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedMode === mode
                      ? `${cfg.color} bg-card shadow-sm`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
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
              {/* Grok Logo */}
              <div className="mb-8">
                <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Welcome */}
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground/90 mb-2 text-center">
                {t.welcomeTitle}
              </h1>
              <p className="text-muted-foreground text-sm text-center max-w-md mb-10">
                {t.welcomeSubtitle}
              </p>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {t.suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="px-3.5 py-2 rounded-full text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-card/50 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* User Message */}
                  {msg.sender === "user" && (
                    <div className="flex items-start gap-3 group">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-foreground/60">U</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Grok Message */}
                  {msg.sender === "grok" && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-foreground/60">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Mode Badge */}
                        {msg.mode && (
                          <div className="mb-2">
                            <ModeBadge mode={msg.mode} />
                          </div>
                        )}

                        {/* Thinking Chain - Think Mode */}
                        {msg.mode === "think" && msg.thoughtChain && msg.thoughtChain.length > 0 && (
                          <div className="mb-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                                {t.thinkingLabel}
                              </span>
                              {msg.isStreaming && msg.thoughtChain.some((s) => s.active) && (
                                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {msg.thoughtChain.map((step) => (
                                <div
                                  key={step.id}
                                  className={`flex items-center gap-2 transition-all duration-500 ${
                                    step.completed ? "opacity-60" : step.active ? "opacity-100" : "opacity-30"
                                  }`}
                                >
                                  {step.completed ? (
                                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  ) : step.active ? (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 think-pulse-ring rounded-full bg-amber-500/20 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    </div>
                                  ) : (
                                    <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-muted/30" />
                                  )}
                                  <p className={`text-xs leading-relaxed ${
                                    step.active ? "text-amber-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/40"
                                  }`}>
                                    {step.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Search Steps - DeepSearch Mode */}
                        {msg.mode === "deepsearch" && msg.searchSteps && msg.searchSteps.length > 0 && (
                          <div className="mb-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                                {t.searchLabel}
                              </span>
                              {msg.isStreaming && msg.searchSteps.some((s) => s.active) && (
                                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {msg.searchSteps.map((step) => (
                                <div
                                  key={step.id}
                                  className={`flex items-center gap-2 transition-all duration-500 ${
                                    step.completed ? "opacity-60" : step.active ? "opacity-100" : "opacity-30"
                                  }`}
                                >
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
                                    <p className={`text-xs leading-relaxed ${
                                      step.active ? "text-blue-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/40"
                                    }`}>
                                      {step.text}
                                    </p>
                                    {step.active && step.detail && (
                                      <p className="text-[10px] text-blue-400/50 mt-0.5">{step.detail}</p>
                                    )}
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

                        {/* Fast Mode - Quick Thinking */}
                        {msg.mode === "fast" && msg.isStreaming && !msg.text && (
                          <div className="mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 fast-blink" />
                            <span className="text-[11px] font-medium text-emerald-400">{t.fastThinkingLabel}</span>
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

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t.messagePlaceholder}
                className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm md:text-base leading-relaxed max-h-32"
                dir={isRTL ? "rtl" : "ltr"}
                rows={1}
                disabled={isProcessing}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />

              <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-foreground/5">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isProcessing}
                  className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-foreground text-background hover:bg-foreground/90"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: ModelMode }) {
  const { t } = useLanguage();
  const config: Record<ModelMode, { label: string; icon: React.ReactNode; className: string }> = {
    fast: {
      label: t.modeFast,
      icon: <Zap className="w-3 h-3" />,
      className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    think: {
      label: t.modeThink,
      icon: <Brain className="w-3 h-3" />,
      className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    deepsearch: {
      label: t.modeDeepSearch,
      icon: <Globe className="w-3 h-3" />,
      className: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
  };
  const cfg = config[mode];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ConversationItem({
  conv,
  isActive,
  isHovered,
  onHover,
  onClick,
  onDelete,
  isRTL,
}: {
  conv: Conversation;
  isActive: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onDelete: () => void;
  isRTL: boolean;
}) {
  return (
    <div
      className={`relative group rounded-lg transition-colors duration-150 ${
        isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
      }`}
      onMouseEnter={() => onHover(conv.id)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-sm text-sidebar-foreground/80 truncate flex-1">{conv.title}</span>
      </button>
      {(isHovered || isActive) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 transition-colors ${
            isRTL ? "left-2" : "right-2"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}
