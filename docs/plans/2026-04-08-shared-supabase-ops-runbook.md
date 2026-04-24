# Shared Supabase Ops Runbook

**Date:** 2026-04-08
**Status:** Live
**Owner:** Max Petrusenko

## Live State

- shared `Supabase` stack runs on Contabo under `/opt/supabase`
- public URL: `https://supabase.maxpetrusenko.com`
- public gateway served by `Traefik` on Coolify
- origin cert served by `Let's Encrypt`
- `Supavisor` pooler healthy

## App Connection Points

For browser/client work:

- `SUPABASE_URL=https://supabase.maxpetrusenko.com`

For Coolify app containers on the shared `coolify` Docker network:

- session pooler host: `supabase-pooler`
- session pooler port: `5432`
- transaction pooler port: `6543`

Use the transaction pooler by default for app backends unless a tool explicitly needs session mode.

For host-local admin access on the VPS only:

- session pooler port: `127.0.0.1:15432`
- transaction pooler port: `127.0.0.1:16543`

## Storage

- backend: local file storage
- path: `/opt/supabase/volumes/storage`

## Backups

Installed on the VPS:

- backup script: `/usr/local/bin/supabase-backup`
- DB restore: `/usr/local/bin/supabase-restore-db`
- storage restore: `/usr/local/bin/supabase-restore-storage`
- backup root: `/var/backups/supabase`
- nightly cron: `03:17 UTC`

Backup contents:

- full Postgres cluster dump via `pg_dumpall`
- storage archive from `/opt/supabase/volumes/storage`
- current `/opt/supabase/.env`
- `SHA256SUMS`

Manual run:

```bash
ssh root@173.249.52.27 /usr/local/bin/supabase-backup
```

Restore DB:

```bash
ssh root@173.249.52.27 supabase-restore-db /var/backups/supabase/<timestamp>
```

Restore storage:

```bash
ssh root@173.249.52.27 supabase-restore-storage /var/backups/supabase/<timestamp>
```

## DNS Note

`supabase.maxpetrusenko.com` now resolves normally through public DNS. Any temporary local `/etc/hosts` workaround can be removed.

## Next App Rule

New apps should plug into this shared backend, not create a new Supabase stack:

- frontend uses `SUPABASE_URL`
- app backend connects to `supabase-pooler:6543` on the `coolify` network when direct DB access is needed
- app data stays isolated with schema, roles, RLS, and buckets
