"""People v2: 16x26 frames, 4 cols x 5 rows = [down, up, side, work, sit].
Adds Burmese monk + village kid, plus work / sit poses for every character."""
from pxlib import *
from gen_chars import SKIN, OUT, pals

WOOD = Ramp("#a8723f")
METAL = Ramp("#aab4ba")
STRAW = Ramp("#d9b45f")


def _seg(s, x0, y0, x1, y1, c):
    s.line(x0, y0, x1, y1, c)


def _tool(u, kind, H, B):
    if kind == "hoe":
        _seg(u, H[0], H[1], B[0], B[1], WOOD.m)
        _seg(u, H[0] + 1, H[1], B[0] + 1, B[1], WOOD.l1)
        ex, ey = B
        u.rect(ex - 1, ey - 1, 4, 2, METAL.m); u.p(ex - 1, ey - 1, METAL.l2); u.p(ex + 2, ey, METAL.d1)
    elif kind == "broom":
        _seg(u, H[0], H[1], B[0], B[1], hx("#b98a3a"))
        ex, ey = B
        u.rect(ex - 2, ey - 1, 5, 3, STRAW.m); u.hline(ex - 2, ey + 1, 5, STRAW.d1); u.p(ex - 1, ey - 1, STRAW.l1)
        for dx in (-2, 0, 2): u.p(ex + dx, ey + 2, STRAW.d2)


HANDS = {
    "hoe":   [((6, 8), (3, 3)), ((10, 8), (13, 5)), ((12, 14), (14, 21)), ((10, 11), (13, 12))],
    "broom": [((11, 14), (15, 22)), ((12, 15), (13, 22)), ((10, 14), (9, 22)), ((11, 14), (12, 22))],
    "bend":  [((11, 17), None), ((12, 18), None), ((11, 17), None), ((10, 16), None)],
}


