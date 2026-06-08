import { Button } from "@/components/ui/button";
import { Mail, Calendar, BookOpen, MessageCircle, Link2, Unlink2 } from "lucide-react";
import { useState } from "react";

interface ConnectorCardProps {
  type: "gmail" | "google_calendar" | "notion" | "slack";
  status: "connected" | "disconnected";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const connectorConfig = {
  gmail: {
    name: "Gmail",
    icon: Mail,
    color: "text-red-500",
    description: "Access your emails",
  },
  google_calendar: {
    name: "Google Calendar",
    icon: Calendar,
    color: "text-blue-500",
    description: "Sync your calendar",
  },
  notion: {
    name: "Notion",
    icon: BookOpen,
    color: "text-gray-900",
    description: "Connect your workspace",
  },
  slack: {
    name: "Slack",
    icon: MessageCircle,
    color: "text-purple-500",
    description: "Integrate with Slack",
  },
};

export function ConnectorCard({
  type,
  status,
  onConnect,
  onDisconnect,
}: ConnectorCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const config = connectorConfig[type];
  const Icon = config.icon;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      onConnect?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      onDisconnect?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <div>
          <p className="text-sm font-medium text-gray-900">{config.name}</p>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status === "connected" ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        {status === "connected" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="text-xs text-red-600 hover:text-red-700"
          >
            <Unlink2 className="w-3 h-3 mr-1" />
            Disconnect
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnect}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            <Link2 className="w-3 h-3 mr-1" />
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
