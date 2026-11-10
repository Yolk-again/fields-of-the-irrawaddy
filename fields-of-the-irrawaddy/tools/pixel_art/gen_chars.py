"""Characters + animals. Frames are 16x24, sheet = 4 walk frames x 3 rows (down, up, side-right)."""
from pxlib import *

SKIN = Ramp("#e0a672")
SKIN_DARK = Ramp("#a96a43")
OUT = hx("#2a1a14")


def _legs(s, f, direction, longyi_bottom_y, pal):
    # frame 0/2 stand, 1/3 step. returns nothing; draws legs + feet below longyi
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    skin = pal["skin"]
    y = longyi_bottom_y
    if direction == "side":
        # two legs overlap, swing front/back
        s.rect(7 + step, y, 2, 24 - y - 1, skin.m)
        s.rect(7 - step, y, 2, 24 - y - 1, skin.d1)
        s.rect(7 + step, 22, 3, 2, pal["sandal"])
        s.rect(6 - step, 22, 3, 2, shade(pal["sandal"], -0.3))
    else:
        lift_l = 1 if (f == 1) else 0
        lift_r = 1 if (f == 3) else 0
        s.rect(5, y, 2, 24 - y - 1 - lift_l, skin.m)
        s.rect(9, y, 2, 24 - y - 1 - lift_r, skin.m)
        s.rect(5, 22 - lift_l, 3, 2, pal["sandal"])
        s.rect(8, 22 - lift_r, 3, 2, pal["sandal"])


