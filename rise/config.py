"""Runtime configuration from environment variables (a local .env file is loaded if present)."""
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


DATA = Path(env("RISE_DATA_DIR", str(ROOT / ".rise")))
DATA.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class Provider:
    id: str
    name: str
    endpoint: str  # "" means the provider's default public endpoint (real AWS)
    region: str  # the region the provider documents for this endpoint
    bucket: str  # bucket the application uses
    test_bucket: str  # disposable bucket for RISE challenge tests
    access_key: str
    secret_key: str
    simulated: bool

    def describe(self) -> dict:
        """Safe description (no secrets) for the UI, the AI and the proof."""
        return {
            "id": self.id, "name": self.name, "endpoint": self.endpoint or "aws-default",
            "documented_region": self.region, "bucket": self.bucket, "test_bucket": self.test_bucket,
            "simulated": self.simulated, "api": "S3-compatible",
        }


def _provider(prefix: str, pid: str, name: str, endpoint: str, region: str) -> Provider:
    return Provider(
        id=pid,
        name=env(f"{prefix}_NAME", name),
        endpoint=env(f"{prefix}_ENDPOINT", endpoint),
        region=env(f"{prefix}_REGION", region),
        bucket=env(f"{prefix}_BUCKET", "rise-assets"),
        test_bucket=env(f"{prefix}_TEST_BUCKET", "rise-test"),
        access_key=env(f"{prefix}_ACCESS_KEY", "testing"),
        secret_key=env(f"{prefix}_SECRET_KEY", "testing"),
        simulated=env(f"{prefix}_SIMULATED", "1") == "1",
    )


SOURCE = _provider("SOURCE", "source", "Provider A", "http://127.0.0.1:9001", "us-east-1")
DEST = _provider("DEST", "destination", "Provider B · EU", "http://127.0.0.1:3900", "nl-ams-1")

# asset-service shipped with ONE region setting that it reuses for every S3 client.
APP_REGION = env("APP_REGION", "us-east-1")

# Simulated source traffic goes through a reversible network link that RISE can cut.
LINK_PORT = int(env("SOURCE_LINK_PORT", "9101"))
SOURCE_APP_ENDPOINT = f"http://127.0.0.1:{LINK_PORT}" if SOURCE.simulated else SOURCE.endpoint

OPENROUTER_KEY = env("OPENROUTER_API_KEY")
OPENROUTER_MODEL = env("OPENROUTER_MODEL", "z-ai/glm-5.3-flash")
