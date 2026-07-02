import React, { useState, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, Building2, CheckCircle2, LogIn, Sparkles, UserCheck, ShieldAlert, ArrowLeft, Search, Facebook, Apple, Eye, EyeOff, Languages, Sun, Moon } from 'lucide-react';
import { AppUser, PropertyListing } from '../types';
import { loginUser, signUpUser, signInWithGoogle } from '../lib/firebase';
import { PropertyCard } from './PropertyCard';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { useAppContext } from '../lib/AppContext';

interface AuthPageProps {
  onAuthSuccess: (user: AppUser) => void;
  onCancel?: () => void;
  listings?: PropertyListing[];
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onCancel, listings = [] }) => {
  const { language, setLanguage, theme, setTheme, t } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'renter' | 'owner'>('renter');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(language === 'en' ? 'Please fill in your email and password.' : 'እባክዎ ኢሜይል እና የይለፍ ቃልዎን ያስገቡ።');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError(language === 'en' ? 'Please write your full name.' : 'እባክዎ ሙሉ ስምዎን ይጻፉ።');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const newUser = await signUpUser({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role,
          password: password
        });
        onAuthSuccess(newUser);
      } else {
        const user = await loginUser(email, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || (language === 'en' ? 'Something went wrong. Please try again.' : 'የሆነ ችግር ተከስቷል። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetEmail: string, presetRole: 'renter' | 'owner') => {
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(presetEmail, '123456');
      onAuthSuccess(user);
    } catch (err: any) {
      try {
        const dummyName = presetRole === 'renter' 
          ? (language === 'en' ? 'Yosef Melaku' : 'ዮሴፍ መላኩ') 
          : (language === 'en' ? 'Premium Host' : 'የላቀ አከራይ');
        const user = await signUpUser({
          name: dummyName,
          email: presetEmail,
          role: presetRole,
          password: '123456'
        });
        onAuthSuccess(user);
      } catch (err2: any) {
        setError(language === 'en' ? 'Quick login failed. Please type your details manually.' : 'ፈጣን መግባት አልተቻለም። እባክዎ በራስዎ ዝርዝር ይግቡ።');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // Shared Toggles Component to avoid redundancy
  const renderToggles = () => (
    <div className="flex items-center space-x-2">
      {/* Language Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0" id="auth-lang-toggle-container">
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 text-[10px] sm:text-xs font-extrabold font-sans rounded-lg transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs font-black'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title="English Language"
          type="button"
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
          type="button"
        >
          አማርኛ
        </button>
      </div>

      {/* Theme Toggle - Single Icon Switch (No Text) */}
      <button
        id="auth-theme-toggle-single"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
          theme === 'light'
            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400'
        }`}
        title={theme === 'light' ? "Switch to Black Mode" : "Switch to White Mode"}
        type="button"
      >
        {theme === 'light' ? (
          <Moon className="h-4.5 w-4.5 text-slate-700" />
        ) : (
          <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
        )}
      </button>
    </div>
  );

  // 1. Landing Page
  if (!showForm) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200" id="landing-page-root">
        
        {/* Header Area */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs">
          {/* Logo Left */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-2.5 rounded-xl shadow-sm inline-flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                RentHub <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Easy</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase font-extrabold hidden sm:block">
                {language === 'en' ? 'Find & Rent Houses' : 'ቤቶችን ይፈልጉ እና ይከራዩ'}
              </p>
            </div>
          </div>

          {/* Quick Lang/Theme Toggles & Login Button Right */}
          <div className="flex items-center space-x-3">
            {renderToggles()}
            
            <button
              onClick={() => {
                setError('');
                setShowForm(true);
              }}
              className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-2"
              type="button"
            >
              <span>{language === 'en' ? 'Login' : 'ይግቡ'}</span>
              <LogIn className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Landing Area */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 sm:py-24 flex flex-col justify-center items-center text-center space-y-12">
          
          {/* Simple Greeting Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'en' ? 'Rent Houses Easily' : 'ቤቶችን በቀላሉ ይከራዩ'}</span>
          </div>

          {/* Beast Large Typography */}
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none text-slate-900 dark:text-white">
              {language === 'en' ? 'Find a Great Home.' : 'ምርጥ መኖሪያ ቤት ያግኙ።'} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-500">
                {language === 'en' ? 'Simple and Safe.' : 'ቀላል እና አስተማማኝ።'}
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto font-light">
              {language === 'en' 
                ? 'We help you find nice houses and apartments to rent. We connect good renters with trusted owners. You can look at real homes, sign easy online agreements, and pay rent safely.'
                : 'የሚያማምሩ ቤቶችን እና አፓርታማዎችን እንዲያገኙ እንረዳዎታለን። የታመኑ አከራዮችን ከተከራዮች ጋር እናገናኛለን። እውነተኛ ቤቶችን መመልከት፣ ቀላል የመስመር ላይ ውሎችን መፈረም፣ እና የቤት ኪራይ ክፍያዎችን በደህና መፈጸም ይችላሉ።'}
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center relative z-20">
            <div className="flex-1 relative flex items-center">
              <Search className="h-5 w-5 text-slate-400 absolute left-4" />
              <input
                type="text"
                placeholder={language === 'en' ? "Where do you want to live? (e.g. Malibu, SoHo...)" : "የት መኖር ይፈልጋሉ? (ለምሳሌ አዲስ አበባ፣ ቪላ...)"}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => {}}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-6 py-3.5 rounded-xl text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 shadow-sm"
            >
              <Search className="h-4 w-4" />
              <span>{language === 'en' ? 'Search Houses' : 'ቤቶችን ፈልግ'}</span>
            </button>
          </div>

          {/* Quick Browse of Available Homes */}
          {listings && listings.length > 0 && (
            <div className="w-full space-y-6 pt-6">
              <div className="text-left border-t border-slate-150 dark:border-slate-800 pt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {searchQuery.trim() 
                    ? (language === 'en' ? `Search Results (${listings.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase())).length})` : `የፍለጋ ውጤት (${listings.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase())).length})`) 
                    : (language === 'en' ? 'Featured Houses to Browse' : 'ለኪራይ የቀረቡ ተለይተው የታወቁ ቤቶች')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {searchQuery.trim() 
                    ? (language === 'en' ? `Showing homes matching "${searchQuery}"` : `ከ "${searchQuery}" ጋር የሚዛመዱ ቤቶች ማሳያ`) 
                    : (language === 'en' ? 'Click on any home to view details and start booking.' : 'ዝርዝሮችን ለማየት እና ማስያዝ ለመጀመር በማንኛውም ቤት ላይ ጠቅ ያድርጉ።')}
                </p>
              </div>
              
              {listings.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl text-center text-slate-500 text-sm font-medium">
                  {language === 'en' ? 'No houses found matching your search. Try looking for another city or location.' : 'የፈለጉት ዓይነት ቤት አልተገኘም። እባክዎ ሌላ አካባቢ ይሞክሩ።'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {listings
                    .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 6)
                    .map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onClick={() => {
                          setSelectedProperty(property);
                        }}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* Property Details Modal when clicked */}
          {selectedProperty && (
            <PropertyDetailsModal
              property={selectedProperty}
              onClose={() => setSelectedProperty(null)}
              onInitiateBooking={(bookingData) => {
                setSelectedProperty(null);
                setError(language === 'en' ? `Please sign in or create an account first to complete your booking for "${selectedProperty.title}".` : `እባክዎ ለ "${selectedProperty.title}" የተያዘውን ለማጠናቀቅ መጀመሪያ አካውንት ይፍጠሩ ወይም ይግቡ።`);
                setShowForm(true);
              }}
            />
          )}

          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 text-left border-t border-slate-200 dark:border-slate-800">
            
            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
                {language === 'en' ? 'Real Homes' : 'እውነተኛ ቤቶች'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'en' 
                  ? 'We check every house and apartment ourselves. This means no fake listings, no scams, and no bad surprises.'
                  : 'ሁሉንም ቤቶች እና አፓርታማዎች እኛ ራሳችን እናረጋግጣለን። ይህ ማለት ምንም የሐሰት ዝርዝሮች እና ማጭበርበሮች የሉም ማለት ነው።'}
              </p>
            </div>

            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
                {language === 'en' ? 'Safe Payments' : 'አስተማማኝ ክፍያዎች'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'en' 
                  ? 'Your money is always secure. Pay your deposit and monthly rent easily online with clear receipts.'
                  : 'ገንዘብዎ ሁልጊዜ ደህንነቱ የተጠበቀ ነው። የቅድሚያ ክፍያዎን እና ወርሃዊ ኪራይዎን በመስመር ላይ በደረሰኝ ይክፈሉ።'}
              </p>
            </div>

            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">
                {language === 'en' ? 'Easy Dashboard' : 'ቀላል የመቆጣጠሪያ ሰሌዳ'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'en' 
                  ? 'See your booked dates, sign simple rental papers, and send quick messages to owners in one clean system.'
                  : 'የተያዙ ቀናትን ይመልከቱ፣ ቀላል የቤት ኪራይ ስምምነቶችን ይፈርሙ፣ እና በአንድ ንጹህ ስርዓት ለአከራዮች መልዕክት ይላኩ።'}
              </p>
            </div>
            
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 px-6 mt-12">
          <p>&copy; 2026 RentHub Easy. {language === 'en' ? 'All rights reserved. Simple and Safe House Rentals.' : 'መብቱ በህግ የተጠበቀ ነው። ቀላል እና አስተማማኝ የቤት ኪራይ መድረክ።'}</p>
        </footer>
      </div>
    );
  }

  // 2. Focused Login / Sign Up Page
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200" id="login-page-root">
      
      {/* Header Area */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs">
        {/* Logo Left */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-2.5 rounded-xl shadow-sm inline-flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              RentHub <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Easy</span>
            </h1>
          </div>
        </div>

        {/* Header Right: Toggles + Back Link */}
        <div className="flex items-center space-x-4">
          {renderToggles()}

          <button
            onClick={() => {
              setError('');
              setShowForm(false);
            }}
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-2"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'en' ? 'Go Back Home' : 'ወደ መነሻ ተመለስ'}</span>
          </button>
        </div>
      </header>

      {/* Centered Login Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12" id="auth-main-container">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-8 space-y-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

          {/* User Role & Sign-In/Up Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {role === 'owner' ? t.roleOwner : t.roleRenter}
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isSignUp ? (language === 'en' ? 'Create an Account' : 'አዲስ አካውንት መፍጠር') : (language === 'en' ? 'Welcome Back' : 'እንኳን ደህና መጡ')}
            </h3>
          </div>

          {/* Selector Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3" id="role-selector-box">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans text-center">
              {t.dontHaveAccount}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="landlord-signup-btn"
                onClick={() => {
                  setRole('owner');
                  setIsSignUp(true);
                  setError('');
                }}
                className={`py-2.5 px-3 rounded-xl border font-sans text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  role === 'owner' && isSignUp
                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-600 shadow-sm scale-102'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                {t.landlordSignUp}
              </button>
              <button
                type="button"
                id="landlord-login-btn"
                onClick={() => {
                  setRole('owner');
                  setIsSignUp(false);
                  setError('');
                }}
                className={`py-2.5 px-3 rounded-xl border font-sans text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  role === 'owner' && !isSignUp
                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-600 shadow-sm scale-102'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                {t.landlordLogin}
              </button>
            </div>

            {/* Toggle Landlord/Renter option */}
            <div className="text-center pt-1.5">
              {role === 'owner' ? (
                <button
                  type="button"
                  id="renter-login-toggle-btn"
                  onClick={() => {
                    setRole('renter');
                    setIsSignUp(false);
                    setError('');
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors bg-transparent border-0 cursor-pointer inline-flex items-center gap-1 hover:underline"
                >
                  {t.notLandlordRenter}
                </button>
              ) : (
                <button
                  type="button"
                  id="landlord-login-toggle-btn"
                  onClick={() => {
                    setRole('owner');
                    setIsSignUp(false);
                    setError('');
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors bg-transparent border-0 cursor-pointer inline-flex items-center gap-1 hover:underline"
                >
                  {t.areYouLandlord}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium leading-relaxed" id="auth-error-banner">
              {error}
            </div>
          )}

          {/* Social Logins Group */}
          <div className="space-y-2.5">
            <button
              type="button"
              id="facebook-login-btn"
              onClick={() => {
                setError('');
                setRole('renter');
                setIsSignUp(false);
                handleQuickLogin('yosefmelaku9876@gmail.com', 'renter');
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] transition-all cursor-pointer shadow-xs"
            >
              <Facebook className="h-4.5 w-4.5 fill-white text-[#1877F2]" />
              <span>{t.loginWithFacebook}</span>
            </button>

            <button
              type="button"
              id="apple-login-btn"
              onClick={() => {
                setError('');
                setRole('renter');
                setIsSignUp(false);
                handleQuickLogin('yosefmelaku9876@gmail.com', 'renter');
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-black dark:border-slate-800 rounded-xl text-xs font-bold text-white bg-black hover:bg-slate-900 transition-all cursor-pointer shadow-xs"
            >
              <Apple className="h-4.5 w-4.5 text-white fill-white" />
              <span>{t.loginWithApple}</span>
            </button>

            <button
              type="button"
              id="google-login-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:bg-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>{t.continueWithGoogle}</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">{t.orEmailDetails}</span>
            <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t.fullName}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yosef Melaku"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t.email}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-16 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-xs"
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  {showPassword ? t.hidePassword : t.showPassword}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Section */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>{t.rememberMe}</span>
              </label>

              <button
                type="button"
                id="forgot-password-btn"
                onClick={() => {
                  alert(language === 'en' ? 'Password reset instructions have been sent to your email.' : 'የይለፍ ቃል መልሶ ማግኛ መመሪያዎች ወደ ኢሜይልዎ ተልከዋል።');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline bg-transparent border-0 cursor-pointer"
              >
                {t.forgotPassword}
              </button>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              id="submit-auth-form-btn"
              disabled={loading}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50 tracking-wider"
            >
              <span>{loading ? t.processing : isSignUp ? t.signUpBtn : t.logInBtn}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Quick Demo logins at the bottom */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 justify-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span className="font-semibold uppercase tracking-wider">{language === 'en' ? 'Simulated Demo Logins' : 'የሙከራ ማሳያ መግቢያዎች'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickLogin('yosefmelaku9876@gmail.com', 'renter')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{language === 'en' ? 'Guest (Renter)' : 'ተከራይ (እንግዳ)'}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate">yosefmelaku9876@gmail.com</p>
              </button>
              <button
                onClick={() => handleQuickLogin('host.premium@luxerent.com', 'owner')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer transition-all disabled:opacity-50"
              >
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{language === 'en' ? 'Host (Owner)' : 'አከራይ (ባለቤት)'}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate">host.premium@luxerent.com</p>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 px-6 mt-12">
        <p>&copy; 2026 RentHub Easy. {language === 'en' ? 'All rights reserved. Simple and Safe House Rentals.' : 'መብቱ በህግ የተጠበቀ ነው። ቀላል እና አስተማማኝ የቤት ኪራይ መድረክ።'}</p>
      </footer>

    </div>
  );
};
