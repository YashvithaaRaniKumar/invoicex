import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CinematicBackground from '../common/CinematicBackground';

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex bg-slate-50 relative selection:bg-sky-500 selection:text-white">
      {/* Subtle Three.js Ambient Particle Layer */}
      <CinematicBackground />

      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        <Header />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
