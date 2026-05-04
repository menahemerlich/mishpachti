import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import LoginPage from '@/pages/LoginPage';
import SignupBootstrapPage from '@/pages/SignupBootstrapPage';
import JoinPage from '@/pages/JoinPage';
import HomePage from '@/pages/HomePage';
import ChatPage from '@/pages/ChatPage';
import CalendarPage from '@/pages/CalendarPage';
import GalleryPage from '@/pages/GalleryPage';
import AlbumPage from '@/pages/AlbumPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminInvitationsPage from '@/pages/AdminInvitationsPage';
import AppLayout from '@/components/layout/AppLayout';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import CallScreen from '@/components/calls/CallScreen';
import { initOneSignal } from '@/lib/oneSignal';

export default function App() {
  const { hydrate, hydrated, accessToken, user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      disconnectSocket();
      return;
    }
    // Fetch /me, then connect socket
    api.auth
      .me()
      .then((u) => {
        setUser(u);
        connectSocket(accessToken);
        initOneSignal(u.id).catch(() => undefined);
      })
      .catch(() => {
        useAuthStore.getState().logout();
        navigate('/login', { replace: true });
      });
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-navy-700">
        טוען…
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={accessToken ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          path="/signup"
          element={accessToken ? <Navigate to="/" replace /> : <SignupBootstrapPage />}
        />
        <Route path="/join/:token" element={<JoinPage />} />

        {/* Protected routes */}
        {accessToken ? (
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:roomId" element={<ChatPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/albums/:id" element={<AlbumPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {user?.role === 'ADMIN' && (
              <Route path="/admin/invitations" element={<AdminInvitationsPage />} />
            )}
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <IncomingCallModal />
      <CallScreen />
    </>
  );
}