def _parts(f, direction, pal, pose="walk", tool=None):
    """Return (lower_layer, upper_layer) 16x24 sprites."""
    lo, up = Spr(16, 24), Spr(16, 24)
    skin, hair, shirt, lungi, stripe = pal["skin"], pal["hair"], pal["shirt"], pal["longyi"], pal["stripe"]
    bob = 1 if (pose == "walk" and f in (1, 3)) else 0
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f] if pose == "walk" else 0
    robe = pal.get("robe", False)
    bot = 21 if robe else 18
    top = 15 - bob
    # --- legs
    if direction == "side":
        lo.rect(7 + step, 19, 2, 4, skin.m); lo.rect(7 - step, 19, 2, 4, skin.d1)
        lo.rect(7 + step, 22, 3, 2, pal["sandal"]); lo.rect(6 - step, 22, 3, 2, shade(pal["sandal"], -.3))
    else:
        ll = 1 if (pose == "walk" and f == 1) else 0
        lr = 1 if (pose == "walk" and f == 3) else 0
        lo.rect(5, 19, 2, 4 - ll, skin.m); lo.rect(9, 19, 2, 4 - lr, skin.m)
        lo.rect(5, 22 - ll, 3, 2, pal["sandal"]); lo.rect(8, 22 - lr, 3, 2, pal["sandal"])
    # --- longyi / robe
    x0, x1 = (5, 10) if direction == "side" else (4, 11)
    lo.rect(x0, top, x1 - x0 + 1, bot - top + 1, lungi.m)
    lo.rect(x0, top, 1, bot - top + 1, lungi.d1)
    if direction != "side": lo.rect(x1, top, 1, bot - top + 1, lungi.d1)
    if robe:
        for yy in range(top + 2, bot, 3):
            lo.hline(x0 + 1, yy, x1 - x0 - 1, lungi.d1)
        lo.vline(7, top + 1, bot - top - 1, lungi.l1)
    else:
        for yy in range(top + 2, bot + 1, 3): lo.hline(x0, yy, x1 - x0 + 1, stripe)
        if direction != "side":
            for xx in (5, 10): lo.vline(xx, top, bot - top + 1, shade(stripe, -.1))
            lo.rect(7, top + 3, 2, bot - top - 2, lungi.l1)
        lo.rect(7, top - 1, 2, 2, lungi.d1)
    # --- torso
    ty = 10 - bob
    tw0, tw1 = (5, 10) if direction == "side" else (4, 11)
    up.rect(tw0, ty, tw1 - tw0 + 1, top - ty + 1, shirt.m)
    up.rect(tw0, ty, 1, top - ty + 1, shirt.d1)
    if direction != "side": up.rect(tw1, ty, 1, top - ty + 1, shirt.d1)
    up.hline(tw0 + 1, ty, tw1 - tw0 - 1, shirt.l1)
    if robe and direction == "down":
        up.rect(8, ty, 4, 5, skin.m); up.rect(8, ty, 1, 5, skin.d1)      # bare right shoulder
        up.line(4, ty + 6, 11, ty + 1, shirt.d1)                          # robe sash
    if direction == "down" and not robe:
        up.vline(8, ty + 1, top - ty - 1, shirt.d1); up.p(8, ty + 2, shirt.l2)
    # --- head
    hy = 3 - bob
    if direction == "side":
        up.rect(5, hy + 1, 7, 7, skin.m); up.rect(5, hy + 1, 1, 7, skin.d1)
        up.rect(11, hy + 3, 1, 2, skin.l1); up.p(10, hy + 4, OUT)
        if not pal.get("bald"):
            up.rect(5, hy, 6, 3, hair.m); up.rect(4, hy + 1, 3, 5, hair.m); up.rect(4, hy + 1, 1, 5, hair.d1)
        if pal.get("thanaka"): up.rect(9, hy + 5, 2, 2, pal["thanaka"])
    else:
        up.rect(4, hy + 1, 8, 7, skin.m); up.rect(4, hy + 1, 1, 7, skin.d1); up.rect(11, hy + 1, 1, 7, skin.d1)
        up.hline(5, hy + 7, 6, skin.d1)
        if direction == "down":
            if not pal.get("bald"):
                up.rect(4, hy, 8, 3, hair.m); up.p(4, hy + 3, hair.m); up.p(11, hy + 3, hair.m); up.hline(5, hy, 6, hair.l1)
            if pal.get("bald"):
                up.hline(5, hy + 1, 6, skin.l1); up.p(3, hy + 4, skin.d1); up.p(12, hy + 4, skin.d1)   # ears
                up.hline(6, hy + 4, 2, OUT); up.hline(9, hy + 4, 2, OUT)                              # calm closed eyes
            else:
                up.p(6, hy + 4, OUT); up.p(9, hy + 4, OUT)
            up.hline(7, hy + 6, 2, shade(skin.m, -.45))
            if pal.get("thanaka"):
                up.rect(5, hy + 5, 2, 2, pal["thanaka"]); up.rect(9, hy + 5, 2, 2, pal["thanaka"])
        else:
            if pal.get("bald"):
                up.rect(4, hy, 8, 8, skin.m); up.hline(5, hy, 6, skin.l1); up.rect(4, hy, 1, 8, skin.d1)
            else:
                up.rect(4, hy, 8, 8, hair.m); up.hline(5, hy, 6, hair.l1); up.rect(4, hy, 1, 8, hair.d1); up.rect(11, hy, 1, 8, hair.d1)
    gear = pal.get("gear")
    if gear == "khamauk":
        c = pal["hat"]
        up.poly([(8, hy - 2), (3, hy + 2), (13, hy + 2)], c.m)
        up.rect(1, hy + 2, 14, 2, c.m); up.hline(1, hy + 3, 14, c.d1); up.hline(2, hy + 2, 10, c.l1); up.p(8, hy - 2, c.l2)
        for xx in range(3, 14, 3): up.p(xx, hy + 2, c.d1)
    elif gear == "gaung":
        c = pal["wrap"]
        up.rect(4, hy - 1, 8, 4, c.m); up.hline(5, hy - 2, 6, c.m); up.hline(5, hy - 2, 4, c.l1); up.hline(4, hy + 2, 8, c.d1)
        if direction == "side": up.rect(2, hy, 3, 3, c.m); up.p(2, hy + 3, c.d1)
        else: up.rect(11, hy - 2, 3, 2, c.m); up.p(13, hy - 3, c.l1)
    elif gear == "bun":
        up.rect(6, hy - 2, 4, 3, hair.m); up.hline(6, hy - 2, 3, hair.l1)
        up.p(10, hy - 2, pal["flower"]); up.p(11, hy - 1, pal["flower"]); up.p(10, hy - 1, hx("#fff0b0"))
    # --- arms
    sw = {0: 0, 1: 1, 2: 0, 3: -1}[f] if pose == "walk" else 0
    ay = ty + 1
    if pose == "walk":
        if pal.get("bowl") and direction != "up":
            # hands holding an alms bowl at the belly
            if direction == "down":
                up.rect(3, ay + 1, 2, 5, shirt.m); up.rect(11, ay + 1, 2, 5, shirt.m)
                up.rect(5, ay + 5, 6, 2, skin.m)
            else:
                up.rect(8, ay + 1, 2, 5, shirt.m); up.rect(9, ay + 5, 2, 2, skin.m)
            bx = 6 if direction == "down" else 9
            up.rect(bx, ay + 5, 4, 3, hx("#2a2018")); up.hline(bx, ay + 5, 4, hx("#5a4a3a")); up.p(bx + 1, ay + 5, hx("#9a8a6a"))
        elif direction == "side":
            up.rect(7 + sw, ay, 2, 5, shirt.m); up.rect(7 + sw, ay + 5, 2, 2, skin.m)
        else:
            up.rect(2, ay + (-sw if sw else 0) + 1, 2, 4, shirt.m); up.rect(12, ay + (sw if sw else 0) + 1, 2, 4, shirt.m)
            up.rect(2, ay + 5 + (-sw if sw else 0), 2, 2, skin.m); up.rect(12, ay + 5 + (sw if sw else 0), 2, 2, skin.m)
    return lo, up


