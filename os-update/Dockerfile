# Distro security updates on top of a pinned upstream image (app unchanged), for
# images upstream hasn't rebuilt yet. Used by docker-compose.yml via build args;
# drop it again once upstream publishes a newer tag.
ARG BASE
FROM ${BASE}
# The base image's own user, restored after the upgrade.
ARG RUN_AS=root
USER root
# pushpin's Fanout repo (fanout.jfrog.io) is no longer signed and breaks apt-get update; the
# Ubuntu repos still carry the security fixes.
RUN grep -rl fanout.jfrog.io /etc/apt/sources.list.d/ 2>/dev/null | xargs -r rm -f; \
    apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
USER ${RUN_AS}
