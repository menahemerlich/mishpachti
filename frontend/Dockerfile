# =================== Build Stage ===================
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ARG VITE_LIVEKIT_URL
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_ONESIGNAL_APP_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=${VITE_GOOGLE_OAUTH_CLIENT_ID}
ENV VITE_LIVEKIT_URL=${VITE_LIVEKIT_URL}
ENV VITE_CLOUDINARY_CLOUD_NAME=${VITE_CLOUDINARY_CLOUD_NAME}
ENV VITE_ONESIGNAL_APP_ID=${VITE_ONESIGNAL_APP_ID}

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# =================== Runtime Stage ===================
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
