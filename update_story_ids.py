#!/usr/bin/env python3
import re
from pathlib import Path
import sys

# Reason: Epics occupy MS-1..MS-9. Stories should start at MS-10 and increment globally in epic order.
START_STORY_ID = 10


def main() -> int:
    repo_root = Path(__file__).resolve().parent
    planning_dir = repo_root / "planning"
    if not planning_dir.is_dir():
        print(
            "Error: could not find 'planning' directory next to this script. Run from repo root.",
            file=sys.stderr,
        )
        return 1

    # Reason: Use declared epic number rather than filename sorting to guarantee consistent cross-file ordering.
    epic_files: list[tuple[int, Path, str]] = []
    for path in sorted(planning_dir.glob("EPIC_*.md")):
        text = path.read_text(encoding="utf-8")
        m = re.search(r"\*\*Epic ID\*\*:\s*MS-(\d+)", text)
        if not m:
            continue
        epic_num = int(m.group(1))
        epic_files.append((epic_num, path, text))

    epic_files.sort(key=lambda t: t[0])

    # Only target lines that explicitly set a Story ID metadata field.
    story_pattern = re.compile(r"(\*\*Story ID\*\*:\s*)MS-[A-Za-z0-9\-]+")

    current_id = START_STORY_ID
    total_updates = 0

    for epic_num, path, text in epic_files:

        def repl(match: re.Match) -> str:
            nonlocal current_id, total_updates
            replacement = f"{match.group(1)}MS-{current_id}"
            current_id += 1
            total_updates += 1
            return replacement

        new_text, replacements = story_pattern.subn(repl, text)
        if replacements > 0 and new_text != text:
            path.write_text(new_text, encoding="utf-8")
            print(f"{path.name}: updated {replacements} Story ID(s)")
        else:
            print(f"{path.name}: no Story ID lines updated")

    if total_updates == 0:
        print("No Story ID updates performed.")
    else:
        print(
            f"Done. Assigned through MS-{current_id - 1}. Total updates: {total_updates}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
