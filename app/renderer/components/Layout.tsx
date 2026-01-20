import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-3 flex justify-center">
          <img src="./logo.png" alt="DIBE - Imagine Logo" className="h-36 w-auto" />
        </div>

        <nav className="mt-3">
          <div className="px-3">
            <Link
              to="/library"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/library')
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Library
            </Link>

            <Link
              to="/"
              className={`flex items-center px-3 py-2 mt-1 text-sm font-medium rounded-md transition-colors ${
                isActive('/')
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image Generation
            </Link>

            <Link
              to="/youtube-thumbnail"
              className={`flex items-center px-3 py-2 mt-1 text-sm font-medium rounded-md transition-colors ${
                isActive('/youtube-thumbnail')
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              YouTube Thumbnails
            </Link>

            <Link
              to="/settings"
              className={`flex items-center px-3 py-2 mt-1 text-sm font-medium rounded-md transition-colors ${
                isActive('/settings')
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>

          <div className="mt-8 px-3">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Services</h3>
            <div className="mt-3">
              <div className="flex items-center px-3 py-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Basic Image Gen
              </div>
              <div className="flex items-center px-3 py-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                YT Thumbnail Gen
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout;