# ShopOS — VPS First-Time Setup (Hostinger Ubuntu)

> Step-by-step bootstrap for a fresh Hostinger Ubuntu VPS. Copy-paste friendly. Takes ~30 minutes.
> No prior Docker/Linux experience assumed.

**What you'll end up with:**
- A secure Ubuntu VPS that only allows SSH + HTTPS
- Docker-powered ShopOS stack: Postgres + Redis + Next.js web + BullMQ worker + Nginx/Caddy with HTTPS
- Nightly automated Postgres backups
- GitHub Actions that auto-deploys on every push to `main`

---

## What you need before you start

- Hostinger VPS running **Ubuntu 22.04 or 24.04** (LTS only)
- Root password (Hostinger panel → VPS → Settings)
- A domain pointed at the VPS's public IP (optional — you can deploy without it first and add later)
- An SSH keypair on your Windows machine (skip to [Appendix A](#appendix-a-generating-an-ssh-keypair-on-windows) if you don't have one)

Throughout this guide:
- Replace `VPS_IP` with your actual public IP
- Replace `shopos.example.com` with your actual domain (or skip those lines for now)
- Replace `you@example.com` with your real email (needed for Let's Encrypt)

---

## Step 1 — SSH into the VPS as root

From PowerShell or Windows Terminal:
```bash
ssh root@VPS_IP
```
Accept the fingerprint; paste the root password from Hostinger.

## Step 2 — Update and install base tools

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban curl ca-certificates gnupg git unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades   # press Enter to accept defaults
```

## Step 3 — Create a non-root deploy user

```bash
adduser deploy                         # set a strong password; name etc. can be blank
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
```

Now **from your Windows machine** (not the VPS), copy your public key up:
```bash
# On Windows PowerShell:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@VPS_IP "cat >> /home/deploy/.ssh/authorized_keys"
```

Back **on the VPS**, fix ownership:
```bash
chown -R deploy:deploy /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Verify you can log in as `deploy` **from a new terminal** — do not close the root session yet:
```bash
ssh deploy@VPS_IP    # should let you in with your key, no password prompt
```

## Step 4 — Lock down SSH (still as root in the original session)

Edit `/etc/ssh/sshd_config`:
```bash
nano /etc/ssh/sshd_config
```
Set (or add) these lines:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```
Save (Ctrl+O, Enter, Ctrl+X) and reload:
```bash
systemctl reload ssh
```

**Do not close this root session yet.** Confirm `ssh deploy@VPS_IP` still works from another terminal, then close root safely.

## Step 5 — Firewall (UFW) + fail2ban

Now as `deploy`:
```bash
ssh deploy@VPS_IP
```

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable     # type "y"
sudo ufw status verbose
```

fail2ban (shipped with sensible sshd defaults):
```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

## Step 6 — Install Docker + Docker Compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```
Log out and back in once so the group takes effect:
```bash
exit
ssh deploy@VPS_IP
docker run hello-world      # should succeed without sudo
```

## Step 7 — Create the app directory structure

```bash
sudo mkdir -p /opt/shopos /etc/shopos /var/backups/shopos
sudo chown -R deploy:deploy /opt/shopos /etc/shopos /var/backups/shopos
```

## Step 8 — Configure environment

Create `/etc/shopos/.env` (this is the **production** env file; never commit it):
```bash
nano /etc/shopos/.env
```
Paste and edit:
```env
# App
NODE_ENV=production
APP_URL=https://shopos.example.com
NEXT_PUBLIC_APP_URL=https://shopos.example.com

# Database (internal Docker network; not exposed to the public)
POSTGRES_USER=shopos
POSTGRES_PASSWORD=<GENERATE A STRONG ONE>
POSTGRES_DB=shopos_prod
DATABASE_URL=postgresql://shopos:<same password, URL-encode @ as %40>@postgres:5432/shopos_prod?schema=public

# Redis
REDIS_URL=redis://redis:6379

# Auth
BETTER_AUTH_SECRET=<openssl rand -base64 48>
SESSION_COOKIE_DOMAIN=shopos.example.com

# Encryption key for per-shop FBR creds (32 bytes, base64)
FBR_ENCRYPTION_KEY=<openssl rand -base64 32>

# Super admin bootstrap (only read on first db:seed)
SUPER_ADMIN_EMAIL=adeel.ahmad8000@gmail.com

# Observability (optional at first)
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=

# Backups
BACKUP_REMOTE=none    # options: none | r2 | b2
# If r2:
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET=shopos-backups
```

Tips to generate the secrets:
```bash
openssl rand -base64 48      # BETTER_AUTH_SECRET
openssl rand -base64 32      # FBR_ENCRYPTION_KEY
openssl rand -base64 24      # a postgres password
```

## Step 9 — Point your domain (optional now, required for HTTPS)

In your DNS provider, add two records pointing at the VPS IP:
```
A    shopos.example.com        →  VPS_IP
A    www.shopos.example.com    →  VPS_IP
```
Wait 5–30 minutes for DNS to propagate. Verify:
```bash
dig +short shopos.example.com
```

## Step 10 — First deploy

The GitHub Actions workflow will SSH in and run these steps on every push to `main`, but the **first time** you do it manually. From your Windows dev machine, push the repo to GitHub, then on the VPS:

```bash
cd /opt/shopos
git clone https://github.com/<your-user>/shopos.git .
# Or if private: set up a read-only deploy key first

# Pull pre-built images (CI publishes to GHCR — once you've pushed once)
# docker login ghcr.io -u <your-user> -p <PAT with read:packages>
# For the very first deploy, build locally:
docker compose -f infra/docker/docker-compose.yml --env-file /etc/shopos/.env build
docker compose -f infra/docker/docker-compose.yml --env-file /etc/shopos/.env up -d

# Wait ~20s for Postgres to start, then run migrations + seed
docker compose -f infra/docker/docker-compose.yml exec web pnpm db:migrate deploy
docker compose -f infra/docker/docker-compose.yml exec web pnpm db:rls:apply
docker compose -f infra/docker/docker-compose.yml exec web pnpm db:seed
```

Check health:
```bash
curl -sI http://localhost:3000/health    # expect 200
docker compose -f infra/docker/docker-compose.yml ps
docker compose -f infra/docker/docker-compose.yml logs -f web
```

## Step 11 — HTTPS via Let's Encrypt

The compose stack uses **Caddy** as the reverse proxy — it fetches and renews Let's Encrypt certificates automatically from the domain set in `APP_URL`. First deploy with the real domain in `/etc/shopos/.env`:
```bash
docker compose -f infra/docker/docker-compose.yml restart caddy
docker compose -f infra/docker/docker-compose.yml logs caddy | grep -i "certificate"
```
Wait up to 60s for the first cert. Visit `https://shopos.example.com` — padlock should be green.

If you prefer **Nginx + certbot**, swap the `caddy` service for `nginx` + `certbot` sidecar; the compose file has both options commented.

## Step 12 — Set up automated nightly backups

Nightly backups run inside a dedicated `backup` container started by compose. Verify the cron works:
```bash
docker compose -f infra/docker/docker-compose.yml exec backup /bin/sh -c "ls -la /var/backups/shopos"
```

Optional: push to Cloudflare R2 by setting `BACKUP_REMOTE=r2` + R2 creds in `/etc/shopos/.env` and restarting the `backup` container.

Test a restore (into a scratch Postgres) quarterly:
```bash
# Inside the compose network:
docker compose -f infra/docker/docker-compose.yml exec backup /opt/scripts/restore-drill.sh
```

## Step 13 — Wire GitHub Actions for auto-deploy

On the VPS, create a deploy key that GitHub Actions will SSH in with:
```bash
ssh-keygen -t ed25519 -N '' -f ~/.ssh/gha_deploy
cat ~/.ssh/gha_deploy.pub >> ~/.ssh/authorized_keys     # allow this key to log in as deploy
cat ~/.ssh/gha_deploy                                   # copy the PRIVATE key — used once below
```

In GitHub → repo → Settings → Secrets and variables → Actions, add:
| Secret            | Value                                                     |
|-------------------|-----------------------------------------------------------|
| `VPS_HOST`        | your VPS IP                                               |
| `VPS_USER`        | `deploy`                                                  |
| `VPS_SSH_KEY`     | paste the private key from above                          |
| `GHCR_PAT`        | GitHub PAT with `read:packages` scope                     |

Now every push to `main` triggers CI → build → push image to GHCR → SSH into VPS → `docker compose pull && up -d` → health check.

## Step 14 — Verify end-to-end

- [ ] `https://shopos.example.com` loads with a valid cert
- [ ] Signup flow works; you receive the welcome email (or see it logged for dev transport)
- [ ] Super-admin can log in at `/admin` with the seeded email
- [ ] `curl -sI https://shopos.example.com/health` → 200
- [ ] Push a trivial commit to `main` → new deploy lands on VPS within 5 min
- [ ] `nmap -Pn VPS_IP` shows only 22/80/443 open
- [ ] `ssh root@VPS_IP` is refused (key + password both)
- [ ] `sudo fail2ban-client status sshd` shows jail active
- [ ] Nightly backup file appears in `/var/backups/shopos/`

---

## Maintenance cheat-sheet

```bash
# Tail logs
docker compose -f infra/docker/docker-compose.yml logs -f web worker

# Restart the app
docker compose -f infra/docker/docker-compose.yml restart web worker

# Open a psql prompt
docker compose -f infra/docker/docker-compose.yml exec postgres psql -U shopos shopos_prod

# Run a one-off migration after pulling new code
docker compose -f infra/docker/docker-compose.yml exec web pnpm db:migrate deploy

# Free some disk
docker system prune -af --volumes    # careful — won't touch named volumes
```

---

## Appendix A — Generating an SSH keypair on Windows

PowerShell:
```powershell
ssh-keygen -t ed25519 -C "you@example.com"
# Accept the default path (~/.ssh/id_ed25519). Set a passphrase.
type $env:USERPROFILE\.ssh\id_ed25519.pub   # the public half to copy up to the VPS
```

## Appendix B — If something goes wrong

| Symptom | First thing to check |
|--------|---------------------|
| `ssh: connection refused` | UFW dropped port 22 — log in via Hostinger web console and `sudo ufw allow 22/tcp` |
| Caddy can't get a cert | DNS not propagated yet, or ports 80/443 not open; check `docker compose logs caddy` |
| `502 Bad Gateway` from Caddy | The `web` container is unhealthy — `docker compose logs web` |
| Postgres refusing connection | Wait 20s on first start; afterwards check `docker compose logs postgres` |
| RLS tests failing locally | Did you run `pnpm db:rls:apply` after the migration? |
| Disk full | `docker system prune -af` and check `/var/backups/shopos` retention |

## Appendix C — Rolling back a bad deploy

```bash
cd /opt/shopos
git log --oneline -5                      # find the last good SHA
docker pull ghcr.io/<your-user>/shopos:<good-sha>
# Edit docker-compose.yml image tags to <good-sha>, then:
docker compose -f infra/docker/docker-compose.yml up -d
```

Or just revert the commit on `main` and let CI redeploy.
