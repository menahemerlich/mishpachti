import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { api } from '@/lib/api';
import EventModal from '@/features/calendar/EventModal';
import type { CalendarEvent } from '@/types/models';

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState<Date | null>(null);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar'],
    queryFn: () =>
      api.calendar.list({
        from: startOfWeek(monthStart, { weekStartsOn: 0 }).toISOString(),
        to: endOfWeek(monthEnd, { weekStartsOn: 0 }).toISOString(),
      }),
  });

  const days = useMemo(() => buildMonthDays(cursor), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(parseISO(e.startsAt), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const dayHeaders = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-navy-900">לוח שנה</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="btn-ghost px-3"
          >
            ‹
          </button>
          <span className="font-semibold text-navy-700 min-w-[120px] text-center">
            {format(cursor, 'MMMM yyyy', { locale: he })}
          </span>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="btn-ghost px-3"
          >
            ›
          </button>
          <button
            onClick={() => setCreating(new Date())}
            className="btn-primary mr-2"
          >
            + אירוע חדש
          </button>
        </div>
      </div>

      <div className="card p-3">
        <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-navy-500">
          {dayHeaders.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={key}
                onClick={() => setCreating(day)}
                className={`aspect-square sm:aspect-auto sm:min-h-[88px] p-1 rounded-lg border text-right transition-colors ${
                  inMonth ? 'bg-white' : 'bg-navy-50/50 text-navy-300'
                } ${isToday ? 'border-teal-500' : 'border-navy-100'} hover:border-teal-300`}
              >
                <div className="text-xs font-medium">{format(day, 'd')}</div>
                <div className="space-y-0.5 mt-1 text-right">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEditing(e);
                      }}
                      className="text-[11px] bg-teal-100 text-teal-800 rounded px-1.5 py-0.5 truncate hover:bg-teal-200 cursor-pointer"
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-navy-500">
                      +{dayEvents.length - 2} עוד
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(creating || editing) && (
        <EventModal
          initialDate={creating ?? undefined}
          event={editing ?? undefined}
          onClose={() => {
            setCreating(null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function buildMonthDays(cursor: Date): Date[] {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days: Date[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
  return days;
}
