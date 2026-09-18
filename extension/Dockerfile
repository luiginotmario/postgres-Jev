FROM postgres:17-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-plpython3-17 && rm -rf /var/lib/apt/lists/*
COPY jev.control jev--0.1.0.sql /usr/share/postgresql/17/extension/
COPY init.sql /docker-entrypoint-initdb.d/01-jev.sql
