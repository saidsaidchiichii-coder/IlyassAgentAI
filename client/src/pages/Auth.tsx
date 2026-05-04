import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader as Loader2, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const { t, isRTL } = useLanguage();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isLogin) {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else {
      const { error: err } = await signUp(email, password, displayName);
      if (err) {
        setError(err);
      } else {
        setSuccess(t.checkEmail);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-foreground/5 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-center text-foreground mb-1">
          {isLogin ? t.signIn : t.createAccount}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {isLogin ? t.signInSubtitle : t.createAccountSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1.5">{t.displayName}</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.displayNamePlaceholder}
                className="bg-card border-border/60 h-10 text-sm rounded-lg"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">{t.emailLabel}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="bg-card border-border/60 h-10 text-sm rounded-lg"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">{t.passwordLabel}</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                required
                minLength={6}
                className="bg-card border-border/60 h-10 text-sm rounded-lg pr-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-medium"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? t.signIn : t.createAccount}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? t.noAccount : t.hasAccount}
          </button>
        </div>
      </div>
    </div>
  );
}
