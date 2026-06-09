#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
IGNORED_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "#")

class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        for name in ("href", "src"):
            value = attributes.get(name)
            if value:
                self.references.append((name, value))


def check_html() -> list[str]:
    errors: list[str] = []
    for html_file in ROOT.rglob("*.html"):
        parser = ReferenceParser()
        parser.feed(html_file.read_text(encoding="utf-8"))
        for attribute, reference in parser.references:
            if reference.startswith(IGNORED_SCHEMES):
                continue
            clean = urlsplit(reference).path
            if not clean:
                continue
            target = (ROOT / clean.lstrip("/")) if reference.startswith("/") else (html_file.parent / clean)
            if not target.resolve().exists():
                errors.append(f"{html_file.relative_to(ROOT)}: missing {attribute} target {reference}")
    return errors


def check_json() -> list[str]:
    errors: list[str] = []
    for json_file in ROOT.rglob("*.json"):
        if "node_modules" in json_file.parts:
            continue
        try:
            json.loads(json_file.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{json_file.relative_to(ROOT)}: invalid JSON: {exc}")
    return errors


def check_javascript() -> list[str]:
    errors: list[str] = []
    for js_file in ROOT.rglob("*.js"):
        if "node_modules" in js_file.parts:
            continue
        result = subprocess.run(
            ["node", "--check", str(js_file)],
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            errors.append(f"{js_file.relative_to(ROOT)}: {result.stderr.strip()}")
    return errors


def check_for_secret_patterns() -> list[str]:
    errors: list[str] = []
    patterns = [
        re.compile(r"sk_(?:test|live)_[A-Za-z0-9]+"),
        re.compile(r'PAYSTACK_SECRET_KEY\s*=\s*["\'][^"\']+["\']'),
    ]
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".zip", ".docx"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in patterns:
            if pattern.search(text):
                errors.append(f"{path.relative_to(ROOT)}: possible committed secret")
    return errors


def main() -> int:
    errors = check_html() + check_json() + check_javascript() + check_for_secret_patterns()
    if errors:
        print("Project checks failed:")
        for error in errors:
            print(f" - {error}")
        return 1
    print("All project checks passed: HTML references, JSON, JavaScript syntax and basic secret scan.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
