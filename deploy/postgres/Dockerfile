# Local-CA-signed TLS for the dev Postgres instance. See ../certs/ (generated
# once by deploy/certs/README.md's steps — not checked into version control).
#
# The cert/key are copied in and chowned at build time (root, inside the
# build stage) rather than bind-mounted from the host, because the official
# postgres image runs as uid 999 internally — a host bind mount would keep
# the host's uid/gid and postgres wouldn't be able to read server.key
# without a host-side `chown 999:999`, which needs sudo. Doing it in the
# Dockerfile avoids that entirely.
FROM postgres:16-alpine

COPY certs/server.crt /etc/postgresql/certs/server.crt
COPY certs/server.key /etc/postgresql/certs/server.key

RUN chown postgres:postgres /etc/postgresql/certs/server.crt /etc/postgresql/certs/server.key \
    && chmod 644 /etc/postgresql/certs/server.crt \
    && chmod 600 /etc/postgresql/certs/server.key
