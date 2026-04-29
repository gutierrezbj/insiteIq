FROM node:20-alpine AS build
WORKDIR /app

# Vite build-time vars. Inyectadas desde docker-compose.yml (build.args).
# Necesarias para que el bundle JS las tenga inlined (Vite las lee en build, no runtime).
ARG VITE_MAPBOX_TOKEN
ARG VITE_MAPBOX_STYLE
ARG VITE_V2_SHELL=1
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_STYLE=$VITE_MAPBOX_STYLE
ENV VITE_V2_SHELL=$VITE_V2_SHELL

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
