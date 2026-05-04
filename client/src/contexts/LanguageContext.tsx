import React, { createContext, useContext, useState, useCallback } from "react";

type Language = "en" | "ar";

interface Translations {
  appName: string;
  newChat: string;
  today: string;
  previous: string;
  settings: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  messagePlaceholder: string;
  disclaimer: string;
  modeAuto: string;
  modeAutoDesc: string;
  modeFast: string;
  modeFastDesc: string;
  modeThink: string;
  modeThinkDesc: string;
  modeDeepSearch: string;
  modeDeepSearchDesc: string;
  thinkingLabel: string;
  searchLabel: string;
  fastThinkingLabel: string;
  autoAnalyzing: string;
  autoRouting: string;
  autoProcessing: string;
  complexity: string;
  suggestions: string[];
}

const translations: Record<Language, Translations> = {
  en: {
    appName: "Grok",
    newChat: "New chat",
    today: "Today",
    previous: "Previous",
    settings: "Settings",
    welcomeTitle: "Ask anything",
    welcomeSubtitle: "Get answers, create images, write code, and search the web and X in real time.",
    messagePlaceholder: "Ask anything",
    disclaimer: "Grok can make mistakes. Verify important information.",
    modeAuto: "Auto",
    modeAutoDesc: "Automatically picks the best approach",
    modeFast: "Fast",
    modeFastDesc: "Quick responses, minimal thinking",
    modeThink: "Think",
    modeThinkDesc: "Deep reasoning with step-by-step chains",
    modeDeepSearch: "DeepSearch",
    modeDeepSearchDesc: "Web research with source verification",
    thinkingLabel: "Thinking",
    searchLabel: "Searching",
    fastThinkingLabel: "Thinking...",
    autoAnalyzing: "Analyzing query",
    autoRouting: "Selecting approach",
    autoProcessing: "Generating response",
    complexity: "Complexity",
    suggestions: [
      "Explain quantum computing simply",
      "Write a Python script to sort a list",
      "What's happening in the news today?",
      "Help me debug my React component",
    ],
  },
  ar: {
    appName: "جروك",
    newChat: "محادثة جديدة",
    today: "اليوم",
    previous: "السابقة",
    settings: "الإعدادات",
    welcomeTitle: "اسأل أي شيء",
    welcomeSubtitle: "احصل على إجابات، أنشئ صورًا، اكتب كودًا، وابحث في الويب وX في الوقت الفعلي.",
    messagePlaceholder: "اسأل أي شيء",
    disclaimer: "قد يخطئ جروك. تحقق من المعلومات المهمة.",
    modeAuto: "تلقائي",
    modeAutoDesc: "يختار أفضل نهج تلقائيًا",
    modeFast: "سريع",
    modeFastDesc: "إجابات سريعة مع تفكير بسيط",
    modeThink: "تفكير",
    modeThinkDesc: "تفكير عميق مع سلاسل خطوة بخطوة",
    modeDeepSearch: "بحث عميق",
    modeDeepSearchDesc: "بحث في الويب مع التحقق من المصادر",
    thinkingLabel: "يفكر",
    searchLabel: "يبحث",
    fastThinkingLabel: "يفكر...",
    autoAnalyzing: "تحليل الاستفسار",
    autoRouting: "اختيار النهج",
    autoProcessing: "توليد الاستجابة",
    complexity: "التعقيد",
    suggestions: [
      "اشرح الحوسبة الكمية ببساطة",
      "اكتب سكربت بايثون لترتيب قائمة",
      "ماذا يحدث في الأخبار اليوم؟",
      "ساعدني في تصحيح مكون React الخاص بي",
    ],
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