def draw_person(f, direction, pal):
    s = Spr(16, 24)
    bob = 1 if f in (1, 3) else 0
    skin = pal["skin"]
    hair = pal["hair"]
    shirt = pal["shirt"]
    lungi = pal["longyi"]
    stripe = pal["stripe"]

    # ---- legs first (behind longyi)
    _legs(s, f, direction, 19, pal)

    # ---- longyi (tube skirt) rows 14..20
    top = 14 - bob + 1
    bot = 18
    if direction == "side":
        s.rect(5, top, 6, bot - top + 1, lungi.m)
        s.rect(5, top, 1, bot - top + 1, lungi.d1)
        s.rect(10, top, 1, bot - top + 1, lungi.l1)
        for yy in range(top + 2, bot + 1, 3):
            s.hline(5, yy, 6, stripe)
    else:
        s.rect(4, top, 8, bot - top + 1, lungi.m)
        s.rect(4, top, 1, bot - top + 1, lungi.d1)
        s.rect(11, top, 1, bot - top + 1, lungi.d1)
        s.rect(7, top + 3, 2, bot - top - 2, lungi.l1)  # knot fold highlight
        for yy in range(top + 2, bot + 1, 3):
            s.hline(4, yy, 8, stripe)
        for xx in (5, 10):
            s.vline(xx, top, bot - top + 1, shade(stripe, -0.1))
    # waist knot
    s.rect(7, top - 1, 2, 2, lungi.d1)

    # ---- torso (eingyi shirt) rows 9..14
    ty = 9 - bob + 1
    if direction == "side":
        s.rect(5, ty, 6, top - ty + 1, shirt.m)
        s.rect(5, ty, 1, top - ty + 1, shirt.d1)
        s.hline(6, ty, 4, shirt.l1)
    else:
        s.rect(4, ty, 8, top - ty + 1, shirt.m)
        s.rect(4, ty, 1, top - ty + 1, shirt.d1)
        s.rect(11, ty, 1, top - ty + 1, shirt.d1)
        s.hline(5, ty, 6, shirt.l1)
        if direction == "down":
            s.vline(8, ty + 1, top - ty - 1, shirt.d1)   # button line
            s.p(8, ty + 2, shirt.l2)

    # ---- arms
    sw = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    ay = ty + 1
    if direction == "side":
        s.rect(7 + sw, ay, 2, 5, shirt.m)
        s.rect(7 + sw, ay + 5, 2, 2, skin.m)
    else:
        s.rect(2, ay + (-sw if sw else 0) + 1, 2, 4, shirt.m)
        s.rect(12, ay + (sw if sw else 0) + 1, 2, 4, shirt.m)
        s.rect(2, ay + 4 + (-sw if sw else 0) + 1, 2, 2, skin.m)
        s.rect(12, ay + 4 + (sw if sw else 0) + 1, 2, 2, skin.m)

    # ---- head rows 2..9
    hy = 2 - bob + 1
    if direction == "side":
        s.rect(5, hy + 1, 7, 7, skin.m)
        s.rect(5, hy + 1, 1, 7, skin.d1)
        s.rect(11, hy + 3, 1, 2, skin.l1)      # nose
        s.p(10, hy + 4, OUT)                   # eye
        s.rect(5, hy, 6, 3, hair.m)            # hair back/top
        s.rect(4, hy + 1, 3, 5, hair.m)
        s.rect(4, hy + 1, 1, 5, hair.d1)
        if pal.get("thanaka"):
            s.rect(9, hy + 5, 2, 2, pal["thanaka"])
    else:
        s.rect(4, hy + 1, 8, 7, skin.m)
        s.rect(4, hy + 1, 1, 7, skin.d1)
        s.rect(11, hy + 1, 1, 7, skin.d1)
        s.hline(5, hy + 7, 6, skin.d1)
        if direction == "down":
            s.rect(4, hy, 8, 3, hair.m)
            s.p(4, hy + 3, hair.m); s.p(11, hy + 3, hair.m)
            s.hline(5, hy, 6, hair.l1)
            s.p(6, hy + 4, OUT); s.p(9, hy + 4, OUT)
            s.p(7, hy + 6, shade(skin.m, -0.45)); s.p(8, hy + 6, shade(skin.m, -0.45))
            if pal.get("thanaka"):
                s.rect(5, hy + 5, 2, 2, pal["thanaka"])
                s.rect(9, hy + 5, 2, 2, pal["thanaka"])
        else:  # up (back of head)
            s.rect(4, hy, 8, 8, hair.m)
            s.hline(5, hy, 6, hair.l1)
            s.rect(4, hy, 1, 8, hair.d1)
            s.rect(11, hy, 1, 8, hair.d1)

    # ---- headgear
    gear = pal.get("gear")
    if gear == "khamauk":   # wide conical bamboo farmer hat
        c = pal["hat"]
        s.poly([(8, hy - 3), (3, hy + 1), (13, hy + 1)], c.m)
        s.rect(1, hy + 1, 14, 2, c.m)
        s.hline(1, hy + 2, 14, c.d1)
        s.hline(2, hy + 1, 10, c.l1)
        s.p(8, hy - 3, c.l2)
        for xx in range(3, 14, 3):
            s.p(xx, hy + 1, c.d1)
        s.vline(4 if direction != "side" else 5, hy + 3, 3, pal["hat_strap"]) if direction == "down" else None
    elif gear == "gaung":   # gaung baung silk head-wrap with tail
        c = pal["wrap"]
        s.rect(4, hy - 1, 8, 4, c.m)
        s.hline(5, hy - 2, 6, c.m)
        s.hline(5, hy - 2, 4, c.l1)
        s.hline(4, hy + 2, 8, c.d1)
        if direction == "side":
            s.rect(2, hy, 3, 3, c.m); s.p(2, hy + 3, c.d1)
        else:
            s.rect(11, hy - 2, 3, 2, c.m); s.p(13, hy - 3, c.l1)
    elif gear == "bun":     # woman's hair bun with flower
        s.rect(6, hy - 2, 4, 3, hair.m)
        s.hline(6, hy - 2, 3, hair.l1)
        s.p(10, hy - 2, pal["flower"]); s.p(11, hy - 1, pal["flower"]); s.p(10, hy - 1, hx("#fff0b0"))

    out = Spr(16, 26)
    out.paste(s, 0, 2)
    out.outline(-0.72)
    return out


def person_sheet(pal):
    frames = []
    for d in ("down", "up", "side"):
        for f in range(4):
            frames.append(draw_person(f, d, pal))
    # the outline adds nothing to canvas size (we kept 1px inside), but clip to 16x24
    return sheet(frames, cols=4)


