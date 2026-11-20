"""Reversible network path between the application and the (simulated) source provider.

Cutting it closes the listening socket and every open connection, so the application
gets "connection refused" — a real network-level loss of access, not a UI flag.
"""
import asyncio
import socket
from urllib.parse import urlparse


class Link:
    def __init__(self, port: int, upstream_url: str):
        u = urlparse(upstream_url)
        self.port, self.up_host, self.up_port = port, u.hostname or "127.0.0.1", u.port or 80
        self.server: asyncio.base_events.Server | None = None
        self.conns: set[asyncio.StreamWriter] = set()

    @property
    def up(self) -> bool:
        return self.server is not None

    async def start(self) -> None:
        if not self.server:
            self.server = await asyncio.start_server(self._handle, "127.0.0.1", self.port)

    async def cut(self) -> None:
        if self.server:
            self.server.close()
            self.server = None
        for w in list(self.conns):
            w.close()
        self.conns.clear()

    async def _handle(self, reader, writer):
        try:
            up_r, up_w = await asyncio.open_connection(self.up_host, self.up_port)
        except OSError:
            writer.close()
            return
        self.conns.update((writer, up_w))

        async def pipe(src, dst):
            try:
                while data := await src.read(65536):
                    dst.write(data)
                    await dst.drain()
            except (OSError, asyncio.IncompleteReadError):
                pass
            finally:
                dst.close()

        await asyncio.gather(pipe(reader, up_w), pipe(up_r, writer))
        self.conns.discard(writer)
        self.conns.discard(up_w)

    def probe(self) -> dict:
        """Open a raw TCP connection to the app-facing endpoint and report what happens."""
        try:
            with socket.create_connection(("127.0.0.1", self.port), timeout=1):
                return {"reachable": True, "result": "TCP connect OK"}
        except OSError as e:
            return {"reachable": False, "result": f"{type(e).__name__}: {e.strerror or e}"}
