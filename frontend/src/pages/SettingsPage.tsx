import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { requestPushPermission } from '@/lib/oneSignal';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture ?? null);

  const updateMutation = useMutation({
    mutationFn: () => api.users.updateProfile({ name, profilePicture }),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('הפרופיל עודכן');
    },
    onError: () => toast.error('עדכון נכשל'),
  });

  async function handleLogout() {
    try {
      await api.auth.logout(refreshToken ?? undefined);
    } catch {
      // ignore
    }
    logout();
    navigate('/login', { replace: true });
  }

  async function handleEnablePush() {
    const ok = await requestPushPermission();
    if (ok) toast.success('Push notifications הופעלו');
    else toast.error('לא הצלחנו להפעיל התראות');
  }

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">הגדרות</h1>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">פרופיל</h2>
        <div className="flex justify-center">
          <ProfilePictureUpload value={profilePicture} onChange={setProfilePicture} />
        </div>
        <div>
          <label className="label">שם</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">אימייל</label>
          <input value={user?.email ?? ''} className="input bg-navy-50" disabled />
        </div>
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="btn-primary"
        >
          שמור שינויים
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">התראות</h2>
        <p className="text-sm text-navy-500">
          הפעל push notifications כדי לקבל התראות על הודעות, אירועים ושיחות נכנסות.
        </p>
        <button onClick={handleEnablePush} className="btn-primary">
          🔔 הפעל התראות Push
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">חשבון</h2>
        <button onClick={handleLogout} className="btn-danger">
          התנתק
        </button>
      </div>
    </div>
  );
}
