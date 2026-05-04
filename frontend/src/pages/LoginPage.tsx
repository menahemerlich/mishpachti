import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import AuthShell from '@/components/AuthShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { config } from '@/lib/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const auth = await api.auth.login(email, password);
      setSession(auth);
      toast.success(`ברוך הבא, ${auth.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'התחברות נכשלה');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(idToken: string) {
    setLoading(true);
    try {
      const auth = await api.auth.google(idToken);
      setSession(auth);
      toast.success(`ברוך הבא, ${auth.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'הזיהוי עם Google נכשל');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="ברוך הבא חזרה" subtitle="התחבר כדי לראות את המשפחה">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="input"
            placeholder="example@gmail.com"
          />
        </div>
        <div>
          <label className="label">סיסמה</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>

      {config.googleClientId && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-navy-400">
            <span className="flex-1 border-t border-navy-100" />
            או
            <span className="flex-1 border-t border-navy-100" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(credential) => credential.credential && handleGoogle(credential.credential)}
              onError={() => toast.error('הזיהוי עם Google נכשל')}
              locale="iw"
              useOneTap={false}
            />
          </div>
        </>
      )}

      <p className="text-center text-sm text-navy-500 mt-6">
        אין לך חשבון? בקש הזמנה מהמנהל
      </p>
      <p className="text-center text-xs text-navy-400 mt-2">
        מנהל ראשון? <Link to="/signup" className="text-teal-600 underline">הירשם כאן</Link>
      </p>
    </AuthShell>
  );
}
