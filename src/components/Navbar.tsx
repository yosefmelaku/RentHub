import React from 'react';
import { Home, User, ShieldAlert, KeyRound, LogOut, Search, Sun, Moon, Languages, Sparkles } from 'lucide-react';
import { AppUser } from '../types';
import { useAppContext } from '../lib/AppContext';

interface NavbarProps {
  currentTab: 'explore' | 'renter-dashboard' | 'owner-dashboard' | 'enterprise';
  setCurrentTab: (tab: 'explore' | 'renter-dashboard' | 'owner-dashboard' | 'enterprise') => void;
  currentUser: AppUser;
  onSignOut: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onSignOut,
  searchQuery,
  setSearchQuery,
}) => {
  const { language, setLanguage, theme, setTheme, t, tenants, activeTenant, setActiveTenant } = useAppContext();

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          
          {/* Brand & Tenant Selector */}
          <div className="flex items-center space-x-4 shrink-0">
            <div 
              className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]" 
              onClick={() => setCurrentTab('explore')}
            >
              <div className="bg-tenant text-white p-2 rounded-xl shadow-md flex items-center justify-center transition-all duration-300">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-widest font-sans text-gray-900 dark:text-white uppercase leading-none">
                  LUXE<span className="text-tenant">RENT</span>
                </span>
                <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 leading-none">
                  Elite Estates
                </span>
              </div>
            </div>
            
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer text-xs sm:text-sm font-sans font-bold text-gray-800 dark:text-slate-200 transition-all">
                <span className="w-2 h-2 rounded-full inline-block bg-tenant shrink-0"></span>
                <span>{activeTenant?.name || "Luxerent Global"}</span>
                <span className="text-[10px] text-gray-400 font-mono font-medium hidden sm:inline-block">({activeTenant?.currency || "USD"})</span>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl py-2 hidden group-hover:block z-50 animate-fadeIn">
                <p className="px-3.5 py-1.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  {language === 'en' ? 'Select Active Workspace' : 'ንቁ የብራንድ የሥራ ቦታ ይምረጡ'}
                </p>
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTenant(t)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/80 cursor-pointer border-0 bg-transparent transition-colors ${
                      activeTenant?.id === t.id ? 'bg-gray-50/50 dark:bg-slate-800/40' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.primaryColor }}></span>
                      <div className="leading-tight">
                        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-100">{t.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">{t.id === 'luxerent' ? 'Luxury stays' : t.id === 'corpstay' ? 'Corporate suites' : 'Resort beach houses'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md shrink-0">
                      {t.currency}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Google-like Search Bar on the Top Header */}
          <div className="flex-grow max-w-xs md:max-w-sm lg:max-w-md relative">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'en' ? "Search properties, locations..." : "ቤቶችን ወይም አካባቢዎችን ይፈልጉ..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentTab !== 'explore') {
                    setCurrentTab('explore');
                  }
                }}
                className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-full text-xs sm:text-sm font-sans text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all focus:outline-hidden shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-sans text-xs font-bold bg-transparent border-0 cursor-pointer"
                  type="button"
                >
                  {language === 'en' ? 'Clear' : 'አጽዳ'}
                </button>
              )}
            </div>
          </div>

          {/* Profile & Controls Panel */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 shrink-0">
            {/* Language Toggle */}
            <div className="flex bg-gray-150 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0" id="lang-toggle-container">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] sm:text-xs font-extrabold font-sans rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-black'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="English Language"
              >
                English
              </button>
              <button
                onClick={() => setLanguage('am')}
                className={`px-2 py-1 text-[10px] sm:text-xs font-extrabold font-sans rounded-lg transition-all cursor-pointer ${
                  language === 'am'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-black'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Amharic Language / አማርኛ"
              >
                አማርኛ
              </button>
            </div>

            {/* Theme Toggle - Single Icon Switch (No Text) */}
            <button
              id="theme-toggle-single"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-50 border-gray-200 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400'
              }`}
              title={theme === 'light' ? "Switch to Black Mode" : "Switch to White Mode"}
            >
              {theme === 'light' ? (
                <Moon className="h-4.5 w-4.5 text-slate-700" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
              )}
            </button>

            {/* User Profile Info Pill */}
            <div className="flex items-center space-x-2 border-l border-gray-100 dark:border-slate-800 pl-3 md:pl-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[120px]">{currentUser.email}</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              id="navbar-sign-out-btn"
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Desktop Navigation Subbar (Below the logo / search bar) */}
        <div className="hidden md:flex items-center space-x-1.5 py-2.5 border-t border-gray-100 dark:border-slate-800/60">
          <button
            id="tab-btn-explore"
            onClick={() => setCurrentTab('explore')}
            className={`px-4 py-2 rounded-xl font-sans text-xs sm:text-sm font-extrabold tracking-tight transition-all cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-tenant bg-opacity-10 text-tenant font-black shadow-xs'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-850/60'
            }`}
          >
            {t.explore}
          </button>
          <button
            id="tab-btn-renter"
            onClick={() => setCurrentTab('renter-dashboard')}
            className={`px-4 py-2 rounded-xl font-sans text-xs sm:text-sm font-extrabold tracking-tight transition-all cursor-pointer ${
              currentTab === 'renter-dashboard'
                ? 'bg-tenant bg-opacity-10 text-tenant font-black shadow-xs'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-850/60'
            }`}
          >
            {t.myBookings}
          </button>
          <button
            id="tab-btn-owner"
            onClick={() => setCurrentTab('owner-dashboard')}
            className={`px-4 py-2 rounded-xl font-sans text-xs sm:text-sm font-extrabold tracking-tight transition-all cursor-pointer ${
              currentTab === 'owner-dashboard'
                ? 'bg-tenant bg-opacity-10 text-tenant font-black shadow-xs'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-850/60'
            }`}
          >
            {t.ownerPortal}
          </button>
          
          {/* New Multi-Tenant Enterprise Console tab */}
          <button
            id="tab-btn-enterprise"
            onClick={() => setCurrentTab('enterprise')}
            className={`px-4 py-2 rounded-xl font-sans text-xs sm:text-sm font-black tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'enterprise'
                ? 'bg-tenant bg-opacity-20 text-tenant border border-tenant/30 font-black shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-850/60 border border-dashed border-gray-200 dark:border-slate-800'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tenant opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tenant"></span>
            </span>
            {language === 'en' ? 'Super Admin' : 'የድርጅት ማዕከል'}
          </button>
        </div>

        {/* Mobile bottom-level Tab Bar */}
        <div className="md:hidden flex justify-around border-t border-gray-100 dark:border-slate-800 py-2">
          <button
            onClick={() => setCurrentTab('explore')}
            className={`flex flex-col items-center space-y-0.5 text-xs font-medium transition-colors ${
              currentTab === 'explore' ? 'text-tenant font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">{t.explore}</span>
          </button>
          <button
            onClick={() => setCurrentTab('renter-dashboard')}
            className={`flex flex-col items-center space-y-0.5 text-xs font-medium transition-colors ${
              currentTab === 'renter-dashboard' ? 'text-tenant font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="h-5 w-5" />
            <span className="text-[10px]">{t.myBookings}</span>
          </button>
          <button
            onClick={() => setCurrentTab('owner-dashboard')}
            className={`flex flex-col items-center space-y-0.5 text-xs font-medium transition-colors ${
              currentTab === 'owner-dashboard' ? 'text-tenant font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px]">{t.ownerPortal}</span>
          </button>
          <button
            onClick={() => setCurrentTab('enterprise')}
            className={`flex flex-col items-center space-y-0.5 text-xs font-medium transition-colors ${
              currentTab === 'enterprise' ? 'text-tenant font-extrabold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="relative flex h-5 w-5 justify-center items-center">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-tenant opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tenant"></span>
            </span>
            <span className="text-[10px]">Super Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
