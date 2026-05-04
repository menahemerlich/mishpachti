# Mishpachti — Frontend (React + Vite)

## הרצה לוקלית
```bash
npm install
npm run dev
```
פתח ב-`http://localhost:5173`. ה-Vite dev-server מבצע proxy אל `/api` ו-`/socket.io` ל-`localhost:4000` (אפשר לשנות עם `VITE_BACKEND_PROXY`).

## מבנה
```
src/
├── main.tsx                    # Bootstrap (Providers, Toaster)
├── App.tsx                     # Router + auth gating + global modals
├── styles/index.css            # Tailwind + custom utilities
├── types/models.ts             # Shared TS types
├── lib/
│   ├── apiClient.ts            # Axios + JWT refresh interceptor
│   ├── api.ts                  # Typed REST endpoints
│   ├── socket.ts               # Socket.IO client + global event handlers
│   ├── cloudinary.ts           # Direct signed uploads
│   ├── queryClient.ts
│   └── oneSignal.ts            # OneSignal Web SDK init
├── stores/                     # Zustand: auth, presence, call
├── components/
│   ├── layout/                 # AppLayout, Sidebar, MobileBottomNav, TopBar
│   ├── calls/                  # IncomingCallModal, CallScreen
│   └── ...
├── features/
│   ├── chat/                   # ChatView, MessageList, MessageBubble, VoiceRecorder, …
│   ├── calendar/               # EventModal
│   └── gallery/                # Lightbox
└── pages/                      # LoginPage, JoinPage, HomePage, ChatPage, CalendarPage, GalleryPage, AlbumPage, SettingsPage, AdminInvitationsPage
```

## עיצוב
לפי הסקיצות ב-`./mockups/`:
- צבעי בסיס: navy `#0f2942` (סייד-בר) + טורקיז `#3DBDB6` (אקסנט) + cream `#f7fafc` (רקע).
- גופן: **Heebo** (חלופי: Rubik).
- RTL מלא (`dir="rtl"` ב-`<html>`), עם Tailwind logical properties.
- Layout responsive: סייד-בר במובייל מתחלף ב-bottom-nav.

## PWA
מופעל דרך `vite-plugin-pwa`:
- ניתן להתקנה במובייל (Add to Home Screen).
- Caching של static assets ושל תמונות Cloudinary.
- Service Worker של OneSignal (`/OneSignalSDKWorker.js`) רשום בנפרד עבור push.