def _compose(lo, up, off=(0, 0), tool=None, hands=None, sprout=False):
    out = Spr(16, 26)
    out.paste(lo, 0, 2)
    up2 = up
    if hands is not None:
        up2 = Spr(16, 24); up2.paste(up, 0, 0)
    out.paste(up2, off[0], 2 + off[1])
    return out


def person_frame(f, direction, pal):
    lo, up = _parts(f, direction, pal)
    o = _compose(lo, up); o.outline(-.72); return o


def work_frame(f, pal, kind):
    lo, up = _parts(f, "side", pal, pose="work")
    lean = (2, 3) if kind == "bend" else (0, 0)
    H, B = HANDS[kind][f]
    shirt = pal["shirt"]
    S = (8, 11)
    # arm
    up.line(S[0], S[1], H[0], H[1], shirt.m); up.line(S[0] + 1, S[1], H[0] + 1, H[1], shirt.d1)
    up.rect(H[0], H[1], 2, 2, pal["skin"].m)
    if kind == "bend" and f in (1, 2):
        up.p(H[0] + 1, H[1] + 2, hx("#6bc04a")); up.p(H[0] + 1, H[1] + 1, hx("#9ae06a"))
    if B is not None:
        _tool(up, kind, H, B)
    o = Spr(16, 26); o.paste(lo, 0, 2); o.paste(up, lean[0], 2 + lean[1]); o.outline(-.72); return o


