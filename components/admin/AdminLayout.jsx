import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import DashboardTab from './DashboardTab';
import UsersTab from './UsersTab';
import SubmissionsTab from './SubmissionsTab';
import WeeksTab from './WeeksTab';
import RecordingsTab from './RecordingsTab';
import AdminsTab from './AdminsTab';

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-2 0" />
      </svg>
    ),
  },
  {
    id: 'submissions',
    label: 'Submissions',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'weeks',
    label: 'Weeks',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'recordings',
    label: 'Recordings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'admins',
    label: 'Admins',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ currentUser, onSwitchToTeam }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-20">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Admin Portal</p>
              <p className="text-xs text-gray-400 truncate">KUWA</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: user + actions */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-3 min-w-0">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 text-xs font-bold">
                {currentUser.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {onSwitchToTeam ? (
              <button
                onClick={onSwitchToTeam}
                className="text-center text-xs text-gray-500 hover:text-gray-800 py-1.5 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                ← Team View
              </button>
            ) : (
              <a
                href="/"
                className="text-center text-xs text-gray-500 hover:text-gray-800 py-1.5 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                ← Team View
              </a>
            )}
            <button
              onClick={() => signOut(auth)}
              className="text-center text-xs text-gray-500 hover:text-gray-800 py-1.5 rounded-lg hover:bg-gray-100 transition font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8 min-h-screen">
        {activeTab === 'dashboard'   && <DashboardTab />}
        {activeTab === 'users'       && <UsersTab />}
        {activeTab === 'submissions' && <SubmissionsTab />}
        {activeTab === 'weeks'       && <WeeksTab currentUser={currentUser} />}
        {activeTab === 'recordings'  && <RecordingsTab currentUser={currentUser} />}
        {activeTab === 'admins'      && <AdminsTab currentUser={currentUser} />}
      </main>
    </div>
  );
}
