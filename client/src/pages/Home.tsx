import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Search, Zap, Mic, Settings, LogOut, Menu, Send, Paperclip, MessageCircle, Clock, X, Languages, Brain, Globe, Loader as Loader2, Check, ArrowRight, Sparkles, FileText, Link as LinkIcon, ChevronDown } from "lucide-react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ModelMode>("fast");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const streamFastResponse = useCallback((msgId: string) => {
    const fullText = SIMULATED_RESPONSES.fast;
    let charIndex = 0;

    streamIntervalRef.current = setInterval(() => {
      charIndex += 3;
      if (charIndex >= fullText.length) {
        charIndex = fullText.length;
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length }
            : m
        )
      );
    }, 15);
  }, []);

  const streamThinkResponse = useCallback((msgId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.think;
    let phase: "thinking" | "responding" = "thinking";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "thinking") {
        if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== msgId) return m;
              const newChain = [...(m.thoughtChain || [])];
              if (stepIndex > 0) newChain[stepIndex - 1] = { ...newChain[stepIndex - 1], completed: true, active: false };
              if (stepIndex < THOUGHT_CHAIN_STEPS.length) {
                newChain[stepIndex] = {
                  id: `step-${stepIndex}`,
                  text: THOUGHT_CHAIN_STEPS[stepIndex],
                  completed: false,
                  active: true,
                };
              }
              return { ...m, thoughtChain: newChain };
            })
          );
          stepIndex++;
        } else {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== msgId) return m;
              const newChain = (m.thoughtChain || []).map((s) => ({ ...s, completed: true, active: false }));
              return { ...m, thoughtChain: newChain };
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length }
              : m
          )
        );
      }
    }, 600);
  }, []);

  const streamDeepSearchResponse = useCallback((msgId: string) => {
    let stepIndex = 0;
    let charIndex = 0;
    const fullText = SIMULATED_RESPONSES.deepsearch;
    let phase: "searching" | "responding" = "searching";

    streamIntervalRef.current = setInterval(() => {
      if (phase === "searching") {
        if (stepIndex < SEARCH_STEPS_DATA.length) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== msgId) return m;
              const newSteps = [...(m.searchSteps || [])];
              if (stepIndex > 0) newSteps[stepIndex - 1] = { ...newSteps[stepIndex - 1], completed: true, active: false };
              const stepData = SEARCH_STEPS_DATA[stepIndex];
              newSteps[stepIndex] = {
                id: `search-${stepIndex}`,
                type: stepData.type,
                text: stepData.text,
                detail: stepData.detail,
                completed: false,
                active: true,
              };
              return { ...m, searchSteps: newSteps };
            })
          );
          stepIndex++;
        } else {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== msgId) return m;
              const newSteps = (m.searchSteps || []).map((s) => ({ ...s, completed: true, active: false }));
              return { ...m, searchSteps: newSteps };
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, text: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length }
              : m
          )
        );
      }
    }, 800);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isProcessing) return;

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

    setMessages((prev) => [...prev, userMsg, grokMsg]);
    setInput("");
    setIsProcessing(true);

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    if (selectedMode === "fast") {
      setTimeout(() => streamFastResponse(grokMsg.id), 1000);
      setTimeout(() => setIsProcessing(false), 2500);
    } else if (selectedMode === "think") {
      streamThinkResponse(grokMsg.id);
      setTimeout(() => setIsProcessing(false), 8000);
    } else {
      streamDeepSearchResponse(grokMsg.id);
      setTimeout(() => setIsProcessing(false), 8000);
    }
  }, [input, selectedMode, isProcessing, streamFastResponse, streamThinkResponse, streamDeepSearchResponse]);

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const modeConfig: Record<ModelMode, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    fast: {
      label: t.modeFast,
      icon: <Zap className="w-4 h-4" />,
      color: "from-emerald-500 to-green-400",
      desc: t.modeFastDesc,
    },
    think: {
      label: t.modeThink,
      icon: <Brain className="w-4 h-4" />,
      color: "from-amber-500 to-orange-400",
      desc: t.modeThinkDesc,
    },
    deepsearch: {
      label: t.modeDeepSearch,
      icon: <Globe className="w-4 h-4" />,
      color: "from-blue-500 to-cyan-400",
      desc: t.modeDeepSearchDesc,
    },
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar ${isRTL ? "border-l" : "border-r"} border-sidebar-border transition-all duration-300 flex flex-col shadow-2xl`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-sidebar-border/50 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-sidebar font-bold" />
              </div>
              <span className="font-bold text-lg tracking-tight">{t.appName}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 space-y-2">
          <Button
            className="w-full bg-gradient-to-r from-accent to-cyan-400 hover:from-accent/90 hover:to-cyan-400/90 text-sidebar font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
            onClick={() => {
              setMessages([]);
              setInput("");
              if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
              setIsProcessing(false);
            }}
          >
            <Plus className="w-5 h-5" />
            {sidebarOpen && t.newChat}
          </Button>
        </div>

        {/* Model Selector in Sidebar */}
        {sidebarOpen && (
          <div className="px-4 pb-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
              {t.modelLabel}
            </div>
            <div className="space-y-1">
              {(["fast", "think", "deepsearch"] as ModelMode[]).map((mode) => {
                const cfg = modeConfig[mode];
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      selectedMode === mode
                        ? `bg-gradient-to-r ${cfg.color} text-white shadow-md`
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    {cfg.icon}
                    <span className="font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem icon={<Search className="w-5 h-5" />} label={t.explore} open={sidebarOpen} />
          <NavItem icon={<MessageCircle className="w-5 h-5" />} label={t.conversations} open={sidebarOpen} />
          <NavItem icon={<Mic className="w-5 h-5" />} label={t.voice} open={sidebarOpen} />
          <NavItem icon={<Zap className="w-5 h-5" />} label={t.discover} open={sidebarOpen} />
        </nav>

        {/* History Section */}
        {sidebarOpen && messages.length > 0 && (
          <div className="px-4 py-4 border-t border-sidebar-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">
              <Clock className="w-3 h-3" />
              <span>{t.recent}</span>
            </div>
            <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
              {messages
                .filter((m) => m.sender === "user")
                .slice(-3)
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 rounded hover:bg-sidebar-accent cursor-pointer transition-colors duration-200 truncate text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  >
                    {msg.text.substring(0, 30)}...
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-2">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-accent"
          >
            <Languages className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">
                {language === "en" ? "العربية" : "English"}
              </span>
            )}
          </button>
          <NavItem icon={<Settings className="w-5 h-5" />} label={t.settings} open={sidebarOpen} />
          <NavItem icon={<LogOut className="w-5 h-5" />} label={t.signOut} open={sidebarOpen} />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-background via-background to-background/95">
        {/* Mode Bar - Top */}
        <div className="border-b border-border/50 px-4 py-2.5 flex items-center justify-center gap-2 bg-card/30 backdrop-blur-sm">
          {(["fast", "think", "deepsearch"] as ModelMode[]).map((mode) => {
            const cfg = modeConfig[mode];
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                  selectedMode === mode
                    ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg scale-105`
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50"
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 flex flex-col scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in duration-500">
              {/* Grok Logo */}
              <div className="w-20 h-20 bg-gradient-to-br from-accent via-cyan-400 to-accent rounded-2xl flex items-center justify-center shadow-2xl">
                <Zap className="w-10 h-10 text-sidebar" />
              </div>

              {/* Welcome Text */}
              <div className="text-center max-w-2xl space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  {t.welcomeTitle}
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  {t.welcomeSubtitle}
                </p>
              </div>

              {/* Mode Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-4">
                <ModeCard
                  icon={<Zap className="w-6 h-6" />}
                  title={t.modeFast}
                  description={t.modeFastDesc}
                  gradient="from-emerald-500 to-green-400"
                  active={selectedMode === "fast"}
                  onClick={() => setSelectedMode("fast")}
                  isRTL={isRTL}
                />
                <ModeCard
                  icon={<Brain className="w-6 h-6" />}
                  title={t.modeThink}
                  description={t.modeThinkDesc}
                  gradient="from-amber-500 to-orange-400"
                  active={selectedMode === "think"}
                  onClick={() => setSelectedMode("think")}
                  isRTL={isRTL}
                />
                <ModeCard
                  icon={<Globe className="w-6 h-6" />}
                  title={t.modeDeepSearch}
                  description={t.modeDeepSearchDesc}
                  gradient="from-blue-500 to-cyan-400"
                  active={selectedMode === "deepsearch"}
                  onClick={() => setSelectedMode("deepsearch")}
                  isRTL={isRTL}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4 max-w-4xl mx-auto w-full">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className="max-w-2xl w-full group">
                    {/* User Message */}
                    {msg.sender === "user" && (
                      <div className={`rounded-2xl px-5 py-4 bg-gradient-to-r from-accent to-cyan-400 text-sidebar shadow-lg ${isRTL ? "mr-12" : "ml-12"}`}>
                        <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                        {msg.timestamp && (
                          <p className="text-xs mt-2 opacity-60">
                            {msg.timestamp.toLocaleTimeString(isRTL ? "ar-SA" : "en-US")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Grok Message */}
                    {msg.sender === "grok" && (
                      <div className={`rounded-2xl border border-border overflow-hidden ${isRTL ? "ml-12" : "mr-12"}`}>
                        {/* Mode Badge */}
                        {msg.mode && (
                          <div className={`px-4 py-2 flex items-center gap-2 border-b border-border/50 ${
                            msg.mode === "fast" ? "bg-emerald-500/10" :
                            msg.mode === "think" ? "bg-amber-500/10" :
                            "bg-blue-500/10"
                          }`}>
                            <ModeBadge mode={msg.mode} />
                          </div>
                        )}

                        {/* Thinking Chain - Think Mode */}
                        {msg.mode === "think" && msg.thoughtChain && msg.thoughtChain.length > 0 && (
                          <div className="px-4 py-3 border-b border-border/50 bg-amber-500/5">
                            <div className="flex items-center gap-2 mb-2.5">
                              <Brain className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                                {t.thinkingLabel}
                              </span>
                              {msg.isStreaming && msg.thoughtChain.some((s) => s.active) && (
                                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                              )}
                            </div>
                            <div className="space-y-2">
                              {msg.thoughtChain.map((step, i) => (
                                <div
                                  key={step.id}
                                  className={`flex items-start gap-2.5 transition-all duration-500 ${
                                    step.completed ? "opacity-70" : step.active ? "opacity-100" : "opacity-40"
                                  }`}
                                >
                                  <div className="mt-0.5 flex-shrink-0">
                                    {step.completed ? (
                                      <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-amber-400" />
                                      </div>
                                    ) : step.active ? (
                                      <div className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center think-pulse-ring">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed ${
                                      step.active ? "text-amber-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/50"
                                    }`}>
                                      {step.text}
                                    </p>
                                    {step.active && (
                                      <div className="mt-1.5 flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                      </div>
                                    )}
                                  </div>
                                  {i < msg.thoughtChain!.length - 1 && step.completed && (
                                    <ChevronDown className="w-3 h-3 text-amber-500/40 flex-shrink-0 mt-1" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Search Steps - DeepSearch Mode */}
                        {msg.mode === "deepsearch" && msg.searchSteps && msg.searchSteps.length > 0 && (
                          <div className="px-4 py-3 border-b border-border/50 bg-blue-500/5">
                            <div className="flex items-center gap-2 mb-2.5">
                              <Globe className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                                {t.searchLabel}
                              </span>
                              {msg.isStreaming && msg.searchSteps.some((s) => s.active) && (
                                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                              )}
                            </div>
                            <div className="space-y-2">
                              {msg.searchSteps.map((step, i) => (
                                <div
                                  key={step.id}
                                  className={`flex items-start gap-2.5 transition-all duration-500 ${
                                    step.completed ? "opacity-70" : step.active ? "opacity-100" : "opacity-40"
                                  }`}
                                >
                                  <div className="mt-0.5 flex-shrink-0">
                                    {step.completed ? (
                                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-blue-400" />
                                      </div>
                                    ) : step.active ? (
                                      <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center search-pulse-ring">
                                        {step.type === "query" && <Search className="w-2.5 h-2.5 text-blue-400" />}
                                        {step.type === "browsing" && <Globe className="w-2.5 h-2.5 text-blue-400 animate-pulse" />}
                                        {step.type === "reading" && <FileText className="w-2.5 h-2.5 text-blue-400" />}
                                        {step.type === "analyzing" && <LinkIcon className="w-2.5 h-2.5 text-blue-400 animate-spin" />}
                                        {step.type === "synthesizing" && <Sparkles className="w-2.5 h-2.5 text-blue-400" />}
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed ${
                                      step.active ? "text-blue-300 font-medium" : step.completed ? "text-muted-foreground" : "text-muted-foreground/50"
                                    }`}>
                                      {step.text}
                                    </p>
                                    {step.active && step.detail && (
                                      <p className="text-[10px] text-blue-400/60 mt-0.5">{step.detail}</p>
                                    )}
                                    {step.active && (
                                      <div className="mt-1.5 h-1 w-24 bg-blue-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full search-progress-bar" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fast Mode - Quick Thinking Indicator */}
                        {msg.mode === "fast" && msg.isStreaming && !msg.text && (
                          <div className="px-4 py-3 border-b border-border/50 bg-emerald-500/5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Sparkles className="w-4 h-4 text-emerald-400 fast-blink" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                                  {t.fastThinkingLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Response Text */}
                        <div className="px-5 py-4 bg-card">
                          {msg.text ? (
                            <p className="text-sm md:text-base leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                              {msg.text}
                              {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 streaming-cursor" />}
                            </p>
                          ) : msg.isStreaming && msg.mode !== "fast" ? null : null}
                          {!msg.isStreaming && msg.text && msg.timestamp && (
                            <p className="text-xs mt-2 opacity-60">
                              {msg.timestamp.toLocaleTimeString(isRTL ? "ar-SA" : "en-US")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Message Actions */}
                    {msg.sender === "user" && (
                      <div className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 justify-end ${isRTL ? "pl-2" : "pr-2"}`}>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 hover:bg-destructive/20 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 p-4 md:p-6 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Active Mode Indicator */}
            <div className="flex items-center justify-center gap-2">
              <ModeBadge mode={selectedMode} />
            </div>

            <div className="relative flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-accent focus-within:shadow-lg focus-within:shadow-accent/20 transition-all duration-300 group">
              <Paperclip className="w-5 h-5 text-muted-foreground group-hover:text-accent cursor-pointer transition-colors duration-200" />

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t.messagePlaceholder}
                className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground text-sm md:text-base"
                dir={isRTL ? "rtl" : "ltr"}
                disabled={isProcessing}
              />

              <div className="flex items-center gap-2">
                {input.trim() && (
                  <button
                    onClick={() => setInput("")}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}

                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isProcessing}
                  className={`bg-gradient-to-r ${modeConfig[selectedMode].color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2 h-auto shadow-lg transition-all duration-200`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
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
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    think: {
      label: t.modeThink,
      icon: <Brain className="w-3 h-3" />,
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    deepsearch: {
      label: t.modeDeepSearch,
      icon: <Globe className="w-3 h-3" />,
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
  };
  const cfg = config[mode];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function NavItem({
  icon,
  label,
  open,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        active
          ? "bg-sidebar-accent text-accent"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-accent"
      }`}
    >
      <div className="flex-shrink-0 flex items-center justify-center">{icon}</div>
      {open && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

function ModeCard({
  icon,
  title,
  description,
  gradient,
  active,
  onClick,
  isRTL,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  active: boolean;
  onClick: () => void;
  isRTL: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all duration-300 text-left group relative overflow-hidden ${
        active
          ? `border-transparent bg-gradient-to-br ${gradient} bg-clip-padding shadow-xl scale-[1.02]`
          : "border-border hover:border-accent bg-card/50 hover:bg-card hover:shadow-lg"
      }`}
    >
      {active && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />}
      <div className={`relative flex items-start gap-3 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`${active ? "text-white" : "text-accent"} group-hover:scale-110 transition-transform duration-300 mt-1`}>
          {icon}
        </div>
        <h3 className={`font-semibold text-sm md:text-base ${active ? "text-white" : "text-foreground"}`}>{title}</h3>
      </div>
      <p className={`text-xs md:text-sm leading-relaxed ${active ? "text-white/80" : "text-muted-foreground"}`} dir={isRTL ? "rtl" : "ltr"}>
        {description}
      </p>
      {active && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>
      )}
    </button>
  );
}
