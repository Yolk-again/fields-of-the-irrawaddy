"""Trees, plants, decorations, farm props, water features."""
from pxlib import *
from gen_buildings import TEAK, WOOD, BAMBOO, GOLD, STONE, thatch, planks

LEAF = Ramp("#46963a")
TRUNK = Ramp("#8a5a34")


def canopy(s, cx, cy, rx, ry, ramp, rnd, blobs=14):
    """Scalloped leaf clusters: each blob has a dark underside, mid body and a highlight."""
    blobsl = []
    for i in range(blobs * 2):
        a = rnd.random() * math.tau
        r = math.sqrt(rnd.random()) * 0.82
        bx = cx + math.cos(a) * rx * r
        by = cy + math.sin(a) * ry * r
        blobsl.append((by, bx, rnd.randint(5, 8)))
    blobsl.sort()
    s.ell(cx, cy, rx - 1, ry - 1, ramp.d2)
    for by, bx, br in blobsl:
        dark = ramp.d1 if by > cy else ramp.m
        s.ell(bx + 1, by + 1.5, br, br * 0.8, ramp.d2 if by > cy else ramp.d1)
        s.ell(bx, by, br, br * 0.8, ramp.m if by > cy - ry * 0.2 else ramp.l1)
        s.ell(bx - 1.5, by - 1.5, br * 0.55, br * 0.4, ramp.l1 if by > cy - ry * 0.2 else ramp.l2)
    for _ in range(blobs):
        x = cx + rnd.randint(-int(rx * .6), int(rx * .6)); y = cy + rnd.randint(-int(ry * .6), int(ry * .6))
        if s.get(x, y)[3]:
            s.p(x, y, ramp.d1); s.p(x + 1, y, ramp.d1)


def mango_tree(W, H, seed, fruit=True, lean=0):
    rnd = random.Random(seed)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, W // 2 - 6, 4, 75)
    tx = W // 2
    s.rect(tx - 3, H - 22, 7, 20, TRUNK.m)
    s.vline(tx - 3, H - 22, 20, TRUNK.l1); s.vline(tx + 3, H - 22, 20, TRUNK.d1)
    s.line(tx - 3, H - 4, tx - 6, H - 2, TRUNK.d1); s.line(tx + 3, H - 4, tx + 6, H - 2, TRUNK.d1)
    for y in range(H - 20, H - 4, 3): s.p(tx, y, TRUNK.d2)
    canopy(s, W // 2, H // 2 - 4, W // 2 - 2, H // 2 - 8, LEAF, rnd)
    if fruit:
        for _ in range(7):
            fx = rnd.randint(8, W - 9); fy = rnd.randint(10, H - 26)
            if s.get(fx, fy)[3]:
                s.p(fx, fy, hx("#ffb02e")); s.p(fx, fy + 1, hx("#e8801f")); s.p(fx + 1, fy, hx("#ffd04a"))
    s.outline(-0.72)
    return s


def toddy_palm(W, H, seed, trunk_h=None, lean=1):
    rnd = random.Random(seed)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2 + 1, H - 3, 9, 3, 75)
    pal = Ramp("#5aa040")
    th = trunk_h or (H - 18)
    bx = W // 2
    topx = bx + lean * 2
    for i in range(th):
        t = i / th
        x = int(bx + (topx - bx) * (t ** 1.5))
        y = H - 3 - i
        w = 4 if t < 0.15 else 3 if t < 0.85 else 3
        s.rect(x - 1, y, w, 1, TRUNK.m if i % 4 else TRUNK.d1)
        s.p(x - 1, y, TRUNK.l1); s.p(x - 1 + w - 1, y, TRUNK.d1)
    cy = H - 3 - th
    # fan crown: drooping fronds
    angles = [-165, -140, -115, -90, -65, -40, -15, 15, 165, 190]
    for a in angles:
        ang = math.radians(a)
        L = rnd.randint(int(W * 0.34), int(W * 0.46))
        px, py = topx, cy
        for k in range(L):
            t = k / L
            px = topx + math.cos(ang) * k
            py = cy + math.sin(ang) * k * 0.55 + (t ** 2) * 9
            c = pal.l1 if t < 0.35 else pal.m if t < 0.7 else pal.d1
            s.p(px, py, c); s.p(px, py + 1, pal.d1)
            if k % 2 == 0 and 0.15 < t < 0.95:
                s.p(px, py + 2, pal.m if k % 4 else pal.l1)
                s.p(px, py - 1, pal.l1)
    s.ell(topx, cy + 1, 3, 3, pal.d1)
    s.p(topx - 1, cy + 3, hx("#6b4a2a")); s.p(topx + 1, cy + 3, hx("#6b4a2a")); s.p(topx, cy + 4, hx("#6b4a2a"))
    s.outline(-0.72)
    return s


