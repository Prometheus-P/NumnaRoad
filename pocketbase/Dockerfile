# PocketBase Docker Image
#
# Builds a minimal Alpine-based container with PocketBase.
# Includes migrations and hooks for NumnaRoad.

FROM alpine:3.19

# PocketBase version
ARG PB_VERSION=0.22.0

# Install dependencies
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    tzdata

# Download and install PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

# Create data directory
RUN mkdir -p /pb/pb_data

# Copy migrations and hooks
COPY ./pb_migrations_temp /pb/pb_migrations
COPY ./pb_hooks /pb/pb_hooks
COPY ./collections /pb/collections

# Set working directory
WORKDIR /pb

# Expose PocketBase port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Volume for persistent data
VOLUME ["/pb/pb_data"]

# Run PocketBase
# Note: --encryptionEnv is optional, remove if not using encryption
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
