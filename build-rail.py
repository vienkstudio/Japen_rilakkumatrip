from collections import defaultdict
from math import floor
from pathlib import Path
from statistics import mean
import json
import zipfile

site = Path(__file__).resolve().parent
source = site.parent / "資料" / "work" / "culture_maps" / "rail.zip"
destination = site / "dist" / "assets" / "rails"
destination.mkdir(exist_ok=True)
with zipfile.ZipFile(source) as bundle:
    read = lambda suffix: json.load(bundle.open(next(n for n in bundle.namelist() if n.endswith(suffix))))["features"]
    lines = read("_RailroadSection.geojson")
    stops = read("_Station.geojson")

def parts(feature):
    geometry = feature["geometry"]
    return [geometry["coordinates"]] if geometry["type"] == "LineString" else geometry["coordinates"]

def cell(lon, lat):
    return floor(lon * 2), floor(lat * 2)

grid = defaultdict(lambda: {"l": [], "s": []})
for index, feature in enumerate(lines):
    props = feature["properties"]
    for part_index, path in enumerate(parts(feature)):
        x, y = zip(*path)
        min_x, min_y = cell(min(x), min(y))
        max_x, max_y = cell(max(x), max(y))
        points = [[round(lat, 5), round(lon, 5)] for lon, lat in path]
        row = [f"{index}-{part_index}", props["N02_004"], props["N02_003"], points]
        for col in range(min_x, max_x + 1):
            for row_no in range(min_y, max_y + 1):
                grid[col, row_no]["l"].append(row)

stations = {}
for feature in stops:
    props = feature["properties"]
    points = [point for path in parts(feature) for point in path]
    x, y = zip(*points)
    location = [round(mean(y), 5), round(mean(x), 5)]
    key = (props["N02_005"], props["N02_004"], props.get("N02_005g", ""))
    existing = stations.get(key)
    if existing and props["N02_003"] not in existing[3]:
        existing[3].append(props["N02_003"])
    elif not existing:
        stations[key] = [key[0], key[1], location, [props["N02_003"]]]

for station in stations.values():
    lat, lon = station[2]
    grid[cell(lon, lat)]["s"].append(station)
for (x, y), data in grid.items():
    (destination / f"{x}-{y}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
index = [f"{x}-{y}" for x, y in sorted(grid)]
(destination.parent / "rail-grid.js").write_text("window.ATLAS_RAIL_GRID=" + json.dumps(index, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"{len(grid)} rail coverage cells, {len(stations)} station records")

