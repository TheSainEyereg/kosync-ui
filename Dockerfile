# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base

ARG PNPM_VERSION=latest
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app
COPY . .

FROM base AS build

RUN --mount=type=cache,id=kosync-pnpm,target=/pnpm/store \
	pnpm install --frozen-lockfile --store-dir=/pnpm/store
RUN pnpm build

FROM base AS production-dependencies

# The current production dependency tree is pure JavaScript.
# Skip lifecycle hooks, including the root SvelteKit prepare script.
RUN --mount=type=cache,id=kosync-pnpm,target=/pnpm/store \
	pnpm install --prod --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

CMD ["node", "build"]
