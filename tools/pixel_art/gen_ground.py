"""World ground map + 16x16 terrain tiles. The map is painted per-pixel from a kind-grid so
paths, canal, paddy and grass all blend naturally (no visible tile seams)."""
from pxlib import *
from gen_buildings import STONE, WOOD, TEAK

GRASS = Ramp("#68ad45")
DIRT = Ramp("#b98f58")
SOIL = Ramp("#8a5a34")
WATER = Ramp("#4aa0bf")
PADDY = Ramp("#7fb0a6")
MUD = Ramp("#7a5a3a")

K_GRASS, K_PATH, K_WATER, K_BANK, K_PADDY, K_BUND, K_PLAZA = range(7)


def grass_px(x, y, coarse, fine):
    n = coarse[y][x] * 0.62 + fine[y][x] * 0.38
    if n < 0.30:
        return GRASS.d1
    if n > 0.74:
        return GRASS.l1
    return GRASS.m


def tuft(img, x, y, rnd):
    h = rnd.choice([2, 3, 3, 4])
    for i in range(h):
        c = GRASS.l2 if i == h - 1 else GRASS.l1
        if 0 <= x < img.w and 0 <= y - i < img.h:
            img.p(x, y - i, c)
    if 0 <= x + 1 < img.w:
        img.p(x + 1, y, GRASS.d1)
    if 0 <= x - 1 < img.w and h > 2:
        img.p(x - 1, y - 1, GRASS.l1)


