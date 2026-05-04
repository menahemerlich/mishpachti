import { apiClient } from './apiClient';
import type {
  AuthResponse,
  User,
  ChatRoom,
  Message,
  CalendarEvent,
  MediaAsset,
  Album,
  Invitation,
  CallToken,
  MessageType,
  MediaType,
} from '@/types/models';

// ----- Auth -----
export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
    signupBootstrap: (data: {
      email: string;
      password: string;
      name: string;
      profilePicture?: string;
    }) => apiClient.post<AuthResponse>('/auth/signup-bootstrap', data).then((r) => r.data),
    signupWithInvite: (data: {
      inviteToken: string;
      name: string;
      password?: string;
      googleIdToken?: string;
      profilePicture?: string;
    }) => apiClient.post<AuthResponse>('/auth/signup-with-invite', data).then((r) => r.data),
    google: (idToken: string) =>
      apiClient.post<AuthResponse>('/auth/google', { idToken }).then((r) => r.data),
    me: () => apiClient.get<User>('/users/me').then((r) => r.data),
    logout: (refreshToken?: string) =>
      apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),
  },

  users: {
    list: () => apiClient.get<User[]>('/users').then((r) => r.data),
    updateProfile: (data: { name?: string; profilePicture?: string | null }) =>
      apiClient.patch<User>('/users/me', data).then((r) => r.data),
    promote: (id: string) => apiClient.patch(`/users/${id}/promote`).then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/users/${id}`).then((r) => r.data),
  },

  invitations: {
    validate: (token: string) =>
      apiClient
        .get<{ valid: boolean; email: string }>(`/invitations/${token}/validate`)
        .then((r) => r.data),
    create: (email: string) =>
      apiClient.post<Invitation>('/invitations', { email }).then((r) => r.data),
    list: () => apiClient.get<Invitation[]>('/invitations').then((r) => r.data),
    revoke: (id: string) => apiClient.delete(`/invitations/${id}`).then((r) => r.data),
  },

  chat: {
    rooms: () => apiClient.get<ChatRoom[]>('/chat/rooms').then((r) => r.data),
    dm: (userId: string) => apiClient.post<ChatRoom>('/chat/dm', { userId }).then((r) => r.data),
    messages: (roomId: string, opts?: { take?: number; before?: string }) =>
      apiClient
        .get<Message[]>(`/chat/rooms/${roomId}/messages`, { params: opts })
        .then((r) => r.data),
    send: (roomId: string, body: { type: MessageType; content?: string; mediaAssetId?: string; replyToId?: string }) =>
      apiClient.post<Message>(`/chat/rooms/${roomId}/messages`, body).then((r) => r.data),
    edit: (messageId: string, content: string) =>
      apiClient.patch<Message>(`/chat/messages/${messageId}`, { content }).then((r) => r.data),
    delete: (messageId: string) =>
      apiClient.delete(`/chat/messages/${messageId}`).then((r) => r.data),
  },

  media: {
    sign: (type: MediaType) =>
      apiClient
        .post<{
          apiKey: string;
          cloudName: string;
          timestamp: number;
          signature: string;
          folder: string;
          resourceType: 'image' | 'video';
          uploadUrl: string;
        }>('/media/sign', { type })
        .then((r) => r.data),
    register: (data: {
      type: MediaType;
      publicId: string;
      url: string;
      width?: number;
      height?: number;
      duration?: number;
      format?: string;
      bytes?: number;
      waveform?: number[];
    }) => apiClient.post<MediaAsset>('/media/register', data).then((r) => r.data),
  },

  calendar: {
    list: (range?: { from?: string; to?: string }) =>
      apiClient.get<CalendarEvent[]>('/calendar', { params: range }).then((r) => r.data),
    create: (data: Omit<Partial<CalendarEvent>, 'id'> & { title: string; startsAt: string; endsAt: string }) =>
      apiClient.post<CalendarEvent>('/calendar', data).then((r) => r.data),
    update: (id: string, data: Partial<CalendarEvent>) =>
      apiClient.patch<CalendarEvent>(`/calendar/${id}`, data).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`/calendar/${id}`).then((r) => r.data),
  },

  gallery: {
    feed: (opts?: { take?: number; before?: string; types?: MediaType[] }) =>
      apiClient
        .get<MediaAsset[]>('/gallery', {
          params: {
            take: opts?.take,
            before: opts?.before,
            types: opts?.types?.join(','),
          },
        })
        .then((r) => r.data),
  },

  albums: {
    list: () => apiClient.get<Album[]>('/albums').then((r) => r.data),
    get: (id: string) => apiClient.get<Album>(`/albums/${id}`).then((r) => r.data),
    create: (title: string, description?: string) =>
      apiClient.post<Album>('/albums', { title, description }).then((r) => r.data),
    update: (id: string, data: Partial<Album>) =>
      apiClient.patch<Album>(`/albums/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/albums/${id}`).then((r) => r.data),
    addAssets: (id: string, assetIds: string[]) =>
      apiClient.post(`/albums/${id}/assets`, { assetIds }).then((r) => r.data),
    removeAsset: (id: string, assetId: string) =>
      apiClient.delete(`/albums/${id}/assets/${assetId}`).then((r) => r.data),
  },

  calls: {
    start: (roomId: string, isVideo = true) =>
      apiClient.post<CallToken>('/calls/start', { roomId, isVideo }).then((r) => r.data),
    join: (callId: string) =>
      apiClient.post<CallToken>(`/calls/${callId}/join`, {}).then((r) => r.data),
    end: (callId: string) =>
      apiClient.post(`/calls/${callId}/end`, {}).then((r) => r.data),
  },

  notifications: {
    subscribe: (oneSignalPlayerId: string, deviceInfo?: string) =>
      apiClient
        .post('/notifications/subscribe', { oneSignalPlayerId, deviceInfo })
        .then((r) => r.data),
    unsubscribe: (playerId: string) =>
      apiClient.delete(`/notifications/subscribe/${playerId}`).then((r) => r.data),
  },
};
