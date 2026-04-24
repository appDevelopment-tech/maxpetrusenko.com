## Social Poster Coolify Normalization

Date: 2026-04-08

Status:
- `social-poster` is now running as a Coolify-managed app
- app id: `2`
- app uuid: `ch6cjsgcqn6afd5052etgvwn`
- app path on server: `/data/coolify/applications/ch6cjsgcqn6afd5052etgvwn`
- compose file: `/data/coolify/applications/ch6cjsgcqn6afd5052etgvwn/docker-compose.yaml`
- data volume: `/opt/social-poster/data:/app/data`

Public URLs:
- `https://social.maxpetrusenko.com`
- `https://social-origin.maxpetrusenko.com`

Health:
- app health route: `/api/health`
- container healthcheck uses `node -e` against `http://127.0.0.1:3000/api/health`
- public health check verified at `https://social.maxpetrusenko.com/api/health`

Coolify DB alignment:
- application row `2` renamed from `social-agent` to `social-poster`
- repo set to `maxpetrusenko/social-poster.git`
- git SHA set to `95682e7d95870f17432dc9966073dc7ddc88fae4`
- Coolify health metadata set to `/api/health` on port `3000`

Smoke checks completed:
- container state `healthy`
- public `api/health` returns `200`
- `/dashboard/replies` renders
- `/dashboard/schedules` renders

Current known app issue:
- manual run of `X Reply Engine` schedule `05fad537-04e3-414a-b4e0-a5295fb8ab31` still fails
- latest failure: X duplicate-status error `187`
- failing target: `https://x.com/TheArsonDragon/status/2041682792258449631`
- failing reply text: `nice. curious where you take it next`

Implication:
- deploy/container normalization is fixed
- reply-engine product logic still needs a duplicate-reply guard or different candidate selection
