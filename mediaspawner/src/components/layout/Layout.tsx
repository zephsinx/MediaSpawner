import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const Layout: React.FC = () => {
  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/assets", label: "Asset Library", icon: "📁" },
    { path: "/config", label: "Config Editor", icon: "⚙️" },
    { path: "/settings", label: "Settings", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">MediaSpawner</h1>
          <p className="text-sm text-gray-500 mt-1">UI Configuration Tool</p>
        </div>

        <ul className="px-3">
          {navItems.map((item) => (
            <li key={item.path} className="mb-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              MediaSpawner Configuration
            </h2>
          </div>
        </header>

        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
