"""16x16 item/tool icons, crop growth stages, FX sheets and UI bits."""
from pxlib import *
from gen_buildings import TEAK, WOOD, BAMBOO, GOLD, STONE

OUTC = hx("#2a1a14")
METAL = Ramp("#aab4ba")


def icon_hoe():
    s = Spr(16, 16)
    s.line(2, 14, 11, 5, WOOD.m); s.line(3, 14, 12, 5, WOOD.l1)
    s.poly([(10, 2), (14, 3), (14, 7), (12, 6), (11, 4)], METAL.m)
    s.line(10, 2, 14, 3, METAL.l2); s.line(14, 3, 14, 7, METAL.d1)
    s.outline(-0.72); return s


def icon_seed_bag():
    s = Spr(16, 16)
    b = Ramp("#c9a56a")
    s.ell(8, 10, 5, 5, b.m); s.ell(7, 9, 3, 3, b.l1); s.hline(5, 14, 7, b.d1)
    s.rect(6, 3, 5, 3, b.m); s.hline(5, 6, 7, hx("#b0392c"))
    s.p(5, 3, b.m); s.p(11, 3, b.m); s.p(4, 2, b.l1); s.p(12, 2, b.l1)
    s.rect(7, 9, 3, 3, hx("#6bc04a")); s.p(8, 8, hx("#9ae06a")); s.p(7, 9, hx("#9ae06a"))
    s.outline(-0.72); return s


def icon_watering_can():
    s = Spr(16, 16)
    c = Ramp("#4a86b8")
    s.rect(3, 6, 8, 8, c.m); s.vline(3, 6, 8, c.l1); s.vline(10, 6, 8, c.d1); s.hline(3, 6, 8, c.l2); s.hline(3, 13, 8, c.d2)
    s.line(11, 11, 14, 5, c.m); s.line(12, 11, 15, 5, c.d1)
    s.rect(13, 3, 3, 2, c.l1)
    s.line(3, 7, 3, 3, METAL.d1); s.hline(3, 3, 5, METAL.d1); s.line(8, 3, 9, 6, METAL.d1)
    s.outline(-0.72); return s


def icon_sickle():
    s = Spr(16, 16)
    s.rect(2, 11, 4, 3, WOOD.m); s.hline(2, 11, 4, WOOD.l1)
    for i, (x, y) in enumerate([(6, 11), (7, 9), (8, 7), (10, 5), (12, 4), (13, 5)]):
        s.p(x, y, METAL.l1); s.p(x, y + 1, METAL.m); s.p(x + 1, y + 1, METAL.d1)
    s.p(13, 6, METAL.d1)
    s.outline(-0.72); return s


def icon_wood():
    s = Spr(16, 16)
    for (x, y) in ((1, 9), (6, 9), (3, 4), (8, 4) if False else (10, 4)):
        pass
    for (x, y) in ((2, 8), (8, 8), (5, 3)):
        s.ell(x + 3, y + 3, 3, 3, hx("#8a5a34")); s.ell(x + 3, y + 3, 2, 2, hx("#e0b878")); s.p(x + 3, y + 3, hx("#a87a4c")); s.p(x + 2, y + 2, hx("#c8985c"))
    s.rect(1, 10, 14, 2, hx("#b0392c")); s.hline(1, 10, 14, hx("#d65a4a"))
    s.outline(-0.72); return s


def icon_bamboo():
    s = Spr(16, 16)
    g = Ramp("#5fa244")
    for x in (3, 6, 9, 12):
        s.rect(x, 2, 3, 12, g.m); s.vline(x, 2, 12, g.l1); s.vline(x + 2, 2, 12, g.d1)
        s.hline(x, 6, 3, g.d2); s.hline(x, 11, 3, g.d2)
    s.rect(2, 8, 13, 2, hx("#d9b45f")); s.hline(2, 8, 13, hx("#f0d070"))
    s.outline(-0.72); return s


def icon_herbs():
    s = Spr(16, 16)
    for ang, c in ((-50, "#4a9a3a"), (-20, "#6bc04a"), (10, "#4a9a3a"), (40, "#6bc04a"), (-80, "#6bc04a")):
        a = math.radians(ang - 90 + 90)
        for k in range(9):
            x = 8 + math.sin(math.radians(ang)) * k * 0.9
            y = 12 - math.cos(math.radians(ang)) * k
            s.p(x, y, hx(c)); s.p(x + 1, y, hx(c)); 
            if k > 4: s.p(x - 1, y, hx("#9ae06a"))
    s.rect(7, 11, 3, 4, hx("#b0392c")); s.hline(7, 11, 3, hx("#d65a4a"))
    s.outline(-0.72); return s


