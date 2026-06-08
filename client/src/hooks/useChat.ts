import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat(conversationId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | undefined>();

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content }]);
      setIsLoading(true);

      try {
        const response = await sendMessageMutation.mutateAsync({
          conversationId,
          message: content,
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
    },
    [conversationId, selectedSkill, sendMessageMutation]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    selectedSkill,
    setSelectedSkill,
  };
}
