import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-600">🎲 Bingo</h1>
        <p className="text-sm text-gray-500 mt-1">Host Dashboard</p>
      </div>

      <nav className="mt-8">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium ${
                isActive
                  ? 'text-purple-600 bg-purple-50 border-r-4 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
