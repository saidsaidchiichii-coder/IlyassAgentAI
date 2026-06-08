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
  Send,
  Plus,
  AtSign,
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

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

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
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            {/* Main Title */}
            <h1 className="text-6xl font-serif text-gray-800 mb-16 tracking-tight leading-tight">
              What can I do for you?
            </h1>

            {/* Chat Input Container */}
            <div className="w-full max-w-2xl mb-8">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                {/* Textarea */}
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="w-full border-0 resize-none focus:ring-0 focus:outline-none p-4 text-sm placeholder:text-gray-500 bg-white rounded-t-2xl"
                  rows={2}
                  style={{
                    boxShadow: "none",
                  }}
                />
                
                {/* Input Footer with Icons */}
                <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {/* Plus Icon Button */}
                    <button
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150 hover:bg-gray-50 rounded"
                      title="Add file"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    {/* At Icon Button */}
                    <button
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150 hover:bg-gray-50 rounded"
                      title="Mention"
                    >
                      <AtSign className="w-4 h-4" />
                    </button>
                    
                    {/* Paperclip Icon Button */}
                    <button
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150 hover:bg-gray-50 rounded"
                      title="Upload"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-all duration-150 ${
                      message.trim() && !isLoading
                        ? "text-blue-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Chips */}
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {actionChips.map((chip) => (
                <button
                  key={chip.label}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-150 flex items-center gap-2 hover:border-gray-300"
                >
                  <chip.icon className="w-4 h-4" />
                  <span>{chip.label}</span>
                </button>
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
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <Textarea
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full border-0 resize-none focus:ring-0 focus:outline-none p-3 text-sm placeholder:text-gray-500 bg-white rounded-t-xl"
                rows={1}
                disabled={isLoading}
                style={{
                  boxShadow: "none",
                }}
              />
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <button
                    className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-150 hover:bg-gray-50 rounded"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className={`h-6 w-6 flex items-center justify-center rounded transition-all duration-150 ${
                    message.trim() && !isLoading
                      ? "text-blue-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
