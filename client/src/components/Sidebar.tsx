import { User } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  MessageSquare,
  Zap,
  Puzzle,
  Clock,
  Library,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logout = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.reload();
  };

  const navItems = [
    { icon: Plus, label: "New task", id: "new-task" },
    { icon: Zap, label: "Agent", id: "agent" },
    { icon: Puzzle, label: "Plugins", id: "plugins" },
    { icon: Clock, label: "Scheduled", id: "scheduled" },
    { icon: Library, label: "Library", id: "library" },
  ];

  return (
    <div
      className={`flex flex-col h-screen bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">manus</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* Projects Section */}
        {!isCollapsed && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Projects
            </h3>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              <span>New project</span>
            </button>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
