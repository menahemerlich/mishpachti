import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import AuthShell from '@/components/AuthShell';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/lib/config';

export default function JoinPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [valid, setValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.invitations
      .validate(token)
      .then((res) => {
        setValid(true);
        setEmail(res.email);
      })
      .catch((err) => {
        setValid(false);
        setError(err?.response?.data?.message ?? 'הקישור לא תקף או שפג תוקפו');
      });
  }, [token]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const auth = await api.auth.signupWithInvite({
        inviteToken: token,
        name,
        password,
        profilePicture: profilePicture ?? undefined,
      });
      setSession(auth);
      toast.success(`ברוך הבא ל-משפחתי, ${auth.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'הרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(idToken: string) {
    setLoading(true);
    try {
      const auth = await api.auth.signupWithInvite({
        inviteToken: token,
        name: name || 'חבר/ת משפחה',
        googleIdToken: idToken,
        profilePicture: profilePicture ?? undefined,
      });
      setSession(auth);
      toast.success(`ברוך הבא ל-משפחתי, ${auth.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'הזיהוי עם Google נכשל');
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <AuthShell title="בודק את הקישור...">
        <div className="text-center text-navy-500 py-6">טוען...</div>
      </AuthShell>
    );
  }

  if (!valid) {
    return (
      <AuthShell title="הקישור לא תקף">
        <p className="text-navy-600 text-sm leading-relaxed">{error}</p>
        <p className="text-xs text-navy-400 mt-3">
          בקש מהמנהל לשלוח קישור חדש.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="ברוך הבא למשפחה!"
      subtitle={`הוזמנת להצטרף עם האימייל ${email}`}
    >
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div className="flex justify-center">
          <ProfilePictureUpload value={profilePicture} onChange={setProfilePicture} />
        </div>
        <div>
          <label className="label">שם מלא</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input"
            placeholder="הכנס את שמך"
          />
        </div>
        <div>
          <label className="label">סיסמה (לפחות 6 תווים)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'יוצר חשבון...' : 'הצטרף למשפחה'}
        </button>
      </form>

      {config.googleClientId && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-navy-400">
            <span className="flex-1 border-t border-navy-100" />
            או הירשם דרך
            <span className="flex-1 border-t border-navy-100" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credential) => credential.credential && handleGoogle(credential.credential)}
              onError={() => toast.error('הזיהוי עם Google נכשל')}
              locale="iw"
            />
          </div>
        </>
      )}
    </AuthShell>
  );
}
