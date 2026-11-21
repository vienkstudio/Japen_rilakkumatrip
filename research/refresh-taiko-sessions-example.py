r"""Read-only TAIKO-LAB inventory example. stdout JSON; never reserve or infer availability.
Run: python refresh-taiko-sessions-example.py > D:\Coding\日本旅遊\設計規劃\taiko-refresh-new.json
Only use an explicitly chosen output path on D:; do not run redirects to C:.
"""
import concurrent.futures
import datetime
import html
from html.parser import HTMLParser
import json
import re
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

BASE = "https://www.taiko-reserve.com"
BRANCHES = ("aoyama", "akihabara", "kyoto", "umekita", "kobe")
TIME = re.compile(r"(\d{4}-\d{2}-\d{2})\s*/\s*(\d{1,2}:\d{2})[~～〜](\d{1,2}:\d{2})")
class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = None
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.active = [dict(attrs).get("href", ""), []]
    def handle_data(self, text):
        if self.active is not None:
            self.active[1].append(text)
    def handle_endtag(self, tag):
        if tag == "a" and self.active is not None:
            self.links.append((self.active[0], " ".join(self.active[1])))
            self.active = None

def parse_venue(body, branch, source_url, checked_at):
    parser = Links()
    parser.feed(body)
    records = {}
    for href, label in parser.links:
        absolute = urljoin(source_url, html.unescape(href))
        p = urlparse(absolute)
        if p.scheme != "https" or p.netloc != "www.taiko-reserve.com":
            continue
        if not p.path.startswith("/en/events/"):
            continue
        match = TIME.search(re.sub(r"\s+", " ", label))
        if not match:
            continue
        date, start, end = match.groups()
        # Reject malformed values instead of manufacturing a full-day session.
        datetime.date.fromisoformat(date)
        start = datetime.time.fromisoformat(start).strftime("%H:%M")
        end = datetime.time.fromisoformat(end).strftime("%H:%M")
        if end <= start:
            raise ValueError("Unexpected overnight/invalid session; manual review required")
        slug = p.path.rstrip("/").split("/")[-1]
        stable_id = "taiko-reserve:" + slug
        record = dict(id=stable_id, externalId=slug,
                      activityId="culture-taiko-lab-" + branch,
                      branchId="taiko-lab-" + branch, date=date, start=start, end=end,
                      startAt=date+"T"+start+":00+09:00",
                      endAt=date+"T"+end+":00+09:00",
                      timezone="Asia/Tokyo", sourceUrl=BASE+p.path,
                      inventorySourceUrl=source_url, checkedAt=checked_at,
                      publicationStatus="listed", availability="unknown",
                      remainingCapacity=None, totalCapacity=None,
                      doorsOpen=None, lastEntry=None, bookingDeadline=None)
        if stable_id in records and records[stable_id] != record:
            raise ValueError("Conflicting duplicate identifier; manual review required")
        records[stable_id] = record
    if not records:
        raise ValueError("No sessions parsed; preserve prior snapshot and flag source error")
    return list(records.values())

def fetch_branch(branch):
    url = BASE + "/en/venue/taiko-lab-" + branch + "-en/"
    req = Request(url, headers={"User-Agent": "JapanTravelResearchRefresh/1.0",
                                "Accept": "text/html"})
    with urlopen(req, timeout=25) as response:
        if response.status != 200:
            raise ValueError("Unexpected HTTP response")
        body = response.read(3_000_001)
        if len(body) > 3_000_000:
            raise ValueError("HTML unexpectedly large")
        encoding = response.headers.get_content_charset() or "utf-8"
    checked = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat()
    return parse_venue(body.decode(encoding), branch, url, checked)

def main():
    # Small bounded concurrency; no retries/pagination loops, no POST or login.
    results = []
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        tasks = {pool.submit(fetch_branch, b): b for b in BRANCHES}
        for future in concurrent.futures.as_completed(tasks):
            try:
                results.extend(future.result())
            except Exception as exc:
                errors.append({"branchId": "taiko-lab-" + tasks[future],
                               "error": str(exc), "action": "keep_previous_snapshot"})
    results.sort(key=lambda x: (x["startAt"], x["branchId"], x["id"]))
    print(json.dumps({"sessions": results, "errors": errors,
                      "availabilityPolicy": "listed does not mean bookable; missing entries are not cancellations"},
                     ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(2)
if __name__ == "__main__":
    main()
