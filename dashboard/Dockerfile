# ===== Stage 1: build =====
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps with reproducible lockfile
COPY package.json package-lock.json ./
RUN npm install

# Build with VITE_API_URL baked in (nginx will proxy /api -> api:8081)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ===== Stage 2: runtime (nginx) =====
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
