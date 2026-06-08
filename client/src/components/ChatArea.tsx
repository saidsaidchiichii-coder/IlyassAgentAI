import { User } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import {
  BarChart3,
  Globe,
  Code2,
  Palette,
  MoreHorizontal,
  Paperclip,
  Search,
  Cpu,
  Send,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface ChatAreaProps {
  user: User | null;
}

export function ChatArea({ user }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const createConversationMutation = trpc.chat.createConversation.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation on first message
  const initializeConversation = async () => {
    if (!conversationId) {
      try {
        const result = await createConversationMutation.mutateAsync({
          title: "New Conversation",
        });
        // Get the created conversation ID from the result
        // For now, we'll use a placeholder ID - in production, the mutation should return the ID
        setConversationId(1);
        return 1;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return null;
      }
    }
    return conversationId;
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Initialize conversation if needed
    let convId = conversationId;
    if (!convId) {
      convId = await initializeConversation();
      if (!convId) return;
    }

    setIsLoading(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        conversationId: convId,
        message: userMessage,
        skillName: selectedSkill,
      });

      // Add assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  };

  const actionChips = [
    { icon: BarChart3, label: "Create slides" },
    { icon: Globe, label: "Build website" },
    { icon: Code2, label: "Develop desktop apps" },
    { icon: Palette, label: "Design" },
    { icon: MoreHorizontal, label: "More" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-4xl font-light text-gray-900 mb-12">What can I do for you?</h1>

            {/* Chat Input */}
            <div className="w-full max-w-2xl mb-8">
              <div className="bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Assign a task or ask anything"
                  className="w-full border-0 resize-none focus:ring-0 p-4 text-base placeholder:text-gray-400"
                  rows={3}
                />
                <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      title="Add file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      title="Web search"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      title="My computer"
                    >
                      <Cpu className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className={`h-8 w-8 p-0 rounded-full transition-all ${
                      message.trim() && !isLoading
                        ? "bg-gray-900 hover:bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Chips */}
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {actionChips.map((chip) => (
                <Button
                  key={chip.label}
                  variant="outline"
                  className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 gap-2"
                >
                  <chip.icon className="w-4 h-4" />
                  <span className="text-sm">{chip.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                role={msg.role as "user" | "assistant"}
                content={msg.content}
              />
            ))}
            {isLoading && (
              <MessageBubble role="assistant" content="" isLoading={true} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area (when messages exist) */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Textarea
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full border-0 resize-none focus:ring-0 p-3 text-sm placeholder:text-gray-400"
                rows={1}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className={`h-7 w-7 p-0 rounded-full transition-all ${
                    message.trim() && !isLoading
                      ? "bg-gray-900 hover:bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
