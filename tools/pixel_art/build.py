"""Regenerates the whole transparent pixel-art asset pack into ../../public/assets."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pxlib import *
import gen_chars as C, gen_buildings as B, gen_nature as N, gen_ground as G, gen_items as I
import gen_people as P, gen_village as V

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "assets"))
written = []


def road_lamp():
    """Small bamboo-and-wood lantern for the village road (16x32 px)."""
    from PIL import Image, ImageDraw
    im = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((4, 28, 11, 30), fill=(65, 42, 27, 255))
    d.rectangle((5, 28, 10, 29), fill=(184, 132, 80, 255))
    d.rectangle((7, 14, 8, 29), fill=(94, 59, 34, 255))
    d.rectangle((6, 15, 6, 27), fill=(184, 132, 80, 255))
    d.rectangle((3, 6, 12, 15), fill=(42, 26, 20, 255))
    d.rectangle((4, 7, 11, 14), fill=(201, 153, 63, 255))
    d.rectangle((5, 8, 10, 13), fill=(255, 217, 120, 255))
    d.rectangle((6, 9, 9, 12), fill=(255, 241, 207, 255))
    d.rectangle((2, 5, 13, 7), fill=(94, 59, 34, 255))
    d.rectangle((4, 3, 11, 4), fill=(184, 132, 80, 255))
    d.rectangle((6, 2, 9, 3), fill=(94, 59, 34, 255))
    d.point((7, 1), fill=(230, 184, 74, 255))
    d.rectangle((3, 14, 12, 15), fill=(94, 59, 34, 255))
    d.rectangle((6, 16, 9, 17), fill=(201, 153, 63, 255))
    d.point((4, 9), fill=(255, 241, 207, 255))
    d.point((11, 10), fill=(255, 217, 120, 255))
    return im


def road_lamp_glow():
    """Soft 128px amber radial halo used by the nighttime road lanterns."""
    from PIL import Image
    size = 128
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = image.load()
    cx = cy = (size - 1) / 2
    radius = size * 0.48
    for y in range(size):
        for x in range(size):
            distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = max(0.0, 1.0 - distance / radius)
            # Broad, soft falloff: warm amber close to the source, transparent at edge.
            alpha = int(88 * (t ** 2.15))
            if alpha > 0:
                warmth = min(1.0, t * 1.25)
                r = int(255)
                g = int(176 + 48 * warmth)
                b = int(76 + 40 * warmth)
                pixels[x, y] = (r, g, b, alpha)
    return image


def save(spr, rel):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    spr.save(path)
    written.append(rel)


def main():
    # ---- characters (portrait = idle front frame, *_sheet = 4x3 walk sheet of 16x26 frames)
    for name, pal in P.people_pals().items():
        sh = P.person_sheet2(name, pal)
        save(sh, f"characters/{name}_sheet.png")
        save(sh.crop_box(0, 0, 16, 26), f"characters/{name}.png")
    # ---- animals
    save(sheet([C.chicken(i) for i in range(3)]), "animals/chicken_sheet.png"); save(C.chicken(0), "animals/chicken.png")
    save(sheet([C.duck(i) for i in range(3)]), "animals/duck_sheet.png"); save(C.duck(0), "animals/duck.png")
    save(sheet([C.buffalo(i) for i in range(4)]), "animals/water_buffalo_sheet.png"); save(C.buffalo(0), "animals/water_buffalo.png")
    # ---- buildings
    save(B.stilt_house(88, 80, Ramp("#b88450"), "thatch", Ramp("#c9993f"), 1, flower=True), "buildings/player_home.png")
    save(B.stilt_house(66, 66, Ramp("#8fb07a"), "corr", Ramp("#4f86a8"), 2), "buildings/ma_thiri_home.png")
    save(B.stilt_house(64, 64, Ramp("#c07c58"), "thatch", Ramp("#9a7a3a"), 3, jar=False), "buildings/ko_aung_home.png")
    save(B.stilt_house(64, 64, Ramp("#c07c58"), "thatch", Ramp("#9a7a3a"), 4), "buildings/stilt_house_01.png")
    save(B.stilt_house(66, 66, Ramp("#a8b88a"), "corr", Ramp("#b0502c"), 5), "buildings/stilt_house_02.png")
    save(B.stilt_house(64, 64, Ramp("#b88450"), "thatch", Ramp("#b98a3a"), 6), "buildings/still_house_01.png")
    save(B.monastery(), "buildings/village_monastery.png")
    save(B.zedi(), "buildings/golden_pagoda.png")
    save(B.granary(), "buildings/rice_granary.png")
    save(B.market_stall(), "buildings/market_stall.png")
    save(B.shrine(), "buildings/small_shrine.png")
    save(B.open_barn(56, 5), "buildings/open_barn_01.png"); save(B.open_barn(46, 6, False), "buildings/open_barn_02.png")
    # ---- vegetation
    save(N.toddy_palm(48, 74, 1), "vegetation/palm_tree_tall.png")
    save(N.toddy_palm(38, 52, 2, lean=-1), "vegetation/palm_tree_small.png")
    save(N.mango_tree(50, 62, 3), "vegetation/fruit_tree_round.png")
    save(N.mango_tree(58, 64, 4, fruit=False), "vegetation/fruit_tree_large.png")
    save(N.banana_plant(48, 48), "vegetation/banana_plant.png")
    save(N.bamboo_clump(), "vegetation/bamboo_clump.png")
    # ---- decorations / props
    save(N.veg_bed(), "decorations/raised_vegetable_bed.png")
    save(N.bamboo_fence(), "decorations/bamboo_fence_segment.png")
    save(N.fence_h_unit(), "decorations/fence_h.png"); save(N.fence_v_unit(), "decorations/fence_v.png")
    save(N.bamboo_planter(), "decorations/bamboo_planter.png")
    save(N.village_sign(), "decorations/village_sign.png")
    save(N.water_jar(), "decorations/water_jar.png")
    save(N.drying_mat(), "decorations/rice_drying_mat.png")
    # ---- village props (v3)
    save(road_lamp(), "village/road_lamp.png")
    save(road_lamp_glow(), "village/road_lamp_glow.png")
    for name, fn in [("water_pot_stand", V.water_pot_stand), ("village_well", V.village_well), ("ox_cart", V.ox_cart),
                     ("firewood_stack", V.firewood_stack), ("rice_sacks", V.rice_sacks), ("bench", V.bench),
                     ("signpost", V.signpost), ("shrub", V.shrub), ("laundry_line", V.laundry_line),
                     ("wall_h", V.wall_h), ("wall_v", V.wall_v), ("gate_pillar", V.gate_pillar), ("produce_crates", V.produce_crates),
                     ("reeds", V.reeds), ("leaf_pile", V.leaf_pile), ("trough", V.trough),
                     ("monastery_bell", V.monastery_bell), ("chicken_coop", V.chicken_coop), ("hay_bale", V.hay_bale)]:
        save(fn(), f"village/{name}.png")
    save(V.flower_bush("#ff7aa8", seed=1), "village/flower_bush_pink.png")
    save(V.flower_bush("#ffb12e", seed=2), "village/flower_bush_yellow.png")
    save(V.flower_bush("#ffffff", seed=3), "village/flower_bush_white.png")
    save(V.boulder(24, 18, 1), "village/boulder_small.png"); save(V.boulder(36, 24, 2), "village/boulder_large.png")
    for name, fn in [("bag", V.ic_bag), ("help", V.ic_question), ("hand", V.ic_hand),
                     ("talk", V.ic_speech), ("person", V.ic_person), ("bed", V.ic_bed), ("action", V.ic_action),
                     ("sun", V.ic_sun), ("moon", V.ic_moon), ("seed", V.ic_seed), ("globe", V.ic_globe),
                     ("expand", V.ic_expand), ("note", V.ic_note), ("sprout", V.ic_sprout)]:
        save(fn(), f"ui/icon_{name}.png")
    save(V.ic_note(True), "ui/icon_note_off.png"); save(V.talk_bubble(), "ui/talk_bubble.png"); save(V.key_e(), "ui/key_e.png")
    save(V.cooking_hearth(), "village/cooking_hearth.png")
    save(I.icon_rice_grain(), "ui/icon_rice.png")
    # ---- agriculture
    save(N.haystack(), "agriculture/haystack.png")
    save(N.rice_bundle(), "agriculture/rice_bundle.png")
    save(N.scarecrow(), "agriculture/scarecrow.png")
    save(N.basket_item(36, 30, "chili"), "agriculture/chili_basket.png")
    save(N.basket_item(36, 30, "tomato"), "agriculture/tomato_basket.png")
    save(N.basket_item(36, 30, "bean"), "agriculture/green_bean_basket.png")
    save(I.icon_rice_bowl(), "agriculture/rice_bowl.png")
    for i in range(3): save(I.rice_clump(i), f"agriculture/young_rice_plant_0{i + 1}.png")
    for st in range(4): save(I.crop(st), f"agriculture/rice_stage_{st}.png")
    save(I.icon_rice_grain(), "agriculture/rice_grain.png")
    save(I.fish_icon("silver_barb"), "agriculture/fish_silver_barb.png")
    save(I.fish_icon("catfish"), "agriculture/fish_catfish.png")
    save(I.fish_icon("golden_carp"), "agriculture/fish_golden_carp.png")
    save(I.meal_icon("fish_rice"), "agriculture/meal_fish_rice.png")
    save(I.meal_icon("mohinga"), "agriculture/meal_mohinga.png")
    save(I.meal_icon("fish_curry"), "agriculture/meal_fish_curry.png")
    # ---- water
    save(N.lotus_pond(), "water/lotus_pond.png"); save(N.bridge(), "water/wooden_bridge_asset.png")
    save(N.stream_section(), "water/stream_section.png"); save(N.canal_vertical(), "water/canal_vertical.png"); save(N.river_bend(), "water/river_bend.png")
    save(sheet([G.tile_water(i) for i in range(4)]), "water/water_tile_sheet.png")
    # ---- resources / tools / ui
    save(I.icon_hoe(), "tools/hoe.png"); save(I.icon_seed_bag(), "tools/rice_seed_bag.png")
    save(I.icon_watering_can(), "tools/watering_can.png"); save(I.icon_sickle(), "tools/sickle.png")
    save(I.icon_fishing_rod(), "tools/fishing_rod.png")
    save(I.icon_coin(), "ui/coin.png"); save(I.ui_slot(False), "ui/slot.png"); save(I.ui_slot(True), "ui/slot_selected.png"); save(I.ui_panel(), "ui/panel.png")
    # ---- fx
    save(I.fx_dust(), "fx/dust.png"); save(I.fx_splash(), "fx/splash.png"); save(I.fx_sparkle(), "fx/sparkle.png"); save(I.water_glint(), "fx/water_glint.png")
    save(I.butterfly(hx("#ffd84a"), hx("#ff9a2e")), "fx/butterfly_yellow.png"); save(I.butterfly(hx("#ffffff"), hx("#8ac8ff")), "fx/butterfly_white.png")
    # ---- terrain
    save(G.build_ground(), "terrain/village_ground_base.png")
    for name, t in G.tile_misc().items():
        if t is not None: save(t, f"terrain/{name}.png")

    manifest = []
    for rel in sorted(set(written)):
        im = Image.open(os.path.join(OUT, rel))
        manifest.append({"path": rel, "width": im.width, "height": im.height, "mode": im.mode,
                         "bytes": os.path.getsize(os.path.join(OUT, rel))})
    with open(os.path.join(OUT, "asset-manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"wrote {len(manifest)} assets to {OUT}")


if __name__ == "__main__":
    main()
