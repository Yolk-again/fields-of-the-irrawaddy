"""Build only the monk and village-child sprites without regenerating other art."""
import json
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_npcs import build_special_npcs

ASSET_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "public", "assets")
)

CHARACTER_ROOT = os.path.join(ASSET_ROOT, "characters")
MANIFEST_PATH = os.path.join(ASSET_ROOT, "asset-manifest.json")


def main():
    os.makedirs(CHARACTER_ROOT, exist_ok=True)

    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as file:
            existing_manifest = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        existing_manifest = []

    manifest_by_path = {
        item["path"]: item
        for item in existing_manifest
        if isinstance(item, dict) and isinstance(item.get("path"), str)
    }

    generated = build_special_npcs()

    for name, sprite in generated.items():
        relative_path = f"characters/{name}.png"
        absolute_path = os.path.join(ASSET_ROOT, relative_path)

        sprite.save(absolute_path)

        image = Image.open(absolute_path)

        manifest_by_path[relative_path] = {
            "path": relative_path,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "bytes": os.path.getsize(absolute_path)
        }

    updated_manifest = [
        manifest_by_path[path]
        for path in sorted(manifest_by_path)
    ]

    with open(MANIFEST_PATH, "w", encoding="utf-8") as file:
        json.dump(updated_manifest, file, indent=2)

    print(f"Generated {len(generated)} NPC assets in {CHARACTER_ROOT}")
    print("Existing artwork was left unchanged.")


if __name__ == "__main__":
    main()