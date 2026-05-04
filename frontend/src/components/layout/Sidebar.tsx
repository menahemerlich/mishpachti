import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const items = [
  { to: '/', label: 'הבית', icon: HomeIcon },
  { to: '/chat', label: "צ'אט", icon: ChatIcon },
  { to: '/calendar', label: 'לוח שנה', icon: CalendarIcon },
  { to: '/gallery', label: 'גלריה', icon: GalleryIcon },
  { to: '/settings', label: 'הגדרות', icon: SettingsIcon },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="flex flex-col w-full py-6">
      <div className="px-6 mb-8">
        <div className="text-xl font-bold tracking-tight">משפחתי</div>
        <div className="text-xs text-navy-300 mt-1">הפורטל המשפחתי</div>
      </div>

      <ul className="flex-1 space-y-1 px-3">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                  isActive
                    ? 'bg-navy-800 text-white border-r-2 border-teal-400'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <it.icon className="w-5 h-5" />
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
        {user?.role === 'ADMIN' && (
          <li>
            <NavLink
              to="/admin/invitations"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                  isActive
                    ? 'bg-navy-800 text-white border-r-2 border-teal-400'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <InviteIcon className="w-5 h-5" />
              <span>הזמנות</span>
            </NavLink>
          </li>
        )}
      </ul>

      <div className="px-4 pt-4 mt-auto border-t border-navy-800/50 mx-3">
        <div className="flex items-center gap-3 py-3">
          <Avatar src={user?.profilePicture} name={user?.name ?? ''} />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-[11px] text-navy-300 truncate">
              {user?.role === 'ADMIN' ? 'מנהל' : 'חבר משפחה'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover" />;
  }
  const initial = name?.[0] ?? '?';
  return (
    <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center font-medium">
      {initial}
    </div>
  );
}

// ----- Inline Icons -----
type IconProps = { className?: string };
function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function GalleryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="M21 16l-5-5-9 9" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinejoin="round" />
    </svg>
  );
}
function InviteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinejoin="round" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" strokeLinecap="round" />
    </svg>
  );
}
