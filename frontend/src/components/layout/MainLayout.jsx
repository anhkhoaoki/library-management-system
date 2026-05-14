import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children, role = 'student', userName, userRole }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        <Topbar userName={userName} userRole={userRole} />
        {/* Mobile Header (Fallback) */}
        <header className="md:hidden bg-surface dark:bg-inverse-surface shadow-sm flex justify-between items-center w-full px-gutter h-16 sticky top-0 z-50">
          <div className="flex items-center gap-stack-sm">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary truncate">
              Intellectual Heritage
            </span>
          </div>
          <div className="flex items-center gap-stack-sm text-primary dark:text-primary-fixed-dim">
            <button className="p-2 hover:bg-surface-container-high dark:hover:bg-on-surface-variant transition-colors rounded-full active:opacity-80 active:scale-95 transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {userName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-margin-mobile md:p-margin-desktop max-w-[container-max] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Floating Chatbot AI Button (Common for students) */}
      {role === 'student' && (
        <button className="fixed bottom-margin-desktop right-margin-desktop z-50 w-14 h-14 bg-gradient-to-br from-secondary to-primary text-white rounded-full shadow-[0_10px_15px_rgba(0,0,0,0.2)] flex items-center justify-center hover:scale-105 transition-transform group">
          <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
            forum
          </span>
          <span className="absolute -top-2 -right-2 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            AI
          </span>
        </button>
      )}
    </div>
  );
}
