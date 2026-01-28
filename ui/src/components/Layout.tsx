import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Network, 
  Server, 
  Container, 
  Cpu,
  Moon,
  Sun,
  Menu,
  X,
  Wifi,
  WifiOff,
  Search,
  HelpCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStore } from '../store/theme';
import { useDataStore } from '../store/data';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, shortcut: 'H' },
  { name: 'Ports', href: '/ports', icon: Network, shortcut: 'P' },
  { name: 'Services', href: '/services', icon: Server, shortcut: 'S' },
  { name: 'Processes', href: '/processes', icon: Cpu, shortcut: '' },
  { name: 'Containers', href: '/containers', icon: Container, shortcut: 'C' },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const { isDark, toggle } = useThemeStore();
  const { isConnected, lastUpdate } = useDataStore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div 
          className="fixed inset-0 bg-slate-900/50" 
          onClick={() => setSidebarOpen(false)} 
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-lg font-bold text-primary-500">App Tracker</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 min-w-[44px] min-h-[44px] rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.shortcut && (
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
          <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-lg font-bold text-slate-900 dark:text-white">
                App Tracker
              </span>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.shortcut && (
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 mr-2 text-green-500" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 mr-2 text-red-500" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
            {lastUpdate && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 min-w-[44px] min-h-[44px] rounded-md lg:hidden hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Search */}
              <div className="relative ml-4 lg:ml-0 flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  data-search-input
                  placeholder="Search processes, ports... (/)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 w-full text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggle}
                data-testid="theme-toggle"
                className="p-2 min-w-[44px] min-h-[44px] rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                title="Toggle theme (D)"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                className="p-2 min-w-[44px] min-h-[44px] rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                title="Help (?)"
                aria-label="Show keyboard shortcuts"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
