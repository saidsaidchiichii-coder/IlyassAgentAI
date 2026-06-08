import { Button } from "@/components/ui/button";
import { Folder, Trash2, Edit2 } from "lucide-react";

interface ProjectCardProps {
  id: number;
  name: string;
  description?: string;
  conversationCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({
  id,
  name,
  description,
  conversationCount = 0,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <div className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex items-start gap-3 flex-1">
        <Folder className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          {description && (
            <p className="text-xs text-gray-500 truncate">{description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {conversationCount} conversation{conversationCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
