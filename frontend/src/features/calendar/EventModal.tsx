import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { CalendarEvent } from '@/types/models';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  initialDate?: Date;
  event?: CalendarEvent;
  onClose: () => void;
}

export default function EventModal({ initialDate, event, onClose }: Props) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const isEdit = !!event;

  const initial = event
    ? {
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        startsAt: format(new Date(event.startsAt), "yyyy-MM-dd'T'HH:mm"),
        endsAt: format(new Date(event.endsAt), "yyyy-MM-dd'T'HH:mm"),
        allDay: event.allDay,
        isFamilyWide: event.isFamilyWide,
      }
    : {
        title: '',
        description: '',
        location: '',
        startsAt: format(initialDate ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
        endsAt: format(
          new Date((initialDate ?? new Date()).getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm",
        ),
        allDay: false,
        isFamilyWide: true,
      };

  const [form, setForm] = useState(initial);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        allDay: form.allDay,
        isFamilyWide: form.isFamilyWide,
      };
      return isEdit
        ? api.calendar.update(event!.id, payload)
        : api.calendar.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(isEdit ? 'האירוע עודכן' : 'האירוע נוצר');
      onClose();
    },
    onError: () => toast.error('שמירה נכשלה'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.calendar.delete(event!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('האירוע נמחק');
      onClose();
    },
    onError: () => toast.error('המחיקה נכשלה'),
  });

  const canEdit = !isEdit || event?.ownerId === me?.id || me?.role === 'ADMIN';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-soft w-full max-w-md p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-navy-900 mb-4">
          {isEdit ? 'עריכת אירוע' : 'אירוע חדש'}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">שם אירוע</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="יום הולדת לאמא"
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">התחלה</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="input"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="label">סיום</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="input"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="label">מיקום</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input"
              placeholder="בית סבתא"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="label">תיאור</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px]"
              placeholder="פרטים נוספים..."
              disabled={!canEdit}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={form.isFamilyWide}
              onChange={(e) => setForm({ ...form, isFamilyWide: e.target.checked })}
              disabled={!canEdit}
            />
            הודע לכל המשפחה
          </label>
        </div>

        <div className="flex justify-between gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost">סגור</button>
          <div className="flex gap-2">
            {isEdit && canEdit && (
              <button
                onClick={() => {
                  if (confirm('למחוק את האירוע?')) deleteMutation.mutate();
                }}
                className="btn-danger"
              >
                מחק
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!form.title || saveMutation.isPending}
                className="btn-primary"
              >
                {isEdit ? 'שמור' : 'צור'}
              </button>
            )}
          </div>
        </div>
        {!canEdit && (
          <p className="text-xs text-navy-500 mt-3 text-center">
            רק יוצר האירוע או המנהל יכולים לערוך
          </p>
        )}
      </div>
    </div>
  );
}
