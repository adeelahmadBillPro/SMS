# syntax=docker/dockerfile:1.7
#
# ShopOS backup sidecar — pg_dump + supercronic.
#
# supercronic (https://github.com/aptible/supercronic) is a cron daemon
# that runs as PID 1, logs to stdout, and crashes the container on schedule
# errors — so docker + logging work the way you'd expect. Much nicer than
# plain cron in containers.
#
# Build from this directory:
#   docker build -t shopos/backup -f infra/backup/Dockerfile ./infra/backup
# (Compose does this automatically; context is ../backup relative to
#  infra/docker/docker-compose.yml.)

FROM postgres:16-bookworm

ARG SUPERCRONIC_VERSION=v0.2.29
# TODO(M5+): pin SUPERCRONIC_SHA256 once we have a documented verification
# procedure. Current download is HTTPS from a tagged GitHub release, which
# is sufficient trust for the P0 backup scope.

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates curl awscli tini \
  && curl -fsSLo /usr/local/bin/supercronic \
       "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
  && chmod +x /usr/local/bin/supercronic \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/scripts /var/backups/shopos
COPY pg_dump.sh prune.sh restore-drill.sh /opt/scripts/
RUN chmod +x /opt/scripts/*.sh

# Entrypoint writes a crontab from BACKUP_CRON at container start so the
# schedule can be overridden via env without rebuilding the image.
COPY entrypoint.sh /opt/scripts/entrypoint.sh
RUN chmod +x /opt/scripts/entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/opt/scripts/entrypoint.sh"]
