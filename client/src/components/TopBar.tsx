import { User } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface TopBarProps {
  user: User | null;
}

export function TopBar({ user }: TopBarProps) {
  const [selectedModel, setSelectedModel] = useState("manus-1.6-lite");

  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      {/* Model Selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-auto border-0 bg-transparent hover:bg-gray-100 px-2 py-1 h-8 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manus-1.6-lite">Manus 1.6 Lite</SelectItem>
            <SelectItem value="manus-1.6-pro">Manus 1.6 Pro</SelectItem>
            <SelectItem value="manus-2.0">Manus 2.0</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right Side - Plan Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
          <span className="text-gray-600">Free plan</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-0 text-blue-500 hover:text-blue-600 hover:bg-transparent font-medium text-xs"
          >
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
