import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader as Loader2, User, Mail, ChevronLeft, LogOut, Shield, Bell, Palette, Globe, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { t, isRTL, language, toggleLanguage } = useLanguage();
  const { user, profile, signOut, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: err } = await updateProfile({ display_name: displayName });
    if (err) setError(err);
    else setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="p-2 hover:bg-card rounded-lg transition-colors">
            <ChevronLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
          </a>
          <h1 className="text-lg font-semibold">{t.settings}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Section */}
        <section>
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-4">{t.profileSection}</h2>
          <div className="bg-card/50 border border-border/40 rounded-xl p-5 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.display_name || user?.email || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">{t.displayName}</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.displayNamePlaceholder}
                className="bg-background border-border/60 h-10 text-sm rounded-lg"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">{t.emailLabel}</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-background border border-border/40 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {saved && <p className="text-xs text-emerald-400">{t.saved}</p>}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.saveChanges}
            </Button>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-4">{t.preferencesSection}</h2>
          <div className="bg-card/50 border border-border/40 rounded-xl divide-y divide-border/30">
            {/* Language */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
            >
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{t.languageSetting}</p>
                <p className="text-xs text-muted-foreground">{language === "en" ? "English" : "العربية"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{t.tapToChange}</span>
            </button>

            {/* Notifications placeholder */}
            <div className="flex items-center gap-3 px-5 py-4 opacity-50">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.notifications}</p>
                <p className="text-xs text-muted-foreground">{t.comingSoon}</p>
              </div>
            </div>

            {/* Theme placeholder */}
            <div className="flex items-center gap-3 px-5 py-4 opacity-50">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.theme}</p>
                <p className="text-xs text-muted-foreground">{t.comingSoon}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section>
          <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-4">{t.accountSection}</h2>
          <div className="bg-card/50 border border-border/40 rounded-xl divide-y divide-border/30">
            <div className="flex items-center gap-3 px-5 py-4 opacity-50">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.privacy}</p>
                <p className="text-xs text-muted-foreground">{t.comingSoon}</p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">{t.signOut}</p>
            </button>

            <div className="flex items-center gap-3 px-5 py-4 opacity-30">
              <Trash2 className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">{t.deleteAccount}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