def icon_coconut():
    s = Spr(16, 16)
    s.ell(8, 8, 6, 6, hx("#7a4a2a")); s.ell(7, 7, 4, 4, hx("#9a6a3c")); s.p(5, 5, hx("#c8985c")); s.p(6, 4, hx("#c8985c"))
    for x, y in ((6, 9), (9, 9), (7, 11)): s.p(x, y, hx("#2a1710")); s.p(x + 1, y, hx("#2a1710"))
    s.hline(4, 12, 8, hx("#5a3418"))
    s.outline(-0.72); return s


def icon_coin():
    s = Spr(16, 16)
    s.ell(8, 8, 6, 6, GOLD.d1); s.ell(8, 8, 5, 5, GOLD.m); s.ell(7, 7, 3, 3, GOLD.l1)
    s.p(5, 5, GOLD.l2); s.p(6, 5, GOLD.l2)
    s.ell(8, 8, 3, 3, GOLD.d1); s.ell(8, 8, 2, 2, GOLD.m)
    s.vline(8, 6, 5, GOLD.d2)
    s.outline(-0.72); return s


def icon_rice_bowl():
    s = Spr(16, 16)
    s.ell(8, 7, 5, 4, hx("#fffbe8")); s.ell(7, 6, 3, 2, hx("#ffffff"))
    for x, y in ((5, 5), (8, 4), (10, 6), (7, 7), (9, 8)): s.p(x, y, hx("#ece4c0"))
    s.poly([(2, 8), (14, 8), (12, 14), (4, 14)], hx("#f2f2f2"))
    s.hline(3, 9, 10, hx("#3f6fb0")); s.hline(4, 11, 8, hx("#3f6fb0")); s.hline(4, 13, 8, hx("#cfd3d6"))
    s.p(6, 10, hx("#27487f")); s.p(9, 10, hx("#27487f"))
    s.outline(-0.72); return s


def icon_rice_grain():
    s = Spr(16, 16)
    g = Ramp("#e0bb54")
    for i in range(5):
        s.line(3 + i * 2, 14, 2 + i * 3, 3, g.m if i % 2 else g.l1)
        for k in range(3): s.p(1 + i * 3 + (k % 2), 2 + k * 2, g.l2)
    s.rect(3, 11, 10, 2, hx("#9a6a3a"))
    s.outline(-0.72); return s


