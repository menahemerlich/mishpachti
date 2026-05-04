export type Role = 'ADMIN' | 'MEMBER';
export type RoomType = 'FAMILY' | 'DM';
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';
export type MediaType = 'IMAGE' | 'VIDEO' | 'VOICE';

export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture: string | null;
  role: Role;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface MediaAsset {
  id: string;
  ownerId: string;
  cloudinaryPublicId: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  format: string | null;
  bytes: number | null;
  waveform: number[] | null;
  createdAt: string;
  owner?: Pick<User, 'id' | 'name' | 'profilePicture'>;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface MessageRead {
  messageId: string;
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  type: MessageType;
  content: string | null;
  mediaAssetId: string | null;
  replyToId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author?: Pick<User, 'id' | 'name' | 'profilePicture'>;
  mediaAsset?: MediaAsset | null;
  reactions?: Reaction[];
  reads?: MessageRead[];
  replyTo?: {
    id: string;
    content: string | null;
    type: MessageType;
    author?: { id: string; name: string };
  } | null;
  // client-only:
  tempId?: string;
  pending?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: RoomType;
  members: Array<{
    userId: string;
    user: Pick<User, 'id' | 'name' | 'profilePicture'>;
  }>;
  messages?: Array<{
    id: string;
    content: string | null;
    type: MessageType;
    createdAt: string;
    author?: Pick<User, 'id' | 'name'>;
  }>;
  lastReadAt?: string | null;
}

export interface CalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  isFamilyWide: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, 'id' | 'name' | 'profilePicture'>;
}

export interface Album {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  coverAssetId: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, 'id' | 'name' | 'profilePicture'>;
  coverAsset?: MediaAsset | null;
  _count?: { assets: number };
  assets?: Array<{ albumId: string; assetId: string; addedAt: string; asset: MediaAsset }>;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  invitedById: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  invitedBy?: { id: string; name: string; email: string };
}

export interface IncomingCall {
  callId: string;
  roomId: string;
  livekitRoomName: string;
  isVideo: boolean;
  startedBy: Pick<User, 'id' | 'name' | 'profilePicture'>;
  startedAt: string;
}

export interface CallToken {
  callId: string;
  roomId: string;
  livekitRoomName: string;
  livekitUrl: string;
  token: string;
  isVideo: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
