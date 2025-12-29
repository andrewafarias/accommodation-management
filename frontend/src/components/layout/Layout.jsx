import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Home, 
  DollarSign,
  Building2,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Painel', href: '/', icon: LayoutDashboard },
  { name: 'Unidades', href: '/accommodations', icon: Building2 },
  { name: 'Calendário', href: '/calendar', icon: Calendar },
  { name: 'Reservas', href: '/reservations', icon: Home },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Financeiro', href: '/financials', icon: DollarSign },
];

export function Layout({ children }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-feminine-100">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-soft border border-primary-100 no-print focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-primary-600" />
        ) : (
          <Menu className="w-6 h-6 text-primary-600" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden no-print"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white/90 backdrop-blur-sm shadow-soft-lg no-print border-r border-primary-100
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 border-b border-primary-100 bg-gradient-to-r from-primary-50 to-secondary-50">
            <h1 className="text-2xl lg:text-3xl font-cursive text-primary-600 tracking-wide">
              Chalés Jasmim
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeMobileMenu}
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
      <div className="flex-1 overflow-auto bg-gradient-to-br from-feminine-50 via-feminine-100 to-secondary-50/40">
        <div className="p-4 sm:p-6 lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
