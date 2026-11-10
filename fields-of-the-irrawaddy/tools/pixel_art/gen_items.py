"""16x16 item/tool icons, crop growth stages, FX sheets and UI bits."""
from pxlib import *
from gen_buildings import WOOD, GOLD

OUTC = hx("#2a1a14")
METAL = Ramp("#aab4ba")


def icon_hoe():
    """Detailed 16px iron field hoe with a broad, flat blade and timber haft."""
    s = Spr(16, 16)
    wood = Ramp("#9b6035")
    iron = Ramp("#aebbc3")
    # Long wooden shaft; dark outline, warm grain and a wrapped lower grip.
    s.line(2, 14, 10, 6, OUTC)
    s.line(3, 14, 10, 7, wood.d2)
    s.line(3, 13, 10, 6, wood.m)
    s.line(4, 13, 10, 7, wood.l1)
    s.line(2, 12, 4, 14, wood.d1)
    s.p(3, 12, wood.l2)
    # Socket and a broad rectangular hoe blade (not a pickaxe point).
    s.poly([(8, 4), (10, 2), (14, 3), (15, 5), (13, 8), (9, 7), (7, 6)], OUTC)
    s.poly([(9, 4), (11, 3), (14, 4), (14, 5), (12, 7), (9, 6)], iron.d1)
    s.poly([(10, 3), (12, 3), (14, 4), (13, 5), (10, 5)], iron.m)
    s.line(11, 3, 14, 4, iron.l2)
    s.line(13, 5, 12, 7, iron.d2)
    s.poly([(8, 5), (10, 4), (11, 6), (9, 8), (7, 7)], wood.d1)
    s.p(9, 5, wood.l1)
    s.outline(-0.72)
    return s


def icon_seed_bag():
    """Folded kraft-paper seed packet with a rice sprig and visible grain."""
    s = Spr(16, 16)
    paper = Ramp("#c49a5c")
    ink = hx("#49301f")
    leaf = Ramp("#5c9d42")
    grain = Ramp("#e4c36b")
    # Packet silhouette and shaded paper body.
    s.poly([(3, 4), (12, 4), (14, 6), (13, 14), (4, 15), (2, 13), (2, 6)], ink)
    s.poly([(4, 5), (11, 5), (13, 7), (12, 13), (4, 14), (3, 12), (3, 7)], paper.m)
    s.vline(4, 7, 6, paper.l1)
    s.vline(11, 7, 5, paper.d1)
    s.hline(5, 13, 6, paper.d2)
    # Folded top flap and a short red-brown string seal.
    s.poly([(3, 4), (6, 2), (12, 3), (14, 6), (10, 5), (5, 5)], paper.l1)
    s.line(4, 4, 11, 4, paper.l2)
    s.p(8, 5, hx("#9a4932")); s.p(8, 6, hx("#d9ad61"))
    # Rice sprig emblem, gold grains and tiny printed detail.
    s.line(8, 12, 8, 8, leaf.d1)
    s.line(8, 10, 6, 8, leaf.m); s.line(8, 9, 10, 7, leaf.l1)
    s.p(5, 8, leaf.l2); s.p(11, 7, leaf.l2)
    s.p(7, 7, grain.l1); s.p(9, 6, grain.m); s.p(10, 9, grain.l2)
    s.hline(6, 12, 5, hx("#846039"))
    s.outline(-0.72)
    return s


def icon_watering_can():
    s = Spr(16, 16)
    c = Ramp("#4a86b8")
    s.rect(3, 6, 8, 8, c.m); s.vline(3, 6, 8, c.l1); s.vline(10, 6, 8, c.d1); s.hline(3, 6, 8, c.l2); s.hline(3, 13, 8, c.d2)
    s.line(11, 11, 14, 5, c.m); s.line(12, 11, 15, 5, c.d1)
    s.rect(13, 3, 3, 2, c.l1)
    s.line(3, 7, 3, 3, METAL.d1); s.hline(3, 3, 5, METAL.d1); s.line(8, 3, 9, 6, METAL.d1)
    s.outline(-0.72); return s


def icon_sickle():
    """Curved rice sickle with a bright sharpened inner edge and wood grip."""
    s = Spr(16, 16)
    wood = Ramp("#986039")
    iron = Ramp("#aebbc3")
    # Handle first so the blade socket naturally overlaps its upper end.
    s.line(8, 8, 14, 14, OUTC)
    s.line(9, 9, 14, 14, wood.d2)
    s.line(9, 8, 13, 13, wood.m)
    s.line(10, 8, 13, 12, wood.l1)
    s.poly([(12, 12), (15, 14), (14, 16), (11, 14), (10, 12)], OUTC)
    s.poly([(12, 13), (14, 14), (13, 15), (11, 13)], wood.m)
    s.p(12, 13, wood.l2)
    # Crescent blade, broad at the socket and tapering to a sharp tip.
    s.poly([(8, 9), (5, 8), (3, 6), (1, 3), (2, 1), (5, 1), (8, 2), (11, 4), (14, 7), (14, 9), (12, 8), (10, 6), (8, 5), (6, 4), (5, 4), (6, 6), (8, 7), (10, 8)], OUTC)
    s.poly([(7, 8), (4, 6), (2, 3), (3, 2), (5, 2), (8, 3), (11, 5), (13, 8), (12, 8), (10, 6), (8, 5), (6, 5), (7, 7), (9, 8)], iron.d1)
    s.poly([(3, 3), (5, 3), (8, 4), (11, 6), (12, 8), (10, 7), (8, 6), (6, 5), (4, 5)], iron.m)
    s.line(3, 3, 5, 3, iron.l2)
    s.line(5, 4, 8, 5, iron.l1)
    s.line(10, 7, 12, 9, iron.d2)
    s.poly([(7, 8), (9, 8), (10, 10), (8, 10), (7, 9)], iron.d2)
    s.outline(-0.72)
    return s

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


