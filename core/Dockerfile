# Placeholder Dockerfile for the C honeypot core.
# Final tuning is the responsibility of the core/ teammate.

FROM gcc:13

# SQLite headers + library for compilation and runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Makefile produces ./honeypot
RUN make

# Shared DB volume mount point (owned by docker-compose)
RUN mkdir -p /data

EXPOSE 8080
CMD ["./honeypot"]
