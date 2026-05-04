import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import TopBar from './TopBar';

export default function AppLayout() {
  const { pathname } = useLocation();
  const isChat = pathname.startsWith('/chat');

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Desktop sidebar (left in RTL) */}
      <aside className="hidden md:flex w-56 shrink-0 bg-navy-900 text-white">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className={`flex-1 ${isChat ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
