import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationSet, translations } from './translations';
import { Tenant } from '../types';
import { getAllTenants, getActiveTenantId, setActiveTenantId } from './firebase';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  t: TranslationSet;
  tenants: Tenant[];
  activeTenant: Tenant | null;
  setActiveTenant: (tenant: Tenant) => void;
  reloadTenants: () => Promise<void>;
  formatPrice: (price: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('renthub_lang');
    return (stored === 'am' || stored === 'en') ? stored : 'en';
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('renthub_theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'light';
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('renthub_lang', lang);
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('renthub_theme', newTheme);
  };

  const reloadTenants = async () => {
    try {
      const data = await getAllTenants();
      setTenants(data);
      const savedTenantId = getActiveTenantId();
      const matched = data.find(t => t.id === savedTenantId) || data[0];
      if (matched) {
        setActiveTenantState(matched);
        setActiveTenantId(matched.id);
      }
    } catch (err) {
      console.error("Failed to fetch tenants inside AppContext:", err);
    }
  };

  const setActiveTenant = (tenant: Tenant) => {
    setActiveTenantState(tenant);
    setActiveTenantId(tenant.id);
    // Reload page or let app handle re-fetching of context data!
    window.location.reload();
  };

  // Load Tenants on Mount
  useEffect(() => {
    reloadTenants();
  }, []);

  // Sync color variables for custom tenant branding
  useEffect(() => {
    if (activeTenant?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', activeTenant.primaryColor);
      // inject primary color classes for background/text custom styling dynamic support
      const styleTagId = 'tenant-custom-branding';
      let styleTag = document.getElementById(styleTagId) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleTagId;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        .text-tenant { color: ${activeTenant.primaryColor} !important; }
        .bg-tenant { background-color: ${activeTenant.primaryColor} !important; }
        .border-tenant { border-color: ${activeTenant.primaryColor} !important; }
        .focus\\:ring-tenant:focus { --tw-ring-color: ${activeTenant.primaryColor} !important; }
      `;
    }
  }, [activeTenant]);

  // Keep html class in sync for Tailwind dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const formatPrice = (price: number) => {
    const currency = activeTenant?.currency || 'USD';
    const formatter = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'am-ET', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    });
    return formatter.format(price);
  };

  const t = translations[language];

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      theme, 
      setTheme, 
      t, 
      tenants, 
      activeTenant, 
      setActiveTenant, 
      reloadTenants,
      formatPrice
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
