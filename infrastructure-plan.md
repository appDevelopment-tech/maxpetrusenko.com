# Infrastructure Plan: Cloudflare + Contabo/Coolify

**Date:** 2026-04-04
**Author:** Max Petrusenko
**Status:** Draft

---

## Current State (Audit Results)

**VPS:** Contabo vmi3203669 — 4 vCPU, 8GB RAM, 150GB SSD (9% used), Ubuntu 24.04, IP `173.249.52.27`
**Coolify:** v4.0.0-beta.470, Traefik proxy on 80/443, dashboard on 8000. Running containers: coolify stack + 1 app.
**Cloudflare:** Zone `60ee8be619c0096bfe6f88c310993672`, active. DNS for `maxpetrusenko.com` + `southfloridaqigong.com`.
**Pages:** `maxpetrusenko-nextjs` (root + www), `atelier` (atelier.maxpetrusenko.com), `geo-analyzer-com`, `southfloridaqigong`.
**Email:** Amazon SES (11 DKIM records), CF Email Routing on root MX.

---

## CRITICAL Issues Found

### 1. SSL Mode is "Flexible" (HIGH RISK)
CF terminates TLS, then connects to your origin over **plain HTTP**. Anyone between CF and Contabo sees traffic in cleartext. MITM-able.

**Fix:** Change to `Full (Strict)` + install CF Origin Certificate on Traefik.

### 2. HTTPS Not Enforced
`always_use_https` is OFF. Users hitting `http://maxpetrusenko.com` get served unencrypted.

**Fix:** Enable `Always Use HTTPS` in CF dashboard.

### 3. TLS 1.0 Allowed
TLS 1.0/1.1 are deprecated and vulnerable to BEAST/POODLE.

**Fix:** Set minimum TLS version to 1.2.

### 4. SSH Root Login + Password Auth
`PermitRootLogin yes`, `PasswordAuthentication` commented out (defaults to yes). Brute-force target.

**Fix:** Create non-root user, disable root login, disable password auth, key-only.

### 5. Coolify Dashboard Open to Internet (port 8000)
Anyone can hit `http://173.249.52.27:8000` and attempt login.

**Fix:** UFW restrict 8000 to your IPs only (or Tailscale).

### 6. Traefik Dashboard Open (port 8080)
Exposes routing config, service discovery info.

**Fix:** Close port 8080 in UFW, or restrict to localhost.

### 7. No Swap
0B swap. If a Remotion render or build spikes past 8GB, OOM killer fires.

**Fix:** Add 4GB swap file.

### 8. No Fail2Ban
No brute-force protection on SSH.

**Fix:** Install + configure fail2ban.

---

## Target Architecture

```
                    Internet
                       │
                  ┌────▼────┐
                  │Cloudflare│  (DNS + proxy + WAF + SSL termination)
                  └────┬────┘
                       │ HTTPS (CF Origin Cert)
            ┌──────────┼──────────┐
            │          │          │
     CF Pages    CF Pages    Contabo VPS (173.249.52.27)
     (nextjs)   (atelier)        │
                            ┌────▼────┐
                            │ Traefik │  (reverse proxy, auto-TLS via CF)
                            └────┬────┘
                    ┌────────────┼────────────┐
                    │            │            │
              social-poster  coolify-ui   future apps
              (Docker)       (internal)   (Docker)
```

### DNS Routing Plan

| Subdomain | Target | Proxy | Purpose |
|-----------|--------|-------|---------|
| `maxpetrusenko.com` | CF Pages (`maxpetrusenko-nextjs`) | ☁️ Yes | Main site (keep as-is) |
| `www.maxpetrusenko.com` | CF Pages (`maxpetrusenko-nextjs`) | ☁️ Yes | www redirect (keep) |
| `atelier.maxpetrusenko.com` | CF Pages (`atelier-8cw`) | ☁️ Yes | Keep as-is |
| `api.maxpetrusenko.com` | A → `173.249.52.27` | ☁️ Yes | Social poster API / webhooks |
| `coolify.maxpetrusenko.com` | A → `173.249.52.27` | ☁️ Yes | Coolify dashboard (CF Access gated) |
| `*.apps.maxpetrusenko.com` | A → `173.249.52.27` | ☁️ Yes | Wildcard for future Coolify apps |
| `blindfold.maxpetrusenko.com` | CNAME mindfoldsanctuary | ☁️ Yes | Keep as-is |

### OVH Strategy (Future)
When you add a second host (OVH), Coolify supports multi-server. You'd:
1. Add OVH server as a Coolify "server" (SSH key from Contabo)
2. Deploy containers to OVH from the same Coolify dashboard
3. Point OVH app subdomains to OVH IP in CF DNS
4. Same CF proxy + Origin Cert pattern

