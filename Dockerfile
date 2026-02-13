
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --silent


FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl python3 make g++

COPY package.json package-lock.json* ./

RUN npm ci --silent

COPY . .


RUN find node_modules/.bin -type f -exec chmod +x {} \; 2>/dev/null || true && \
    find node_modules/.bin -type l -exec chmod +x {} \; 2>/dev/null || true && \
    find node_modules/next -type f -name "next" -exec chmod +x {} \; 2>/dev/null || true && \
    chmod +x node_modules/.bin/* 2>/dev/null || true

RUN npx prisma generate || true

RUN node node_modules/next/dist/bin/next build || ./node_modules/.bin/next build || npx next build


FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl su-exec

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app ./

RUN chmod +x /app/docker/entrypoint.sh

RUN mkdir -p /app/public/uploads/tasks && \
    chown -R appuser:appgroup /app/public/uploads


EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
CMD ["npm", "run", "start"]