def build_ground(W=720, H=320):
    rnd = random.Random(2026)
    coarse = value_noise(W, H, 14, 11)
    fine = value_noise(W, H, 3, 12)
    wob = value_noise(W, 8, 9, 13)
    kind = [[K_GRASS] * W for _ in range(H)]

    def fill(x0, y0, x1, y1, k):
        for y in range(max(0, y0), min(H, y1)):
            for x in range(max(0, x0), min(W, x1)):
                kind[y][x] = k

    # ---- paths (organic edges)
    for x in range(W):
        top = 135 + int(wob[0][x] * 3); bot = 157 - int(wob[1][x] * 3)
        for y in range(top, bot):
            kind[y][x] = K_PATH
    for y in range(102, 158):
        l = 87 + int(wob[2][y % W] * 2); r = 107 - int(wob[3][y % W] * 2)
        for x in range(l, r):
            kind[y][x] = K_PATH
    for y in range(155, 262):
        l = 516 + int(wob[4][y % W] * 2); r = 540 - int(wob[5][y % W] * 2)
        for x in range(l, r):
            kind[y][x] = K_PATH
    # stone plaza before the monastery / zedi
    for y in range(108, 132):
        for x in range(575, 705):
            if (x - 640) ** 2 / 66 ** 2 + (y - 120) ** 2 / 13 ** 2 < 1:
                kind[y][x] = K_PLAZA
    # ---- canal + banks
    fill(0, 259, W, 264, K_BANK)
    fill(0, 264, W, 297, K_WATER)
    fill(0, 297, W, 302, K_BANK)
    # ---- paddy
    fill(212, 165, 349, 237, K_BUND)
    fill(215, 168, 346, 234, K_PADDY)

    img = Spr(W, H)
    px = img.im.load()
    for y in range(H):
        for x in range(W):
            k = kind[y][x]
            if k == K_GRASS:
                px[x, y] = grass_px(x, y, coarse, fine)
            elif k == K_PATH:
                n = fine[y][x] * 0.6 + coarse[y][x] * 0.4
                c = DIRT.m
                if n < 0.3: c = DIRT.d1
                elif n > 0.72: c = DIRT.l1
                if rnd.random() < 0.04: c = DIRT.l2
                elif rnd.random() < 0.03: c = DIRT.d2
                px[x, y] = c
            elif k == K_PLAZA:
                c = STONE.m
                if (x // 8 + (y // 6) * 3) % 4 == 0: c = STONE.l1
                if x % 8 == 0 or y % 6 == 0: c = STONE.d1
                px[x, y] = c
            elif k == K_WATER:
                t = (y - 264) / 33
                c = WATER.d1 if t < 0.10 else WATER.m if t < 0.62 else WATER.l1
                px[x, y] = c
            elif k == K_BANK:
                c = MUD.m if fine[y][x] > 0.4 else MUD.d1
                if y in (259, 260): c = GRASS.d1
                px[x, y] = c
            elif k == K_PADDY:
                n = fine[y][x]
                c = PADDY.m
                if n < 0.3: c = PADDY.d1
                elif n > 0.78: c = PADDY.l1
                px[x, y] = c
            elif k == K_BUND:
                px[x, y] = DIRT.m

    # path edge: darker rim where path touches grass + ragged grass fringe
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if kind[y][x] == K_PATH:
                nb = [kind[y + 1][x], kind[y - 1][x], kind[y][x + 1], kind[y][x - 1]]
                if K_GRASS in nb:
                    px[x, y] = DIRT.d1 if (nb[1] == K_GRASS or nb[3] == K_GRASS) else DIRT.d2
            elif kind[y][x] == K_GRASS:
                nb = [kind[y + 1][x], kind[y - 1][x], kind[y][x + 1], kind[y][x - 1]]
                if K_PATH in nb and rnd.random() < 0.35:
                    px[x, y] = DIRT.d1
    # plaza rim
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if kind[y][x] == K_PLAZA:
                if K_PLAZA != kind[y + 1][x] or K_PLAZA != kind[y][x + 1]:
                    px[x, y] = STONE.d2
                elif K_PLAZA != kind[y - 1][x] or K_PLAZA != kind[y][x - 1]:
                    px[x, y] = STONE.l2

    # canal details: ripples, glints, bank stones, reeds
    for _ in range(170):
        x = rnd.randint(0, W - 12); y = rnd.randint(267, 293)
        L = rnd.randint(3, 9)
        c = WATER.l2 if rnd.random() < 0.5 else WATER.d1
        for i in range(L):
            if kind[y][x + i] == K_WATER:
                px[x + i, y] = c
    for y in (264, 265):
        for x in range(W):
            px[x, y] = WATER.d2 if y == 264 else WATER.d1
    for x in range(W):
        if (x // 3) % 7 == 0:
            px[x, 296] = WATER.l2
    for _ in range(90):
        x = rnd.randint(0, W - 1); y = rnd.choice([261, 262, 298, 299])
        px[x, y] = rnd.choice([STONE.m, STONE.l1, MUD.d2, MUD.l1])
    for _ in range(26):
        x = rnd.randint(0, W - 1)
        if not (500 < x < 556):
            base = rnd.choice([258, 301])
            hgt = rnd.randint(4, 8)
            for i in range(hgt):
                if 0 <= base - i < H: px[x, base - i] = GRASS.l1 if i % 2 else GRASS.m
            if base - hgt >= 0: px[x, base - hgt] = hx("#8a5a34")
    # paddy: bund shading + water streaks + furrows between plant rows
    for x in range(212, 349):
        px[x, 165] = DIRT.l2; px[x, 166] = DIRT.l1; px[x, 167] = DIRT.m
        px[x, 235] = DIRT.d1; px[x, 236] = DIRT.d2; px[x, 234] = DIRT.m
    for y in range(165, 237):
        px[212, y] = DIRT.l1; px[213, y] = DIRT.m
        px[347, y] = DIRT.d1; px[348, y] = DIRT.d2
    for r in range(7):
        yy = 177 + r * 11 - 5
        for x in range(217, 345):
            if kind[yy][x] == K_PADDY:
                px[x, yy] = PADDY.d1 if (x // 6) % 2 else PADDY.d2
    for _ in range(95):
        x = rnd.randint(217, 336); y = rnd.randint(170, 232)
        L = rnd.randint(2, 6)
        for i in range(L):
            if kind[y][x + i] == K_PADDY: px[x + i, y] = PADDY.l2

    # decoration: grass tufts, flowers, pebbles
    blocked = lambda x, y: kind[y][x] != K_GRASS
    for _ in range(2300):
        x = rnd.randint(1, W - 2); y = rnd.randint(4, H - 2)
        if not blocked(x, y):
            tuft(img, x, y, rnd)
    flower_cols = ["#fff2c2", "#ffd84a", "#ff9ec0", "#ffffff", "#b9a0ff", "#ff8f4a"]
    for _ in range(190):
        x = rnd.randint(2, W - 3); y = rnd.randint(5, H - 3)
        if blocked(x, y):
            continue
        c = hx(rnd.choice(flower_cols))
        px[x, y] = c
        if rnd.random() < 0.5:
            px[x + 1, y] = c
            px[x, y + 1] = GRASS.d1
    for _ in range(150):
        x = rnd.randint(2, W - 4); y = rnd.randint(5, H - 3)
        if kind[y][x] == K_PATH and kind[y][x + 1] == K_PATH:
            px[x, y] = STONE.m; px[x + 1, y] = STONE.d1; px[x, y - 1] = STONE.l1
    for _ in range(60):
        x = rnd.randint(2, W - 4); y = rnd.randint(5, H - 3)
        if not blocked(x, y):
            px[x, y] = STONE.l1; px[x + 1, y] = STONE.m; px[x, y + 1] = STONE.d1; px[x + 1, y + 1] = STONE.d1
    # farm-plot ground: slightly worn turf so players see where to farm
    for y in range(176, 228):
        for x in range(129, 212):
            if kind[y][x] == K_GRASS and rnd.random() < 0.08:
                px[x, y] = GRASS.l1
    return img


# ------------------------- 16x16 tiles -------------------------------
def tile_grass(seed, flowers=False, lush=False):
    rnd = random.Random(seed)
    s = Spr(16, 16)
    c = value_noise(16, 16, 5, seed, wrap=False)
    f = value_noise(16, 16, 2, seed + 1)
    base = Ramp("#5fa83c") if lush else GRASS
    for y in range(16):
        for x in range(16):
            n = c[y][x] * .6 + f[y][x] * .4
            s.p(x, y, base.d1 if n < .3 else base.l1 if n > .74 else base.m)
    for _ in range(5):
        x, y = rnd.randint(1, 14), rnd.randint(3, 15)
        s.p(x, y, base.l2); s.p(x, y - 1, base.l1)
    if flowers:
        for _ in range(3):
            x, y = rnd.randint(1, 14), rnd.randint(1, 14)
            s.p(x, y, hx(rnd.choice(["#ffd84a", "#ffffff", "#ff9ec0"])))
    return s


def tile_dirt(seed, ramp=DIRT, cracked=False):
    rnd = random.Random(seed)
    s = Spr(16, 16)
    f = value_noise(16, 16, 3, seed)
    for y in range(16):
        for x in range(16):
            n = f[y][x]
            s.p(x, y, ramp.d1 if n < .3 else ramp.l1 if n > .72 else ramp.m)
    for _ in range(6): s.p(rnd.randint(0, 15), rnd.randint(0, 15), ramp.l2)
    if cracked:
        x, y = 3, 2
        for _ in range(14):
            s.p(x, y, ramp.d2); x += rnd.choice([0, 1, 1]); y += rnd.choice([0, 1])
        x, y = 12, 4
        for _ in range(9):
            s.p(x, y, ramp.d2); x -= rnd.choice([0, 1]); y += rnd.choice([1, 1, 0])
    return s


def tile_plot():
    s = tile_grass(77)
    for p in ((0, 0), (1, 0), (0, 1), (14, 0), (15, 0), (15, 1), (0, 14), (0, 15), (1, 15), (15, 14), (15, 15), (14, 15)):
        s.p(p[0], p[1], GRASS.l2)
    return s


def tile_tilled(wet=False):
    s = Spr(16, 16)
    r = Ramp("#5a3b24") if wet else Ramp("#8a5a34")
    rnd = random.Random(5 if wet else 6)
    for y in range(16):
        band = y % 5
        for x in range(16):
            if band == 0: c = r.l1
            elif band == 1: c = r.m
            elif band == 2: c = r.m
            elif band == 3: c = r.d1
            else: c = r.d2
            if rnd.random() < 0.07: c = r.l2 if band < 3 else r.d2
            s.p(x, y, c)
    if wet:
        for x, y in ((3, 1), (4, 1), (10, 6), (11, 6), (6, 11), (7, 11), (13, 13)):
            s.p(x, y, hx("#7cb8d0"))
    return s


def tile_paddy():
    s = Spr(16, 16)
    f = value_noise(16, 16, 3, 41)
    for y in range(16):
        for x in range(16):
            s.p(x, y, PADDY.d1 if f[y][x] < .3 else PADDY.l1 if f[y][x] > .78 else PADDY.m)
    for x in range(2, 12): s.p(x, 5, PADDY.l2)
    for x in range(6, 14): s.p(x, 11, PADDY.l2)
    return s


def tile_water(frame):
    s = Spr(16, 16)
    for y in range(16):
        for x in range(16):
            s.p(x, y, WATER.m if y > 2 else WATER.d1)
    off = frame * 4
    for (x, y, L) in ((2, 5, 5), (9, 9, 4), (4, 13, 6), (11, 3, 3)):
        for i in range(L): s.p((x + i + off) % 16, y, WATER.l2 if frame % 2 == 0 else WATER.l1)
    return s


def tile_misc():
    t = {}
    t["plain_grass"] = tile_grass(1)
    t["field_grass"] = tile_grass(2, flowers=True)
    t["lush_grass"] = tile_grass(3, lush=True, flowers=True)
    t["muddy_grass"] = tile_dirt(4, Ramp("#6a5a38"))
    for y in range(0, 16, 3):
        for x in range(0, 16):
            if (x * 7 + y) % 5 == 0: t["muddy_grass"].p(x, y, GRASS.m)
    t["dry_soil"] = tile_dirt(5, Ramp("#b98f58"))
    t["cracked_soil"] = tile_dirt(6, Ramp("#a8825a"), cracked=True)
    t["stone_ground"] = Spr(16, 16)
    sg = t["stone_ground"]
    for y in range(16):
        for x in range(16):
            sg.p(x, y, STONE.d1 if (x % 8 == 0 or y % 6 == 0) else STONE.m if (x // 8 + y // 6) % 2 else STONE.l1)
    t["riverbank"] = tile_dirt(8, MUD)
    t["harvested_straw"] = tile_dirt(9, Ramp("#c9a64c"))
    for x in range(0, 16, 3):
        t["harvested_straw"].p(x, (x * 5) % 16, hx("#f0d070")); t["harvested_straw"].p(x + 1, (x * 5) % 16, hx("#f0d070"))
    t["wet_rice_paddy"] = tile_paddy()
    t["rice_seedlings"] = tile_paddy()
    for x in (3, 8, 13):
        for y in (4, 11):
            t["rice_seedlings"].p(x, y, hx("#6bc04a")); t["rice_seedlings"].p(x, y - 1, hx("#9ae06a")); t["rice_seedlings"].p(x + 1, y, hx("#4a9a3a"))
    t["young_crops"] = tile_tilled(); 
    for x in (3, 8, 13):
        for y in (3, 8, 13):
            t["young_crops"].p(x, y, hx("#6bc04a")); t["young_crops"].p(x, y - 1, hx("#9ae06a"))
    t["tilled_soil"] = tile_tilled()
    t["tilled_soil_wet"] = tile_tilled(True)
    t["farm_plot"] = tile_plot()
    t["village_ground_base"] = None
    return t
