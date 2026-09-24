#!/usr/bin/env python3
"""
Scrapes today's schedule from intvschedule.com for a fixed set of channels
and writes a JSON file keyed by channel name (matching the "name" field in
channels.json), in the same {start, stop, title} shape the app's epgData
already uses.

Output: tv/intv-epg.json  (relative to repo root when run via GitHub Actions)

NOTE: intvschedule.com only reliably shows *today's* schedule (the ?date=
query param doesn't change the page), so this only ever produces one day's
worth of data. Run this on a schedule (see the accompanying GitHub Actions
workflow) so "today" stays current.

NOTE: intvschedule.com doesn't publish a stated timezone; times are assumed
to be IST (+05:30), which is standard for Indian TV schedule listings. If
the "now playing" in the app looks consistently off by a fixed amount,
that assumption is the first thing to check (change IST_OFFSET below).

This is a best-effort HTML scraper, not an API — if intvschedule.com
changes its page layout, parsing may silently return fewer/no programmes
for some or all channels. Channels that fail to parse are skipped (logged
as a warning), not treated as fatal.
"""

import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Bangla channel name (must match channels.json's "name" field exactly) -> intvschedule.com slug
CHANNEL_MAP = {
    "জি বাংলা এইচডি": "zee-bangla",
    "স্টার জলসা": "star-jalsha",
    "কালার্স বাংলা": "colors-bangla",
    "সান বাংলা": "sun-bangla",
    "সনি আট": "sony-aath",
    "& পিকচার্স এইচডি": "and-pictures",
    "জি বাংলাসোনার": "zee-bangla-cinema",
    "জলসা মুভিজ এইচডি": "jalsha-movies",
    "কালার্স বাংলা সিনেমা": "colors-bangla-cinema",
    "এন্টারটেইন বাংলা": "enterr10-bangla",
    "স্টার প্লাস": "star-plus",
    "জি টিভি": "zee-tv",
    "কালার্স এইচডি": "colors-hd",
    "স্টার ভারত": "star-bharat",
    "& টিভি": "and-tv",
    "সনি ম্যাক্স": "sony-max",
    "সনি সাব": "sony-sab",
    "জি সিনেমা এইচডি": "zee-cinema",
    "জি অ্যাকশন": "zee-action",
    "স্টার গোল্ড": "star-gold",
    "স্টার মুভিজ": "star-movies",
    "সনি পিক্স এইচডি": "sony-pix",
    "এএক্সএন": "axn",
    "বিফোরইউ": "b4u-movies",
    "সনি এন্টারটেইনমেন্ট টেলিভিশন": "sony-entertainment-television",
    "ডিসকোভারি চ্যানেল": "discovery-channel",
    "ন্যাশনাল জিওগ্রাফিক এইচডি": "national-geographic",
    "ন্যাশনাল জিওগ্রাফিক ওয়াইল্ড": "national-geographic-wild",
    "এনিম্যাল প্লেনেট এইচডি": "animal-planet",
    "সনি বিবিসি আর্থ এইচডি": "sony-bbc-earth",
    "টিএলসি এইচডি": "tlc",
    "নিকেলোডিয়ন": "nickelodeon",
    "কার্টুন নেটওয়ার্ক": "cartoon-network",
    "পোগো": "pogo",
    "ডিসকোভারি কিডস্": "discovery-kids",
    "সনি ইয়েহ!": "sony-yay",
    "নাইন এক্স এম": "9xm",
    "বি ফোর ইউ মিউজিক": "b4u-music",
    "ট্রাভেল এক্সপি এইচডি": "travel-xp",
}

BASE_URL = "https://intvschedule.com/channel/{slug}/"
IST_OFFSET = timezone(timedelta(hours=5, minutes=30))  # assumption — see note above
OUTPUT_PATH = "intv-epg.json"  # written at the repo root of whatever branch this runs against (the "tv" branch — see the workflow)
REQUEST_TIMEOUT = 20
REQUEST_DELAY_SEC = 1.5  # be polite to the site between requests

TIME_RANGE_RE = re.compile(
    r'(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)', re.IGNORECASE
)
TAG_RE = re.compile(r'<[^>]+>')
EP_SUFFIX_RE = re.compile(r'\s*Ep\s*\d+\s*$', re.IGNORECASE)
WS_RE = re.compile(r'[ \t]+')


def fetch_html(slug):
    url = BASE_URL.format(slug=slug)
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; DurjoyTV-EPG-Bot/1.0)"})
    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT) as res:
            return res.read().decode("utf-8", errors="replace")
    except (URLError, HTTPError) as e:
        print(f"  ! fetch failed for {slug}: {e}", file=sys.stderr)
        return None


