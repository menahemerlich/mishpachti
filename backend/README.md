# Mishpachti — Backend (NestJS)

## הרצה לוקלית
```bash
npm install
npx prisma migrate dev      # יצירת DB + migrations
npx prisma db seed          # אופציונלי: יצירת חדר משפחתי
npm run dev                 # דב על פורט 4000
```

## מבנה המודולים

| תיקייה | אחריות |
| ------ | ------ |
| `auth/` | JWT (access+refresh), Google OAuth, signup-bootstrap, signup-with-invite |
| `users/` | פרופיל, רשימה, קידום, הסרה |
| `invitations/` | יצירה (Admin), שליחה דרך Resend, validate, consume |
| `chat/` | חדרים, הודעות (TEXT/IMAGE/VIDEO/VOICE), edit/delete, reactions, read receipts |
| `media/` | חתימה ל-Cloudinary, רישום `MediaAsset` ב-DB, מחיקה |
| `calendar/` | אירועים: CRUD, broadcast דרך socket+push |
| `gallery/` | feed כל המדיה ע"פ דדליין, אלבומים CRUD |
| `calls/` | LiveKit token, התחלת שיחה, סיום, signaling |
| `presence/` | Redis sets - online users + sockets לכל משתמש |
| `notifications/` | OneSignal subscribe/unsubscribe, fan-out לעורכים offline |
| `realtime/` | Socket.IO Gateway + Redis adapter |

## Routes (REST)

> כל הנתיבים תחת `/api`. כל מה שלא מצוין מפורש דורש `Authorization: Bearer <accessToken>`.

### Auth (public)
- `POST /auth/login` — `{email,password}`
- `POST /auth/signup-bootstrap` — `{email,password,name,profilePicture?}` (פעם אחת בלבד)
- `POST /auth/signup-with-invite` — `{inviteToken,name,password?,googleIdToken?,profilePicture?}`
- `POST /auth/google` — `{idToken}`
- `POST /auth/refresh` — `{refreshToken}`
- `POST /auth/logout` *(auth)*
- `GET  /auth/status` *(auth)*

### Users *(auth)*
- `GET    /users` — רשימת משתמשים
- `GET    /users/me`
- `PATCH  /users/me` — `{name?,profilePicture?}`
- `PATCH  /users/:id/promote` *(Admin)*
- `DELETE /users/:id` *(Admin)*

### Invitations
- `GET  /invitations/:token/validate` *(public)*
- `POST /invitations` *(Admin)* — `{email}`
- `GET  /invitations` *(Admin)* — list
- `DELETE /invitations/:id` *(Admin)*

### Chat *(auth)*
- `GET    /chat/rooms`
- `GET    /chat/rooms/:roomId/messages?take=50&before=<msgId>`
- `POST   /chat/rooms/:roomId/messages` — `{type,content?,mediaAssetId?,replyToId?}`
- `PATCH  /chat/messages/:messageId` — `{content}`
- `DELETE /chat/messages/:messageId`

### Media *(auth)*
- `POST   /media/sign` — `{type}` → signature for direct Cloudinary upload
- `POST   /media/register` — אחרי upload להוסיף `MediaAsset` ל-DB
- `GET    /media/:id`
- `DELETE /media/:id`

### Calendar *(auth)*
- `GET    /calendar?from=&to=`
- `GET    /calendar/:id`
- `POST   /calendar`
- `PATCH  /calendar/:id`
- `DELETE /calendar/:id`

### Gallery *(auth)*
- `GET /gallery?take=60&before=<assetId>&types=IMAGE,VIDEO`

### Albums *(auth)*
- `GET    /albums`
- `GET    /albums/:id`
- `POST   /albums` — `{title,description?}`
- `PATCH  /albums/:id`
- `DELETE /albums/:id`
- `POST   /albums/:id/assets` — `{assetIds:string[]}`
- `DELETE /albums/:id/assets/:assetId`

### Calls *(auth)*
- `POST /calls/start`         — `{roomId,isVideo?}` → broadcast `call:incoming` + מחזיר token ליוזם
- `POST /calls/:callId/join`  → token לחבר משפחה
- `POST /calls/:callId/end`

### Notifications *(auth)*
- `POST   /notifications/subscribe`  — `{oneSignalPlayerId,deviceInfo?}`
- `DELETE /notifications/subscribe/:playerId`

## Socket.IO Events

חיבור: ה-client מעביר JWT ב-`auth.token`.

### Server → Client
- `presence:list` (בחיבור הראשון: `string[]` של userIds online)
- `presence:update` `{userId, online}`
- `message:new` `Message & {tempId?}`
- `message:edited` `Message`
- `message:deleted` `{id, roomId}`
- `reaction:added` `Reaction`
- `reaction:removed` `{messageId, userId, emoji}`
- `typing:start` / `typing:stop` `{roomId, userId}`
- `read:receipt` `{roomId, messageId, userId, readAt}`
- `calendar:created` / `calendar:updated` / `calendar:deleted`
- `call:incoming` `{callId, roomId, livekitRoomName, isVideo, startedBy}`
- `call:accepted` / `call:rejected` / `call:ended`

### Client → Server
- `message:send` `{tempId?, roomId, type, content?, mediaAssetId?, replyToId?}`
- `message:edit` `{messageId, content}`
- `message:delete` `{messageId}`
- `reaction:add` / `reaction:remove` `{messageId, emoji}`
- `typing:start` / `typing:stop` `{roomId}`
- `read:receipt` `{roomId, messageId}`
- `call:accept` / `call:reject` `{callId, roomId}`
