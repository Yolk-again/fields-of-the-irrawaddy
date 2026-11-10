"""Monk (U Pyinnya) and village kid (Maung Nyi) sprite sheets with activity animations.

Frames are 16x26, 4 columns. Rows
  monk: 0 walk-down 1 walk-up 2 walk-side 3 sweep 4 sit/meditate 5 alms-walk(side) 6 pray(2 frames)
  kid : 0 walk-down 1 walk-up 2 walk-side 3 run(side) 4 jump/play 5 sit(2)+cheer(2)
"""
from pxlib import *

OUT = hx("#2a1a14")
ROBE = Ramp("#9a2f2a")
TRIM = hx("#e0a030")
MSKIN = Ramp("#d9a06a")
KSKIN = Ramp("#d99a62")


def _fin(s):
    out = Spr(16, 26)
    out.paste(s, 0, 0)
    out.outline(-0.72)
    return out


# ------------------------------- MONK ---------------------------------
def monk_head(s, y, d, bow=0):
    y += bow
    if d == "side":
        s.rect(5, y, 7, 7, MSKIN.m); s.rect(5, y, 1, 7, MSKIN.d1)
        s.hline(6, y, 4, MSKIN.l1)               # shaved scalp shine
        s.rect(11, y + 3, 1, 2, MSKIN.l1)        # nose
        s.p(10, y + 3, OUT)
        s.p(5, y + 3, MSKIN.d1)                   # ear
    elif d == "up":
        s.rect(4, y, 8, 7, MSKIN.m); s.hline(5, y, 6, MSKIN.l1)
        s.vline(4, y, 7, MSKIN.d1); s.vline(11, y, 7, MSKIN.d1)
        s.p(3, y + 3, MSKIN.d1); s.p(12, y + 3, MSKIN.d1)
    else:
        s.rect(4, y, 8, 7, MSKIN.m); s.hline(5, y, 6, MSKIN.l1)
        s.vline(4, y, 7, MSKIN.d1); s.vline(11, y, 7, MSKIN.d1)
        s.p(3, y + 3, MSKIN.d1); s.p(12, y + 3, MSKIN.d1)
        s.p(6, y + 3, OUT); s.p(9, y + 3, OUT)
        s.hline(7, y + 5, 2, shade(MSKIN.m, -0.45))   # calm mouth


