import { Button } from "@/components/ui/button";
import { Clock, Trash2, Power } from "lucide-react";
import { useState } from "react";

interface ScheduledTaskCardProps {
  id: number;
  name: string;
  cronExpression: string;
  enabled?: boolean;
  lastRun?: Date;
  nextRun?: Date;
  onToggle?: () => void;
  onDelete?: () => void;
}

export function ScheduledTaskCard({
  id,
  name,
  cronExpression,
  enabled = true,
  lastRun,
  nextRun,
  onToggle,
  onDelete,
}: ScheduledTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      onToggle?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex items-start gap-3 flex-1">
        <Clock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 font-mono">{cronExpression}</p>
          {nextRun && (
            <p className="text-xs text-gray-400 mt-1">
              Next run: {new Date(nextRun).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
          className={`h-7 w-7 p-0 ${
            enabled
              ? "text-green-600 hover:text-green-700"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Power className="w-3 h-3" />
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
