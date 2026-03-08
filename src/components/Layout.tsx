import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, Building2, List, BarChart3 } from 'lucide-react';

const navigationItems = [
  { title: 'Recherche', url: createPageUrl('Search'), icon: Search },
  { title: 'Mes Listes', url: createPageUrl('Lists'), icon: List },
  { title: 'Analyses', url: createPageUrl('Analytics'), icon: BarChart3 },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <header className="border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">ImmoProspection</h2>
              <p className="text-xs text-slate-500 font-medium">V2 - Données DVF</p>
            </div>
          </div>
        </header>

        <nav className="p-4 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-3">
            Navigation
          </p>
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    location.pathname === item.url
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">
            Données DVF • data.gouv.fr
          </p>
        </footer>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
