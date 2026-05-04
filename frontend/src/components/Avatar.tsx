import clsx from 'clsx';
import { usePresenceStore } from '@/stores/presenceStore';

interface Props {
  src?: string | null;
  name: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({
  src,
  name,
  userId,
  size = 'md',
  showOnline = false,
  className,
}: Props) {
  const isOnline = usePresenceStore((s) => (userId ? s.isOnline(userId) : false));
  const initial = name?.[0] ?? '?';

  return (
    <div className={clsx('relative inline-block', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          decoding="async"
          className={clsx(sizes[size], 'rounded-full object-cover')}
        />
      ) : (
        <div
          className={clsx(
            sizes[size],
            'rounded-full bg-teal-500 text-white flex items-center justify-center font-medium',
          )}
        >
          {initial}
        </div>
      )}
      {showOnline && (
        <span
          className={clsx(
            'absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-white',
            isOnline ? 'bg-green-500' : 'bg-navy-200',
          )}
        />
      )}
    </div>
  );
}
