import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Language, TranslationDictionary } from './types';
import { vi } from './locales/vi';
import { en } from './locales/en';

const LOCALES: Record<Language, TranslationDictionary> = {
  vi,
  en,
};

const STORAGE_KEY = 'prompt_mixer_lang';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  isVietnamese: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'vi' || saved === 'en') {
        return saved;
      }
    }
    return 'vi'; // default to Vietnamese
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const dict = LOCALES[language] || vi;
      const parts = path.split('.');
      let current: any = dict;

      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          // Fallback to vi if not found
          let fallback: any = vi;
          for (const fbPart of parts) {
            if (fallback && typeof fallback === 'object' && fbPart in fallback) {
              fallback = fallback[fbPart];
            } else {
              return path;
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
        });
      }
      return result;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isVietnamese: language === 'vi',
      isEnglish: language === 'en',
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
