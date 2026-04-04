# Social Agent

Operator docs for the Coolify + Contabo deployment of the social posting service.

## Purpose

Run the social posting pipeline on the VPS as a single container. Keep the website on Cloudflare Pages and let it read status from this service instead of owning the scheduling logic itself.

## Recommended Layout

- Coolify app on Contabo VPS
- One container for the agent
- One persistent volume for state
- No extra services on day one
- SQLite first, Postgres only if the workload outgrows a single writer

## Runtime Contract

- `GET /health`
- `GET /status`
- `GET /posts`
- `POST /run/:job` or equivalent manual-run endpoint behind a token

`/health` should answer fast and only report process plus storage reachability.  
`/status` should expose last run, next run, and recent errors.  
`/posts` should expose the merged social feed for the website.  
Manual run should be protected and should never be public without auth.

## Persistent Data

Mount one volume and keep all writable state there.

- SQLite database
- dedup cache
- job log history
- small transient queue files if needed

Keep renders and temp media short-lived. Do not treat the container filesystem as durable state.

## Deployment Steps

1. Provision the Contabo VPS.
2. Install Coolify.
3. Create the app from this repo or a dedicated social-agent repo.
4. Mount the persistent volume.
5. Set env vars from `.env.example` in Coolify or Doppler.
   Include the Zernio account IDs for each platform you actually plan to publish from.
6. Bind the public hostname, usually `social.maxpetrusenko.com`.
7. Verify `GET /health`.
8. Run one manual job.
9. Watch logs for one full cycle before cutover.

## Cutover Notes

Use shadow mode first.

- Keep the existing scheduler live until the VPS service has run cleanly for a few cycles.
- Compare published output and status logs before disabling the old path.
- If the site still reads social status directly, point it at this service only after the new endpoint is stable.
- Keep a rollback path until you have at least one clean day of runs and restarts.

## Operational Notes

- Prefer a single replica while the service owns scheduling and SQLite.
- Add a second worker only if video rendering or queue depth demands it.
- Rotate secrets if they were ever copied outside private storage.
- Keep logs structured and short-lived.
- Back up the persistent volume on a schedule.
