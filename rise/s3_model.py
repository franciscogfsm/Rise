"""Experimental local classifier for ambiguous S3 call sites."""
from dataclasses import dataclass
import math
import re
from pathlib import PurePosixPath
from zlib import crc32

from .scan import COMMENT, IMPORT, PY_DEF, detected


CANDIDATE = re.compile(
    r"(?i)\b(?:[a-z_]\w*\.)*(?:\w*(?:object|bucket|version|signedurl|presign)\w*"
    r"|upload_fileobj|upload_file|download_file|paginate|fetch|send|list|delete|copy|upload|all)\s*\("
    r"|\bnew\s+\w*(?:Command|Upload)\s*\("
)
STORAGE = re.compile(r"(?i)s3|knox|minio|backblaze|amazonaws|object[_ -]?storage|presign")
CALL_NAME = re.compile(r"\b(\w+)\s*\(")
CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|_+")
FIELD = re.compile(r"(?i)\b(bucket|key|prefix|versionid|expiresin|body)\s*[:=]")
KNOX_CLIENT = re.compile(r"\b(\w+)\s*=\s*knox\.createClient\s*\(")
LIST_PAGER = re.compile(r"""\b(\w+)\s*=\s*[\w.]+\.get_paginator\(\s*['"]list_objects(?:_v2)?['"]""")
SIGNED_UPLOAD = re.compile(r"""\bfetch\(\s*((?:pre)?signedUrl)\b[^)]{0,240}\bmethod\s*:\s*['"]PUT['"]""", re.IGNORECASE)
POST_FORM = re.compile(r"""\bfetch\(\s*(\w+)\b[^)]{0,240}\bmethod\s*:\s*['"]POST['"]""")
FORM_FIELDS = re.compile(r"\bObject\.entries\(\s*fields\s*\)")


@dataclass(frozen=True)
class Candidate:
    file: str
    line: int
    features: tuple[int, ...]


def candidates(files: dict[str, str]):
    """Generate bounded contextual features without saving or executing source."""
    for path, text in sorted(files.items()):
        suffix = PurePosixPath(path).suffix.lower()
        if suffix not in {".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".py"} or path.endswith(".min.js"):
            continue
        if not STORAGE.search(text):
            continue
        sdk = detected(text)
        lines = text.splitlines()
        for index, line in enumerate(lines):
            if "(" not in line or len(line) > 400 or COMMENT.match(line) or IMPORT.match(line):
                continue
            matches = list(CANDIDATE.finditer(line))
            if not matches:
                continue
            names = {part.lower() for m in matches for name in CALL_NAME.findall(m[0])
                     for part in CAMEL.split(name) if part}
            context = " ".join(lines[max(0, index - 1):index + 2])
            flags = {
                "sdk": sdk,
                "storage-near": bool(STORAGE.search(context)),
                "s3-receiver": bool(re.search(r"(?i)\b(?:s3\w*|b2\w*|bucket|obj)\.", line)),
                "construct": bool(re.search(r"\bnew\s+\w+(?:Command|Upload)\s*\(", line)),
                "decl": bool(PY_DEF.match(line) or re.match(r"\s*(?:async\s+)?function\s", line)),
                "mock": bool(re.search(r"(?i)\bmock\w*\.|\.commandCalls\(|\bassert\b", line)),
                "relative-route": bool(re.search(r"""\bfetch\(\s*['"\x60]/""", line)),
            }
            tokens = ["bias", "language:" + suffix]
            tokens.extend("shape:" + key for key, value in flags.items() if value)
            tokens.extend("call:" + name for name in names)
            tokens.extend("field:" + name.lower() for name in FIELD.findall(context))
            yield Candidate(path, index + 1, tuple(sorted({crc32(t.encode()) % 2048 for t in tokens})))


class CallModel:
    """Sparse logistic regression. Apply updates only to explicitly labelled examples."""

    def __init__(self, weights=None):
        self.weights = dict(weights or {})

    def score(self, features):
        logit = sum(self.weights.get(feature, 0.0) for feature in features)
        return 1 / (1 + math.exp(-max(-35.0, min(35.0, logit))))

    def update(self, features, is_s3: bool, rate: float = 0.35):
        step = rate * (int(is_s3) - self.score(features))
        for feature in features:
            self.weights[feature] = self.weights.get(feature, 0.0) + step


def source_anchors(text: str) -> set[int]:
    """Find structural evidence for experimental suggestions in the same source file."""
    offsets = set()
    for binding in KNOX_CLIENT.finditer(text):
        offsets.update(m.start() for m in re.finditer(
            r"\b" + binding[1] + r"\.(?:list|signedUrl)\s*\(", text, re.ASCII
        ) if m.start() >= binding.end())
    for binding in LIST_PAGER.finditer(text):
        offsets.update(m.start() for m in re.finditer(r"\b" + binding[1] + r"\.paginate\s*\(", text)
                       if m.start() >= binding.end())
    offsets.update(m.start() for m in SIGNED_UPLOAD.finditer(text))
    if "FormData" in text and FORM_FIELDS.search(text) and STORAGE.search(text):
        offsets.update(m.start() for m in POST_FORM.finditer(text))
    return {text.count("\n", 0, offset) + 1 for offset in offsets}