def banana_plant(W=44, H=44, seed=3):
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, 10, 3, 70)
    leaf = Ramp("#6bb44a")
    bx, by = W // 2, H - 14
    s.rect(bx - 2, by, 5, 11, hx("#b9d27a")); s.vline(bx - 2, by, 11, hx("#d8e8a0")); s.vline(bx + 2, by, 11, hx("#8aa85a"))
    # (ox, up, droop, length)
    for ox, up, droop, L in [(-1.0, 0.55, 0.9, 20), (1.0, 0.55, 0.9, 20), (-0.55, 1.0, 0.7, 22), (0.55, 1.0, 0.7, 22), (0.0, 1.2, 0.4, 17)]:
        prev = None
        for i in range(L * 2 + 1):
            t = i / (L * 2)
            x = bx + ox * t * L * 0.95
            y = by - up * math.sin(t * math.pi * 0.62) * L * 0.9 + droop * (t ** 2) * L * 0.55
            if prev is not None:
                tx, ty = x - prev[0], y - prev[1]
                n = math.hypot(tx, ty) or 1
                nx, ny = -ty / n, tx / n
                wd = 4.2 * math.sin(min(1, t * 1.1) * math.pi) ** 0.6
                for k in range(int(-wd), int(wd) + 1):
                    px, py = x + nx * k, y + ny * k
                    edge = abs(k) >= int(wd)
                    c = leaf.d1 if edge else leaf.l2 if k == 0 else leaf.l1 if k < 0 else leaf.m
                    s.p(px, py, c)
            prev = (x, y)
    s.ell(bx + 4, by + 3, 2, 3, hx("#8a3a6a"))
    for i in range(3): s.rect(bx + 1 + i * 2, by + 7, 2, 3, hx("#d6d44a"))
    s.outline(-0.72)
    return s


