#!/bin/sh
# One-time setup: the 20% coupon behind the monthly personal codes (CI20-XXXXXX).
# NOT run by the PR. Run it yourself against live, then store the id as the Worker secret:
#   doppler run -p api_keys -c prd -- sh -c 'STRIPE_KEY=$MINDFOLD_STRIPE_SECRET_KEY tools/create_monthly_coupon.sh'
#   printf 'ci-monthly-20' | wrangler secret put CI_MONTHLY_COUPON_ID
set -eu
: "${STRIPE_KEY:?set STRIPE_KEY (the key never goes in arguments)}"
curl -s https://api.stripe.com/v1/coupons -u "$STRIPE_KEY:" \
  -d id=ci-monthly-20 -d percent_off=20 -d duration=once \
  --data-urlencode "name=CI monthly 20% off" \
  | python3 -c 'import sys, json; d = json.load(sys.stdin); print(d.get("id") or d.get("error"))'
