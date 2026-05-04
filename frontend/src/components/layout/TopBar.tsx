import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'משפחה מחוברת',
  '/chat': "צ'אט משפחתי",
  '/calendar': 'לוח שנה משפחתי',
  '/gallery': 'גלריית המשפחה',
  '/settings': 'הגדרות',
  '/admin/invitations': 'הזמנות בני משפחה',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const matched = Object.keys(titles).find(
    (k) => k === pathname || (k !== '/' && pathname.startsWith(k)),
  );
  const title = matched ? titles[matched] : 'משפחתי';

  return (
    <header className="h-14 bg-white border-b border-navy-100 flex items-center justify-between px-5 sticky top-0 z-20">
      <div className="flex items-center gap-2 text-navy-800 font-semibold">
        <span className="md:hidden text-teal-600 text-lg">משפחתי</span>
        <span className="hidden md:inline">{title}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-navy-500">
        <span>{title}</span>
        <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-base">👨‍👩‍👧</span>
      </div>
    </header>
  );
}
