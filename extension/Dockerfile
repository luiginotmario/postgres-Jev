FROM postgres:17-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-17-http ca-certificates && rm -rf /var/lib/apt/lists/*
COPY jev.control /usr/share/postgresql/17/extension/jev.control
COPY sql/jev--0.1.0.sql /usr/share/postgresql/17/extension/jev--0.1.0.sql
COPY init.sql /docker-entrypoint-initdb.d/10-jev.sql
