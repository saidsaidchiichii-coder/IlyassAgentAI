import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface ConversationListProps {
  isCollapsed: boolean;
  onSelectConversation?: (id: number) => void;
}

export function ConversationList({ isCollapsed, onSelectConversation }: ConversationListProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: conversations, isLoading } = trpc.chat.getConversations.useQuery();

  const handleSelect = (id: number) => {
    setSelectedId(id);
    onSelectConversation?.(id);
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-gray-500">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {conversations.map((convo) => (
        <button
          key={convo.id}
          onClick={() => handleSelect(convo.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            selectedId === convo.id
              ? "bg-blue-100 text-blue-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left truncate">{convo.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Delete conversation
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
              </button>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
