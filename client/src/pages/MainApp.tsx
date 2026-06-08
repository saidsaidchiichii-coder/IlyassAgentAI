import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { TopBar } from "@/components/TopBar";
import { getLoginUrl } from "@/const";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function MainApp() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<string | undefined>();


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading Manus AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manus AI</h1>
            <p className="text-gray-600">Sign in to get started</p>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            size="lg"
          >
            Sign in with Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        selectedSkill={selectedSkill}
        onSkillChange={setSelectedSkill}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <TopBar user={user} />

        {/* Chat Area */}
        <ChatArea user={user} />
      </div>
    </div>
  );
}
