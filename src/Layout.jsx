import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { LayoutDashboard, Users, UserPlus, Award, Mail, BarChart3, Settings, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Leads', icon: Users, page: 'Leads' },
    { name: 'New Lead', icon: UserPlus, page: 'NewLead' },
    { name: 'Members', icon: Award, page: 'Members' },
    { name: 'Onboarding', icon: UserPlus, page: 'MemberOnboarding' },
    { name: 'Email Sequences', icon: Mail, page: 'EmailSequences' },
    { name: 'Reports', icon: BarChart3, page: 'Reports' },
    { name: 'Messages', icon: Mail, page: 'Messages' },
    { name: 'Team', icon: Users, page: 'InviteUser', adminOnly: true },
    { name: 'Audit Logs', icon: Settings, page: 'AuditLogs', adminOnly: true },
    { name: 'Settings', icon: Settings, page: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        :root {
          --color-primary: #0073ea;
          --color-secondary: #00c875;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">NS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NO SAFE MARGIN</h1>
                <p className="text-xs text-gray-500">Foundation CRM</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.full_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 min-h-screen bg-white border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}