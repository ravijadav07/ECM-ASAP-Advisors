# Multi-stage build for the ECM Reconciliation Suite (Vite + React).
# Dokploy builds this from the uploaded SOURCE bundle so Vite bakes the
# VITE_* env vars at build time. Final image serves the static SPA via nginx.

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