# --------------------------- crops ---------------------------------
def crop(stage):
    s = Spr(16, 16)
    if stage == 0:
        for x, y in ((6, 10), (9, 9), (8, 12)):
            s.p(x, y, hx("#e8c860")); s.p(x + 1, y, hx("#b8982a"))
        s.hline(5, 13, 6, hx("#7a4a2a"))
    elif stage == 1:
        for x, h in ((6, 4), (8, 6), (10, 4)):
            for i in range(h): s.p(x, 13 - i, hx("#6bc04a") if i % 2 else hx("#4a9a3a"))
            s.p(x, 13 - h, hx("#9ae06a"))
        s.p(7, 12, hx("#4a9a3a")); s.p(9, 12, hx("#4a9a3a"))
    elif stage == 2:
        for x, h, sway in ((4, 7, -1), (6, 10, -1), (8, 12, 0), (10, 10, 1), (12, 7, 1)):
            for i in range(h):
                xx = x + (sway if i > h // 2 else 0)
                s.p(xx, 14 - i, hx("#4a9a3a") if i % 3 == 0 else hx("#6bc04a"))
            s.p(x + sway, 14 - h, hx("#a8e07a"))
        s.hline(5, 14, 7, hx("#3a7a2a"))
    else:
        for x, h, sway in ((4, 8, -2), (6, 11, -2), (8, 13, -1), (10, 11, 2), (12, 8, 2)):
            for i in range(h):
                xx = x + (sway if i > h - 5 else 0)
                s.p(xx, 14 - i, hx("#7ab04a") if i % 3 == 0 else hx("#9ac85a"))
            tip = 14 - h
            for k in range(4):
                s.p(x + sway + (k // 2) * (1 if sway > 0 else -1), tip + k, hx("#f0c840") if k % 2 else hx("#ffe070"))
            s.p(x + sway, tip - 1, hx("#ffe070"))
        s.hline(5, 14, 7, hx("#7a8a3a"))
    s.outline(-0.62)
    return s


def rice_clump(i):
    """12x12 paddy clump used in the flooded field."""
    rnd = random.Random(i)
    s = Spr(14, 14)
    g = [Ramp("#5fb04a"), Ramp("#6bc04a"), Ramp("#4aa04a")][i % 3]
    s.ell(7, 11, 5, 1, hx("#4a7a70"))
    for x in (3, 5, 7, 9, 11):
        h = rnd.randint(6, 9)
        for k in range(h):
            xx = x + (1 if k > h - 3 and x > 7 else -1 if k > h - 3 and x < 7 else 0)
            s.p(xx, 11 - k, g.l1 if k % 2 else g.m)
        s.p(x, 11 - h, g.l2)
    s.outline(-0.6, fixed=hx("#2f6a48"))
    return s


# ----------------------------- FX -----------------------------------
def fx_dust():
    fr = []
    for f in range(4):
        s = Spr(16, 16)
        r = 2 + f * 2
        a = 255 - f * 55
        for (dx, dy) in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1)):
            s.ell(8 + dx * r * 0.6, 9 + dy * r * 0.5, max(1, 3 - f // 2), max(1, 2), (176, 140, 96, a))
        fr.append(s)
    return sheet(fr)


def fx_splash():
    fr = []
    for f in range(4):
        s = Spr(16, 16)
        for i, ang in enumerate([-150, -120, -90, -60, -30]):
            d = 2 + f * 2
            x = 8 + math.cos(math.radians(ang)) * d; y = 12 + math.sin(math.radians(ang)) * d + f * f * 0.5
            s.p(x, y, (140, 210, 240, 255 - f * 50)); s.p(x, y + 1, (80, 160, 210, 255 - f * 50))
        fr.append(s)
    return sheet(fr)


def fx_sparkle():
    fr = []
    for f in range(4):
        s = Spr(16, 16)
        r = [1, 3, 4, 2][f]
        c = hx("#fff3a0")
        for k in range(1, r + 1):
            for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)): s.p(8 + dx, 8 + dy, c if k < r else GOLD.m)
        s.p(8, 8, hx("#ffffff"))
        if r >= 3:
            for dx, dy in ((2, 2), (-2, 2), (2, -2), (-2, -2)): s.p(8 + dx, 8 + dy, GOLD.l1)
        fr.append(s)
    return sheet(fr)


def water_glint():
    fr = []
    for f in range(4):
        s = Spr(8, 8)
        pts = [[(3, 4)], [(3, 4), (4, 4), (2, 4)], [(2, 4), (3, 4), (4, 4), (5, 4), (3, 3), (3, 5)], [(3, 4)]][f]
        for p in pts: s.p(p[0], p[1], hx("#e8faff"))
        fr.append(s)
    return sheet(fr)


def butterfly(c1, c2):
    fr = []
    for f in range(2):
        s = Spr(8, 8)
        if f == 0:
            s.rect(1, 2, 3, 3, c1); s.rect(5, 2, 3, 3, c1); s.p(2, 3, c2); s.p(6, 3, c2); s.rect(4, 3, 1, 3, OUTC)
        else:
            s.rect(2, 3, 2, 2, c1); s.rect(5, 3, 2, 2, c1); s.rect(4, 2, 1, 4, OUTC)
        fr.append(s)
    return sheet(fr)


# ------------------------------ UI -----------------------------------
def ui_slot(selected=False):
    s = Spr(20, 20)
    edge = hx("#2a1a14")
    frame = Ramp("#e6b84a") if selected else Ramp("#8a5a34")
    s.rect(0, 0, 20, 20, edge)
    s.rect(1, 1, 18, 18, frame.m)
    s.hline(1, 1, 18, frame.l2); s.vline(1, 1, 18, frame.l1)
    s.hline(1, 18, 18, frame.d1); s.vline(18, 1, 18, frame.d1)
    s.rect(3, 3, 14, 14, hx("#4a3324") if not selected else hx("#6a4a30"))
    s.hline(3, 3, 14, hx("#2f2018")); s.vline(3, 3, 14, hx("#2f2018"))
    for p in ((0, 0), (19, 0), (0, 19), (19, 19)): s.p(p[0], p[1], T)
    return s


def ui_panel(W=24, H=24):
    """Nine-slice friendly panel: 4px border."""
    s = Spr(W, H)
    edge = hx("#2a1a14"); wood = Ramp("#8a5a34"); gold = Ramp("#e6b84a")
    s.rect(0, 0, W, H, edge)
    s.rect(1, 1, W - 2, H - 2, wood.m)
    s.hline(1, 1, W - 2, wood.l1); s.vline(1, 1, H - 2, wood.l1)
    s.hline(1, H - 2, W - 2, wood.d1); s.vline(W - 2, 1, H - 2, wood.d1)
    s.rect(3, 3, W - 6, H - 6, gold.d1)
    s.rect(4, 4, W - 8, H - 8, hx("#3a281c"))
    s.hline(4, 4, W - 8, hx("#2a1a14")); s.vline(4, 4, H - 8, hx("#2a1a14"))
    for p in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)): s.p(p[0], p[1], T)
    return s
