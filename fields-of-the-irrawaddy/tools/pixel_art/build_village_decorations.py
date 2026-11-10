"""Generate clear, Burmese countryside pixel-art landmarks and path overlays.

All artwork is deliberately drawn on a small pixel grid without antialiasing.
Run from the project root:
    python tools/pixel_art/build_village_decorations.py
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"

# Palette shared with the existing warm earth / lush green art direction.
INK = "#39271d"
WOOD_D = "#68442b"
WOOD = "#9a693d"
WOOD_L = "#c89558"
STRAW_D = "#9a7139"
STRAW = "#d1a54f"
STRAW_L = "#f0cf79"
STONE_D = "#56645a"
STONE = "#889184"
STONE_L = "#c5c6a9"
WATER_D = "#286d86"
WATER = "#4ba6c0"
WATER_L = "#9adddf"
LEAF_D = "#397442"
LEAF = "#68a64f"
LEAF_L = "#a9cf70"
CLOTH_RED = "#ad5142"
CLOTH_BLUE = "#487d9b"
CLOTH_CREAM = "#e9d9b8"


def new(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))


def rect(d, box, fill, outline=INK):
    d.rectangle(box, fill=fill, outline=outline)


def save(img, relative):
    path = ASSETS / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path


def make_well():
    im = new((36, 34)); d = ImageDraw.Draw(im)
    # Ground shadow and stone well ring.
    d.ellipse((4, 27, 32, 32), fill=(40, 34, 25, 70))
    rect(d, (5, 16, 30, 28), STONE_D)
    d.rectangle((7, 17, 28, 26), fill=STONE)
    for x in (9, 15, 21, 27):
        d.point((x, 19), fill=STONE_L)
        d.point((x+1, 24), fill=STONE_D)
    d.rectangle((8, 14, 27, 20), fill=WATER_D, outline=INK)
    d.line((9, 15, 26, 15), fill=WATER_L)
    # Raised stone rim.
    rect(d, (4, 12, 31, 17), STONE_D)
    d.line((6, 13, 29, 13), fill=STONE_L)
    d.line((6, 16, 29, 16), fill=STONE)
    # Two timber posts and crossbeam with a simple rope and bucket.
    rect(d, (6, 3, 9, 14), WOOD_D)
    d.rectangle((7, 4, 8, 12), fill=WOOD_L)
    rect(d, (27, 3, 30, 14), WOOD_D)
    d.rectangle((28, 4, 29, 12), fill=WOOD_L)
    rect(d, (5, 1, 31, 4), WOOD_D)
    d.line((7, 2, 29, 2), fill=WOOD_L)
    d.line((18, 4, 18, 12), fill=INK)
    d.line((18, 11, 20, 15), fill=STRAW)
    rect(d, (17, 14, 22, 19), WOOD_D)
    d.rectangle((18, 15, 21, 17), fill=WOOD_L)
    d.point((19, 15), fill=WATER_L)
    return save(im, "decorations/village_well.png")


def make_drying_mat():
    im = new((56, 28)); d = ImageDraw.Draw(im)
    d.ellipse((2, 23, 53, 27), fill=(42, 32, 22, 65))
    # Large woven reed mat.
    rect(d, (2, 5, 53, 23), WOOD_D)
    d.rectangle((4, 7, 51, 21), fill=STRAW)
    for y in range(8, 22, 3):
        d.line((4, y, 51, y), fill=WOOD_L)
    for x in range(6, 52, 5):
        d.line((x, 7, x, 21), fill=STRAW_L)
    # Rice grains are clearly visible as golden kernels on the mat.
    for x, y in [(9,10),(15,13),(21,9),(27,14),(33,10),(39,15),(45,11),
                 (12,18),(19,17),(25,11),(31,18),(37,8),(43,18),(48,15)]:
        d.line((x, y, x+2, y-1), fill="#fff0a1")
        d.point((x, y+1), fill=STRAW_D)
    # Two little securing pegs.
    d.rectangle((3, 4, 5, 7), fill=WOOD_D)
    d.rectangle((50, 4, 52, 7), fill=WOOD_D)
    return save(im, "decorations/rice_drying_mat.png")


def make_irrigation_channel():
    im = new((80, 20)); d = ImageDraw.Draw(im)
    d.ellipse((1, 15, 78, 19), fill=(37, 30, 20, 45))
    # Earthen banks and dark channel bed.
    d.polygon([(1,5),(8,2),(72,2),(79,5),(79,16),(1,16)], fill=WOOD_D)
    d.polygon([(4,6),(10,4),(70,4),(76,6),(76,13),(4,13)], fill=STRAW_D)
    d.rectangle((7,7,73,13), fill=WATER_D)
    d.line((8,8,71,8), fill=WATER_L)
    d.line((12,11,25,11), fill=WATER)
    d.line((35,10,48,10), fill=WATER_L)
    d.line((57,12,70,12), fill=WATER)
    # Visible stone / bamboo retaining edges.
    for x in range(4, 77, 8):
        d.rectangle((x,3,x+3,5), fill=WOOD_L)
        d.rectangle((x,14,x+3,16), fill=WOOD)
    # Little rice seedlings mark the channel as farm irrigation.
    for x in (16, 62):
        d.line((x,4,x-2,0), fill=LEAF_D)
        d.line((x,4,x+2,0), fill=LEAF)
        d.point((x,3), fill=LEAF_L)
    return save(im, "decorations/irrigation_channel.png")


def make_washing_platform():
    im = new((48, 28)); d = ImageDraw.Draw(im)
    d.ellipse((2,22,45,27), fill=(40,31,23,55))
    # Two low washing stones beside a narrow blue wash channel.
    rect(d, (2, 12, 45, 22), STONE_D)
    d.rectangle((4,13,43,19), fill=STONE)
    d.line((5,14,42,14), fill=STONE_L)
    d.rectangle((8,17,39,19), fill=WATER_D)
    d.line((10,17,35,17), fill=WATER_L)
    # Folded longyi cloth on the flat rock.
    rect(d, (9,6,25,13), CLOTH_BLUE)
    d.rectangle((11,7,23,11), fill="#6b9bb3")
    d.line((11,9,23,9), fill=CLOTH_CREAM)
    d.rectangle((17,7,18,12), fill=CLOTH_RED)
    # Soap / wash bowl.
    d.ellipse((30,8,40,15), fill=INK)
    d.ellipse((31,8,39,13), fill="#8cb8ba")
    d.line((32,9,37,9), fill=WATER_L)
    return save(im, "decorations/washing_platform.png")


def make_clothesline():
    im = new((58, 34)); d = ImageDraw.Draw(im)
    d.ellipse((3,29,55,33), fill=(35,29,21,55))
    # Bamboo uprights and taut line.
    rect(d, (4, 4, 7, 29), WOOD_D); d.line((5,5,5,27), fill=WOOD_L)
    rect(d, (50, 4, 53, 29), WOOD_D); d.line((51,5,51,27), fill=WOOD_L)
    d.line((5,7,52,7), fill=INK)
    d.line((6,6,51,6), fill=STRAW_L)
    # Three unmistakable drying garments: blouse and two longyi cloths.
    d.line((15,7,15,11), fill=INK)
    rect(d, (11,11,19,22), CLOTH_CREAM)
    d.rectangle((12,12,18,20), fill="#f2e7d1")
    d.line((12,15,18,15), fill=WOOD_L)
    d.line((12,18,18,18), fill=WOOD_L)
    d.line((29,7,29,10), fill=INK)
    rect(d, (25,10,34,25), CLOTH_RED)
    d.line((26,13,33,13), fill="#e78a65")
    d.line((26,18,33,18), fill="#e78a65")
    d.line((26,23,33,23), fill="#e78a65")
    d.line((43,7,43,10), fill=INK)
    rect(d, (39,10,47,24), CLOTH_BLUE)
    d.line((40,14,46,14), fill=CLOTH_CREAM)
    d.line((40,19,46,19), fill=CLOTH_CREAM)
    return save(im, "decorations/bamboo_clothesline.png")


def make_village_sign():
    im = new((34, 34)); d = ImageDraw.Draw(im)
    d.ellipse((5,29,29,33), fill=(35,29,21,55))
    rect(d, (15,18,18,31), WOOD_D)
    d.line((16,20,16,30), fill=WOOD_L)
    rect(d, (2,4,31,21), WOOD_D)
    d.rectangle((4,6,29,18), fill=WOOD_L)
    d.rectangle((6,8,27,16), fill="#e8cf93")
    d.rectangle((8,10,25,14), fill="#7b4d30")
    # Gold pagoda / village emblem (not text, so language remains handled in UI labels).
    d.polygon([(13,14),(14,10),(17,7),(20,10),(21,14)], fill=STRAW_L, outline=INK)
    d.rectangle((15,12,19,14), fill=STRAW)
    d.point((17,6), fill=STRAW_L)
    return save(im, "decorations/village_sign.png")



def make_chicken_coop():
    im = new((42, 32)); d = ImageDraw.Draw(im)
    d.ellipse((2,27,39,31), fill=(39,31,22,65))
    # Low bamboo frame and woven wall.
    rect(d, (5,13,36,27), WOOD_D)
    d.rectangle((7,15,34,25), fill="#b9884e")
    for x in range(9,34,5):
        d.line((x,15,x,25), fill="#d8b36d")
    d.line((7,19,34,19), fill=WOOD)
    # Wide thatched roof and simple front overhang.
    d.polygon([(2,14),(7,5),(20,1),(35,6),(40,14),(35,16),(7,16)], fill=STRAW_D, outline=INK)
    d.polygon([(5,12),(9,6),(20,3),(33,7),(37,12)], fill=STRAW)
    d.line((9,8,32,8), fill=STRAW_L)
    d.line((7,12,35,12), fill=WOOD_L)
    # Dark open coop doorway, perch and straw inside.
    rect(d, (17,18,26,27), INK)
    d.rectangle((19,20,24,26), fill="#30231b")
    d.line((11,25,33,25), fill=WOOD_L)
    d.line((13,27,31,27), fill=STRAW_L)
    d.point((29,21), fill=STRAW_L)
    return save(im, "buildings/chicken_coop.png")


def make_paths_overlay():
    # Ground tile is 720x320; paths are drawn at source resolution then rendered 2x.
    im = new((720, 320)); d = ImageDraw.Draw(im)

    # Short, clearly connected footpaths lead from each doorway to the main road.
    # A dark edge and sandy center make them read as worn village earth tracks.
    paths = [
        [(95, 124), (95, 141)],       # player homestead to main road
        [(190, 111), (190, 141)],     # shared rice granary
        [(348, 74), (348, 141)],      # Ko Aung's house
        [(410, 124), (410, 141)],     # Ma Thiri's house
        [(285, 128), (285, 141)],     # village market stall
        [(614, 123), (614, 141)],     # monastery entrance
        [(82, 148), (82, 190), (60, 202)],  # open gate into chicken yard
        [(112, 140), (112, 170)],     # approach to the community well (from west)
        [(165, 145), (165, 178)],     # clear farm-plot entrance gate
        [(230, 151), (230, 165)],     # footpath to the rice paddy edge
        [(350, 165), (350, 210)],     # narrow track along the paddy's east edge
        [(350, 210), (520, 210)],     # path from paddy to canal bridge lane
        [(520, 210), (520, 258)],     # joins the existing canal crossing
        [(614, 142), (614, 184), (642, 218)],  # monastery to lotus pond
    ]
    for points in paths:
        d.line(points, fill="#765239", width=13, joint="curve")
        d.line(points, fill="#bd9160", width=8, joint="curve")
        # Small, deliberate texture flecks break up the flat path center.
        for px, py in points:
            d.point((px-2, py+2), fill="#d2aa77")
            d.point((px+2, py-1), fill="#98714a")

    # Worn stepping stones make the well and canal access points legible.
    for x, y in [(108,166),(112,172),(116,178),(158,169),(165,175),
                 (226,158),(233,162),(350,185),(350,198),(365,210),
                 (382,210),(399,210),(416,210),(433,210),(450,210),
                 (467,210),(484,210),(501,210),(614,160),(614,174),
                 (624,190),(636,205)]:
        d.rectangle((x, y, x+2, y+1), fill="#c6b18c")
    return save(im, "terrain/village_paths_overlay.png")


def update_manifest(files):
    manifest = ASSETS / "asset-manifest.json"
    try:
        entries = json.loads(manifest.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        entries = []
    by_path = {entry.get("path"): entry for entry in entries if isinstance(entry, dict)}
    for path in files:
        relative = path.relative_to(ASSETS).as_posix()
        with Image.open(path) as image:
            by_path[relative] = {
                "path": relative,
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "bytes": path.stat().st_size,
            }
    manifest.write_text(json.dumps([by_path[k] for k in sorted(by_path)], indent=2), encoding="utf-8")


def main():
    generated = [
        make_well(), make_drying_mat(), make_irrigation_channel(),
        make_washing_platform(), make_clothesline(), make_village_sign(),
        make_chicken_coop(), make_paths_overlay(),
    ]
    update_manifest(generated)
    for path in generated:
        print(f"Created {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