def sit_frame(f, pal):
    lo, up = _parts(0, "down", pal, pose="sit")
    # replace lower layer with a crossed-legs mound
    lo = Spr(16, 24)
    L = pal["longyi"]
    lo.ell(8, 19, 7, 3, L.d1); lo.ell(8, 18, 6, 3, L.m)
    lo.hline(3, 20, 10, L.d1); lo.hline(5, 17, 6, L.l1)
    lo.ell(4, 21, 2, 1, pal["skin"].m); lo.ell(11, 21, 2, 1, pal["skin"].m)   # feet peeking out
    # upper layer: hide hanging arms by re-drawing torso w/o arms, then forearms in lap
    up2 = Spr(16, 24)
    for y in range(24):
        for x in range(16):
            px = up.get(x, y)
            if px[3] and not (y >= 11 and (x <= 3 or x >= 12)):
                up2.p(x, y, px)
    sh = pal["shirt"]
    up2.rect(4, 15, 8, 2, sh.d1)
    up2.rect(6, 16, 4, 2, pal["skin"].m); up2.hline(6, 16, 4, pal["skin"].l1)
    breathe = -1 if f in (1, 2) else 0
    o = Spr(16, 26)
    o.paste(lo, 0, 2)
    o.paste(up2, 0, 2 + 6 + breathe)
    # clip hang-down: nothing below torso except lap
    o.outline(-.72); return o


# ------------------------------- kid ----------------------------------
def kid_frame(f, direction, pal, pose="walk"):
    s = Spr(16, 26)
    sk, hair, sh, lg = pal["skin"], pal["hair"], pal["shirt"], pal["longyi"]
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    dy = 0
    arms_up = False
    if pose == "play":
        dy = [-1, -4, -5, -2][f]; arms_up = f in (1, 2)
    base = 24 + dy
    # legs
    if pose == "play":
        spread = [0, 2, 2, 1][f]
        s.rect(6 - spread, base - 3, 2, 3, sk.m); s.rect(9 + spread, base - 3, 2, 3, sk.m)
        s.rect(6 - spread, base - 1, 3, 1, pal["sandal"]); s.rect(9 + spread, base - 1, 3, 1, pal["sandal"])
    elif direction == "side":
        s.rect(7 + step, base - 4, 2, 4, sk.m); s.rect(7 - step, base - 4, 2, 4, sk.d1)
        s.rect(7 + step, base - 1, 3, 1, pal["sandal"]); s.rect(6 - step, base - 1, 3, 1, pal["sandal"])
    else:
        l = 1 if f == 1 else 0; r = 1 if f == 3 else 0
        s.rect(5, base - 4, 2, 4 - l, sk.m); s.rect(9, base - 4, 2, 4 - r, sk.m)
        s.rect(5, base - 1 - l, 3, 1, pal["sandal"]); s.rect(8, base - 1 - r, 3, 1, pal["sandal"])
    # shorts / short longyi
    s.rect(4, base - 7, 8, 4, lg.m); s.rect(4, base - 7, 1, 4, lg.d1); s.hline(4, base - 5, 8, pal["stripe"])
    # shirt
    s.rect(4, base - 11, 8, 5, sh.m); s.rect(4, base - 11, 1, 5, sh.d1); s.hline(5, base - 11, 6, sh.l1)
    # arms
    if arms_up:
        s.rect(2, base - 15, 2, 5, sh.m); s.rect(12, base - 15, 2, 5, sh.m)
        s.rect(2, base - 16, 2, 2, sk.m); s.rect(12, base - 16, 2, 2, sk.m)
    elif direction == "side" and pose == "walk":
        s.rect(7 + step * 2, base - 10, 2, 4, sh.m); s.rect(7 + step * 2, base - 7, 2, 2, sk.m)
    else:
        a = step if pose == "walk" else 0
        s.rect(2, base - 10 + a, 2, 4, sh.m); s.rect(12, base - 10 - a, 2, 4, sh.m)
        s.rect(2, base - 7 + a, 2, 2, sk.m); s.rect(12, base - 7 - a, 2, 2, sk.m)
    # head (big)
    hy = base - 19
    if direction == "side":
        s.rect(4, hy, 8, 8, sk.m); s.rect(4, hy, 1, 8, sk.d1)
        s.rect(4, hy - 1, 7, 3, hair.m); s.p(10, hy + 4, OUT); s.p(11, hy + 4, sk.l1)
        s.rect(9, hy + 5, 2, 2, pal["thanaka"])
        s.p(7, hy - 2, hair.m); s.p(7, hy - 3, hair.l1)
    elif direction == "up":
        s.rect(4, hy, 8, 8, hair.m); s.hline(5, hy, 6, hair.l1); s.p(8, hy - 1, hair.m); s.p(8, hy - 2, hair.l1)
    else:
        s.rect(4, hy, 8, 8, sk.m); s.rect(4, hy, 1, 8, sk.d1); s.rect(11, hy, 1, 8, sk.d1)
        s.rect(4, hy - 1, 8, 3, hair.m); s.hline(5, hy - 1, 6, hair.l1); s.p(8, hy - 2, hair.m); s.p(8, hy - 3, hair.l1)
        s.p(6, hy + 4, OUT); s.p(9, hy + 4, OUT)
        s.rect(5, hy + 5, 2, 2, pal["thanaka"]); s.rect(9, hy + 5, 2, 2, pal["thanaka"])
        s.hline(7, hy + 6, 2, hx("#a0402a"))
        s.p(3, hy + 4, sk.d1); s.p(12, hy + 4, sk.d1)
    o = Spr(16, 26); o.paste(s, 0, 0); o.outline(-.72); return o


