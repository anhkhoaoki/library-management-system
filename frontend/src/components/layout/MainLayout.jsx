import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from '../chat/ChatWidget';

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
              BkLib
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

      {/* Chat Widget – available for students and librarians */}
      {(role === 'student' || role === 'librarian') && <ChatWidget />}
    </div>
  );
}

