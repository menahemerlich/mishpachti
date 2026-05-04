import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from '@/components/AuthShell';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function SignupBootstrapPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const auth = await api.auth.signupBootstrap({
        email,
        password,
        name,
        profilePicture: profilePicture ?? undefined,
      });
      setSession(auth);
      toast.success('ברוך הבא, מנהל המשפחה!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'הרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="הרשמה ראשונית"
      subtitle="הרשמה זו מיועדת רק למנהל הראשון של המערכת"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="משה כהן"
          />
        </div>
        <div>
          <label className="label">אימייל (חייב להיות זהה ל-ADMIN_BOOTSTRAP_EMAIL)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
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
          {loading ? 'נרשם...' : 'צור חשבון מנהל'}
        </button>
      </form>

      <p className="text-center text-sm text-navy-500 mt-6">
        יש לך כבר חשבון?{' '}
        <Link to="/login" className="text-teal-600 underline">התחבר</Link>
      </p>
    </AuthShell>
  );
}
