import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface SkillPickerProps {
  value?: string;
  onChange?: (skillName: string) => void;
}

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  const { data: skills, isLoading } = trpc.skills.getSkills.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading skills...</span>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-3 border-t border-gray-200">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
        Skill
      </label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="w-full h-8 text-sm">
          <SelectValue placeholder="Select a skill" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No skill</SelectItem>
          {skills.map((skill) => (
            <SelectItem key={skill.id} value={skill.name}>
              {skill.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
