"""Recognisable village props + HUD icons (replaces the vague decorations)."""
from pxlib import *
from gen_buildings import TEAK, WOOD, BAMBOO, GOLD, STONE, thatch, planks, posts
from gen_nature import canopy

OUTC = hx("#2a1a14")


def water_pot_stand():
    """Roadside Burmese 'yay-zet': little roofed shelter holding clay drinking-water pots."""
    rnd = random.Random(51)
    s = Spr(38, 40); g = 37
    s.shadow_ellipse(19, g, 16, 3, 70)
    posts(s, [5, 31], 14, g, TEAK)
    planks(s, 3, 28, 32, 4, WOOD, rnd, vertical=False)       # shelf
    s.rect(5, 32, 3, 5, TEAK.m); s.rect(30, 32, 3, 5, TEAK.m)
    c = Ramp("#b46b44")
    for x in (9, 17, 25):
        s.ell(x + 2, 24, 4, 4, c.m); s.ell(x + 1, 23, 2, 2, c.l1); s.hline(x, 20, 5, c.d1); s.hline(x - 1, 20, 7, c.m)
        s.rect(x, 18, 5, 2, hx("#7a4a2a"))      # wooden lid
    s.ell(33, 27, 1, 1, hx("#e8d29b"))            # coconut-shell cup
    thatch(s, 0, 4, 37, 15, 7, Ramp("#c9993f"), rnd, band=2)
    s.outline(-0.72); return s


def village_well():
    s = Spr(30, 36); g = 33
    s.shadow_ellipse(15, g, 12, 3, 70)
    s.ell(15, 27, 11, 5, STONE.d1); s.ell(15, 26, 10, 4, STONE.m)
    s.ell(15, 25, 7, 3, hx("#1f4a68")); s.ell(14, 25, 4, 1, hx("#4aa0bf"))
    s.rect(4, 26, 22, 6, STONE.m); s.hline(4, 26, 22, STONE.l1)
    for x in range(5, 26, 5): s.vline(x, 27, 5, STONE.d1)
    s.hline(4, 31, 22, STONE.d2)
    s.rect(5, 8, 2, 20, TEAK.m); s.rect(23, 8, 2, 20, TEAK.m)
    s.poly([(15, 1), (2, 10), (28, 10)], Ramp("#b0502c").m)
    s.line(15, 1, 2, 10, Ramp("#b0502c").l1); s.hline(2, 10, 27, Ramp("#b0502c").d1)
    s.hline(8, 12, 14, TEAK.d1); s.vline(15, 12, 8, hx("#c8b080")); s.rect(13, 19, 5, 4, WOOD.m); s.hline(13, 19, 5, WOOD.l1)
    s.outline(-0.72); return s


def ox_cart():
    s = Spr(64, 44); g = 40
    s.shadow_ellipse(32, g, 28, 3, 70)
    # hay load + cart bed
    s.ell(30, 16, 17, 7, hx("#d9b45f")); s.ell(27, 13, 10, 4, hx("#ecd283"))
    for i in range(14): s.p(16 + i * 2, 14 + (i % 3), hx("#a8832f"))
    planks(s, 10, 20, 40, 7, WOOD, random.Random(3), vertical=False)
    s.rect(8, 19, 3, 9, TEAK.m); s.rect(49, 19, 3, 9, TEAK.m)
    # yoke pole
    s.line(52, 24, 63, 30, TEAK.m); s.line(52, 25, 63, 31, TEAK.d1); s.rect(61, 28, 3, 5, TEAK.d1)
    # big spoked wheel
    cx, cy = 28, 31
    s.ell(cx, cy, 9, 9, TEAK.d2); s.ell(cx, cy, 8, 8, TEAK.m); s.ell(cx, cy, 6, 6, hx("#3a281c")); s.ell(cx, cy, 5, 5, hx("#5a3b24"))
    for k in range(8):
        a = k * math.pi / 4
        s.line(cx, cy, cx + math.cos(a) * 6, cy + math.sin(a) * 6, TEAK.l1)
    s.ell(cx, cy, 2, 2, hx("#2a1a14")); s.p(cx - 1, cy - 1, TEAK.l2)
    s.outline(-0.72); return s