def pals():
    base = dict(skin=SKIN, hair=Ramp("#2d211c"), sandal=hx("#6a4528"),
                hat=Ramp("#d9b45f"), hat_strap=hx("#8a2f2a"), thanaka=None, gear="khamauk")
    out = {}
    for name, shirt, lg, st in [
        ("farmer_green",  "#f1ead2", "#3f8f58", "#2a6a3f"),
        ("farmer_blue",   "#f1ead2", "#3f6fb0", "#27487f"),
        ("farmer_red",    "#f1ead2", "#b24a3c", "#7e2c25"),
        ("farmer_purple", "#f1ead2", "#7c56a4", "#553880"),
    ]:
        p = dict(base); p.update(shirt=Ramp(shirt), longyi=Ramp(lg), stripe=hx(st))
        out[name] = p
    # Ma Thiri: htamein, thanaka, bun with flower, no hat
    out["ma_thiri"] = dict(base, gear="bun", thanaka=hx("#f2dd8a"), flower=hx("#ff7aa8"),
                           hair=Ramp("#1f1714"), skin=Ramp("#e6b183"),
                           shirt=Ramp("#f6a1b4"), longyi=Ramp("#2f8fa0"), stripe=hx("#e8c75a"))
    # Ko Aung: gaung baung head-wrap, brown longyi
    out["ko_aung"] = dict(base, gear="gaung", wrap=Ramp("#ef9a2c"), skin=Ramp("#cf9360"),
                          hair=Ramp("#241a16"), shirt=Ramp("#e8e0c8"), longyi=Ramp("#8a5a38"),
                          stripe=hx("#5b3720"))
    return out


# ---------------- animals ----------------
def chicken(f):
    s = Spr(16, 16)
    peck = f == 1
    body = Ramp("#f2efe6")
    s.ell(8, 10, 5, 4, body.m)
    s.ell(7, 11, 3, 2, body.l1)
    s.rect(3, 8, 3, 3, body.d1)  # tail
    hx_ = 11 if not peck else 12
    hy_ = 5 if not peck else 8
    s.ell(hx_, hy_, 2, 2, body.m)
    s.p(hx_ + 1, hy_ - 1, OUT)
    s.p(hx_ - 1, hy_ - 3, hx("#d63b3b")); s.p(hx_, hy_ - 3, hx("#d63b3b"))   # comb
    s.p(hx_ + 2, hy_, hx("#f2a22c")); s.p(hx_ + 3, hy_, hx("#f2a22c"))       # beak
    s.p(hx_, hy_ + 2, hx("#d63b3b"))
    legs = [(6, 14), (9, 14)] if f != 2 else [(5, 14), (10, 14)]
    for x, y in legs:
        s.vline(x, y, 1, hx("#e09a2b")); s.hline(x, y + 1, 2, hx("#e09a2b"))
    s.outline(-0.7)
    return s


def duck(f):
    s = Spr(16, 16)
    body = Ramp("#f5f0d8")
    s.ell(7, 10, 5, 3, body.m)
    s.ell(6, 11, 3, 2, body.l1)
    s.rect(11, 5, 4, 4, hx("#2f7f4a"))      # green head (mallard)
    s.hline(11, 5, 3, hx("#3f9a5c"))
    s.rect(12, 9, 2, 1, hx("#f6f2dc"))
    s.p(13, 6, OUT)
    s.rect(14, 7, 3 if f == 0 else 2, 1, hx("#f2b02c"))
    s.rect(2, 8, 3, 2, body.d1)
    s.rect(5, 12 + (1 if f == 1 else 0), 2, 1, hx("#f2902c"))
    s.rect(8, 12 + (1 if f == 2 else 0), 2, 1, hx("#f2902c"))
    s.outline(-0.7)
    return s


def buffalo(f):
    s = Spr(44, 30)
    body = Ramp("#6a645e")
    # body
    s.ell(20, 15, 15, 9, body.m)
    s.ell(18, 12, 12, 5, body.l1)
    s.hline(10, 10, 14, body.l2)
    # hump / neck / head (faces right)
    s.ell(33, 14, 5, 5, body.m)
    s.rect(34, 14, 7, 7, body.d1)
    s.rect(38, 17, 4, 4, shade(body.m, 0.2))      # muzzle
    s.p(40, 19, OUT); s.p(40, 15, OUT) if False else None
    s.p(37, 15, OUT)
    # horns (big swept-back)
    horn = hx("#e8dcc0")
    s.line(34, 11, 30, 6, horn); s.line(30, 6, 27, 6, horn); s.p(27, 5, horn)
    s.line(36, 11, 40, 5, horn) if False else None
    # tail
    s.line(5, 11, 3, 18, body.d1)
    # legs with walk offset
    off = [0, 1, 0, -1][f % 4]
    for x, o in ((10, off), (14, -off), (24, -off), (28, off)):
        s.rect(x, 21, 3, 7 + (0), body.d1)
        s.rect(x, 27 + (1 if o > 0 else 0), 3, 1, hx("#3b352f"))
    # mud streaks
    for x, y in ((12, 17), (19, 19), (26, 16)):
        s.hline(x, y, 3, hx("#4d4338"))
    s.outline(-0.72)
    return s
