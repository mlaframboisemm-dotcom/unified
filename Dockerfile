FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install Python3, pip, venv, and precompiled Debian backend libraries for maximum build resilience
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-venv \
      python3-fastapi \
      python3-uvicorn \
      python3-pydantic \
      python3-requests \
      python3-cryptography && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

# Copy built application artifacts and required runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy sovereigns banking hub (including Python backend), config, and fallbacks
COPY --from=builder /app/sovereigns-banking-hub ./sovereigns-banking-hub
COPY --from=builder /app/config ./config
COPY --from=builder /app/etransfers.json ./etransfers.json

# Create Python virtual environment with system-site-packages so Debian precompiled packages are inherited
RUN python3 -m venv --system-site-packages /app/sovereigns-banking-hub/backend/venv && \
    (/app/sovereigns-banking-hub/backend/venv/bin/pip install --no-cache-dir --retries 5 --timeout 30 -r /app/sovereigns-banking-hub/backend/requirements.txt || true)

EXPOSE 10000
CMD ["node", "dist/server.cjs"]
