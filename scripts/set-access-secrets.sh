#!/usr/bin/env bash
# Sets (or rotates) the two secrets that lock the deployed CloudGuard API:
#
#   CLOUDGUARD_ACCESS_PASSWORD     the shared password visitors type into the lock screen
#   CLOUDGUARD_TOKEN_SIGNING_KEY   a random key the API signs login tokens with
#
# They are stored only as app settings on the Function App in Azure. Nothing is written to the
# repository or to GitHub, and the script never prints either value.
#
# Usage (you will be asked for the password twice; nothing is echoed):
#
#   FUNCTION_APP_NAME=<function app> RESOURCE_GROUP=<resource group> scripts/set-access-secrets.sh
#
# Optional: SUBSCRIPTION_ID=<id> to pick a subscription other than the one `az` currently uses.
#
# You need to be logged in with the Azure CLI (`az login`) with rights on the Function App.
#
# Run it BEFORE merging the change that adds the lock: the deploy stops, without touching the
# live app, when these settings are missing.
#
# Running it again rotates the password AND the signing key. Everyone who is logged in is
# signed out and has to unlock again with the new password. Changing an app setting restarts
# the Function App, so expect a few seconds of errors while it comes back.

set -euo pipefail

# Files this script creates are readable by you only.
umask 077

: "${FUNCTION_APP_NAME:?Set FUNCTION_APP_NAME to the name of the Function App}"
: "${RESOURCE_GROUP:?Set RESOURCE_GROUP to the resource group that contains it}"

MIN_PASSWORD_LENGTH=12

for tool in az jq openssl; do
  if ! command -v "$tool" > /dev/null 2>&1; then
    echo "error: '$tool' is required but was not found on PATH." >&2
    exit 1
  fi
done

subscription_args=()
if [ -n "${SUBSCRIPTION_ID:-}" ]; then
  subscription_args=(--subscription "$SUBSCRIPTION_ID")
fi

read -r -s -p "New access password (at least ${MIN_PASSWORD_LENGTH} characters): " password
echo >&2
read -r -s -p "Type it again to confirm: " confirmation
echo >&2

if [ "${#password}" -lt "$MIN_PASSWORD_LENGTH" ]; then
  echo "error: the password must be at least ${MIN_PASSWORD_LENGTH} characters. Nothing was changed." >&2
  exit 1
fi
if [ "$password" != "$confirmation" ]; then
  echo "error: the two entries do not match. Nothing was changed." >&2
  exit 1
fi
unset confirmation

# 48 random bytes, base64-encoded: 64 characters, well over the 32 the API requires.
signing_key="$(openssl rand -base64 48 | tr -d '\n')"

settings_file="$(mktemp)"
trap 'rm -f "$settings_file"' EXIT

# The values only ever pass through printf (a shell builtin, so they never appear in a process
# list) and jq's standard input, which turns them into correctly escaped JSON strings.
json_password="$(printf '%s' "$password" | jq -Rs .)"
json_key="$(printf '%s' "$signing_key" | jq -Rs .)"
printf '{"CLOUDGUARD_ACCESS_PASSWORD": %s, "CLOUDGUARD_TOKEN_SIGNING_KEY": %s}\n' \
  "$json_password" "$json_key" > "$settings_file"
unset password signing_key json_password json_key

# `@file` makes the Azure CLI read the settings from the file instead of the command line.
# Output is discarded: it would only be redacted copies of the settings anyway.
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "@${settings_file}" \
  --output none \
  "${subscription_args[@]}"

rm -f "$settings_file"

# Check by name that both settings are now there. Values are not read.
missing=0
for setting in CLOUDGUARD_ACCESS_PASSWORD CLOUDGUARD_TOKEN_SIGNING_KEY; do
  found="$(az functionapp config appsettings list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[?name=='${setting}'].name" \
    --output tsv \
    "${subscription_args[@]}")"
  if [ -z "$found" ]; then
    echo "error: $setting is not set on $FUNCTION_APP_NAME after the update." >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "Done. The access password and a fresh signing key are set on $FUNCTION_APP_NAME."
echo "Anyone who was logged in has been signed out. Share the password privately."
