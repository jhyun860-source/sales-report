# [신규] Nixpacks의 자동 추측 대신, Dockerfile로 빌드 결과물 복사 과정을 명시적으로 통제.
#   기존 코드/로직/포트/실행 방식은 전혀 안 바꿈 - 단지 "무엇을 어디로 복사할지"만 확실히 함.

FROM node:20-slim AS builder
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 의존성 설치 (lockfile 그대로 사용)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 전체 복사 후 빌드 (기존과 동일한 빌드 명령)
COPY . .
RUN pnpm build

# ---- 실행 전용 이미지 ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# 빌드 결과물만 명시적으로 복사 (서버 번들 + 클라이언트 정적 파일)
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
