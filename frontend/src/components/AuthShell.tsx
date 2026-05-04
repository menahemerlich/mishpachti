import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-teal-50 to-navy-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 text-white text-2xl mb-3 shadow-soft">
            👨‍👩‍👧‍👦
          </div>
          <h1 className="text-2xl font-bold text-navy-900">משפחתי</h1>
          <p className="text-sm text-navy-500">הפורטל המשפחתי הפרטי</p>
        </div>

        <div className="card animate-slide-up">
          <h2 className="text-xl font-semibold text-navy-900 mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-navy-500 mb-5">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
