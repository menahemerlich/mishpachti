import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/Avatar';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: api.users.list });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: api.chat.rooms });
  const { data: events } = useQuery({
    queryKey: ['calendar', 'upcoming'],
    queryFn: () =>
      api.calendar.list({
        from: new Date().toISOString(),
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
  });
  const { data: gallery } = useQuery({
    queryKey: ['gallery', 'preview'],
    queryFn: () => api.gallery.feed({ take: 1 }),
  });

  const familyRoom = rooms?.find((r) => r.type === 'FAMILY');
  const lastMessage = familyRoom?.messages?.[0];
  const nextEvent = events?.[0];
  const heroImage = gallery?.[0];

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 p-6 max-w-7xl mx-auto pb-24 md:pb-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900">
            שלום {user?.name?.split(' ')[0] ?? ''}!
          </h1>
          <p className="text-navy-500 mt-1">
            ברוך הבא ל-משפחתי, הפורטל הפרטי של המשפחה
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {user?.role === 'ADMIN' && (
            <Card>
              <h3 className="text-lg font-semibold text-navy-900 mb-3">
                הזמנת בני משפחה
              </h3>
              <Link to="/admin/invitations" className="btn-primary w-full">
                + שלח הזמנה
              </Link>
            </Card>
          )}

          <Card>
            <Link to="/chat" className="block">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-navy-900">צ'אט משפחתי</h3>
                <span className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                  💬
                </span>
              </div>
              <p className="text-sm text-navy-500 line-clamp-2">
                {lastMessage
                  ? `${lastMessage.author?.name ?? ''}: ${
                      lastMessage.content ?? `${lastMessage.type === 'IMAGE' ? '📷 תמונה' : lastMessage.type === 'VIDEO' ? '🎥 וידאו' : lastMessage.type === 'VOICE' ? '🎙️ הודעה קולית' : ''}`
                    }`
                  : 'אין הודעות חדשות'}
              </p>
            </Link>
          </Card>

          <Card>
            <Link to="/calendar" className="block">
              <h3 className="text-lg font-semibold text-navy-900 mb-1">אירועים קרובים</h3>
              {nextEvent ? (
                <>
                  <p className="text-sm text-navy-700 font-medium">{nextEvent.title}</p>
                  <p className="text-xs text-navy-500 mt-1">
                    {formatEventDate(nextEvent.startsAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-navy-500">אין אירועים בקרוב</p>
              )}
            </Link>
          </Card>

          <Card className="overflow-hidden p-0">
            <Link to="/gallery" className="block">
              <div className="relative h-32 bg-navy-100">
                {heroImage?.thumbnailUrl ? (
                  <img
                    src={heroImage.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    🖼️
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-4">
                  <h3 className="text-lg font-semibold text-white">גלריה</h3>
                </div>
              </div>
            </Link>
          </Card>
        </div>
      </div>

      <aside className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">חברי המשפחה</h2>
        <div className="card space-y-3">
          {users?.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <Avatar
                src={u.profilePicture}
                name={u.name}
                userId={u.id}
                showOnline
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy-900 truncate">
                  {u.name}{' '}
                  {u.role === 'ADMIN' && (
                    <span className="badge bg-teal-100 text-teal-700 mr-1 text-[10px]">מנהל</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!users?.length && (
            <p className="text-sm text-navy-400 text-center py-2">אין חברי משפחה עדיין</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card hover:shadow-soft transition-shadow ${className}`}>{children}</div>;
}

function formatEventDate(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return `היום, ${format(d, 'HH:mm')}`;
  if (isTomorrow(d)) return `מחר, ${format(d, 'HH:mm')}`;
  return format(d, 'EEEE, dd בMMMM', { locale: he });
}
