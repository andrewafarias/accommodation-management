import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Home, 
  DollarSign,
  Building2
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Unidades', href: '/accommodations', icon: Building2 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reservas', href: '/reservations', icon: Home },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Financials', href: '/financials', icon: DollarSign },
];

export function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-cream-100">
      {/* Sidebar */}
      <div className="w-64 bg-white/90 backdrop-blur-sm shadow-soft-lg no-print border-r border-primary-100">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 border-b border-primary-100 bg-gradient-to-r from-primary-50 to-secondary-50">
            <h1 className="text-3xl font-cursive text-primary-600 tracking-wide">
              Chalés Jasmim
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-5 py-3.5 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-700 font-semibold shadow-soft'
                      : 'text-gray-600 hover:bg-primary-50/50 hover:text-primary-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-5 border-t border-primary-100 bg-gradient-to-r from-primary-50/50 to-secondary-50/50">
            <p className="text-sm text-primary-400 text-center font-medium">
              © 2025 Chalés Jasmim
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-cream-50 via-cream-100 to-primary-50/30">
        <div className="p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
