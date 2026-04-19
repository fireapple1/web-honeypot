# ===== Stage 1: build =====
FROM gradle:8.8-jdk17 AS builder
WORKDIR /build

# Copy Gradle metadata first for better layer caching
COPY settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
COPY gradlew ./
# (gradlew.bat not needed in Linux container)

# Pre-fetch dependencies
RUN gradle --no-daemon dependencies || true

# Copy source and build a runnable distribution
COPY src ./src
RUN gradle --no-daemon installDist

# ===== Stage 2: runtime =====
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the prepared distribution (scripts + libs)
COPY --from=builder /build/build/install/honeypot-api ./

# SQLite DB location (overridden by docker-compose)
ENV DB_PATH=/data/honeypot.db
RUN mkdir -p /data

EXPOSE 8081

CMD ["./bin/honeypot-api"]
