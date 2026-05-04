export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '',
  googleClientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '',
  livekitUrl: import.meta.env.VITE_LIVEKIT_URL ?? '',
  cloudinaryCloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '',
  oneSignalAppId: import.meta.env.VITE_ONESIGNAL_APP_ID ?? '',
};