def monk_robe_front(s, top, bottom, sway=0, bare=True):
    # body
    s.rect(3, top, 10, bottom - top + 1, ROBE.m)
    s.vline(3, top, bottom - top + 1, ROBE.d1)
    s.vline(12, top, bottom - top + 1, ROBE.l1)
    # folds
    for x in (6, 9):
        s.vline(x, top + 3, bottom - top - 2, ROBE.d1)
    # diagonal drape across chest
    for i in range(5):
        s.p(5 + i, top + 1 + i // 2 + 1, ROBE.d2)
    s.hline(3, top, 10, ROBE.l1)
    if bare:
        s.rect(3, top, 3, 2, MSKIN.m); s.p(3, top, MSKIN.d1)  # bare shoulder
        s.rect(2, top + 2, 2, 5, MSKIN.m)                      # bare arm
        s.rect(2, top + 7, 2, 2, MSKIN.m)
    s.hline(3, bottom, 10, TRIM)                                # gold hem line


def draw_monk_walk(f, d):
    s = Spr(16, 26)
    bob = 1 if f in (1, 3) else 0
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    y0 = 3 + bob
    if d == "side":
        s.rect(5, y0 + 7, 6, 13, ROBE.m); s.vline(5, y0 + 7, 13, ROBE.d1); s.vline(10, y0 + 7, 13, ROBE.l1)
        s.hline(5, y0 + 19, 6, TRIM)
        s.hline(5, y0 + 8, 6, ROBE.l1)
        s.rect(7 + step, y0 + 8, 2, 6, MSKIN.m)                # swinging arm
        s.rect(7, 23, 2, 2, MSKIN.m)
        s.rect(6 + step, 23, 3, 2, MSKIN.d1)
    else:
        top = y0 + 7
        monk_robe_front(s, top, 22 - 0, bare=(d == "down"))
        if d == "up":
            s.rect(3, top, 10, 3, ROBE.m)
            s.hline(3, top, 10, ROBE.l1)
        s.rect(5 + (1 if f == 1 else 0), 23, 2, 2, MSKIN.m)
        s.rect(9, 23 - (1 if f == 3 else 0), 2, 2, MSKIN.m)
    monk_head(s, y0, d)
    return _fin(s)


def draw_monk_sweep(f):
    s = Spr(16, 26)
    y0 = 4
    # leaning, side view
    s.rect(4, y0 + 7, 6, 13, ROBE.m); s.vline(4, y0 + 7, 13, ROBE.d1); s.vline(9, y0 + 7, 13, ROBE.l1)
    s.hline(4, y0 + 19, 6, TRIM); s.hline(4, y0 + 8, 6, ROBE.l1)
    s.rect(5, 23, 2, 2, MSKIN.d1); s.rect(8, 23, 2, 2, MSKIN.m)
    # broom swing: head position along ground
    bx = [11, 13, 14, 12][f]
    hx_, hy_ = 9, y0 + 11
    s.line(hx_, hy_, bx, 22, hx("#8a5a34"))
    s.line(hx_ + 1, hy_, bx + 1, 22, hx("#a87a4c"))
    for i in range(4):
        s.p(bx - 1 + i, 23, hx("#d9b45f")); s.p(bx - 1 + i, 24, hx("#b8903a")) if i % 2 == 0 else None
    # arms holding
    s.rect(8, y0 + 8, 2, 3, MSKIN.m); s.rect(9, y0 + 10, 2, 2, MSKIN.m)
    monk_head(s, y0 + 1, "side")
    return _fin(s)


def draw_monk_sit(f):
    s = Spr(16, 26)
    b = [0, 1, 1, 0][f]
    # folded legs / robe base
    s.rect(1, 18, 14, 6, ROBE.m); s.hline(1, 18, 14, ROBE.l1); s.hline(1, 23, 14, ROBE.d1)
    s.hline(2, 22, 12, TRIM)
    for x in (4, 7, 10): s.vline(x, 19, 4, ROBE.d1)
    s.rect(2, 21, 3, 2, MSKIN.m); s.rect(11, 21, 3, 2, MSKIN.m)     # feet tucked
    # torso
    s.rect(4, 10 + b, 8, 9 - b, ROBE.m); s.vline(4, 10 + b, 9 - b, ROBE.d1); s.vline(11, 10 + b, 9 - b, ROBE.l1)
    s.rect(4, 10 + b, 3, 2, MSKIN.m)                                 # bare shoulder
    for i in range(4): s.p(6 + i, 11 + b + i // 2, ROBE.d2)
    # arms + hands in lap (dhyana mudra)
    s.rect(3, 13 + b, 2, 5, MSKIN.m); s.rect(11, 13 + b, 2, 5, ROBE.d1)
    s.rect(5, 18, 6, 2, MSKIN.m); s.hline(5, 18, 6, MSKIN.l1)
    monk_head(s, 3 + b, "down")
    # closed eyes while meditating
    s.p(6, 6 + b, MSKIN.m); s.p(9, 6 + b, MSKIN.m)
    s.hline(5, 7 + b, 2, OUT); s.hline(9, 7 + b, 2, OUT)
    return _fin(s)


def draw_monk_alms(f):
    s = Spr(16, 26)
    bob = 1 if f in (1, 3) else 0
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    y0 = 3 + bob
    s.rect(5, y0 + 7, 6, 13, ROBE.m); s.vline(5, y0 + 7, 13, ROBE.d1); s.vline(10, y0 + 7, 13, ROBE.l1)
    s.hline(5, y0 + 19, 6, TRIM); s.hline(5, y0 + 8, 6, ROBE.l1)
    s.rect(6 + step, 23, 3, 2, MSKIN.d1); s.rect(8, 23, 2, 2, MSKIN.m)
    # forearms forward holding the alms bowl
    s.rect(9, y0 + 9, 3, 2, MSKIN.m)
    s.ell(12, y0 + 12, 3, 2, hx("#1f1a18")); s.hline(10, y0 + 11, 5, hx("#e0a030"))   # lacquer bowl + gold rim
    s.p(11, y0 + 12, hx("#5a4a40"))
    monk_head(s, y0, "side", bow=1)
    return _fin(s)


def draw_monk_pray(f):
    s = Spr(16, 26)
    bow = f   # 0 upright, 1 slight bow
    y0 = 3 + bow
    monk_robe_front(s, y0 + 7, 22, bare=False)
    s.rect(3, y0 + 7, 3, 2, MSKIN.m)
    # hands pressed together (anjali) at the chest
    s.rect(3, y0 + 9, 2, 3, ROBE.d1); s.rect(11, y0 + 9, 2, 3, ROBE.d1)
    s.rect(6, y0 + 8, 4, 3, MSKIN.m); s.vline(8, y0 + 8, 3, MSKIN.d1)
    s.rect(5 + 0, 23, 2, 2, MSKIN.m); s.rect(9, 23, 2, 2, MSKIN.m)
    monk_head(s, y0, "down", bow=0)
    s.hline(6, y0 + 3, 2, MSKIN.m); s.hline(9, y0 + 3, 2, MSKIN.m)
    s.hline(6, y0 + 4, 2, OUT) if bow else None
    return _fin(s)


def monk_sheet():
    frames = []
    for d in ("down", "up", "side"):
        for f in range(4): frames.append(draw_monk_walk(f, d))
    for f in range(4): frames.append(draw_monk_sweep(f))
    for f in range(4): frames.append(draw_monk_sit(f))
    for f in range(4): frames.append(draw_monk_alms(f))
    frames += [draw_monk_pray(0), draw_monk_pray(1), draw_monk_pray(0), draw_monk_pray(1)]
    return sheet(frames, cols=4)


# -------------------------------- KID ---------------------------------
SHIRT = Ramp("#f1ead2")
SHORTS = Ramp("#c0453a")
HAIR = Ramp("#231a16")


def kid_head(s, y, d, x=0, happy=False):
    if d == "side":
        s.rect(4 + x, y, 8, 7, KSKIN.m); s.rect(4 + x, y, 1, 7, KSKIN.d1)
        s.rect(4 + x, y - 1, 8, 3, HAIR.m); s.rect(3 + x, y, 3, 5, HAIR.m); s.hline(5 + x, y - 1, 5, HAIR.l1)
        s.p(10 + x, y + 3, OUT); s.p(11 + x, y + 4, KSKIN.l1)
        if happy: s.hline(9 + x, y + 5, 3, OUT)
    elif d == "up":
        s.rect(4, y, 8, 7, HAIR.m); s.hline(5, y, 6, HAIR.l1); s.vline(4, y, 7, HAIR.d1); s.vline(11, y, 7, HAIR.d1)
    else:
        s.rect(4, y, 8, 7, KSKIN.m); s.vline(4, y, 7, KSKIN.d1); s.vline(11, y, 7, KSKIN.d1)
        s.rect(4, y - 1, 8, 3, HAIR.m); s.p(4, y + 2, HAIR.m); s.p(11, y + 2, HAIR.m); s.hline(5, y - 1, 5, HAIR.l1)
        s.p(6, y + 3, OUT); s.p(9, y + 3, OUT)
        s.p(5, y + 5, shade(KSKIN.m, 0.15)); s.p(10, y + 5, shade(KSKIN.m, 0.15))   # cheeks
        if happy: s.hline(6, y + 5, 4, OUT)
        else: s.hline(7, y + 5, 2, shade(KSKIN.m, -0.5))


def kid_body_front(s, top, arms=(0, 0), legs=(0, 0), d="down"):
    s.rect(5, top, 6, 5, SHIRT.m); s.vline(5, top, 5, SHIRT.d1); s.hline(5, top, 6, SHIRT.l1)
    s.rect(5, top + 5, 6, 3, SHORTS.m); s.hline(5, top + 5, 6, SHORTS.l1); s.hline(5, top + 7, 6, SHORTS.d1)
    ly = top + 8
    s.rect(6, ly, 2, 24 - ly - legs[0], KSKIN.m); s.rect(9, ly, 2, 24 - ly - legs[1], KSKIN.m)
    s.rect(6, 23 - legs[0], 2, 1, KSKIN.d1); s.rect(9, 23 - legs[1], 2, 1, KSKIN.d1)
    s.rect(3, top + 1 + arms[0], 2, 4, KSKIN.m); s.rect(11, top + 1 + arms[1], 2, 4, KSKIN.m)
    s.rect(3, top + 1 + arms[0], 2, 2, SHIRT.m); s.rect(11, top + 1 + arms[1], 2, 2, SHIRT.m)


def draw_kid_walk(f, d):
    s = Spr(16, 26)
    bob = 1 if f in (1, 3) else 0
    top = 13 - bob + 1
    step = {0: 0, 1: 1, 2: 0, 3: -1}[f]
    if d == "side":
        s.rect(5, top, 6, 5, SHIRT.m); s.vline(5, top, 5, SHIRT.d1); s.hline(5, top, 6, SHIRT.l1)
        s.rect(5, top + 5, 6, 3, SHORTS.m); s.hline(5, top + 7, 6, SHORTS.d1)
        s.rect(7 + step, top + 8, 2, 24 - top - 8, KSKIN.m); s.rect(7 - step, top + 8, 2, 24 - top - 8, KSKIN.d1)
        s.rect(7 + step, 23, 3, 1, KSKIN.d1); s.rect(6 - step, 23, 3, 1, KSKIN.d1)
        s.rect(7 + step, top + 1, 2, 5, KSKIN.m)
    else:
        kid_body_front(s, top, arms=(step, -step), legs=(1 if f == 1 else 0, 1 if f == 3 else 0), d=d)
        if d == "up":
            s.rect(5, top, 6, 5, SHIRT.m)
    kid_head(s, top - 7, d)
    return _fin(s)


def draw_kid_run(f):
    s = Spr(16, 26)
    lift = [0, 2, 0, 2][f]
    top = 13 - (1 if f in (1, 3) else 0)
    # leaning torso
    s.rect(5, top, 6, 5, SHIRT.m); s.hline(5, top, 6, SHIRT.l1); s.vline(5, top, 5, SHIRT.d1)
    s.rect(5, top + 5, 6, 3, SHORTS.m); s.hline(5, top + 7, 6, SHORTS.d1)
    # legs in wide stride
    if f == 0: front, back = 10, 3
    elif f == 2: front, back = 3, 10
    else: front = back = 7
    ly = top + 8
    s.line(7, ly, front, 23 - (lift if f in (1, 3) else 0), KSKIN.m); s.line(8, ly, front + 1, 23 - (lift if f in (1, 3) else 0), KSKIN.m)
    s.line(7, ly, back, 23, KSKIN.d1); s.line(8, ly, back + 1, 23, KSKIN.d1)
    # pumping arms
    if f in (0, 2):
        s.rect(10, top + 1, 3, 2, KSKIN.m) if f == 0 else s.rect(2, top + 1, 3, 2, KSKIN.m)
        s.rect(3, top + 3, 2, 3, KSKIN.d1) if f == 0 else s.rect(11, top + 3, 2, 3, KSKIN.d1)
    else:
        s.rect(7, top + 2, 2, 4, KSKIN.m)
    kid_head(s, top - 7, "side", x=1, happy=True)
    return _fin(s)


def draw_kid_jump(f):
    s = Spr(16, 26)
    lift = [0, 4, 6, 1][f]
    crouch = 2 if f == 0 else 0
    top = 13 + crouch - lift
    s.rect(5, top, 6, 5, SHIRT.m); s.hline(5, top, 6, SHIRT.l1); s.vline(5, top, 5, SHIRT.d1)
    s.rect(5, top + 5, 6, 3, SHORTS.m); s.hline(5, top + 7, 6, SHORTS.d1)
    ly = top + 8
    if f in (1, 2):   # legs tucked
        s.rect(5, ly, 2, 3, KSKIN.m); s.rect(9, ly, 2, 3, KSKIN.m); s.rect(4, ly + 2, 3, 1, KSKIN.d1); s.rect(9, ly + 2, 3, 1, KSKIN.d1)
    else:
        s.rect(5, ly, 2, 24 - ly, KSKIN.m); s.rect(9, ly, 2, 24 - ly, KSKIN.m)
    # arms up
    s.rect(2, top - 3 if f in (1, 2) else top + 1, 2, 5, KSKIN.m)
    s.rect(12, top - 3 if f in (1, 2) else top + 1, 2, 5, KSKIN.m)
    kid_head(s, top - 7, "down", happy=True)
    if f in (1, 2):
        s.rect(5, 24, 6, 1, T)
    return _fin(s)


def draw_kid_sit(f):
    s = Spr(16, 26)
    b = f
    # crossed legs
    s.rect(3, 20, 10, 4, KSKIN.m); s.hline(3, 20, 10, KSKIN.l1); s.hline(3, 23, 10, KSKIN.d1)
    s.rect(2, 19, 4, 3, SHORTS.m); s.rect(10, 19, 4, 3, SHORTS.m)
    s.rect(5, 14 + b, 6, 6 - b, SHIRT.m); s.vline(5, 14 + b, 6 - b, SHIRT.d1); s.hline(5, 14 + b, 6, SHIRT.l1)
    # hands folded (reciting / paying respect)
    s.rect(4, 16 + b, 2, 3, KSKIN.m); s.rect(10, 16 + b, 2, 3, KSKIN.m); s.rect(6, 17 + b, 4, 2, KSKIN.m)
    kid_head(s, 7 + b, "down")
    return _fin(s)


def draw_kid_cheer(f):
    s = Spr(16, 26)
    b = f
    top = 14 - b
    kid_body_front(s, top, arms=(0, 0), legs=(0, 0))
    s.rect(3, top - 2, 2, 5, KSKIN.m); s.rect(11, top - 2 - (1 - f), 2, 5, KSKIN.m)
    kid_head(s, top - 7, "down", happy=True)
    return _fin(s)


def kid_sheet():
    frames = []
    for d in ("down", "up", "side"):
        for f in range(4): frames.append(draw_kid_walk(f, d))
    for f in range(4): frames.append(draw_kid_run(f))
    for f in range(4): frames.append(draw_kid_jump(f))
    frames += [draw_kid_sit(0), draw_kid_sit(1), draw_kid_cheer(0), draw_kid_cheer(1)]
    return sheet(frames, cols=4)
