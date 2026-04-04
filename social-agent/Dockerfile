FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY social-agent/package*.json ./
RUN npm ci --include=dev

COPY social-agent/tsconfig.json ./tsconfig.json
COPY social-agent/src ./src
COPY nextjs/workers/social-scheduler/schedule.json ./config/schedule.json

RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY social-agent/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config

ENV NODE_ENV=production
ENV PORT=3333
ENV SOCIAL_DATA_DIR=/data

VOLUME ["/data"]

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3333') + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
