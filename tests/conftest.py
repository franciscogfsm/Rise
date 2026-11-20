"""Test environment, set before any rise module is imported (rise.config reads env once at import)."""
import os
import socket
import tempfile


def _port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


P_SRC, P_DST, P_LINK = _port(), _port(), _port()
os.environ.update({
    "SOURCE_ENDPOINT": f"http://127.0.0.1:{P_SRC}", "DEST_ENDPOINT": f"http://127.0.0.1:{P_DST}",
    "DEST_REGION": "us-east-1", "SOURCE_LINK_PORT": str(P_LINK),
    # both moto servers share one in-process backend, so bucket names must differ
    "SOURCE_BUCKET": "rise-src", "SOURCE_TEST_BUCKET": "rise-src-test",
    "DEST_BUCKET": "rise-dst", "DEST_TEST_BUCKET": "rise-dst-test",
    "OPENROUTER_API_KEY": "", "RISE_DATA_DIR": tempfile.mkdtemp(),  # no live AI and no real data in tests
})