def bamboo_clump(W=30, H=48, seed=5):
    rnd = random.Random(seed)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, 13, 3, 70)
    g = Ramp("#5fa244")
    for i, x in enumerate([6, 10, 14, 18, 22]):
        top = rnd.randint(2, 9)
        base = H - 4 - rnd.randint(0, 2)
        for y in range(top, base):
            s.p(x, y, g.l1); s.p(x + 1, y, g.m); s.p(x + 2, y, g.d1)
        for y in range(top + 5, base, 9):
            s.hline(x - 1, y, 5, g.d2)
        for y in range(top + 2, top + 24, 8):
            for k in range(7):
                s.p(x + 3 + k, y - k // 2, g.m if k < 5 else g.l1); s.p(x + 3 + k, y - k // 2 + 1, g.d1)
                s.p(x - 1 - k, y + 1 - k // 2, g.m if k < 5 else g.l1); s.p(x - 1 - k, y + 2 - k // 2, g.d1)
    s.outline(-0.72)
    return s


def veg_bed(W=76, H=32):
    rnd = random.Random(9)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, W // 2 - 3, 3, 60)
    s.rect(2, 8, W - 4, H - 12, hx("#5a3b24"))
    s.rect(4, 10, W - 8, H - 18, hx("#6d4a30"))
    s.hline(2, 8, W - 4, WOOD.l1); s.hline(2, H - 5, W - 4, WOOD.d1)
    cols = [("#5ab04a", "#8acd5a"), ("#4a9a3a", "#6cc04a"), ("#a8d65a", "#d6ec7a"), ("#7a3a8a", "#a85ac0")]
    for r in range(2):
        for i in range(9):
            x = 7 + i * 7 + (r % 2) * 3; y = 10 + r * 8
            c1, c2 = cols[(i + r) % 4]
            s.ell(x + 2, y + 3, 3, 3, hx(c1)); s.p(x + 1, y + 2, hx(c2)); s.p(x + 2, y + 1, hx(c2)); s.p(x + 3, y + 3, hx(c1))
    s.outline(-0.72)
    return s


def flower_bed(W=56, H=30):
    rnd = random.Random(12)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, W // 2 - 3, 3, 60)
    s.rect(2, 10, W - 4, H - 14, hx("#5a3b24"))
    s.hline(2, 10, W - 4, STONE.l1); s.hline(2, H - 5, W - 4, STONE.d1)
    cols = ["#ffb12e", "#ff8a1e", "#ffffff", "#ff7aa8", "#ffd84a"]   # marigold, jasmine, lotus-pink
    for x in range(5, W - 5, 4):
        h = rnd.randint(3, 8)
        s.vline(x, 10 - h + 5, h, hx("#4c9a3c"))
        c = hx(rnd.choice(cols))
        s.p(x, 10 - h + 4, c); s.p(x - 1, 10 - h + 5, c); s.p(x + 1, 10 - h + 5, c); s.p(x, 10 - h + 6, shade(c, -0.3))
        s.p(x, 10 - h + 5, hx("#fff0a0"))
    s.outline(-0.72)
    return s


def potted_row(W=36, H=16):
    s = Spr(W, H)
    for i in range(4):
        x = 2 + i * 8
        s.rect(x, 8, 6, 6, hx("#b9693f")); s.hline(x - 1, 8, 8, hx("#d8895a")); s.hline(x, 13, 6, hx("#7e4426"))
        c = [hx("#ff7aa8"), hx("#5ab04a"), hx("#ffd84a"), hx("#6bc04a")][i]
        s.rect(x + 2, 3, 2, 5, hx("#4c9a3c")); s.ell(x + 3, 3, 2, 2, c)
    s.outline(-0.72)
    return s


def irrigation(W=84, H=12):
    s = Spr(W, H)
    s.rect(0, 1, W, H - 2, STONE.m); s.hline(0, 1, W, STONE.l2); s.hline(0, H - 2, W, STONE.d1)
    s.rect(1, 3, W - 2, H - 6, hx("#4a96b8"))
    s.hline(1, 3, W - 2, hx("#2f6a8c"))
    for x in range(3, W - 4, 9): s.hline(x, 5, 4, hx("#bfe8f4")); s.hline(x + 3, 7, 3, hx("#7cc4dc"))
    for x in range(6, W, 12): s.vline(x, 1, 2, STONE.d2)
    s.outline(-0.72)
    return s


def bamboo_fence(W=28, H=16):
    s = Spr(W, H)
    g = Ramp("#d2b05c")
    for x in (2, 13, 24):
        s.rect(x, 1, 3, H - 2, g.m); s.vline(x, 1, H - 2, g.l1); s.vline(x + 2, 1, H - 2, g.d1)
        s.hline(x, 1, 3, g.l2); s.hline(x, 6, 3, g.d2)
    for y in (5, 10):
        s.rect(0, y, W, 2, g.m); s.hline(0, y, W, g.l1); s.hline(0, y + 1, W, g.d1)
    s.outline(-0.72)
    return s


def fence_h_unit():
    """8x13 chainable fence piece (post at left + rails)."""
    s = Spr(8, 14)
    g = Ramp("#d2b05c")
    s.rect(0, 1, 3, 12, g.m); s.vline(0, 1, 12, g.l1); s.vline(2, 1, 12, g.d1); s.hline(0, 1, 3, g.l2)
    s.rect(3, 4, 5, 2, g.m); s.hline(3, 4, 5, g.l1)
    s.rect(3, 8, 5, 2, g.m); s.hline(3, 9, 5, g.d1)
    s.outline(-0.72)
    return s


def fence_v_unit():
    s = Spr(8, 10)
    g = Ramp("#d2b05c")
    s.rect(2, 0, 3, 10, g.d1)
    s.rect(1, 1, 4, 4, g.m); s.hline(1, 1, 4, g.l2); s.hline(1, 4, 4, g.d1)
    s.outline(-0.72)
    return s


def bamboo_planter(S=18):
    s = Spr(S, S)
    g = Ramp("#d2b05c")
    s.rect(3, 8, 12, 8, g.m); s.vline(3, 8, 8, g.l1); s.vline(14, 8, 8, g.d1)
    for y in (10, 13): s.hline(3, y, 12, g.d2)
    s.rect(3, 7, 12, 2, hx("#5a3b24"))
    for x, c in ((6, "#5ab04a"), (9, "#7acb5a"), (12, "#4a9a3a")):
        s.vline(x, 2, 6, hx(c)); s.p(x - 1, 3, hx(c)); s.p(x + 1, 4, hx(c))
    s.p(9, 1, hx("#ff7aa8")); s.p(8, 2, hx("#ff7aa8"))
    s.outline(-0.72)
    return s


def village_sign(W=24, H=24):
    s = Spr(W, H)
    s.shadow_ellipse(12, H - 2, 6, 2, 60)
    s.rect(11, 8, 3, 14, TEAK.m); s.vline(11, 8, 14, TEAK.l1)
    planks(s, 2, 2, 20, 9, WOOD, random.Random(2), vertical=False)
    s.hline(2, 2, 20, WOOD.l2)
    s.rect(5, 5, 14, 2, TEAK.d1)
    s.p(4, 4, TEAK.d2); s.p(20, 4, TEAK.d2)
    s.outline(-0.72)
    return s


def water_jar():
    s = Spr(12, 16)
    s.shadow_ellipse(6, 14, 5, 2, 60)
    c = Ramp("#b46b44")
    s.ell(6, 9, 5, 5, c.m); s.ell(5, 8, 3, 3, c.l1); s.p(4, 6, c.l2)
    s.rect(4, 3, 5, 3, c.d1); s.hline(3, 3, 7, c.m); s.hline(4, 2, 5, c.l1)
    s.hline(3, 9, 7, c.d1)
    s.outline(-0.72)
    return s


def drying_mat(W=30, H=10):
    s = Spr(W, H)
    s.rect(0, 1, W, H - 2, hx("#7a5330")); s.hline(0, 1, W, hx("#9a6f40"))
    s.rect(2, 2, W - 4, H - 5, hx("#e8d080"))
    rnd = random.Random(4)
    for _ in range(40):
        s.p(rnd.randint(2, W - 3), rnd.randint(2, H - 4), rnd.choice([hx("#f6e6a0"), hx("#d0b050"), hx("#fff3c0")]))
    s.outline(-0.72)
    return s


def haystack(W=36, H=30):
    rnd = random.Random(8)
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, W // 2 - 3, 3, 70)
    r = Ramp("#dcb85a")
    for y in range(4, H - 3):
        t = (y - 4) / (H - 8)
        hw = int(3 + 13 * (t ** 0.7))
        for x in range(W // 2 - hw, W // 2 + hw + 1):
            u = (x - (W // 2 - hw)) / max(1, 2 * hw)
            c = r.l1 if u < 0.3 else r.m if u < 0.7 else r.d1
            if rnd.random() < 0.15: c = r.d1 if c != r.d1 else r.d2
            s.p(x, y, c)
    for y in (12, 19):
        hw = int(3 + 13 * (((y - 4) / (H - 8)) ** 0.7))
        s.hline(W // 2 - hw, y, 2 * hw + 1, hx("#a8832f"))
    s.p(W // 2, 3, r.l2); s.p(W // 2 - 1, 3, r.l1)
    s.outline(-0.72)
    return s


def rice_bundle(W=20, H=18):
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 2, 7, 2, 60)
    g = Ramp("#e0bb54")
    for i in range(7):
        x = 4 + i * 2
        s.line(x, H - 4, x + (i - 3) // 2 + (i - 3), 3, g.m if i % 2 else g.l1)
        s.p(x + (i - 3) // 2 + (i - 3), 2, g.l2)
    s.rect(4, 9, 12, 2, hx("#9a6a3a")); s.hline(4, 9, 12, hx("#c18a52"))
    s.outline(-0.72)
    return s


def scarecrow(W=30, H=38):
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 3, 8, 3, 70)
    s.rect(W // 2 - 1, 12, 3, H - 14, TEAK.m); s.vline(W // 2 - 1, 12, H - 14, TEAK.l1)
    s.rect(3, 15, W - 6, 3, TEAK.m); s.hline(3, 15, W - 6, TEAK.l1)
    # shirt + longyi
    s.rect(9, 14, 12, 8, hx("#c85a3c")); s.hline(9, 14, 12, hx("#e07a58")); s.vline(9, 14, 8, hx("#9a3a28"))
    s.rect(10, 22, 10, 7, hx("#3f6fb0")); s.hline(10, 25, 10, hx("#27487f"))
    # straw hands + patches
    for x in (1, 2, 27, 28): s.vline(x, 17, 3, hx("#e0bb54"))
    s.rect(12, 17, 3, 3, hx("#e8d29b"))
    # head + khamauk hat
    s.ell(W // 2, 9, 4, 4, hx("#e8d29b")); s.p(13, 8, OUT_C); s.p(17, 8, OUT_C); s.hline(14, 11, 3, OUT_C)
    hat = Ramp("#d9b45f")
    s.poly([(W // 2, 0), (6, 8), (24, 8)], hat.m)
    s.rect(3, 7, 24, 2, hat.m); s.hline(3, 8, 24, hat.d1); s.hline(5, 7, 18, hat.l1)
    s.outline(-0.72)
    return s


OUT_C = hx("#2a1a14")


def basket_item(W, H, kind):
    s = Spr(W, H)
    s.shadow_ellipse(W // 2, H - 2, W // 2 - 3, 2, 60)
    b = Ramp("#c9a156")
    s.rect(3, H // 2, W - 6, H // 2 - 3, b.m)
    for x in range(3, W - 3):
        for y in range(H // 2, H - 3):
            if (x + y) % 4 < 2: s.p(x, y, b.d1)
    s.hline(2, H // 2, W - 4, b.l1)
    cols = {"chili": ["#d63b3b", "#f0504a", "#a82828"], "tomato": ["#e0452e", "#f06a4a", "#b02a1c"], "bean": ["#5ab04a", "#8acd5a", "#3f8a3a"]}[kind]
    rnd = random.Random(len(kind))
    for _ in range(W * 2):
        x = rnd.randint(4, W - 5); y = rnd.randint(H // 2 - 6, H // 2 + 1)
        s.p(x, y, hx(rnd.choice(cols)))
        if kind == "tomato": s.p(x + 1, y, hx(cols[1])); s.p(x, y - 1, hx("#4c9a3c")) if rnd.random() < .3 else None
    s.outline(-0.72)
    return s


def lotus_pond(W=86, H=66):
    rnd = random.Random(15)
    s = Spr(W, H)
    # bank (grass/mud) then water blob
    s.ell(W // 2, H // 2, W // 2 - 1, H // 2 - 1, hx("#7a5a38"))
    s.ell(W // 2, H // 2, W // 2 - 3, H // 2 - 3, hx("#9a7a4c"))
    s.ell(W // 2, H // 2, W // 2 - 5, H // 2 - 5, hx("#3a86a8"))
    s.ell(W // 2 - 2, H // 2 - 2, W // 2 - 9, H // 2 - 9, hx("#4aa0bf"))
    for _ in range(14):
        x = rnd.randint(14, W - 20); y = rnd.randint(12, H - 14)
        s.hline(x, y, rnd.randint(4, 8), hx("#9ad8ea"))
    pad = Ramp("#4f9a3a")
    for _ in range(11):
        x = rnd.randint(16, W - 16); y = rnd.randint(14, H - 14)
        s.ell(x, y, 5, 3, pad.m); s.ell(x - 1, y - 1, 3, 1, pad.l1); s.poly([(x, y), (x + 5, y - 1), (x + 5, y + 1)], hx("#3a86a8"))
    for fx, fy, c in [(30, 24, "#ff8fb8"), (52, 36, "#ffffff"), (42, 18, "#ff6a9a"), (60, 24, "#ffd0e0")]:
        s.p(fx, fy, hx(c)); s.p(fx - 1, fy + 1, hx(c)); s.p(fx + 1, fy + 1, hx(c)); s.p(fx, fy - 1, hx(c)); s.p(fx, fy + 1, hx("#ffe070"))
    # reeds on rim
    for x in (8, 12, 70, 74):
        s.vline(x, H // 2 - 4, 8, hx("#4c9a3c")); s.p(x, H // 2 - 5, hx("#8a5a34"))
    s.outline(-0.72)
    return s


def bridge(W=56, H=38):
    rnd = random.Random(17)
    s = Spr(W, H)
    # deck planks across (horizontal strips), walkable lane x 10..46
    for y in range(2, H - 2):
        c = WOOD.m if (y // 3) % 2 == 0 else WOOD.l1
        s.hline(10, y, 36, c)
        if y % 3 == 2: s.hline(10, y, 36, WOOD.d1)
        if rnd.random() < .3: s.p(rnd.randint(11, 44), y, WOOD.d2)
    s.vline(10, 2, H - 4, WOOD.d1); s.vline(45, 2, H - 4, WOOD.d2)
    # bamboo railings
    g = Ramp("#d2b05c")
    for x in (5, 46):
        s.rect(x, 0, 5, H, g.m); s.vline(x, 0, H, g.l1); s.vline(x + 4, 0, H, g.d1)
        for y in range(2, H, 8): s.hline(x - 1, y, 7, g.d2)
    for y in (1, H - 3):
        s.rect(3, y, 9, 3, TEAK.m); s.rect(44, y, 9, 3, TEAK.m)
    s.outline(-0.72)
    return s


def stream_section(W=30, H=36):
    s = Spr(W, H)
    s.rect(0, 0, W, H, hx("#8a6a44")); s.rect(3, 0, W - 6, H, hx("#3a86a8")); s.rect(5, 0, W - 10, H, hx("#4aa0bf"))
    for y in range(2, H, 6): s.hline(8, y, 8, hx("#9ad8ea"))
    return s


def canal_vertical(W=60, H=130):
    s = Spr(W, H)
    s.rect(0, 0, W, H, hx("#8a6a44")); s.rect(5, 0, W - 10, H, hx("#2f6a8c")); s.rect(8, 0, W - 16, H, hx("#4aa0bf"))
    rnd = random.Random(1)
    for _ in range(40): s.hline(rnd.randint(10, W - 18), rnd.randint(0, H - 1), rnd.randint(3, 8), hx("#9ad8ea"))
    return s


def river_bend(W=62, H=63):
    s = Spr(W, H)
    s.ell(W // 2, H // 2, W // 2 - 1, H // 2 - 1, hx("#8a6a44")); s.ell(W // 2, H // 2, W // 2 - 4, H // 2 - 4, hx("#3a86a8")); s.ell(W // 2 - 2, H // 2 - 2, W // 2 - 9, H // 2 - 9, hx("#4aa0bf"))
    s.outline(-0.6)
    return s
