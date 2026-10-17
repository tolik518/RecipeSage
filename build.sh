#!/usr/bin/env bash
# Build the custom RecipeSage api + static images from the app fork, the same
# way upstream CI does (see .circleci/config.yml in the fork). No Node needed on
# the host: the frontend is built inside a node container.
#
# Usage: ./build.sh [tag]            (default tag: v4.0.13-trello)
#   APP_SRC=/path/to/RecipeSage ./build.sh
#   BUILD=static ./build.sh            (only the frontend image; also: BUILD=api)
#
# Produces:
#   recipesage-custom:api-<tag>
#   recipesage-custom:static-<tag>
set -euo pipefail

cd "$(dirname "$0")"

TAG="${1:-v4.0.13-trello}"
APP_SRC="$(cd "${APP_SRC:-../recipesage-app}" && pwd)"
NODE_IMAGE="node:24.13-alpine"
BUILD="${BUILD:-api static}"

echo "==> Source: $APP_SRC ($(git -C "$APP_SRC" rev-parse --abbrev-ref HEAD) @ $(git -C "$APP_SRC" rev-parse --short HEAD))"
if [[ -n "$(git -C "$APP_SRC" status --porcelain)" ]]; then
  echo "    WARNING: source tree has uncommitted changes; they will be built in." >&2
fi

if [[ " $BUILD " == *" api "* ]]; then
echo "==> Building api image recipesage-custom:api-$TAG"
docker build \
  --build-arg VERSION="$TAG" \
  -f "$APP_SRC/production.Dockerfile" \
  -t "recipesage-custom:api-$TAG" \
  "$APP_SRC"
fi

if [[ " $BUILD " == *" static "* ]]; then
echo "==> Building frontend (nx build:selfhost) in $NODE_IMAGE"
docker run --rm \
  -v "$APP_SRC":/app \
  -v recipesage-pnpm-store:/pnpm-store \
  -w /app \
  -e ENVIRONMENT=production \
  -e NODE_OPTIONS=--max-old-space-size=4096 \
  -e APP_VERSION="$TAG" \
  -e NX_DAEMON=false \
  -e NX_NO_CLOUD=true \
  -e CI=true \
  "$NODE_IMAGE" sh -c '
    set -e
    corepack enable
    pnpm install --frozen-lockfile --store-dir /pnpm-store
    pnpm exec prisma generate
    pnpm exec nx build:selfhost frontend --skip-nx-cache
  '

STATIC_CTX="$(mktemp -d)"
trap 'rm -rf "$STATIC_CTX"' EXIT
cp -r "$APP_SRC/packages/frontend/www" "$STATIC_CTX/www"
sed -i "s/window.version = \"development\";/window.version = \"$TAG\";/" "$STATIC_CTX/www/index.html"
cp "$APP_SRC/packages/frontend/selfhost.Dockerfile" "$STATIC_CTX/Dockerfile"

echo "==> Building static image recipesage-custom:static-$TAG"
docker build -t "recipesage-custom:static-$TAG" "$STATIC_CTX"
fi

echo "==> Done:"
docker image ls --filter "reference=recipesage-custom:*-$TAG" --format '    {{.Repository}}:{{.Tag}}  {{.Size}}'
