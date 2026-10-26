FROM node:22-alpine AS build

WORKDIR /web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install --include=dev
COPY apps/web/ ./
ARG VITE_GATEWAY_URL=same-origin
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
