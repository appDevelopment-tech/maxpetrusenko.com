#!/bin/sh
# One-time setup: create the Twilio Verify service that sends the signup text code.
# Prints the service SID (VA...), which is not a secret. Then store it as the Worker secret:
#   printf '%s' "$SID" | wrangler secret put TWILIO_VERIFY_SID
#
# Credentials come from the environment, never from arguments:
#   doppler run -p api_keys -c dev -- sh -c '
#     TWILIO_ACCOUNT_SID=$BLINDFOLD_DANCE_TWILIO_ACCOUNT_SID \
#     TWILIO_AUTH_TOKEN=$BLINDFOLD_DANCE_TWILIO_AUTH_TOKEN \
#     tools/create_verify_service.sh'
set -eu
: "${TWILIO_ACCOUNT_SID:?set TWILIO_ACCOUNT_SID}"
: "${TWILIO_AUTH_TOKEN:?set TWILIO_AUTH_TOKEN}"
curl -s -X POST https://verify.twilio.com/v2/Services \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  --data-urlencode "FriendlyName=Miami CI" \
  --data-urlencode "CodeLength=6" \
  | python3 -c 'import sys, json; d = json.load(sys.stdin); print(d.get("sid") or d)'
