#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
singbox_to_shadowrocket.py

Fetch sing-box geosite rule-set JSON files from MetaCubeX/meta-rules-dat and
convert them into Shadowrocket-compatible ``.list`` rule-set files.

sing-box JSON  ->  Shadowrocket .list
    domain          -> DOMAIN,<value>
    domain_suffix   -> DOMAIN-SUFFIX,<value>      (leading "." stripped)
    domain_keyword  -> DOMAIN-KEYWORD,<value>
    ip_cidr (v4)    -> IP-CIDR,<value>
    ip_cidr (v6)    -> IP-CIDR6,<value>
    domain_regex    -> skipped (not supported by Shadowrocket rule-sets)

Only the standard library is used, so the script runs on a bare CI runner with
no ``pip install`` step.

Usage:
    # Convert the built-in list of rulesets and write into ./Shadowrocket/ruleset
    python3 singbox_to_shadowrocket.py --out Shadowrocket/ruleset

    # Convert a single local file or URL to stdout
    python3 singbox_to_shadowrocket.py --one openai.json
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# geosite rule-sets to fetch and convert (order preserved in the summary).
RULESETS = [
    "openai",
    "anthropic",
    "google-gemini",
    "perplexity",
    "category-ai-!cn",
    "google-scholar",
    "google",
    "youtube",
    "spotify",
    "telegram",
    "tiktok",
    "twitter",
    "netflix",
    "github",
    "microsoft",
    "apple",
    "cloudflare",
    "alibaba",
    "baidu",
    "tencent",
    "douban",
    "xiaohongshu",
    "douyin",
    "cn",
    "private",
]

# Primary source (jsdelivr CDN) and a raw.githubusercontent fallback.
PRIMARY_URL = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/{name}.json"
FALLBACK_URL = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/{name}.json"

USER_AGENT = "singbox-to-shadowrocket/1.0 (+https://github.com)"
BEIJING_OFFSET = 8 * 3600  # UTC+8


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _as_list(value):
    """sing-box fields may be a single string or a list; normalise to a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _dedupe(seq):
    """Order-preserving de-duplication."""
    seen = set()
    out = []
    for item in seq:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def convert(data):
    """Convert parsed sing-box rule-set JSON into a list of output sections.

    Returns (lines, counts) where ``lines`` is the ordered list of rule lines
    (with blank separators between sections) and ``counts`` is a dict of
    rule-type -> number of rules.
    """
    domains, suffixes, keywords, ipv4, ipv6 = [], [], [], [], []
    regex_skipped = 0

    for rule in data.get("rules", []):
        if not isinstance(rule, dict):
            continue
        domains += _as_list(rule.get("domain"))
        for s in _as_list(rule.get("domain_suffix")):
            suffixes.append(s.lstrip("."))
        keywords += _as_list(rule.get("domain_keyword"))
        for cidr in _as_list(rule.get("ip_cidr")):
            (ipv6 if ":" in cidr else ipv4).append(cidr)
        regex_skipped += len(_as_list(rule.get("domain_regex")))

    domains = _dedupe(domains)
    suffixes = _dedupe(suffixes)
    keywords = _dedupe(keywords)
    ipv4 = _dedupe(ipv4)
    ipv6 = _dedupe(ipv6)

    sections = []
    if domains:
        sections.append([f"DOMAIN,{d}" for d in domains])
    if suffixes:
        sections.append([f"DOMAIN-SUFFIX,{d}" for d in suffixes])
    if keywords:
        sections.append([f"DOMAIN-KEYWORD,{d}" for d in keywords])
    if ipv4:
        sections.append([f"IP-CIDR,{c}" for c in ipv4])
    if ipv6:
        sections.append([f"IP-CIDR6,{c}" for c in ipv6])

    lines = []
    for i, section in enumerate(sections):
        if i > 0:
            lines.append("")  # blank line between rule-type blocks
        lines.extend(section)

    counts = {
        "DOMAIN": len(domains),
        "DOMAIN-SUFFIX": len(suffixes),
        "DOMAIN-KEYWORD": len(keywords),
        "IP-CIDR": len(ipv4),
        "IP-CIDR6": len(ipv6),
        "regex_skipped": regex_skipped,
    }
    return lines, counts


def render(name, source_url, lines, counts):
    """Build the final file text including a comment header."""
    now = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(time.time() + BEIJING_OFFSET))
    summary = ", ".join(
        f"{k}={v}" for k, v in counts.items()
        if k != "regex_skipped" and v > 0
    ) or "empty"
    header = [
        f"# Shadowrocket rule-set: {name}",
        f"# Converted from sing-box: {source_url}",
        f"# Updated: {now} (Beijing / UTC+8)",
        f"# Rules: {summary}",
    ]
    if counts.get("regex_skipped"):
        header.append(f"# Note: skipped {counts['regex_skipped']} domain_regex rule(s) (unsupported by Shadowrocket)")
    body = "\n".join(header + [""] + lines)
    return body.rstrip("\n") + "\n"


def fetch(url, retries=3, backoff=2):
    """Fetch a URL and return decoded text, retrying on transient errors."""
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            # Do not retry on client errors (e.g. 404 missing ruleset); fail fast.
            if 400 <= e.code < 500:
                raise
            last_err = e
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
        if attempt < retries - 1:
            time.sleep(backoff * (attempt + 1))
    raise last_err


def load_json(name):
    """Fetch and parse a ruleset by name, trying primary then fallback URL."""
    primary = PRIMARY_URL.format(name=name)
    try:
        return json.loads(fetch(primary)), primary
    except Exception as e:
        fallback = FALLBACK_URL.format(name=name)
        sys.stderr.write(f"  primary failed ({e}); trying fallback\n")
        return json.loads(fetch(fallback)), fallback


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def run_batch(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    failures = []
    for name in RULESETS:
        try:
            data, source = load_json(name)
            lines, counts = convert(data)
            text = render(name, source, lines, counts)
            path = os.path.join(out_dir, f"{name}.list")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)
            total = counts["DOMAIN"] + counts["DOMAIN-SUFFIX"] + counts["DOMAIN-KEYWORD"] + counts["IP-CIDR"] + counts["IP-CIDR6"]
            print(f"[ok]   {name}.list  ({total} rules)")
        except Exception as e:  # noqa: BLE001 - report and continue
            print(f"[FAIL] {name}: {e}", file=sys.stderr)
            failures.append(name)
    if failures:
        print(f"\n{len(failures)} ruleset(s) failed: {', '.join(failures)}", file=sys.stderr)
        return 1
    print(f"\nDone. {len(RULESETS)} rulesets written to {out_dir}")
    return 0


def run_one(target):
    if target.startswith("http://") or target.startswith("https://"):
        data = json.loads(fetch(target))
        source = target
        name = os.path.splitext(os.path.basename(target))[0]
    else:
        with open(target, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        source = target
        name = os.path.splitext(os.path.basename(target))[0]
    lines, counts = convert(data)
    sys.stdout.write(render(name, source, lines, counts))
    return 0


def main():
    parser = argparse.ArgumentParser(description="Convert sing-box geosite rule-sets to Shadowrocket .list format")
    parser.add_argument("--out", default="Shadowrocket/ruleset", help="output directory for batch mode")
    parser.add_argument("--one", help="convert a single local file or URL to stdout instead of batch mode")
    args = parser.parse_args()

    if args.one:
        return run_one(args.one)
    return run_batch(args.out)


if __name__ == "__main__":
    raise SystemExit(main())
