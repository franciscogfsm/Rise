"""Pitch visuals that asset-service stores in object storage. The pitch loads them through RISE."""
from html import escape

from .config import ROOT

FONT = "Geist, 'Segoe UI', Helvetica, Arial, sans-serif"
SOURCE_LINE = "Leaseweb Digital Independence Survey 2026 · 800 senior leaders (UK, US, DE, NL) · survey responses"


def _card(big: str, caption: str, foot: str) -> bytes:
    lines = caption.split("\n")
    text = "".join(
        f'<text x="96" y="{430 + i * 52}" font-family="{FONT}" font-size="38" fill="#42506A">{escape(t)}</text>'
        for i, t in enumerate(lines))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="{escape(big)} {escape(caption)}">
<defs>
<radialGradient id="a" cx=".15" cy=".1" r=".6"><stop offset="0" stop-color="#DCEBFF"/><stop offset="1" stop-color="#F7F8FA" stop-opacity="0"/></radialGradient>
<radialGradient id="b" cx=".9" cy=".5" r=".55"><stop offset="0" stop-color="#E9E4FF"/><stop offset="1" stop-color="#F7F8FA" stop-opacity="0"/></radialGradient>
<radialGradient id="c" cx=".45" cy="1" r=".5"><stop offset="0" stop-color="#C6F0EC"/><stop offset="1" stop-color="#F7F8FA" stop-opacity="0"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
</defs>
<rect width="1200" height="675" fill="#F7F8FA"/><rect width="1200" height="675" fill="url(#a)"/><rect width="1200" height="675" fill="url(#b)"/><rect width="1200" height="675" fill="url(#c)"/>
<rect x="48" y="48" width="1104" height="579" rx="36" fill="url(#g)" stroke="#fff" stroke-width="2"/>
<text x="96" y="360" font-family="{FONT}" font-size="230" font-weight="700" letter-spacing="-9" fill="#121F35">{escape(big)}</text>
{text}
<text x="96" y="585" font-family="'Geist Mono', Consolas, monospace" font-size="20" fill="#42506A">{escape(foot)}</text>
</svg>""".encode()


def assets() -> list[tuple[str, bytes, str, dict]]:
    """(key, bytes, content_type, metadata). One key is non-ASCII on purpose: real apps have them."""
    icon = (ROOT / "web" / "brand" / "rise-icon.svg").read_bytes()
    return [
        ("slides/stat-89.svg", _card("89%", "could not move critical workloads\naway from their largest provider within 3 weeks", SOURCE_LINE),
         "image/svg+xml", {"owner": "pitch", "slide": "problem"}),
        ("slides/stat-79.svg", _card("79%", "expect AI to increase dependence\non a few technology providers", SOURCE_LINE),
         "image/svg+xml", {"owner": "pitch", "slide": "problem"}),
        ("slides/stat-73.svg", _card("73%", "would pay at least 11% more\nfor greater digital independence", SOURCE_LINE),
         "image/svg+xml", {"owner": "pitch", "slide": "problem"}),
        ("slides/independência.svg", _card("RISE", "Built to rise\nwhen clouds fall.", "served through RISE · object storage routing"),
         "image/svg+xml", {"owner": "pitch", "slide": "reveal"}),
        ("brand/rise-icon.svg", icon, "image/svg+xml", {"owner": "brand"}),
    ]
