#!/usr/bin/env bash
# Create one RecipeSage account while registration is otherwise disabled.
# Usage: ./add-user.sh <email> <password> "<full name>"
#
# Registration stays closed (DISABLE_REGISTRATION=true) at all other times.
# This script opens it only for the single API call below, then re-locks.
set -euo pipefail

cd "$(dirname "$0")"

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <email> <password> \"<full name>\"" >&2
  exit 1
fi
EMAIL="$1"; PASSWORD="$2"; NAME="$3"

if [[ ${#PASSWORD} -lt 6 ]]; then
  echo "Password must be at least 6 characters." >&2
  exit 1
fi

PROXY="http://127.0.0.1:7270"

relock() {
  # Recreate api with the default (DISABLE_REGISTRATION=true).
  docker compose up -d api >/dev/null 2>&1
}
trap relock EXIT   # always re-lock, even on error/ctrl-c

echo "==> Opening registration (temporary)..."
RS_DISABLE_REGISTRATION=false docker compose up -d api >/dev/null 2>&1

echo "==> Waiting for API to come back up..."
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "$PROXY/api/trpc/users.register" 2>/dev/null \
     || curl -s "$PROXY/api/trpc/users.register" 2>/dev/null | grep -q METHOD_NOT_SUPPORTED; then
    break
  fi
  sleep 1
  [[ $i -eq 60 ]] && { echo "API did not become ready in time." >&2; exit 1; }
done

echo "==> Registering $EMAIL ..."
BODY=$(jq -n --arg n "$NAME" --arg e "$EMAIL" --arg p "$PASSWORD" \
  '{name:$n,email:$e,password:$p}')
RESP=$(curl -s -X POST "$PROXY/api/trpc/users.register" \
  -H 'content-type: application/json' --data "$BODY")

if echo "$RESP" | grep -q '"error"'; then
  echo "Registration FAILED:" >&2
  echo "$RESP" | jq -r '.error.message' 2>/dev/null || echo "$RESP" >&2
  exit 1
fi

echo "==> Account created for $EMAIL."
echo "    Share these credentials with them; they can change the password after logging in."
# relock runs via trap on exit
echo "==> Re-locking registration..."
