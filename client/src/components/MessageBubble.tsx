import { Streamdown } from "streamdown";
import { Loader2 } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

export function MessageBubble({ role, content, isLoading }: MessageBubbleProps) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-md px-4 py-3 rounded-lg ${
          role === "user"
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : role === "assistant" ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <Streamdown>{content}</Streamdown>
          </div>
        ) : (
          <p className="text-sm">{content}</p>
        )}
      </div>
    </div>
  );
}