def firewood_stack():
    s = Spr(26, 18); s.shadow_ellipse(13, 15, 11, 2, 60)
    for row, n in ((0, 5), (1, 4), (2, 3)):
        for i in range(n):
            x = 3 + i * 4 + row * 2; y = 11 - row * 4
            s.ell(x + 2, y + 2, 2, 2, hx("#8a5a34")); s.ell(x + 2, y + 2, 1, 1, hx("#e0b878"))
            s.hline(x + 2, y, 4, hx("#6a4528"))
    s.rect(2, 13, 22, 1, hx("#5a3b24"))
    s.outline(-0.72); return s


def rice_sacks():
    s = Spr(30, 22); s.shadow_ellipse(15, 19, 13, 2, 60)
    b = Ramp("#c9a56a")
    def sack(x, y):
        s.ell(x + 5, y + 6, 6, 5, b.m); s.ell(x + 4, y + 5, 3, 3, b.l1); s.rect(x + 3, y, 5, 3, b.m)
        s.hline(x + 2, y + 2, 7, hx("#b0392c")); s.hline(x + 3, y + 10, 6, b.d1)
        s.p(x + 4, y + 7, b.d1); s.p(x + 6, y + 8, b.d1)
    sack(1, 8); sack(11, 8); sack(20, 8); sack(6, 1); sack(15, 1)
    s.outline(-0.72); return s


def bench():
    s = Spr(30, 18); s.shadow_ellipse(15, 16, 13, 2, 60)
    g = Ramp("#d2b05c")
    s.rect(2, 7, 26, 3, g.m); s.hline(2, 7, 26, g.l2); s.hline(2, 9, 26, g.d1)
    for x in (4, 23): s.rect(x, 10, 3, 6, g.d1); s.vline(x, 10, 6, g.m)
    s.rect(3, 2, 24, 2, g.m); s.hline(3, 2, 24, g.l1)
    for x in (4, 24): s.rect(x, 3, 2, 5, g.d1)
    s.outline(-0.72); return s


def signpost():
    s = Spr(26, 34); s.shadow_ellipse(13, 31, 6, 2, 60)
    s.rect(11, 6, 4, 26, TEAK.m); s.vline(11, 6, 26, TEAK.l1); s.vline(14, 6, 26, TEAK.d1)
    for y, d, c in ((3, 1, "#b88450"), (13, -1, "#9a6a3a")):
        pts = [(2, y), (18, y), (23, y + 4), (18, y + 8), (2, y + 8)] if d == 1 else [(24, y), (8, y), (3, y + 4), (8, y + 8), (24, y + 8)]
        s.poly(pts, hx(c)); s.hline(min(p[0] for p in pts) + 1, y + 1, 16, hx("#d8a868"))
        s.rect(7, y + 3, 10, 2, TEAK.d1)
    s.outline(-0.72); return s


