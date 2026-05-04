import React, { createContext, useContext, useState, useCallback } from "react";

type Language = "en" | "ar";

interface Translations {
  appName: string;
  newChat: string;
  explore: string;
  conversations: string;
  voice: string;
  discover: string;
  recent: string;
  settings: string;
  signOut: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  messagePlaceholder: string;
  disclaimer: string;
  grokResponse: string;
  modelLabel: string;
  modeFast: string;
  modeFastDesc: string;
  modeThink: string;
  modeThinkDesc: string;
  modeDeepSearch: string;
  modeDeepSearchDesc: string;
  thinkingLabel: string;
  searchLabel: string;
  fastThinkingLabel: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: "Grok",
    newChat: "New chat",
    explore: "Explore",
    conversations: "Conversations",
    voice: "Voice",
    discover: "Discover",
    recent: "Recent",
    settings: "Settings",
    signOut: "Sign out",
    welcomeTitle: "What do you want to know?",
    welcomeSubtitle:
      "Ask Grok anything. Get instant, accurate answers powered by real-time information and advanced reasoning.",
    messagePlaceholder: "Message Grok",
    disclaimer: "Grok can make mistakes. Check important information.",
    grokResponse:
      "I'm here to help. This Grok clone interface is ready for your backend integration. You can now connect this to your actual AI API.",
    modelLabel: "Model",
    modeFast: "Fast",
    modeFastDesc: "Quick responses with minimal thinking. Best for simple questions and fast answers.",
    modeThink: "Think",
    modeThinkDesc: "Deep reasoning with step-by-step thought chains. Best for complex problems in math, science, and coding.",
    modeDeepSearch: "DeepSearch",
    modeDeepSearchDesc: "Search the web deeply with source verification. Best for research and fact-checking.",
    thinkingLabel: "Thinking",
    searchLabel: "Searching",
    fastThinkingLabel: "Thinking...",
  },
  ar: {
    appName: "جروك",
    newChat: "محادثة جديدة",
    explore: "استكشاف",
    conversations: "المحادثات",
    voice: "صوتي",
    discover: "اكتشف",
    recent: "الأخيرة",
    settings: "الإعدادات",
    signOut: "تسجيل الخروج",
    welcomeTitle: "ماذا تريد أن تعرف؟",
    welcomeSubtitle:
      "اسأل جروك أي شيء. احصل على إجابات فورية ودقيقة مدعومة بالمعلومات في الوقت الفعلي والتفكير المتقدم.",
    messagePlaceholder: "أرسل رسالة لجروك",
    disclaimer: "قد يخطئ جروك. تحقق من المعلومات المهمة.",
    grokResponse:
      "أنا هنا للمساعدة. واجهة جروك جاهزة للتكامل مع الخادم الخاص بك. يمكنك الآن ربطها بواجهة برمجة التطبيقات الخاصة بك.",
    modelLabel: "النموذج",
    modeFast: "سريع",
    modeFastDesc: "إجابات سريعة مع تفكير بسيط. الأفضل للأسئلة البسيطة والإجابات الفورية.",
    modeThink: "تفكير",
    modeThinkDesc: "تفكير عميق مع سلسلة خطوات منطقية. الأفضل للمشاكل المعقدة في الرياضيات والعلوم والبرمجة.",
    modeDeepSearch: "بحث عميق",
    modeDeepSearchDesc: "بحث معمق في الويب مع التحقق من المصادر. الأفضل للبحث والتحقق من الحقائق.",
    thinkingLabel: "يفكر",
    searchLabel: "يبحث",
    fastThinkingLabel: "يفكر...",
  },
};

interface LanguageContextType {
  language: Language;
  t: Translations;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("lang");
    return (stored as Language) || "en";
  });

  const isRTL = language === "ar";
  const t = translations[language];

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ar" : "en");
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={{ language, t, isRTL, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
