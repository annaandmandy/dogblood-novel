import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    // Try to get language from localStorage, default to 'zh-TW'
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app_language') || 'zh-TW';
    });

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                // Fallback to zh-TW if key missing in current language
                let fallback = translations['zh-TW'];
                for (const fk of keys) {
                    if (fallback && fallback[fk]) {
                        fallback = fallback[fk];
                    } else {
                        return key; // Return key if not found anywhere
                    }
                }
                return fallback;
            }
        }
        return value;
    };

    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
