# One container: RISE + the two simulated S3 providers (moto + Garage). Linux x86_64.
#   docker build -t rise .
#   docker run -p 127.0.0.1:8080:8080 -e OPENROUTER_API_KEY=... rise
FROM python:3.12-slim
ARG GARAGE_VERSION=v1.0.1
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && curl -sfL -o /usr/local/bin/garage "https://garagehq.deuxfleurs.fr/_releases/$GARAGE_VERSION/x86_64-unknown-linux-musl/garage" \
 && chmod +x /usr/local/bin/garage
ENV RISE_VENV=/opt/venv GARAGE_BIN=/usr/local/bin/garage RISE_HOST=0.0.0.0 RISE_PORT=8080 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv && /opt/venv/bin/pip install -q --no-cache-dir -r requirements.txt
COPY . .
RUN rm -f .env && chmod +x scripts/*.sh
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD curl -sf -o /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["bash", "-c", "bash scripts/env.sh && exec bash scripts/run.sh"]
