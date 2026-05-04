import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Zap,
  Mic,
  Settings,
  LogOut,
  Menu,
  Send,
  Paperclip,
  MessageCircle,
  Clock,
  ChevronRight,
  X,
  MoreVertical,
} from "lucide-react";

/**
 * Grok Clone - High-fidelity recreation of Grok AI interface
 * Design Philosophy: Dark navy/black theme with cyan accents, minimalist navigation
 * Color Palette: #0a0e27 (bg), #1a1f3a (card), #00d9ff (accent), #ffffff (text)
 */
export default function Home() {
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; sender: "user" | "grok"; timestamp?: Date }>
  >([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"auto" | "deepsearch" | "think">("auto");

  const handleSendMessage = () => {
    if (input.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: input,
        sender: "user" as const,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInput("");

      // Simulate Grok response with typing indicator
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "I'm here to help. This Grok clone interface is ready for your backend integration. You can now connect this to your actual AI API.",
            sender: "grok",
            timestamp: new Date(),
          },
        ]);
      }, 800);
    }
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Grok Navigation */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col shadow-2xl`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-sidebar-border/50 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-sidebar font-bold" />
              </div>
              <span className="font-bold text-lg tracking-tight">Grok</span>
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
            }}
          >
            <Plus className="w-5 h-5" />
            {sidebarOpen && "New chat"}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem
            icon={<Search className="w-5 h-5" />}
            label="Explore"
            open={sidebarOpen}
            active={false}
          />
          <NavItem
            icon={<MessageCircle className="w-5 h-5" />}
            label="Conversations"
            open={sidebarOpen}
            active={false}
          />
          <NavItem
            icon={<Mic className="w-5 h-5" />}
            label="Voice"
            open={sidebarOpen}
            active={false}
          />
          <NavItem
            icon={<Zap className="w-5 h-5" />}
            label="Discover"
            open={sidebarOpen}
            active={false}
          />
        </nav>

        {/* History Section */}
        {sidebarOpen && messages.length > 0 && (
          <div className="px-4 py-4 border-t border-sidebar-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">
              <Clock className="w-3 h-3" />
              <span>Recent</span>
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

        {/* Bottom User Section */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-2">
          <NavItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            open={sidebarOpen}
            active={false}
          />
          <NavItem
            icon={<LogOut className="w-5 h-5" />}
            label="Sign out"
            open={sidebarOpen}
            active={false}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-background via-background to-background/95">
        {/* Chat Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in duration-500">
              {/* Grok Logo - Larger */}
              <div className="w-20 h-20 bg-gradient-to-br from-accent via-cyan-400 to-accent rounded-2xl flex items-center justify-center shadow-2xl">
                <Zap className="w-10 h-10 text-sidebar" />
              </div>

              {/* Welcome Text */}
              <div className="text-center max-w-2xl space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                  What do you want to know?
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Ask Grok anything. Get instant, accurate answers powered by real-time information and advanced reasoning.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex gap-3 flex-wrap justify-center">
                {["auto", "deepsearch", "think"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedMode === mode
                        ? "bg-accent text-sidebar shadow-lg"
                        : "bg-card border border-border hover:border-accent text-foreground"
                    }`}
                  >
                    {mode === "auto" && "Auto"}
                    {mode === "deepsearch" && "DeepSearch"}
                    {mode === "think" && "Think"}
                  </button>
                ))}
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-4">
                <ActionCard
                  icon={<Search className="w-6 h-6" />}
                  title="DeepSearch"
                  description="Search deeply to deliver detailed, well-reasoned answers with sources"
                />
                <ActionCard
                  icon={<Zap className="w-6 h-6" />}
                  title="Think"
                  description="Solve the hardest problems in math, science, and coding with reasoning"
                />
                <ActionCard
                  icon={<Paperclip className="w-6 h-6" />}
                  title="Image Analysis"
                  description="Analyze and understand images with advanced vision capabilities"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="max-w-2xl w-full group">
                    <div
                      className={`rounded-2xl px-5 py-4 transition-all duration-200 ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-accent to-cyan-400 text-sidebar shadow-lg ml-12"
                          : "bg-card text-foreground border border-border hover:border-accent/50 mr-12"
                      }`}
                    >
                      <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                      {msg.timestamp && (
                        <p className="text-xs mt-2 opacity-60">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* Message Actions */}
                    {msg.sender === "user" && (
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 justify-end pr-2">
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
            </div>
          )}
        </div>

        {/* Input Area - Bottom */}
        <div className="border-t border-border/50 p-4 md:p-6 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Input Field */}
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
                placeholder="Message Grok"
                className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground text-sm md:text-base"
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
                  disabled={!input.trim()}
                  className="bg-gradient-to-r from-accent to-cyan-400 hover:from-accent/90 hover:to-cyan-400/90 disabled:opacity-50 disabled:cursor-not-allowed text-sidebar rounded-full p-2 h-auto shadow-lg transition-all duration-200"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Info Text */}
            <p className="text-xs text-muted-foreground text-center">
              Grok can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </div>
    </div>
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
      {open && active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function ActionCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button className="p-5 rounded-xl border border-border hover:border-accent bg-card/50 hover:bg-card hover:shadow-lg transition-all duration-300 text-left group">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-accent group-hover:scale-110 transition-transform duration-300 mt-1">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground text-sm md:text-base">{title}</h3>
      </div>
      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </button>
  );
}