def flower_bush(petal, centre="#fff0a0", seed=1, W=22, H=18):
    rnd = random.Random(seed)
    s = Spr(W, H); s.shadow_ellipse(W // 2, H - 3, W // 2 - 3, 2, 60)
    leaf = Ramp("#3f8f3a")
    s.ell(W // 2, H - 8, W // 2 - 2, 6, leaf.d1); s.ell(W // 2, H - 9, W // 2 - 3, 5, leaf.m); s.ell(W // 2 - 2, H - 11, 4, 2, leaf.l1)
    for _ in range(9):
        x = rnd.randint(4, W - 5); y = rnd.randint(H - 15, H - 7)
        c = hx(petal)
        s.p(x, y, hx(centre)); s.p(x - 1, y, c); s.p(x + 1, y, c); s.p(x, y - 1, c); s.p(x, y + 1, shade(c, -.3))
    s.outline(-0.7); return s


def shrub(W=22, H=16, seed=2):
    rnd = random.Random(seed)
    s = Spr(W, H); s.shadow_ellipse(W // 2, H - 2, W // 2 - 2, 2, 60)
    L = Ramp("#46963a")
    canopy(s, W // 2, H - 7, W // 2 - 1, 6, L, rnd, blobs=5)
    s.outline(-0.72); return s


def laundry_line():
    s = Spr(52, 34); s.shadow_ellipse(26, 31, 22, 2, 55)
    for x in (3, 47): s.rect(x, 6, 3, 26, TEAK.m); s.vline(x, 6, 26, TEAK.l1)
    s.line(5, 7, 48, 9, hx("#d8cfae"))
    def cloth(x, c, ln):
        r = Ramp(c)
        s.rect(x, 9, 8, ln, r.m); s.vline(x, 9, ln, r.l1); s.vline(x + 7, 9, ln, r.d1); s.hline(x, 9 + ln - 1, 8, r.d1)
        for yy in range(12, 9 + ln, 4): s.hline(x + 1, yy, 6, r.d1)
        s.p(x + 1, 8, hx("#f0e0b0")); s.p(x + 6, 8, hx("#f0e0b0"))
    cloth(9, "#3f8f58", 14); cloth(20, "#b24a3c", 13); cloth(31, "#3f6fb0", 15); cloth(42, "#f1ead2", 9)
    s.outline(-0.72); return s


def wall_h():
    s = Spr(16, 16)
    s.rect(0, 4, 16, 10, hx("#f1ead8")); s.hline(0, 4, 16, hx("#ffffff")); s.hline(0, 13, 16, hx("#b8b09a"))
    s.rect(0, 2, 16, 3, hx("#b0392c")); s.hline(0, 2, 16, hx("#d65a4a")); s.hline(0, 4, 16, hx("#7a2a20"))
    for x in (5, 11): s.vline(x, 6, 7, hx("#d8d0b8"))
    s.outline(-0.72); return s


def wall_v():
    s = Spr(8, 16)
    s.rect(0, 0, 8, 16, hx("#f1ead8")); s.vline(0, 0, 16, hx("#ffffff")); s.vline(7, 0, 16, hx("#b8b09a"))
    s.rect(0, 0, 8, 3, hx("#b0392c")); s.hline(0, 0, 8, hx("#d65a4a")); s.hline(0, 2, 8, hx("#7a2a20"))
    s.hline(1, 8, 6, hx("#d8d0b8"))
    s.outline(-0.72); return s


def gate_pillar():
    s = Spr(14, 30); s.shadow_ellipse(7, 27, 6, 2, 60)
    s.rect(2, 8, 10, 20, hx("#f1ead8")); s.vline(2, 8, 20, hx("#ffffff")); s.vline(11, 8, 20, hx("#b8b09a"))
    s.rect(1, 6, 12, 3, hx("#b0392c")); s.hline(1, 6, 12, hx("#d65a4a"))
    s.rect(4, 2, 6, 4, GOLD.m); s.p(6, 0, GOLD.l2); s.p(7, 0, GOLD.m); s.rect(6, 1, 2, 2, GOLD.l1)
    s.rect(3, 14, 8, 2, GOLD.m)
    s.outline(-0.72); return s


def produce_crates():
    s = Spr(34, 18); s.shadow_ellipse(17, 16, 15, 2, 60)
    def crate(x, items):
        s.rect(x, 7, 15, 9, WOOD.m); s.hline(x, 7, 15, WOOD.l1); s.hline(x, 11, 15, WOOD.d1); s.hline(x, 15, 15, WOOD.d2)
        for i, c in enumerate(items):
            s.ell(x + 3 + i * 4, 6, 2, 2, hx(c)); s.p(x + 2 + i * 4, 5, shade(hx(c), .5))
    crate(1, ["#d63b3b", "#e8452e", "#d63b3b"]); crate(18, ["#5ab04a", "#8acd5a", "#5ab04a"])
    s.outline(-0.72); return s


def reeds(W=18, H=26, seed=3):
    rnd = random.Random(seed)
    s = Spr(W, H)
    for x in (3, 6, 9, 12, 15):
        h = rnd.randint(14, 24)
        s.vline(x, H - 2 - h, h, hx("#5fa244")); s.vline(x + 1, H - 2 - h + 3, h - 3, hx("#3f8a3a"))
        if rnd.random() < .6:
            s.rect(x - 0, H - 4 - h, 2, 5, hx("#8a5a34")); s.p(x, H - 5 - h, hx("#a87a4c"))   # cattail
    s.outline(-0.7); return s


def boulder(W, H, seed):
    rnd = random.Random(seed)
    s = Spr(W, H); s.shadow_ellipse(W // 2, H - 2, W // 2 - 1, 2, 60)
    s.ell(W // 2, H - 6, W // 2 - 1, H // 2 - 1, STONE.d1); s.ell(W // 2, H - 7, W // 2 - 2, H // 2 - 2, STONE.m)
    s.ell(W // 2 - 2, H - 9, W // 4, H // 5, STONE.l1)
    for _ in range(3): s.p(rnd.randint(3, W - 4), rnd.randint(H - 10, H - 4), STONE.d2)
    s.outline(-0.72); return s


def leaf_pile():
    s = Spr(18, 10); s.shadow_ellipse(9, 8, 8, 2, 50)
    cols = ["#c8782a", "#e0982e", "#a85a22", "#d6b04a"]
    rnd = random.Random(6)
    s.ell(9, 6, 7, 3, hx("#a85a22"))
    for _ in range(26):
        s.p(rnd.randint(3, 14), rnd.randint(3, 8), hx(rnd.choice(cols)))
    s.outline(-0.7); return s


def trough():
    s = Spr(28, 14); s.shadow_ellipse(14, 12, 12, 2, 60)
    s.rect(1, 4, 26, 7, WOOD.m); s.hline(1, 4, 26, WOOD.l1); s.hline(1, 10, 26, WOOD.d2)
    s.rect(3, 5, 22, 3, hx("#4a96b8")); s.hline(5, 6, 6, hx("#bfe8f4"))
    for x in (2, 24): s.rect(x, 9, 2, 4, TEAK.d1)
    s.outline(-0.72); return s


def monastery_bell():
    s = Spr(24, 34); s.shadow_ellipse(12, 31, 10, 2, 60)
    s.rect(3, 8, 3, 23, TEAK.m); s.rect(18, 8, 3, 23, TEAK.m)
    s.rect(3, 8, 18, 3, TEAK.d1)
    red = Ramp("#b0392c")
    s.poly([(12, 0), (1, 8), (23, 8)], red.m); s.line(12, 0, 1, 8, red.l1); s.hline(1, 8, 23, GOLD.m)
    s.rect(11, 10, 2, 4, hx("#3a2a1a"))
    s.ell(12, 20, 5, 7, GOLD.m); s.ell(10, 18, 2, 4, GOLD.l1); s.hline(7, 26, 10, GOLD.d1); s.rect(10, 27, 4, 2, GOLD.d2)
    s.outline(-0.72); return s


def chicken_coop():
    rnd = random.Random(8)
    s = Spr(40, 34); s.shadow_ellipse(20, 31, 17, 3, 70)
    for x in (5, 31): s.rect(x, 22, 3, 9, TEAK.m)
    planks(s, 4, 11, 30, 14, Ramp("#b88450"), rnd)
    s.rect(14, 15, 9, 10, TEAK.d2); s.rect(15, 16, 7, 9, hx("#1a100c"))
    s.poly([(15, 25), (22, 25), (26, 31), (11, 31)], WOOD.m); s.hline(12, 28, 12, WOOD.d1); s.hline(14, 26, 8, WOOD.d1)
    s.poly([(20, 1), (1, 13), (39, 13)], Ramp("#b0502c").m); s.line(20, 1, 1, 13, Ramp("#b0502c").l1); s.hline(1, 13, 38, Ramp("#b0502c").d1)
    s.rect(28, 17, 6, 6, hx("#5a3b24")); s.p(30, 19, hx("#f0d070")); s.p(32, 20, hx("#f0d070"))
    s.outline(-0.72); return s


def hay_bale():
    s = Spr(22, 16); s.shadow_ellipse(11, 14, 9, 2, 60)
    r = Ramp("#dcb85a")
    s.rect(2, 4, 18, 9, r.m); s.hline(2, 4, 18, r.l1); s.hline(2, 12, 18, r.d1)
    for x in (7, 14): s.vline(x, 4, 9, hx("#9a7a3a"))
    rnd = random.Random(1)
    for _ in range(14): s.p(rnd.randint(3, 18), rnd.randint(5, 11), rnd.choice([r.l2, r.d1]))
    s.outline(-0.72); return s


# ----------------------------- HUD icons -----------------------------
def _icon():
    return Spr(16, 16)


def ic_bag():
    s = _icon(); b = Ramp("#c9a56a")
    s.ell(8, 10, 5, 5, b.m); s.ell(7, 9, 3, 3, b.l1); s.rect(6, 3, 5, 3, b.m); s.hline(5, 6, 7, hx("#b0392c")); s.hline(5, 14, 7, b.d1)
    s.p(7, 10, b.d1); s.p(9, 11, b.d1); s.outline(-.72); return s


def ic_question():
    s = _icon()
    s.ell(8, 8, 6, 6, hx("#3f6fb0")); s.ell(7, 7, 4, 4, hx("#5a8ad0"))
    for p in ((6, 5), (7, 4), (8, 4), (9, 5), (9, 6), (8, 7), (7, 8), (7, 9)): s.p(p[0], p[1], hx("#ffffff"))
    s.p(7, 11, hx("#ffffff")); s.p(7, 12, hx("#ffffff"))
    s.outline(-.72); return s


def ic_hand():
    s = _icon(); k = Ramp("#e0a672")
    s.rect(4, 7, 8, 6, k.m); s.rect(4, 3, 2, 6, k.m); s.rect(7, 2, 2, 6, k.m); s.rect(10, 3, 2, 6, k.m)
    s.rect(3, 9, 2, 3, k.m); s.hline(5, 12, 6, k.d1); s.vline(4, 4, 4, k.l1)
    s.outline(-.72); return s


def ic_speech():
    s = _icon()
    s.rect(2, 3, 12, 8, hx("#fff8e0")); s.hline(2, 3, 12, hx("#ffffff")); s.hline(2, 10, 12, hx("#d8cfae"))
    s.poly([(4, 11), (8, 11), (4, 14)], hx("#fff8e0"))
    for x in (5, 8, 11): s.rect(x, 6, 1, 2, hx("#5a3b24"))
    s.outline(-.72); return s


def ic_person():
    s = _icon(); k = Ramp("#e0a672")
    s.rect(5, 2, 6, 6, k.m); s.hline(5, 2, 6, hx("#2d211c")); s.rect(5, 2, 1, 3, hx("#2d211c")); s.p(6, 5, OUTC); s.p(9, 5, OUTC)
    s.rect(3, 9, 10, 5, hx("#3f8f58")); s.hline(3, 9, 10, hx("#5ab070")); s.hline(3, 13, 10, hx("#27603f"))
    s.outline(-.72); return s


def ic_bed():
    s = _icon()
    s.rect(1, 10, 14, 3, WOOD.m); s.rect(1, 6, 3, 7, WOOD.d1); s.rect(12, 8, 3, 5, WOOD.d1)
    s.rect(3, 7, 9, 4, hx("#f1ead2")); s.rect(3, 7, 4, 3, hx("#ffffff")); s.hline(3, 10, 9, hx("#c8c0a0"))
    s.p(11, 2, hx("#ffe070")); s.p(12, 2, hx("#ffe070")); s.p(12, 3, hx("#ffe070")); s.p(13, 3, hx("#ffe070")); s.p(12, 4, hx("#ffe070"))
    s.outline(-.72); return s


def ic_action():
    s = _icon()
    s.line(3, 13, 9, 7, WOOD.m); s.line(4, 13, 10, 7, WOOD.l1)
    s.rect(9, 3, 5, 3, hx("#aab4ba")); s.hline(9, 3, 5, hx("#e0e6ea"))
    for p in ((2, 4), (4, 2), (13, 10), (14, 12)): s.p(p[0], p[1], hx("#ffe070"))
    s.outline(-.72); return s


def ic_sun():
    s = _icon()
    s.ell(8, 8, 4, 4, hx("#ffd84a")); s.ell(7, 7, 2, 2, hx("#fff3a0"))
    for p in ((8, 1), (8, 14), (1, 8), (14, 8), (3, 3), (12, 3), (3, 12), (12, 12)): s.p(p[0], p[1], hx("#ffb02e")); 
    s.outline(-.6); return s


def ic_moon():
    s = _icon()
    s.ell(8, 8, 6, 6, hx("#f1ead2")); s.ell(11, 6, 5, 5, T)
    s.p(4, 7, hx("#d8cfae")); s.p(5, 10, hx("#d8cfae")); s.p(6, 12, hx("#d8cfae"))
    s.p(13, 12, hx("#ffe070")); s.p(14, 3, hx("#ffe070"))
    s.outline(-.6); return s


def ic_seed():
    s = _icon()
    for x, y in ((5, 5), (9, 4), (7, 9), (11, 9), (4, 10)):
        s.ell(x, y, 2, 1, hx("#e8c860")); s.p(x - 1, y, hx("#fff0a0")); s.p(x + 1, y, hx("#b8982a"))
    s.outline(-.7); return s


def ic_globe():
    s = _icon()
    s.ell(8, 8, 6, 6, hx("#3f8fc0")); s.ell(7, 7, 4, 4, hx("#5aaad8"))
    s.ell(6, 6, 2, 2, hx("#5ab04a")); s.ell(10, 10, 2, 2, hx("#5ab04a")); s.hline(3, 8, 10, hx("#bfe8f4")); s.vline(8, 3, 10, hx("#bfe8f4"))
    s.outline(-.72); return s


def ic_expand():
    s = _icon(); c = hx("#fff1cf")
    for x0, y0, dx, dy in ((2, 2, 1, 1), (13, 2, -1, 1), (2, 13, 1, -1), (13, 13, -1, -1)):
        for i in range(4):
            s.p(x0 + dx * i, y0, c); s.p(x0, y0 + dy * i, c)
    s.outline(-.7); return s


def ic_note(muted=False):
    s = _icon(); c = hx("#fff1cf") if not muted else hx("#8a7a6a")
    s.ell(5, 12, 3, 2, c); s.ell(11, 10, 3, 2, c)
    s.vline(7, 3, 9, c); s.vline(13, 1, 9, c); s.hline(7, 3, 7, c); s.hline(7, 4, 7, c)
    if muted:
        s.line(2, 2, 14, 14, hx("#d65a4a")); s.line(3, 2, 14, 13, hx("#d65a4a"))
    s.outline(-.7); return s


def ic_sprout():
    s = _icon()
    s.rect(7, 7, 2, 7, hx("#5ab04a")); s.ell(5, 6, 3, 2, hx("#6bc04a")); s.ell(11, 5, 3, 2, hx("#8ae06a"))
    s.hline(4, 14, 8, hx("#7a4a2a")); s.outline(-.7); return s


def talk_bubble():
    s = Spr(14, 14)
    s.rect(1, 1, 12, 8, hx("#fff8e0")); s.hline(1, 1, 12, hx("#ffffff")); s.poly([(4, 9), (8, 9), (4, 12)], hx("#fff8e0"))
    for x in (4, 7, 10): s.p(x, 5, hx("#5a3b24"))
    s.outline(-.72); return s


def key_e():
    s = Spr(12, 12)
    s.rect(1, 1, 10, 9, hx("#fff1cf")); s.hline(1, 1, 10, hx("#ffffff")); s.hline(1, 9, 10, hx("#c8b080"))
    for p in ((4, 3), (5, 3), (6, 3), (4, 4), (4, 5), (5, 5), (4, 6), (4, 7), (5, 7), (6, 7)): s.p(p[0], p[1], hx("#2a1a14"))
    s.outline(-.72); return s


def cooking_hearth():
    """Small outdoor Burmese-style cooking hearth with a clay stove and pot."""
    s = Spr(24, 24)
    s.shadow_ellipse(12, 21, 10, 2, 75)
    stone = Ramp("#77756b")
    clay = Ramp("#b65f3c")
    iron = Ramp("#55545a")
    # Low clay stove body, with a dark fire opening facing the player.
    s.ell(12, 17, 9, 4, stone.d1)
    s.ell(12, 16, 8, 3, stone.m)
    s.poly([(4, 15), (20, 15), (18, 21), (6, 21)], clay.d1)
    s.rect(6, 15, 12, 5, clay.m)
    s.hline(7, 15, 10, clay.l1); s.vline(6, 16, 4, clay.l2)
    s.ell(12, 19, 4, 2, hx("#2a1a14"))
    s.p(11, 18, hx("#f08b38")); s.p(12, 17, hx("#ffd36b")); s.p(13, 18, hx("#d74d2c"))
    # Black cooking pot and two small handles.
    s.rect(7, 7, 10, 7, iron.d1)
    s.ell(12, 7, 5, 2, iron.m)
    s.hline(8, 6, 8, hx("#c6c1b3"))
    s.rect(8, 8, 8, 5, iron.m)
    s.vline(8, 9, 3, iron.l1); s.vline(15, 9, 3, iron.d2)
    s.hline(9, 13, 6, iron.d2)
    s.hline(5, 8, 2, iron.d1); s.hline(17, 8, 2, iron.d1)
    # Lid rim / steam.
    s.hline(8, 6, 8, hx("#d6d1c5"))
    s.p(10, 3, hx("#dce7df")); s.p(12, 2, hx("#eef2e5")); s.p(14, 3, hx("#dce7df"))
    s.outline(-0.72)
    return s


# --------------------- Burmese home-interior details ---------------------
def house_bed():
    """Low teak bed with a woven indigo blanket and cotton pillow (64x44)."""
    s = Spr(64, 44)
    s.shadow_ellipse(32, 41, 27, 3, 65)
    s.rect(5, 8, 54, 29, TEAK.d2)
    s.rect(7, 6, 50, 28, TEAK.m)
    s.hline(8, 7, 48, TEAK.l2)
    s.vline(8, 8, 26, TEAK.l1); s.vline(55, 8, 26, TEAK.d1)
    s.rect(10, 10, 44, 22, hx("#e7d8bd"))
    s.rect(12, 12, 14, 17, hx("#f7efd9"))
    s.hline(13, 13, 12, hx("#ffffff")); s.vline(13, 13, 13, hx("#c8bca5"))
    s.rect(29, 11, 23, 20, hx("#3e6177"))
    s.rect(31, 13, 19, 16, hx("#557f92"))
    for x in range(32, 50, 4):
        s.vline(x, 14, 14, hx("#d4ad66"))
    for y in (15, 21, 27): s.hline(31, y, 19, hx("#d4ad66"))
    s.rect(6, 34, 5, 7, TEAK.d1); s.rect(53, 34, 5, 7, TEAK.d1)
    s.hline(6, 39, 6, TEAK.l1); s.hline(53, 39, 6, TEAK.l1)
    s.outline(-0.72)
    return s


def house_lacquer_chest():
    """Small teak storage chest with Burmese red lacquer panels and brass fittings (48x32)."""
    s = Spr(48, 32)
    s.shadow_ellipse(24, 29, 20, 2, 60)
    s.rect(4, 9, 40, 18, TEAK.d2)
    s.rect(5, 8, 38, 17, TEAK.m)
    s.rect(7, 11, 34, 12, hx("#7f3028"))
    s.rect(8, 12, 32, 10, hx("#a64032"))
    s.hline(8, 12, 32, hx("#e0a45b"))
    s.hline(8, 22, 32, hx("#5f251f"))
    for x in (10, 36):
        s.vline(x, 13, 8, hx("#d49b50"))
        s.p(x, 14, hx("#f0ce82")); s.p(x, 20, hx("#70402b"))
    s.rect(21, 13, 6, 8, hx("#d9b25f")); s.rect(22, 14, 4, 5, hx("#f3d98e"))
    s.p(23, 16, hx("#6b4027")); s.p(24, 16, hx("#6b4027"))
    s.rect(8, 25, 5, 3, TEAK.d1); s.rect(35, 25, 5, 3, TEAK.d1)
    s.outline(-0.72)
    return s


def house_woven_mat():
    """Reed floor mat with a red/indigo geometric border (64x28)."""
    s = Spr(64, 28)
    s.shadow_ellipse(32, 25, 29, 2, 55)
    s.rect(2, 3, 60, 21, hx("#7b4b2d"))
    s.rect(4, 4, 56, 18, hx("#c7a36a"))
    s.hline(4, 5, 56, hx("#e5ca8e")); s.hline(4, 21, 56, hx("#7e532f"))
    for x in range(5, 60, 3):
        s.vline(x, 6, 14, hx("#a87a49") if x % 2 else hx("#dbbc7b"))
    for y in (8, 13, 18): s.hline(5, y, 54, hx("#b58a55"))
    for x in (10, 22, 34, 46, 54):
        s.poly([(x, 9), (x + 3, 12), (x, 15), (x - 3, 12)], hx("#8f3d32"))
        s.p(x, 12, hx("#e5c47a"))
    s.outline(-0.72)
    return s


def house_wall_textile():
    """A small woven longyi-style wall textile with traditional diamond motifs (32x28)."""
    s = Spr(32, 28)
    s.rect(2, 1, 28, 25, hx("#542b22"))
    s.rect(4, 2, 24, 22, hx("#9e3d32"))
    s.hline(4, 3, 24, hx("#e0b66c")); s.hline(4, 22, 24, hx("#e0b66c"))
    for x in range(6, 27, 4): s.vline(x, 4, 17, hx("#c76b47"))
    s.poly([(16, 5), (23, 12), (16, 19), (9, 12)], hx("#e3c278"))
    s.poly([(16, 8), (20, 12), (16, 16), (12, 12)], hx("#315b67"))
    s.p(16, 12, hx("#f0d996"))
    for x in (7, 25): s.p(x, 7, hx("#4e7a68")); s.p(x, 17, hx("#4e7a68"))
    s.rect(14, 24, 4, 3, hx("#d9b36d"))
    s.outline(-0.72)
    return s


def house_clay_jar():
    """Terracotta drinking-water jar with a dark mouth and glazed highlights (18x24)."""
    s = Spr(18, 24)
    s.shadow_ellipse(9, 22, 7, 1, 50)
    clay = Ramp("#b56d49")
    s.rect(6, 2, 6, 3, clay.d1)
    s.hline(5, 3, 8, clay.l1); s.hline(6, 5, 6, clay.d1)
    s.ell(9, 13, 7, 8, clay.m)
    s.ell(7, 12, 4, 6, clay.l1)
    s.vline(3, 11, 7, clay.d1); s.vline(14, 11, 7, clay.d2)
    s.hline(4, 19, 10, clay.d1); s.hline(6, 21, 6, clay.d2)
    s.ell(9, 4, 4, 1, hx("#39271e")); s.hline(6, 3, 6, clay.l2)
    s.p(6, 9, clay.l2); s.p(5, 13, clay.l1)
    s.outline(-0.72)
    return s


def house_oil_lamp():
    """Brass-and-clay household oil lamp with a tiny warm flame (14x20)."""
    s = Spr(14, 20)
    s.shadow_ellipse(7, 18, 5, 1, 45)
    brass = Ramp("#c59a4b")
    s.rect(6, 7, 2, 7, brass.d1)
    s.ell(7, 14, 5, 3, brass.m)
    s.ell(7, 13, 4, 2, brass.l1)
    s.hline(3, 15, 9, brass.d2)
    s.p(7, 7, hx("#5a3925")); s.p(7, 6, hx("#f3d27a"))
    s.poly([(7, 1), (5, 4), (6, 6), (8, 6), (9, 4)], hx("#f3a33e"))
    s.p(7, 3, hx("#fff0a0")); s.p(6, 5, hx("#ffe071"))
    s.outline(-0.72)
    return s
