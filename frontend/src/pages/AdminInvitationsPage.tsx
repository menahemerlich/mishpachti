import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export default function AdminInvitationsPage() {
  const qc = useQueryClient();
  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: api.invitations.list,
  });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: api.users.list });

  const [email, setEmail] = useState('');

  const createMutation = useMutation({
    mutationFn: api.invitations.create,
    onSuccess: () => {
      toast.success('ההזמנה נשלחה');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'שליחה נכשלה'),
  });

  const revokeMutation = useMutation({
    mutationFn: api.invitations.revoke,
    onSuccess: () => {
      toast.success('ההזמנה בוטלה');
      qc.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: () => toast.error('הפעולה נכשלה'),
  });

  const removeUserMutation = useMutation({
    mutationFn: api.users.remove,
    onSuccess: () => {
      toast.success('המשתמש הוסר');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('הפעולה נכשלה'),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">הזמנות בני משפחה</h1>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">הזמנה חדשה</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="input flex-1"
          />
          <button
            disabled={!email || createMutation.isPending}
            onClick={() => createMutation.mutate(email)}
            className="btn-primary shrink-0"
          >
            שלח הזמנה
          </button>
        </div>
        <p className="text-xs text-navy-400">
          הקישור יישלח לאימייל ויהיה תקף ל-7 ימים. שימוש חד-פעמי.
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">הזמנות פעילות וקודמות</h2>
        <div className="divide-y divide-navy-50">
          {invitations?.map((inv) => {
            const used = !!inv.usedAt;
            const expired = !used && parseISO(inv.expiresAt) < new Date();
            const status = used ? 'נוצלה' : expired ? 'פגה' : 'פעילה';
            return (
              <div key={inv.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-medium text-navy-900">{inv.email}</div>
                  <div className="text-xs text-navy-500">
                    נשלחה {format(parseISO(inv.createdAt), 'dd/MM/yyyy', { locale: he })} · ע"י{' '}
                    {inv.invitedBy?.name ?? '—'}
                  </div>
                </div>
                <span
                  className={`badge ${
                    used
                      ? 'bg-navy-100 text-navy-600'
                      : expired
                        ? 'bg-red-50 text-red-700'
                        : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {status}
                </span>
                {!used && (
                  <button
                    onClick={() => navigator.clipboard.writeText(buildJoinUrl(inv.token))}
                    className="btn-ghost text-xs"
                    title="העתק קישור"
                  >
                    📋 העתק
                  </button>
                )}
                {!used && (
                  <button
                    onClick={() => {
                      if (confirm('לבטל את ההזמנה?')) revokeMutation.mutate(inv.id);
                    }}
                    className="btn-danger text-xs"
                  >
                    בטל
                  </button>
                )}
              </div>
            );
          })}
          {invitations?.length === 0 && (
            <p className="text-sm text-navy-400 text-center py-6">אין הזמנות עדיין</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">חברי משפחה</h2>
        <div className="divide-y divide-navy-50">
          {users?.map((u) => (
            <div key={u.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy-900 truncate">
                  {u.name}{' '}
                  {u.role === 'ADMIN' && (
                    <span className="badge bg-teal-100 text-teal-700 text-[10px]">מנהל</span>
                  )}
                </div>
                <div className="text-xs text-navy-500 truncate">{u.email}</div>
              </div>
              {u.role !== 'ADMIN' && (
                <button
                  onClick={() => {
                    if (confirm(`להסיר את ${u.name}?`)) removeUserMutation.mutate(u.id);
                  }}
                  className="btn-danger text-xs"
                >
                  הסר
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildJoinUrl(token: string) {
  const base = window.location.origin;
  return `${base}/join/${token}`;
}
