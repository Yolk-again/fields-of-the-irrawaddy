"""Create selectable female-farmer outfit variants from Ma Thiri's existing sprite art.

Run from the project root with Pillow installed:
    python tools/pixel_art/build_female_player_variants.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CHARACTERS = ROOT / "public" / "assets" / "characters"
SOURCE_SHEET = CHARACTERS / "ma_thiri_sheet.png"
SOURCE_PORTRAIT = CHARACTERS / "ma_thiri.png"

BLOUSE_SOURCE = [
    (246, 161, 180), (205, 129, 142), (148, 88, 95), (255, 183, 202)
]
LONGYI_SOURCE = [
    (47, 143, 160), (32, 113, 133), (16, 75, 96), (65, 166, 181)
]

PALETTES = {
    "green": {
        "blouse": [(207, 222, 168), (160, 190, 121), (102, 132, 74), (225, 235, 190)],
        "longyi": [(63, 143, 88), (42, 106, 63), (20, 71, 44), (128, 184, 112)]
    },
    "blue": {
        "blouse": [(179, 211, 230), (119, 164, 194), (66, 105, 137), (218, 235, 245)],
        "longyi": [(63, 111, 176), (39, 72, 127), (25, 53, 95), (112, 151, 204)]
    },
    "red": {
        "blouse": [(235, 190, 151), (201, 139, 98), (142, 83, 57), (248, 218, 177)],
        "longyi": [(178, 74, 60), (126, 44, 37), (90, 36, 31), (215, 128, 94)]
    },
    "purple": {
        "blouse": [(214, 190, 226), (166, 132, 186), (108, 76, 130), (235, 220, 239)],
        "longyi": [(124, 86, 164), (85, 56, 128), (57, 37, 82), (169, 143, 198)]
    }
}


def recolor(source: Image.Image, mapping: dict[tuple[int, int, int], tuple[int, int, int]]) -> Image.Image:
    result = source.convert("RGBA").copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            replacement = mapping.get((red, green, blue))
            if alpha and replacement:
                pixels[x, y] = (*replacement, alpha)
    return result


def main() -> None:
    source_sheet = Image.open(SOURCE_SHEET).convert("RGBA")
    source_portrait = Image.open(SOURCE_PORTRAIT).convert("RGBA")
    for name, palette in PALETTES.items():
        mapping = dict(zip(BLOUSE_SOURCE, palette["blouse"]))
        mapping.update(dict(zip(LONGYI_SOURCE, palette["longyi"])))
        recolor(source_sheet, mapping).save(CHARACTERS / f"farmer_female_{name}_sheet.png", optimize=True)
        recolor(source_portrait, mapping).save(CHARACTERS / f"farmer_female_{name}.png", optimize=True)


if __name__ == "__main__":
    main()