def kid_sit(f, pal):
    s = Spr(16, 26)
    sk, hair, sh, lg = pal["skin"], pal["hair"], pal["shirt"], pal["longyi"]
    b = [0, 1, 0, -1][f] * 0
    s.ell(8, 22, 6, 2, lg.d1); s.ell(8, 21, 5, 2, lg.m)
    s.rect(4, 14 + (1 if f in (1, 2) else 0), 8, 5, sh.m); s.rect(4, 14 + (1 if f in (1, 2) else 0), 1, 5, sh.d1)
    s.rect(6, 18, 4, 2, sk.m)
    hy = 6 + (1 if f in (1, 2) else 0)
    s.rect(4, hy, 8, 8, sk.m); s.rect(4, hy, 1, 8, sk.d1); s.rect(11, hy, 1, 8, sk.d1)
    s.rect(4, hy - 1, 8, 3, hair.m); s.hline(5, hy - 1, 6, hair.l1); s.p(8, hy - 2, hair.m)
    s.p(6, hy + 4, OUT); s.p(9, hy + 4, OUT); s.rect(5, hy + 5, 2, 2, pal["thanaka"]); s.rect(9, hy + 5, 2, 2, pal["thanaka"])
    s.outline(-.72); return s


def people_pals():
    p = pals()
    p["monk"] = dict(skin=Ramp("#d9a06a"), hair=Ramp("#d9a06a"), bald=True, robe=True, bowl=True,
                     shirt=Ramp("#9a2f2a"), longyi=Ramp("#9a2f2a"), stripe=hx("#6a1e1a"),
                     sandal=hx("#5a4228"), gear=None, thanaka=None)
    p["kid"] = dict(skin=Ramp("#d99a68"), hair=Ramp("#1f1714"), shirt=Ramp("#3f9ad0"),
                    longyi=Ramp("#d65a3c"), stripe=hx("#8a2f20"), sandal=hx("#6a4528"),
                    thanaka=hx("#f2dd8a"), gear=None)
    return p


def person_sheet2(name, pal):
    fr = []
    if name == "kid":
        for d in ("down", "up", "side"):
            fr += [kid_frame(f, d, pal) for f in range(4)]
        fr += [kid_frame(f, "down", pal, pose="play") for f in range(4)]
        fr += [kid_sit(f, pal) for f in range(4)]
        return sheet(fr, cols=4)
    for d in ("down", "up", "side"):
        fr += [person_frame(f, d, pal) for f in range(4)]
    kind = "broom" if name == "monk" else "bend" if name == "ma_thiri" else "hoe"
    fr += [work_frame(f, pal, kind) for f in range(4)]
    fr += [sit_frame(f, pal) for f in range(4)]
    return sheet(fr, cols=4)
