"""Generates the extension icons (no dependencies). Run: python3 scripts/make-icons.py"""
import os, struct, zlib

PURPLE = (91, 60, 196)
WHITE = (255, 255, 255)
SS = 4  # supersampling factor for anti-aliased edges


def in_round_rect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def shade(u, v):
    """Colour at normalised coords (0..1). Returns (r,g,b,a)."""
    if not in_round_rect(u, v, 0, 0, 1, 1, 0.22):
        return (0, 0, 0, 0)
    # white "proposal card"
    if in_round_rect(u, v, 0.22, 0.2, 0.78, 0.8, 0.07):
        # text lines on the card
        for y0, x1 in ((0.32, 0.66), (0.45, 0.66), (0.58, 0.56)):
            if in_round_rect(u, v, 0.32, y0, x1, y0 + 0.06, 0.03):
                return PURPLE + (255,)
        return WHITE + (255,)
    return PURPLE + (255,)


def png(size):
    rows = []
    n = size * SS
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    r, g, b, a = shade((x * SS + sx + 0.5) / n, (y * SS + sy + 0.5) / n)
                    acc[0] += r * a; acc[1] += g * a; acc[2] += b * a; acc[3] += a
            a = acc[3]
            px = [round(c / a) if a else 0 for c in acc[:3]] + [round(a / (SS * SS))]
            row += bytes(px)
        rows.append(bytes(row))

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
            + chunk(b'IEND', b''))


out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
for s in (16, 32, 48, 128):
    with open(os.path.join(out, f'icon-{s}.png'), 'wb') as f:
        f.write(png(s))
    print(f'icons/icon-{s}.png')
