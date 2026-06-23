# ---- Frontend: build with Node, serve with nginx ----
# Stage 1: build the static bundle
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL must be known at build time (Vite inlines env vars).
# Pass it with: docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine
# Templated so the official nginx entrypoint can envsubst ${PORT} at
# container start (Railway/Render inject a dynamic PORT, not always 80).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
