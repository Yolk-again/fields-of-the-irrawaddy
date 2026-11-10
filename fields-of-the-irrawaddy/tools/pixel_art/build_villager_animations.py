
import json
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from pxlib import Spr, hx, sheet
import gen_chars as C

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSET_ROOT = os.path.join(ROOT, "public", "assets")
CHARACTER_ROOT = os.path.join(ASSET_ROOT, "characters")
MANIFEST_PATH = os.path.join(ASSET_ROOT, "asset-manifest.json")

BASKET_DARK = hx("#69452d")
BASKET = hx("#ad7540")
BASKET_LIGHT = hx("#d8a45c")
WATER = hx("#67b9d1")
WATER_LIGHT = hx("#b5e7e9")
WOOD = hx("#91602f")
WOOD_LIGHT = hx("#c99a51")
METAL = hx("#777d80")
METAL_LIGHT = hx("#c2c5b8")
RICE = hx("#e5c66c")


def ma_market(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ma_thiri"])
    bob = [0, 1, 0, -1][frame]
    x = 10
    y = 15 + bob
    sprite.rect(x, y, 5, 5, BASKET_DARK)
    sprite.rect(x + 1, y + 1, 3, 3, BASKET)
    sprite.hline(x + 1, y + 2, 3, BASKET_LIGHT)
    sprite.line(x + 1, y, x + 2, y - 2, BASKET_DARK)
    sprite.line(x + 2, y - 2, x + 4, y, BASKET_DARK)
    sprite.p(x + 2, y + 3, BASKET_DARK)
    return sprite


def ma_water(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ma_thiri"])
    bob = [0, 1, 0, -1][frame]
    x = 10
    y = 13 + bob
    sprite.rect(x, y, 4, 4, hx("#547d8a"))
    sprite.rect(x + 1, y + 1, 2, 2, hx("#8bb8b8"))
    sprite.p(x + 2, y + 1, WATER_LIGHT)
    sprite.line(x + 1, y, x + 2, y - 2, METAL_LIGHT)
    sprite.line(x + 2, y - 2, x + 4, y - 1, METAL_LIGHT)
    sprite.line(13, 15 + bob, 15, 17 + bob, WATER)
    drops = [(15, 18), (14, 19), (15, 20), (14, 18)]
    sprite.p(*drops[frame], WATER_LIGHT)
    sprite.p(drops[frame][0] - 1, drops[frame][1] + 1, WATER)
    return sprite


def ma_wash(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ma_thiri"])
    bob = [0, 1, 0, -1][frame]
    sprite.rect(10, 19, 6, 4, hx("#75543d"))
    sprite.rect(11, 19, 4, 2, WATER)
    sprite.hline(11, 19, 4, WATER_LIGHT)
    hand_y = 16 + bob
    sprite.rect(10 + (frame % 2), hand_y, 3, 2, C.SKIN.m)
    sprite.hline(11 + (frame % 2), hand_y, 2, C.SKIN.l1)
    sprite.p(12, 18, WATER_LIGHT if frame in (1, 3) else WATER)
    return sprite


def ko_hoe(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ko_aung"])
    end_x = [4, 6, 8, 6][frame]
    end_y = [23, 22, 23, 22][frame]
    sprite.line(10, 14, end_x, end_y, WOOD)
    sprite.line(10, 14, 9, 13, WOOD_LIGHT)
    sprite.line(end_x - 1, end_y, end_x + 2, end_y - 1, METAL)
    sprite.line(end_x, end_y - 1, end_x + 2, end_y - 2, METAL_LIGHT)
    sprite.p(max(2, end_x - 2), 24, hx("#9b7541"))
    sprite.p(max(3, end_x), 24, hx("#b98b4a"))
    return sprite


def ko_carry(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ko_aung"])
    bob = [0, 1, 0, -1][frame]
    x = 1
    y = 8 + bob
    sprite.rect(x, y, 5, 6, BASKET_DARK)
    sprite.rect(x + 1, y + 1, 3, 4, BASKET)
    sprite.hline(x + 1, y + 2, 3, BASKET_LIGHT)
    sprite.line(x + 1, y, x + 2, y - 2, BASKET_DARK)
    sprite.line(x + 2, y - 2, x + 4, y, BASKET_DARK)
    sprite.p(2, y - 1, RICE)
    sprite.p(3, y - 2, RICE)
    sprite.p(4, y - 1, hx("#a9b963"))
    return sprite


def ko_rest(frame):
    sprite = C.draw_person(frame, "side", C.pals()["ko_aung"])
    cup_y = [13, 11, 10, 12][frame]
    sprite.rect(11, cup_y, 3, 3, hx("#a66a42"))
    sprite.hline(11, cup_y, 3, hx("#dfb77b"))
    sprite.p(14, cup_y + 1, hx("#a66a42"))
    sprite.rect(10, 13, 2, 2, C.SKIN.m)
    if frame in (1, 2):
        sprite.p(13, cup_y - 1, hx("#d9e4df"))
    return sprite


def make_ma_sheet():
    pal = C.pals()["ma_thiri"]
    frames = []

    for direction in ("down", "up", "side"):
        for frame in range(4):
            frames.append(C.draw_person(frame, direction, pal))

    frames.extend(ma_market(frame) for frame in range(4))
    frames.extend(ma_water(frame) for frame in range(4))
    frames.extend(ma_wash(frame) for frame in range(4))

    return sheet(frames, cols=4)


def make_ko_sheet():
    pal = C.pals()["ko_aung"]
    frames = []

    for direction in ("down", "up", "side"):
        for frame in range(4):
            frames.append(C.draw_person(frame, direction, pal))

    frames.extend(ko_hoe(frame) for frame in range(4))
    frames.extend(ko_carry(frame) for frame in range(4))
    frames.extend(ko_rest(frame) for frame in range(4))

    return sheet(frames, cols=4)


def update_manifest(paths):
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as file:
            entries = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        entries = []

    indexed = {
        entry["path"]: entry
        for entry in entries
        if isinstance(entry, dict) and isinstance(entry.get("path"), str)
    }

    for relative_path in paths:
        full_path = os.path.join(ASSET_ROOT, relative_path)

        with Image.open(full_path) as image:
            indexed[relative_path] = {
                "path": relative_path,
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "bytes": os.path.getsize(full_path)
            }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as file:
        json.dump([indexed[key] for key in sorted(indexed)], file, indent=2)


def main():
    os.makedirs(CHARACTER_ROOT, exist_ok=True)

    outputs = {
        "characters/ma_thiri_sheet.png": make_ma_sheet(),
        "characters/ko_aung_sheet.png": make_ko_sheet()
    }

    for relative_path, sprite in outputs.items():
        sprite.save(os.path.join(ASSET_ROOT, relative_path))

    update_manifest(list(outputs))

    print("Updated Ma Thiri and Ko Aung animation sheets.")
    print("Each sheet is 64 x 156 pixels.")
    print("Three walking directions and three activity loops.")
    print("All other assets were left unchanged.")


if __name__ == "__main__":
    main()
