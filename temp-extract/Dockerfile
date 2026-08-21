# Multi-stage build for the ECM Reconciliation Suite (Vite + React).
# Line 16 copies nginx.conf into the conf.d directory — this is what
# creates the /core-api/ → core-api.pucho.ai proxy route.
# If deploying without Docker, configure the platform's nginx to proxy
# /core-api/ → https://core-api.pucho.ai/ with the same settings.

FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]