Portability = Docker images + Coolify's git-based deployments. Move any app between Contabo/OVH by redeploying to the other server and flipping the DNS A record. No vendor lock-in beyond Docker.

---

## Implementation Plan

### Phase 1: VPS Hardening (30 min)

```bash
# 1. Create non-root user
adduser max
usermod -aG sudo max
mkdir -p /home/max/.ssh
cp /root/.ssh/authorized_keys /home/max/.ssh/
chown -R max:max /home/max/.ssh
chmod 700 /home/max/.ssh && chmod 600 /home/max/.ssh/authorized_keys

# 2. Lock down SSH
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd
# TEST: ssh max@173.249.52.27 in a NEW terminal BEFORE closing current session

# 3. Firewall: close 8080, restrict 8000
ufw delete allow 8000/tcp
ufw allow from YOUR_HOME_IP to any port 8000 proto tcp
ufw deny 8080
ufw reload

# 4. Fail2ban
apt install -y fail2ban
systemctl enable fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 5
bantime = 3600
EOF
systemctl restart fail2ban

# 5. Swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 6. Auto-updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### Phase 2: Cloudflare Hardening (15 min)

Via CF Dashboard or API:

1. **SSL/TLS → Full (Strict)**
2. **Edge Certificates → Always Use HTTPS: ON**
3. **Edge Certificates → Minimum TLS Version: 1.2**
4. **Origin Server → Create Origin Certificate** (15-year, covers `*.maxpetrusenko.com` + `maxpetrusenko.com`)
   - Save cert + key on VPS at `/etc/ssl/cloudflare/`
   - Configure in Traefik (see Phase 3)
5. **Security → WAF → Enable managed rules** (free tier gives basic protection)
6. **Security → Bot Fight Mode: ON**
7. **Caching → Browser Cache TTL: 4 hours** for static assets
8. **Speed → Auto Minify: ON** (HTML/CSS/JS)

### Phase 3: Traefik + Origin Cert (20 min)

On VPS, configure Traefik to use CF Origin Certificate:

```bash
# Save CF Origin cert
mkdir -p /etc/ssl/cloudflare
# (paste cert.pem and key.pem from CF dashboard)

