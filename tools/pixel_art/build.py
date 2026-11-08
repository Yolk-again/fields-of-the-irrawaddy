"""Regenerates the whole transparent pixel-art asset pack into ../../public/assets."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pxlib import *
import gen_chars as C, gen_buildings as B, gen_nature as N, gen_ground as G, gen_items as I

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "assets"))
written = []


def save(spr, rel):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    spr.save(path)
    written.append(rel)


def main():
    # ---- characters (portrait = idle front frame, *_sheet = 4x3 walk sheet of 16x26 frames)
    for name, pal in C.pals().items():
        sh = C.person_sheet(pal)
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
    save(B.workbench(), "buildings/crafting_workbench.png")
    save(B.shrine(), "buildings/small_shrine.png")
    save(B.open_barn(56, 5), "buildings/open_barn_01.png"); save(B.open_barn(46, 6, False), "buildings/open_barn_02.png")
    # ---- vegetation
    save(N.toddy_palm(40, 70, 1), "vegetation/palm_tree_tall.png")
    save(N.toddy_palm(32, 40, 2, lean=-1), "vegetation/palm_tree_small.png")
    save(N.mango_tree(50, 62, 3), "vegetation/fruit_tree_round.png")
    save(N.mango_tree(58, 64, 4, fruit=False), "vegetation/fruit_tree_large.png")
    save(N.banana_plant(), "vegetation/banana_plant.png")
    save(N.bamboo_clump(), "vegetation/bamboo_clump.png")
    # ---- decorations / props
    save(N.veg_bed(), "decorations/raised_vegetable_bed.png")
    save(N.flower_bed(), "decorations/flower_bed.png")
    save(N.potted_row(), "decorations/potted_plants_row.png")
    save(N.irrigation(), "decorations/irrigation_channel.png")
    save(N.bamboo_fence(), "decorations/bamboo_fence_segment.png")
    save(N.fence_h_unit(), "decorations/fence_h.png"); save(N.fence_v_unit(), "decorations/fence_v.png")
    save(N.bamboo_planter(), "decorations/bamboo_planter.png")
    save(N.village_sign(), "decorations/village_sign.png")
    save(N.water_jar(), "decorations/water_jar.png")
    save(N.drying_mat(), "decorations/rice_drying_mat.png")
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
    # ---- water
    save(N.lotus_pond(), "water/lotus_pond.png"); save(N.bridge(), "water/wooden_bridge_asset.png")
    save(N.stream_section(), "water/stream_section.png"); save(N.canal_vertical(), "water/canal_vertical.png"); save(N.river_bend(), "water/river_bend.png")
    save(sheet([G.tile_water(i) for i in range(4)]), "water/water_tile_sheet.png")
    # ---- resources / tools / ui
    save(I.icon_wood(), "resources/wood_bundle.png"); save(I.icon_bamboo(), "resources/bamboo_bundle.png")
    save(I.icon_herbs(), "resources/herb_bunch.png"); save(I.icon_coconut(), "resources/coconut.png")
    save(I.icon_hoe(), "tools/hoe.png"); save(I.icon_seed_bag(), "tools/rice_seed_bag.png")
    save(I.icon_watering_can(), "tools/watering_can.png"); save(I.icon_sickle(), "tools/sickle.png")
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
