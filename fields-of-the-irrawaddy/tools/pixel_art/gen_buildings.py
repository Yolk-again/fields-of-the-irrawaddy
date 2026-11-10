"""Burmese village buildings: stilt houses, monastery (kyaung), golden zedi, granary, stalls."""
from pxlib import *

WOOD = Ramp("#a8723f")
TEAK = Ramp("#7a4a2a")
BAMBOO = Ramp("#d9b868")
GOLD = Ramp("#f0c040")
STONE = Ramp("#a9a69a")


def thatch(s, x0, y0, x1, y1, inset, ramp, rnd, band=3, fringe=True):
    h = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        t = (y - y0) / h
        l = int(x0 + inset * (1 - t))
        r = int(x1 - inset * (1 - t))
        tone = ramp.m if ((y - y0) // band) % 2 == 0 else ramp.d1
        for x in range(l, r + 1):
            c = tone
            v = rnd.random()
            if v < 0.12: c = ramp.l1
            elif v < 0.22: c = ramp.d2 if tone == ramp.d1 else ramp.d1
            s.p(x, y, c)
        s.p(l, y, ramp.d1); s.p(l + 1, y, ramp.l1 if y % 2 else ramp.m)
        s.p(r, y, ramp.d2)
        if (y - y0) % band == band - 1:
            for x in range(l + 1, r, 2):
                s.p(x, y, ramp.d2)
    if fringe:
        for x in range(x0, x1 + 1):
            n = rnd.choice([1, 1, 2, 2, 3])
            for k in range(n):
                s.p(x, y1 + 1 + k, ramp.d1 if k < n - 1 else ramp.d2)


def corrugated(s, x0, y0, x1, y1, inset, ramp):
    h = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        t = (y - y0) / h
        l = int(x0 + inset * (1 - t)); r = int(x1 - inset * (1 - t))
        for x in range(l, r + 1):
            s.p(x, y, ramp.l1 if (x // 2) % 2 == 0 else ramp.m)
        s.p(l, y, ramp.d1); s.p(r, y, ramp.d2)
    s.hline(x0, y1, x1 - x0 + 1, ramp.d2)
    s.hline(x0 + inset, y0, x1 - x0 - 2 * inset + 1, ramp.l2)


def planks(s, x, y, w, h, ramp, rnd, vertical=True):
    s.rect(x, y, w, h, ramp.m)
    if vertical:
        for xx in range(x, x + w, 3):
            s.vline(xx, y, h, ramp.d1)
            if xx + 1 < x + w:
                s.vline(xx + 1, y, h, ramp.l1 if rnd.random() < .6 else ramp.m)
        for _ in range(w * h // 40):
            s.p(rnd.randint(x, x + w - 1), rnd.randint(y, y + h - 1), ramp.d2)
    else:
        for yy in range(y, y + h, 3):
            s.hline(x, yy, w, ramp.d1)
            if yy + 1 < y + h:
                s.hline(x, yy + 1, w, ramp.l1)
    s.hline(x, y, w, ramp.l1)
    s.hline(x, y + h - 1, w, ramp.d1)


def posts(s, xs, y0, y1, ramp):
    for x in xs:
        s.rect(x, y0, 3, y1 - y0, ramp.m)
        s.vline(x, y0, y1 - y0, ramp.l1)
        s.vline(x + 2, y0, y1 - y0, ramp.d1)
        s.rect(x - 1, y1 - 1, 5, 2, STONE.d1)  # stone footing


def ladder(s, x, y0, y1):
    s.vline(x, y0, y1 - y0, TEAK.m); s.vline(x + 5, y0, y1 - y0, TEAK.m)
    for yy in range(y0 + 1, y1, 3):
        s.hline(x, yy, 6, WOOD.l1)


def stilt_house(W, H, wall, roof_kind, roof_ramp, seed, flower=False, jar=True):
    rnd = random.Random(seed)
    s = Spr(W, H)
    ground = H - 3
    floor_y = ground - 13
    s.shadow_ellipse(W // 2, ground, W // 2 - 4, 4, 80)
    # under-floor darkness + posts
    s.rect(8, floor_y + 3, W - 16, ground - floor_y - 3, shade(TEAK.d2, -0.2))
    pxs = [8, W // 2 - 1, W - 11]
    posts(s, pxs, floor_y + 2, ground, TEAK)
    if jar:
        jx = W - 22
        s.ell(jx, ground - 4, 3, 4, hx("#a15f3b")); s.hline(jx - 2, ground - 8, 5, hx("#6d3a22")); s.p(jx - 1, ground - 5, hx("#d08a5c"))
    ladder(s, 14, floor_y + 3, ground)
    # floor deck
    planks(s, 5, floor_y, W - 10, 3, WOOD, rnd, vertical=False)
    # walls
    wy0 = floor_y - 22
    planks(s, 9, wy0, W - 18, 22, wall, rnd)
    # bamboo woven panel along bottom
    for yy in range(wy0 + 14, wy0 + 22):
        for x in range(9, W - 9):
            s.p(x, yy, BAMBOO.m if (x + yy) % 4 < 2 else BAMBOO.d1)
    # door
    dx = W // 2 - 4
    s.rect(dx, wy0 + 5, 9, 17, TEAK.d2)
    s.rect(dx + 1, wy0 + 6, 7, 16, shade(TEAK.d2, -0.3))
    s.rect(dx - 1, wy0 + 4, 11, 2, TEAK.d1)
    s.vline(dx - 1, wy0 + 4, 18, TEAK.d1); s.vline(dx + 9, wy0 + 4, 18, TEAK.m)
    # window with open shutters
    wx = W - 26
    s.rect(wx, wy0 + 7, 8, 7, shade(TEAK.d2, -0.3))
    s.rect(wx - 3, wy0 + 6, 3, 9, TEAK.m); s.rect(wx + 8, wy0 + 6, 3, 9, TEAK.m)
    s.hline(wx, wy0 + 6, 8, TEAK.l1)
    s.p(wx + 3, wy0 + 10, hx("#ffd98a")); s.p(wx + 4, wy0 + 10, hx("#ffd98a"))  # lamplight
    wx2 = 15
    s.rect(wx2, wy0 + 7, 8, 7, shade(TEAK.d2, -0.3))
    s.rect(wx2 - 3, wy0 + 6, 3, 9, TEAK.m); s.rect(wx2 + 8, wy0 + 6, 3, 9, TEAK.m)
    # roof
    ry1 = wy0 + 6
    ry0 = ry1 - 28
    if roof_kind == "thatch":
        thatch(s, 1, ry0, W - 2, ry1, 20, roof_ramp, rnd)
    else:
        corrugated(s, 1, ry0, W - 2, ry1, 20, roof_ramp)
        s.hline(1, ry1 + 1, W - 2, roof_ramp.d2)
    # ridge + crossed finials
    cx = W // 2
    s.line(cx - 3, ry0 - 5, cx + 2, ry0 + 1, TEAK.d1); s.line(cx + 3, ry0 - 5, cx - 2, ry0 + 1, TEAK.d1)
    s.p(cx - 3, ry0 - 5, TEAK.l1); s.p(cx + 3, ry0 - 5, TEAK.l1)
    if flower:
        for i, c in enumerate(["#ff7aa8", "#ffd35a", "#ff8f4a", "#ffffff"]):
            s.p(8 + i * 3, floor_y - 1, hx(c)); s.p(9 + i * 3, floor_y - 2, hx("#4c9a3c"))
    s.outline(-0.72)
    return s


def monastery():
    rnd = random.Random(7)
    s = Spr(72, 78)
    s.shadow_ellipse(36, 74, 34, 4, 80)
    # stone platform with steps
    s.rect(4, 68, 64, 8, STONE.m); s.hline(4, 68, 64, STONE.l2); s.hline(4, 75, 64, STONE.d2)
    for x in range(4, 68, 8): s.vline(x, 69, 6, STONE.d1)
    for i in range(3): s.rect(28 - i * 2, 70 + i * 2, 16 + i * 4, 2, STONE.l1 if i % 2 == 0 else STONE.m)
    # teak hall
    planks(s, 11, 48, 50, 20, TEAK, rnd)
    for x in (11, 24, 36, 48, 59):
        s.rect(x, 46, 3, 22, shade(TEAK.m, 0.1)); s.vline(x, 46, 22, TEAK.l1)
    for x in (16, 41):  # carved panels / windows
        s.rect(x, 52, 8, 9, hx("#2a1710")); s.rect(x + 1, 53, 6, 7, hx("#5b2d1a"))
        s.hline(x, 51, 8, hx("#e8b84a"))
    s.rect(30, 52, 12, 16, hx("#2a1710")); s.rect(31, 53, 10, 15, hx("#7a2f22"))   # red door
    s.hline(30, 51, 12, hx("#e8b84a")); s.p(35, 60, hx("#e8b84a")); s.p(36, 60, hx("#e8b84a"))
    red = Ramp("#a8392b")
    def tier(x0, x1, y0, y1, inset):
        for y in range(y0, y1 + 1):
            t = (y - y0) / (y1 - y0)
            l = int(x0 + inset * (1 - t)); r = int(x1 - inset * (1 - t))
            for x in range(l, r + 1):
                c = red.m if ((x + y) % 4 < 2) else red.d1
                if (x // 3 + y // 2) % 5 == 0: c = red.l1
                s.p(x, y, c)
            s.p(l, y, red.l1); s.p(r, y, red.d2)
        s.hline(x0 - 1, y1 + 1, x1 - x0 + 3, GOLD.m)
        s.hline(x0 - 1, y1 + 2, x1 - x0 + 3, GOLD.d1)
        for x in range(x0, x1, 4): s.p(x, y1 + 3, GOLD.l1)
    tier(1, 70, 35, 46, 14)
    tier(11, 60, 23, 34, 11)
    tier(21, 50, 12, 22, 8)
    # spire
    s.rect(34, 4, 4, 9, GOLD.m); s.vline(34, 4, 9, GOLD.l2); s.vline(37, 4, 9, GOLD.d1)
    for y in (5, 8, 11): s.hline(32, y, 8, GOLD.d1); s.hline(33, y - 1, 6, GOLD.l1)
    s.p(35, 1, GOLD.l2); s.p(35, 2, GOLD.m); s.p(36, 2, GOLD.d1); s.p(35, 0, GOLD.l2)
    s.outline(-0.72)
    return s


def zedi():
    s = Spr(40, 76)
    s.shadow_ellipse(20, 72, 19, 4, 80)
    WH = Ramp("#f1ead8")
    # square terraces
    for i, (x0, x1, y0, y1) in enumerate([(2, 38, 64, 73), (6, 34, 58, 64), (10, 30, 53, 58)]):
        s.rect(x0, y0, x1 - x0, y1 - y0, WH.m); s.hline(x0, y0, x1 - x0, WH.l2); s.hline(x0, y1 - 1, x1 - x0, WH.d1)
        s.vline(x1 - 1, y0, y1 - y0, WH.d1)
        s.hline(x0, y0 + 2, x1 - x0, GOLD.m)
        for x in range(x0 + 2, x1 - 1, 4): s.p(x, y0 + 4 if i == 0 else y0 + 3, GOLD.d1)
    # bell
    def bell(y):
        t = (y - 24) / 29
        return 3 + 11 * (t ** 0.75)
    for y in range(24, 53):
        hw = bell(y)
        for x in range(int(20 - hw), int(20 + hw) + 1):
            u = (x - (20 - hw)) / max(1, 2 * hw)
            c = GOLD.l2 if u < 0.22 else GOLD.l1 if u < 0.38 else GOLD.m if u < 0.68 else GOLD.d1 if u < 0.88 else GOLD.d2
            s.p(x, y, c)
    s.hline(6, 52, 28, GOLD.d2)
    # rings + lotus bud + hti
    for i, y in enumerate(range(16, 24, 2)):
        hw = 3 + i * 0.9
        s.hline(int(20 - hw), y, int(2 * hw) + 1, GOLD.l1 if i % 2 else GOLD.m)
        s.hline(int(20 - hw), y + 1, int(2 * hw) + 1, GOLD.d1)
    s.ell(20, 12, 3, 4, GOLD.m); s.vline(19, 9, 6, GOLD.l2)
    s.rect(19, 3, 2, 6, GOLD.m)
    s.hline(15, 5, 10, GOLD.d1); s.hline(16, 4, 8, GOLD.l1); s.hline(17, 7, 6, GOLD.d1)
    s.p(20, 0, hx("#ff5a5a")); s.p(20, 1, GOLD.l2); s.p(20, 2, GOLD.m)
    s.outline(-0.72)
    return s


def granary():
    rnd = random.Random(11)
    s = Spr(52, 48)
    g = 44
    s.shadow_ellipse(26, g, 22, 3, 80)
    s.rect(10, 34, 32, g - 34, shade(TEAK.d2, -0.2))
    posts(s, [10, 25, 39], 33, g, TEAK)
    ladder(s, 3, 34, g)
    # woven bamboo bin
    for y in range(18, 35):
        t = (y - 18) / 16
        hw = int(14 + 3 * math.sin(t * math.pi * 0.9))
        for x in range(26 - hw, 26 + hw + 1):
            c = BAMBOO.m if ((x + y) % 4 < 2) else BAMBOO.d1
            if x < 26 - hw + 3: c = BAMBOO.l1 if (x + y) % 4 < 2 else BAMBOO.m
            if x > 26 + hw - 3: c = BAMBOO.d1 if (x + y) % 4 < 2 else BAMBOO.d2
            s.p(x, y, c)
    s.rect(22, 25, 8, 10, TEAK.d2); s.hline(21, 24, 10, TEAK.l1)
    thatch(s, 3, 4, 49, 20, 17, Ramp("#c9993f"), rnd, band=3)
    s.rect(25, 0, 2, 4, TEAK.d1)
    s.outline(-0.72)
    return s


def market_stall():
    rnd = random.Random(21)
    s = Spr(72, 62)
    g = 58
    s.shadow_ellipse(36, g, 32, 4, 80)
    posts(s, [6, 62], 18, g, TEAK)
    # counter
    planks(s, 6, 36, 60, 10, WOOD, rnd, vertical=False)
    s.rect(8, 46, 56, 10, shade(TEAK.d2, -0.1))
    for x in (10, 34, 58): s.rect(x, 46, 3, 11, TEAK.m)
    # produce on counter
    def basket(x, y, c1, c2):
        s.rect(x, y + 3, 11, 4, BAMBOO.m); s.hline(x, y + 3, 11, BAMBOO.l1); s.hline(x, y + 6, 11, BAMBOO.d1)
        for i in range(6):
            s.p(x + 1 + i * 2 - (i % 2), y + 2 - (i % 2), c1 if i % 2 else c2)
            s.p(x + 2 + i * 2 - (i % 2), y + 1, c2 if i % 2 else c1)
    basket(9, 30, hx("#d63b3b"), hx("#f06a4a"))      # chilli / tomato
    basket(22, 30, hx("#5ab04a"), hx("#8acd5a"))     # greens
    basket(35, 30, hx("#f0d070"), hx("#e8b84a"))     # rice
    basket(48, 30, hx("#ff9a3a"), hx("#ffc04a"))     # oranges
    s.rect(58, 27, 6, 8, hx("#c9a56a")); s.hline(58, 27, 6, hx("#e8d29b")); s.p(60, 30, hx("#7a5a30"))  # rice sack
    # striped canopy
    cols = [Ramp("#e9772e"), Ramp("#f7e7b0")]
    for y in range(4, 22):
        t = (y - 4) / 18
        l = int(2 + 6 * (1 - t)); r = int(69 - 6 * (1 - t))
        for x in range(l, r + 1):
            k = ((x - 2) // 6) % 2
            c = cols[k]
            tone = c.m if y < 15 else c.d1
            if y == 4: tone = c.l1
            s.p(x, y, tone)
    for x in range(2, 70):   # scalloped valance
        k = ((x - 2) // 6) % 2
        depth = 3 - abs(((x - 2) % 6) - 2.5) * 0.9
        for yy in range(22, 22 + max(1, int(depth))):
            s.p(x, yy, cols[k].d1 if yy > 22 else cols[k].m)
    s.rect(34, 0, 4, 5, TEAK.m)
    # hanging scale
    s.line(36, 23, 36, 27, hx("#3a3028")); s.hline(32, 27, 9, hx("#c9c4b0"))
    s.outline(-0.72)
    return s


def shrine():
    rnd = random.Random(41)
    s = Spr(38, 44)
    g = 41
    s.shadow_ellipse(19, g, 15, 3, 80)
    s.rect(17, 28, 4, g - 28, TEAK.m)
    s.rect(7, 24, 24, 4, WOOD.m); s.hline(7, 24, 24, WOOD.l1)
    s.rect(11, 16, 16, 8, hx("#f1ead8")); s.rect(15, 18, 8, 6, hx("#2a1710"))
    s.p(18, 21, GOLD.m); s.p(19, 21, GOLD.m)
    red = Ramp("#b0392c")
    for y in range(6, 17):
        t = (y - 6) / 10
        l = int(5 + 8 * (1 - t)); r = int(32 - 8 * (1 - t))
        s.hline(l, y, r - l + 1, red.m if y % 3 else red.d1)
        s.p(l, y, red.l1)
    s.hline(4, 17, 30, GOLD.m); s.rect(18, 1, 2, 6, GOLD.m); s.p(18, 0, GOLD.l2)
    # offerings
    s.p(9, 23, hx("#ff7aa8")); s.p(10, 22, hx("#ffd35a")); s.p(27, 23, hx("#f7e7b0")); s.p(26, 22, hx("#ff8f4a"))
    s.outline(-0.72)
    return s


def open_barn(W, seed, hay=True):
    rnd = random.Random(seed)
    H = 52
    s = Spr(W, H)
    g = H - 3
    s.shadow_ellipse(W // 2, g, W // 2 - 3, 3, 80)
    s.rect(5, 26, W - 10, g - 26, shade(TEAK.d2, -0.2))
    posts(s, [5, W - 9], 24, g, TEAK)
    if hay:
        s.ell(W // 2, g - 8, 11, 8, hx("#d9b45f")); s.ell(W // 2 - 3, g - 11, 6, 4, hx("#ecd283"))
        for i in range(10): s.p(W // 2 - 9 + i * 2, g - 6 - (i % 3), hx("#a8832f"))
    thatch(s, 1, 6, W - 2, 28, 16, Ramp("#b98a3a"), rnd)
    s.outline(-0.72)
    return s
