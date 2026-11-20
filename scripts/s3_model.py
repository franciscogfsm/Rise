"""Review candidates and update an experimental model from explicit local feedback."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from rise import repo  # noqa: E402
from rise.s3_model import CallModel, candidates, source_anchors  # noqa: E402


def read_model(path):
    if not path.exists():
        return CallModel()
    return CallModel({int(key): value for key, value in json.loads(path.read_text(encoding="utf-8")).items()})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--feedback", type=Path, help="JSON list of reviewed file, line and is_s3 boolean values")
    parser.add_argument("--min-score", type=float, default=0.0, help="Only list candidates at or above this score")
    parser.add_argument("--corroborated", action="store_true", help="Only list candidates with matching source structure")
    args = parser.parse_args()
    if not 0.0 <= args.min_score <= 1.0:
        parser.error("--min-score must be between 0 and 1")
    model = read_model(args.model)
    root = args.folder.resolve()
    files = {}
    for path in root.rglob("*"):
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root):
            continue
        name = path.relative_to(root).as_posix()
        if path.suffix in {".py", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"} and repo.wanted(name):
            if path.stat().st_size <= repo.MAX_FILE:
                files[name] = path.read_text(encoding="utf-8", errors="replace")
    locations = {(c.file, c.line): c.features for c in candidates(files)}
    if args.feedback:
        labels = json.loads(args.feedback.read_text(encoding="utf-8-sig"))
        updates = {}
        for label in labels:
            location = (label["file"], label["line"])
            if location not in locations or type(label["is_s3"]) is not bool or location in updates:
                parser.error(f"Expected a unique candidate location and boolean label: {location!r}")
            updates[location] = label["is_s3"]
        for location, is_s3 in updates.items():
            features = locations[location]
            model.update(features, is_s3, rate=0.5 / len(features))
        temporary = args.model.with_suffix(args.model.suffix + ".tmp")
        temporary.write_text(json.dumps(model.weights, separators=(",", ":")), encoding="utf-8")
        temporary.replace(args.model)
        print(json.dumps({"updated": len(updates), "weights": len(model.weights)}))
    else:
        scored = [(file, line, score) for (file, line), features in locations.items()
                  if (score := model.score(features)) >= args.min_score]
        anchors = {}
        if args.corroborated:
            anchors = {file: source_anchors(files[file]) for file in {file for file, _, _ in scored}}
        print(json.dumps([
            {"file": file, "line": line, "score": round(score, 4)}
            for file, line, score in scored
            if not args.corroborated or line in anchors[file]
        ], indent=2))


if __name__ == "__main__":
    main()
