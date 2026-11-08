"""Tiny pixel-art toolkit used by the Fields of the Irrawaddy asset generator.

Everything is drawn at NATIVE pixel resolution (16px tiles). The game scales
sprites 2x with nearest-neighbour filtering, so these PNGs stay razor sharp.
"""
import colorsys
import math
import random
from PIL import Image, ImageDraw

T = (0, 0, 0, 0)


def hx(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def shade(c, amt):
    """amt<0 darker (hue shifts cool), amt>0 lighter (hue shifts warm)."""
    r, g, b = [v / 255 for v in c[:3]]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if amt < 0:
        v = max(0, v * (1 + amt * 0.55))
        s = min(1, s * (1 - amt * 0.25))
        h = (h + (-amt) * 0.025) % 1.0 if h > 0.2 else (h - (-amt) * 0.02) % 1.0
    else:
        v = min(1, v * (1 + amt * 0.35) + amt * 0.04)
        s = max(0, s * (1 - amt * 0.30))
        h = (h - amt * 0.012) % 1.0
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r * 255), int(g * 255), int(b * 255), c[3] if len(c) > 3 else 255)


class Ramp:
    """5 tones: d2 d1 m l1 l2 around a base colour."""

    def __init__(self, base):
        base = hx(base) if isinstance(base, str) else base
        self.d2 = shade(base, -0.62)
        self.d1 = shade(base, -0.30)
        self.m = base
        self.l1 = shade(base, 0.32)
        self.l2 = shade(base, 0.62)

    def __getitem__(self, i):
        return [self.d2, self.d1, self.m, self.l1, self.l2][i + 2]


class Spr:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), T)
        self.d = ImageDraw.Draw(self.im)

    # --- primitives -------------------------------------------------
    def p(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((x, y), c)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.im.getpixel((x, y))
        return T

    def rect(self, x, y, w, h, c):
        if w <= 0 or h <= 0:
            return
        self.d.rectangle([int(x), int(y), int(x + w - 1), int(y + h - 1)], fill=c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def line(self, x0, y0, x1, y1, c):
        self.d.line([int(x0), int(y0), int(x1), int(y1)], fill=c)

    def ell(self, cx, cy, rx, ry, c):
        self.d.ellipse([int(cx - rx), int(cy - ry), int(cx + rx), int(cy + ry)], fill=c)

    def poly(self, pts, c):
        self.d.polygon([(int(a), int(b)) for a, b in pts], fill=c)

    def paste(self, other, x, y):
        self.im.alpha_composite(other.im if isinstance(other, Spr) else other, (int(x), int(y)))

    # --- helpers ----------------------------------------------------
    def outline(self, darken=-0.7, fixed=None):
        """Selective outline: each border pixel takes a darkened neighbour colour."""
        src = self.im.copy()
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3] != 0:
                    continue
                best = None
                for dx, dy in ((0, 1), (1, 0), (-1, 0), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h:
                        n = src.getpixel((nx, ny))
                        if n[3] == 255:
                            best = n
                            break
                if best is not None:
                    self.im.putpixel((x, y), fixed if fixed else shade(best, darken))

    def shadow_ellipse(self, cx, cy, rx, ry, alpha=70):
        ov = Image.new("RGBA", (self.w, self.h), T)
        ImageDraw.Draw(ov).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(25, 40, 20, alpha))
        # draw BEHIND existing pixels
        ov.alpha_composite(self.im)
        self.im = ov
        self.d = ImageDraw.Draw(self.im)

    def dither_fill(self, x, y, w, h, c1, c2, rnd=None, chance=0.5):
        rnd = rnd or random
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c2 if rnd.random() < chance else c1)

    def flip_h(self):
        n = Spr(self.w, self.h)
        n.im = self.im.transpose(Image.FLIP_LEFT_RIGHT)
        n.d = ImageDraw.Draw(n.im)
        return n

    def crop_box(self, x, y, w, h):
        n = Spr(w, h)
        n.im = self.im.crop((x, y, x + w, y + h))
        n.d = ImageDraw.Draw(n.im)
        return n

    def save(self, path, scale=1):
        im = self.im
        if scale != 1:
            im = im.resize((self.w * scale, self.h * scale), Image.NEAREST)
        im.save(path)


def sheet(frames, cols=None):
    """Pack a list of Spr (same size) into a horizontal/grid sheet."""
    cols = cols or len(frames)
    rows = (len(frames) + cols - 1) // cols
    w, h = frames[0].w, frames[0].h
    out = Spr(w * cols, h * rows)
    for i, f in enumerate(frames):
        out.paste(f, (i % cols) * w, (i // cols) * h)
    return out


# ---- noise ---------------------------------------------------------
def value_noise(w, h, cell, seed, wrap=False):
    rnd = random.Random(seed)
    gw, gh = w // cell + 2, h // cell + 2
    grid = [[rnd.random() for _ in range(gw)] for _ in range(gh)]
    if wrap:
        for y in range(gh):
            grid[y][gw - 1] = grid[y][0]
        grid[gh - 1] = grid[0][:]

    def lerp(a, b, t):
        return a + (b - a) * (t * t * (3 - 2 * t))

    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            gx, gy = x / cell, y / cell
            x0, y0 = int(gx), int(gy)
            fx, fy = gx - x0, gy - y0
            a = lerp(grid[y0][x0], grid[y0][x0 + 1], fx)
            b = lerp(grid[y0 + 1][x0], grid[y0 + 1][x0 + 1], fx)
            out[y][x] = lerp(a, b, fy)
    return out