def icon_fishing_rod():
    """16px bamboo fishing rod with a fine line and curved hook."""
    s = Spr(16, 16)
    bamboo = Ramp("#a9773e")
    line = hx("#d8e4dc")
    iron = Ramp("#aebbc3")
    # Tapered bamboo pole and darker grip.
    s.line(1, 14, 11, 2, OUTC)
    s.line(2, 14, 11, 2, bamboo.d2)
    s.line(3, 13, 10, 3, bamboo.m)
    s.line(3, 12, 9, 3, bamboo.l1)
    s.p(2, 14, bamboo.d1); s.p(3, 13, bamboo.l2)
    # Fine fishing line hangs from the tip and ends in a small hook.
    s.line(11, 2, 13, 7, line)
    s.line(13, 7, 13, 10, line)
    s.line(13, 10, 11, 12, iron.m)
    s.p(10, 12, iron.l1)
    s.outline(-0.72)
    return s


def fish_icon(kind="silver_barb"):
    """Distinct small river-fish icons for the inventory and fishing markers."""
    palettes = {
        "silver_barb": ("#8fa8a9", "#c7d4c9", "#526f78", "#e7d9a1"),
        "catfish": ("#7d7880", "#b6a8a0", "#45414d", "#e6bd84"),
        "golden_carp": ("#c18a35", "#f0c85a", "#80502c", "#ffe9a0"),
    }
    body, light, dark, fin = palettes.get(kind, palettes["silver_barb"])
    s = Spr(16, 16)
    body_c, light_c, dark_c, fin_c = map(hx, (body, light, dark, fin))
    # Tail, fins and body are layered so the fish reads clearly at 16px.
    s.poly([(2, 7), (0, 4), (0, 10)], dark_c)
    s.poly([(2, 7), (1, 5), (1, 9)], fin_c)
    s.poly([(5, 6), (7, 3), (10, 5), (8, 7)], dark_c)
    s.poly([(6, 9), (9, 9), (11, 12), (7, 11)], dark_c)
    s.ell(8, 7, 6, 3, dark_c)
    s.ell(8, 6, 5, 2, body_c)
    s.hline(5, 5, 6, light_c)
    s.p(11, 6, hx("#fff1cf")); s.p(12, 6, dark_c)
    s.p(13, 7, hx("#2a1a14"))
    s.line(5, 8, 10, 8, fin_c)
    if kind == "catfish":
        s.line(12, 6, 14, 4, dark_c); s.line(12, 7, 15, 8, dark_c)
        s.p(13, 4, light_c); s.p(14, 8, light_c)
    elif kind == "golden_carp":
        s.p(7, 6, hx("#fff0a0")); s.p(9, 7, hx("#e9a83a")); s.p(10, 6, hx("#fff0a0"))
        s.line(4, 6, 4, 8, dark_c)
    else:
        s.p(7, 6, hx("#edf5e8")); s.p(9, 7, hx("#dce6da"))
    s.outline(-0.72)
    return s


def meal_icon(kind="fish_rice"):
    """16px top-down serving bowl with recipe-specific fish/broth garnish."""
    s = Spr(16, 16)
    bowl = Ramp("#d7d9d2")
    rim = hx("#3d6680")
    s.ell(8, 8, 7, 5, hx("#2a1a14"))
    s.ell(8, 7, 6, 4, bowl.m)
    s.ell(8, 6, 5, 3, hx("#f3ead0"))
    s.hline(3, 8, 10, rim); s.hline(4, 10, 8, rim)
    s.hline(5, 12, 6, bowl.d1)
    if kind == "mohinga":
        s.ell(8, 6, 4, 2, hx("#d99a3d"))
        s.hline(5, 6, 6, hx("#f0c66a"))
        s.p(6, 5, hx("#fff0bd")); s.p(10, 7, hx("#a94c2d"))
        s.p(8, 4, hx("#5c9d42")); s.p(9, 5, hx("#5c9d42"))
    elif kind == "fish_curry":
        s.ell(8, 6, 4, 2, hx("#b9562f"))
        s.p(6, 5, hx("#f0bd54")); s.p(9, 6, hx("#f4d27c"))
        s.p(11, 5, hx("#5c9d42")); s.p(5, 7, hx("#fff0bd"))
    else:
        for x, y in ((5, 6), (7, 5), (9, 5), (11, 6), (7, 7), (9, 7)):
            s.p(x, y, hx("#fffdf0"))
        s.poly([(5, 6), (7, 5), (8, 7), (6, 8)], hx("#c28b45"))
        s.p(6, 6, hx("#f0c66a")); s.p(10, 7, hx("#5c9d42"))
    s.outline(-0.72)
    return s


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
