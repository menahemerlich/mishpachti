import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'הבית', emoji: '🏠' },
  { to: '/chat', label: "צ'אט", emoji: '💬' },
  { to: '/calendar', label: 'לוח שנה', emoji: '📅' },
  { to: '/gallery', label: 'גלריה', emoji: '🖼️' },
  { to: '/settings', label: 'הגדרות', emoji: '⚙️' },
];

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-navy-100 z-30 pb-safe">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 text-[11px] transition-colors ${
                  isActive ? 'text-teal-600' : 'text-navy-500'
                }`
              }
            >
              <span className="text-lg leading-none mb-0.5">{it.emoji}</span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