def html_to_lines(html):
    """Strips tags to a list of non-empty visible text lines, in document order."""
    # Drop script/style blocks entirely so their content doesn't leak into the text.
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Turn common block-level tag boundaries into newlines so text doesn't run together.
    html = re.sub(r'</(p|div|h[1-6]|li|tr|br)\s*>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    text = TAG_RE.sub('\n', html)
    import html as html_lib
    text = html_lib.unescape(text)
    lines = [WS_RE.sub(' ', l).strip() for l in text.split('\n')]
    return [l for l in lines if l]


def isolate_schedule_section(lines):
    """Cuts the line list down to just today's schedule block, dropping nav/FAQ/footer noise."""
    start_idx = 0
    end_idx = len(lines)
    for i, l in enumerate(lines):
        if re.match(r'^.*Schedule \(', l):
            start_idx = i + 1
            break
    for i in range(start_idx, len(lines)):
        if lines[i].startswith('Last updated'):
            end_idx = i
            break
        if lines[i].startswith('Frequently Asked Questions'):
            end_idx = i
            break
    return lines[start_idx:end_idx]


def parse_schedule(lines):
    """
    Walks the isolated lines looking for a time-range line, then takes the next
    non-empty line as the title (stripping a trailing "Ep N"). Entries with no
    parseable time or title are skipped.
    """
    entries = []
    i = 0
    while i < len(lines):
        m = TIME_RANGE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        start_str, end_str = m.group(1).upper().replace(' ', ''), m.group(2).upper().replace(' ', '')
        # title is the next line that isn't itself a time range and isn't empty
        j = i + 1
        title = None
        while j < len(lines) and j < i + 6:  # don't scan too far — bail if structure looks off
            if TIME_RANGE_RE.match(lines[j]):
                break
            candidate = lines[j].strip()
            if candidate and candidate.upper() not in ('UPCOMING', 'LIVE', 'ENDED'):
                title = EP_SUFFIX_RE.sub('', candidate).strip()
                break
            j += 1
        if title:
            entries.append((start_str, end_str, title))
        i += 1
    return entries


def to_24h(time_str):
    """'12:00AM' / '01:29AM' / '11:30PM' -> (hour, minute) in 24h."""
    m = re.match(r'(\d{1,2}):(\d{2})(AM|PM)', time_str)
    if not m:
        return None
    h, mnt, ap = int(m.group(1)), int(m.group(2)), m.group(3)
    if ap == 'AM':
        h = 0 if h == 12 else h
    else:
        h = 12 if h == 12 else h + 12
    return h, mnt


def build_channel_programmes(entries, base_date):
    """Converts parsed (start_str, end_str, title) tuples into ISO start/stop pairs,
    handling the midnight-wrap case where a slot's end time is earlier than its start."""
    out = []
    for start_str, end_str, title in entries:
        sh = to_24h(start_str)
        eh = to_24h(end_str)
        if not sh or not eh:
            continue
        start_dt = datetime(base_date.year, base_date.month, base_date.day, sh[0], sh[1], tzinfo=IST_OFFSET)
        stop_dt = datetime(base_date.year, base_date.month, base_date.day, eh[0], eh[1], tzinfo=IST_OFFSET)
        if stop_dt <= start_dt:
            stop_dt += timedelta(days=1)
        out.append({
            "start": start_dt.isoformat(),
            "stop": stop_dt.isoformat(),
            "title": title,
        })
    out.sort(key=lambda p: p["start"])
    return out


def main():
    today = datetime.now(IST_OFFSET).date()
    result = {}
    for name, slug in CHANNEL_MAP.items():
        print(f"Fetching {name} ({slug})...")
        html = fetch_html(slug)
        time.sleep(REQUEST_DELAY_SEC)
        if not html:
            continue
        lines = isolate_schedule_section(html_to_lines(html))
        entries = parse_schedule(lines)
        if not entries:
            print(f"  ! no programmes parsed for {name} — skipping (site layout may have changed, or slug is wrong)", file=sys.stderr)
            continue
        programmes = build_channel_programmes(entries, today)
        result[name] = programmes
        print(f"  ok: {len(programmes)} programmes")

    if not result:
        print("Nothing scraped successfully — leaving existing output file untouched.", file=sys.stderr)
        sys.exit(1)

    import os
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {OUTPUT_PATH} with {len(result)} channels.")


if __name__ == "__main__":
    main()
