import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Mic,
  Settings,
  LogOut,
  Menu,
  Send,
  Paperclip,
  MessageCircle,
  Clock,
  ChevronDown,
  X,
  Image,
  Compass,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  UserPlus,
  User,
  Volume2,
} from "lucide-react";

function GrokLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M50,8 C26.8,8 8,26.8 8,50 C8,73.2 26.8,92 50,92 C73.2,92 92,73.2 92,50 C92,26.8 73.2,8 50,8 Z M50,82 C32.3,82 18,67.7 18,50 C18,32.3 32.3,18 50,18 C67.7,18 82,32.3 82,50 C82,67.7 67.7,82 50,82 Z"
      />
      <polygon points="72,8 62,8 28,92 38,92" />
    </svg>
  );
}

function AudioWaveIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="9" width="2" height="6" rx="1" fill="currentColor" />
      <rect x="8" y="6" width="2" height="12" rx="1" fill="currentColor" />
      <rect x="12" y="4" width="2" height="16" rx="1" fill="currentColor" />
      <rect x="16" y="7" width="2" height="10" rx="1" fill="currentColor" />
      <rect x="20" y="9" width="2" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      sender: "user" | "grok";
      timestamp?: Date;
    }>
  >([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMode, setSelectedMode] = useState("Fast");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "I'm Grok, made by xAI. I'm here to help you with anything you need. How can I assist you today?",
            sender: "grok",
            timestamp: new Date(),
          },
        ]);
      }, 800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modes = ["Fast", "Think", "DeepSearch"];

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
        } bg-[#171717] flex flex-col transition-all duration-300 border-r border-[#2a2a2a] flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 h-[52px]">
          <div className="flex items-center gap-2">
            <GrokLogo className="w-6 h-6 text-white" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <PanelLeftClose className="w-5 h-5 text-[#8e8e8e]" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              setMessages([]);
              setInput("");
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-[#212121] hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          <SidebarItem
            icon={<Compass className="w-5 h-5" />}
            label="Explore"
          />
          <SidebarItem
            icon={<MessageCircle className="w-5 h-5" />}
            label="Conversations"
          />
          <SidebarItem
            icon={<Volume2 className="w-5 h-5" />}
            label="Voice"
          />
          <SidebarItem
            icon={<Sparkles className="w-5 h-5" />}
            label="Discover"
          />

          {/* Chat History */}
          {messages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
              <div className="px-3 pb-2 text-xs font-medium text-[#6e6e6e] uppercase tracking-wider">
                Recent
              </div>
              <div className="space-y-0.5">
                {messages
                  .filter((m) => m.sender === "user")
                  .slice(-5)
                  .reverse()
                  .map((msg) => (
                    <button
                      key={msg.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors truncate text-left"
                    >
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {msg.text.substring(0, 30)}
                        {msg.text.length > 30 ? "..." : ""}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t border-[#2a2a2a] space-y-0.5">
          <SidebarItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
          <SidebarItem
            icon={<LogOut className="w-5 h-5" />}
            label="Sign out"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 h-[52px] flex-shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <PanelLeft className="w-5 h-5 text-[#8e8e8e]" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
              <Image className="w-4 h-4" />
              <span>Imagine</span>
            </button>
            <button className="p-2 text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button className="px-3 py-1.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
              Sign in
            </button>
            <button className="px-4 py-1.5 text-sm font-medium text-white border border-[#555] hover:bg-[#2a2a2a] rounded-full transition-colors">
              Sign up
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            /* Welcome Screen - Centered */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="flex flex-col items-center gap-6 w-full max-w-[680px]">
                {/* Logo and Brand */}
                <div className="flex items-center gap-3">
                  <GrokLogo className="w-10 h-10 text-white" />
                  <span className="text-[32px] font-semibold tracking-tight">
                    Grok
                  </span>
                </div>

                {/* Input Field */}
                <div className="w-full relative">
                  <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-2 focus-within:border-[#444] transition-colors">
                    {/* Plus/Attach button */}
                    <button className="p-2 text-[#6e6e6e] hover:text-white rounded-full transition-colors flex-shrink-0">
                      <Plus className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="How can I help you today?"
                      rows={1}
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-white placeholder:text-[#6e6e6e] text-[15px] px-2 py-1.5 max-h-[200px] leading-normal"
                    />

                    {/* Right side buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Mode Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setModeDropdownOpen(!modeDropdownOpen)
                          }
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                          <span>{selectedMode}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {modeDropdownOpen && (
                          <div className="absolute bottom-full right-0 mb-1 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl py-1 min-w-[140px] z-50">
                            {modes.map((mode) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setSelectedMode(mode);
                                  setModeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                  selectedMode === mode
                                    ? "text-white bg-[#2a2a2a]"
                                    : "text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]"
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mic button */}
                      <button className="p-2 text-[#8e8e8e] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>

                      {/* Send/Voice button */}
                      <button
                        onClick={handleSendMessage}
                        className="p-2.5 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                      >
                        <AudioWaveIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom disclaimer */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-xs text-[#6e6e6e]">
                  By messaging Grok, you agree to our{" "}
                  <span className="text-[#1d9bf0] hover:underline cursor-pointer">
                    Terms
                  </span>{" "}
                  and{" "}
                  <span className="text-[#1d9bf0] hover:underline cursor-pointer">
                    Privacy Policy
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[680px] mx-auto px-4 py-6 space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-0.5">
                      {msg.sender === "grok" ? (
                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                          <GrokLogo className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#1d9bf0] flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {msg.sender === "grok" ? "Grok" : "You"}
                        </span>
                        {msg.timestamp && (
                          <span className="text-xs text-[#6e6e6e]">
                            {msg.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area - Bottom when chatting */}
              <div className="sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pt-6 pb-4 px-4">
                <div className="max-w-[680px] mx-auto">
                  <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-2 focus-within:border-[#444] transition-colors">
                    <button className="p-2 text-[#6e6e6e] hover:text-white rounded-full transition-colors flex-shrink-0">
                      <Plus className="w-5 h-5" />
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="How can I help you today?"
                      rows={1}
                      className="flex-1 bg-transparent border-0 outline-none resize-none text-white placeholder:text-[#6e6e6e] text-[15px] px-2 py-1.5 max-h-[200px] leading-normal"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setModeDropdownOpen(!modeDropdownOpen)
                          }
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                          <span>{selectedMode}</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {modeDropdownOpen && (
                          <div className="absolute bottom-full right-0 mb-1 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl py-1 min-w-[140px] z-50">
                            {modes.map((mode) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setSelectedMode(mode);
                                  setModeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                  selectedMode === mode
                                    ? "text-white bg-[#2a2a2a]"
                                    : "text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a]"
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="p-2 text-[#8e8e8e] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        className="p-2.5 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                      >
                        <AudioWaveIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#6e6e6e] text-center mt-2">
                    Grok can make mistakes. Verify important information.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
        active
          ? "bg-[#2a2a2a] text-white"
          : "text-[#a0a0a0] hover:bg-[#212121] hover:text-white"
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span>{label}</span>
    </button>
  );
}