# Coolify manages Traefik config via labels, but you need to add
# the default cert. Edit the Traefik static config:
# In Coolify dashboard → Settings → Proxy → add entrypoint TLS default cert
```

In Coolify, set each app's domain and Traefik will route automatically. The CF Origin Cert covers `*.maxpetrusenko.com`, so all subdomains work.

### Phase 4: DNS Records (5 min)

```bash
# Add these A records in CF (proxied ☁️):
# api.maxpetrusenko.com       → 173.249.52.27
# coolify.maxpetrusenko.com   → 173.249.52.27
# *.apps.maxpetrusenko.com    → 173.249.52.27  (wildcard)
```

### Phase 5: CF Access for Coolify Dashboard (10 min)

Instead of IP-restricting port 8000, use Cloudflare Access (Zero Trust free tier, 50 users):

1. Route `coolify.maxpetrusenko.com` → VPS
2. In CF Zero Trust dashboard → Access → Applications → Add
3. Policy: allow `max.petrusenko@gmail.com` (email OTP or Google SSO)
4. Now Coolify dashboard is behind CF auth — no direct IP exposure needed
5. Remove UFW rule for 8000 entirely (only accessible via CF tunnel or Access)

### Phase 6: Deploy Social Poster (from migration plan)

This is the Node.js service with node-cron, sharp, Remotion, Simli/Cartesia integrations. Deploy as a Docker container on Coolify with domain `api.maxpetrusenko.com`.

Environment variables via Coolify's env management (sourced from Doppler or pasted directly).

---

## What You're Missing (Gap Analysis)

### Must-Have (do now)

| Gap | Why | Fix |
|-----|-----|-----|
| **Backups** | Coolify DB + volumes have no backup. Disk failure = total loss | Coolify has built-in S3 backup. Point to Cloudflare R2 ($0.015/GB) or Backblaze B2 |
| **Monitoring/uptime** | No alerting if VPS or services go down | Use UptimeRobot (free, 50 monitors) or Better Stack. Ping `api.maxpetrusenko.com/health` |
| **Container registry** | Currently building on VPS = slow, eats RAM | GitHub Container Registry (ghcr.io, free for public repos) — build in CI, pull on VPS |
| **Log aggregation** | Docker logs disappear on container restart | Coolify has built-in log viewer. For persistence: Grafana Loki (self-hosted) or Axiom.co free tier |
| **Secrets rotation** | API keys in Doppler but no rotation schedule | Set calendar reminder quarterly. Zernio/Cartesia/Simli keys especially |

### Should-Have (do within a week)

| Gap | Why | Fix |
|-----|-----|-----|
| **CI/CD pipeline** | Manual deploys are error-prone | Coolify supports GitHub webhook deploys. Push to main → auto-deploy |
| **Rate limiting** | API endpoints exposed, no throttle | CF free tier has rate limiting rules (5 rules). Add to `api.maxpetrusenko.com` |
| **DDoS protection** | CF provides L7 DDoS by default when proxied (☁️) — but only if proxied | Ensure ALL public A/CNAME records are proxied. Never expose raw IP |
| **Health checks** | No automated restart on service crash | Docker `HEALTHCHECK` in Dockerfile + Coolify's built-in health monitoring |
| **DNS for southfloridaqigong.com** | On CF but not pointed to Coolify yet | Add A record when ready to migrate that site to Coolify |

### Nice-to-Have (do within a month)

| Gap | Why | Fix |
|-----|-----|-----|
| **Cloudflare Tunnel** (replaces exposing ports) | Eliminates need for UFW/IP management entirely. Tunnel = outbound-only connection from VPS to CF | `cloudflared tunnel create` → zero inbound ports needed |
| **Infrastructure as Code** | Server config is manual, not reproducible | Ansible playbook or simple bash setup script in repo |
| **Staging environment** | No way to test before prod | Second Coolify "environment" or branch-based preview deploys |
| **Email alerting** | No notifications on deploy fail/success | Coolify supports Discord/Slack/email notifications — configure in settings |
| **Resource alerts** | No warning before disk/RAM fills up | Coolify Sentinel already running — configure thresholds in dashboard |

---

## Cost Breakdown

| Service | Cost/mo | Notes |
|---------|---------|-------|
| Contabo VPS (4 vCPU/8GB) | ~€9 | Current plan |
| Cloudflare (Free) | $0 | DNS, proxy, WAF, Pages, 50 Access seats |
| Cloudflare R2 (backups) | ~$0.50 | <30GB backup storage |
| Domain (maxpetrusenko.com) | ~$10/yr | Can transfer registrar to CF for at-cost pricing |
| UptimeRobot (Free) | $0 | 50 monitors, 5-min intervals |
| GitHub (Free) | $0 | Container registry, CI/CD |
| **Total** | **~€10/mo** | |

### Domain Registrar Note
If your domain isn't registered through Cloudflare, consider transferring it there. CF charges at-cost (no markup), and you get tighter integration (DNSSEC one-click, no NS propagation delays). This is the "hostname bought via Cloudflare" you mentioned.

---

## Portability Checklist

Your stack is portable if you can answer YES to all of these:

- [x] **All apps are Docker containers** — Coolify deploys via Docker/Docker Compose
- [x] **DNS is on Cloudflare** — flip A records to any new IP in seconds
- [x] **No vendor-specific managed services** — no AWS RDS/Lambda lock-in
- [x] **Secrets in Doppler** — environment-agnostic, inject anywhere
- [ ] **Backups in object storage** — need to configure (R2/B2)
- [ ] **Infra as code** — need to create setup script
- [ ] **Container images in registry** — need to push to ghcr.io

**Migration to new host (OVH, Hetzner, etc.):**
1. Provision new VPS, run setup script
2. Install Coolify, add as server in existing Coolify dashboard (or fresh install)
3. Pull container images from registry
4. Update CF DNS A records to new IP
5. Done. Zero-downtime if you do DNS switch after new server is healthy.

---

## Execution Order

```
Week 1:
  Day 1: Phase 1 (VPS hardening) + Phase 2 (CF settings)
  Day 2: Phase 3 (Origin cert + Traefik) + Phase 4 (DNS records)
  Day 3: Phase 5 (CF Access for Coolify)

Week 2:
  Day 4-5: Phase 6 (Deploy social-poster service)
  Day 6: Configure backups (R2), monitoring (UptimeRobot), CI/CD webhooks
  Day 7: Test failover: stop service, verify alerts fire, restart

Week 3+:
  - Evaluate CF Tunnel to replace port exposure
  - Write Ansible/bash setup script
  - Migrate southfloridaqigong to Coolify if desired
  - Set up staging environment
```

---

## Quick Reference

| What | Where |
|------|-------|
| VPS SSH | `ssh -i ~/.ssh/contabo_vmi3203669_ed25519 root@173.249.52.27` |
| Coolify | `http://173.249.52.27:8000` (move to `coolify.maxpetrusenko.com`) |
| CF Dashboard | `dash.cloudflare.com` |
| Doppler secrets | `doppler secrets --project api_keys --config dev` |
| CF Zone ID | `60ee8be619c0096bfe6f88c310993672` |
| CF Account ID | `f56dca6ee3b28dba800f82fb63f548e0` |
| Contabo API creds | Doppler: `CONTABO_CLIENT_ID`, `CONTABO_CLIENT_SECRET` |
