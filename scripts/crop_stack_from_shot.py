"""Crop stack icons from user's reference screenshot — authoritative visuals."""
from PIL import Image
import os

ref_path = r"C:\Users\Антон\.cursor\projects\e-vibecoding-folder-portfolio-v2-0\assets\c__Users_______AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-24f62ef3-3c24-4724-93c2-05d96a687d3b.png"
dst = r"E:\vibecoding-folder\portfolio v2.0\src\assets\img\stack"
dbg = os.path.join(dst, "_debug")
os.makedirs(dbg, exist_ok=True)

im = Image.open(ref_path).convert("RGBA")
px = im.load()
w, h = im.size
BADGE = (236, 236, 238)


def near(c, t, tol=10):
    return all(abs(c[i] - t[i]) <= tol for i in range(3))


def is_badge(x, y):
    return near(px[x, y], BADGE, 10)


def is_iconish(x, y):
    r, g, b, a = px[x, y]
    if a < 200:
        return False
    if near((r, g, b), BADGE, 12):
        return False
    if near((r, g, b), (255, 255, 255), 8):
        return False
    if near((r, g, b), (245, 245, 245), 8):
        return False
    # content: dark glyph OR colored logo
    return True


# Find unique badge rects (max extent) by flood from seed points every few px
def find_badges():
    seen = [[False] * w for _ in range(h)]
    badges = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if seen[y][x] or not is_badge(x, y):
                continue
            # BFS
            stack = [(x, y)]
            seen[y][x] = True
            minx = maxx = x
            miny = maxy = y
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and is_badge(nx, ny):
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            bw, bh = maxx - minx + 1, maxy - miny + 1
            if bw >= 70 and 40 <= bh <= 55 and count > 2000:
                badges.append((minx, miny, maxx, maxy))
    # dedupe by center proximity
    badges.sort(key=lambda b: (b[1], b[0]))
    uniq = []
    for b in badges:
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        if any(abs(cx - (u[0] + u[2]) / 2) < 20 and abs(cy - (u[1] + u[3]) / 2) < 20 for u in uniq):
            continue
        uniq.append(b)
    return uniq


badges = find_badges()
print("badges", len(badges))
for i, b in enumerate(badges):
    print(i, b, "w", b[2] - b[0] + 1, "h", b[3] - b[1] + 1)


def crop_icon_from_badge(b, out_name, icon_size=24):
    x0, y0, x1, y1 = b
    # find leftmost iconish pixel in left third of badge
    icon_pixels = []
    lim = x0 + max(36, (x1 - x0) // 3)
    for y in range(y0 + 4, y1 - 4):
        for x in range(x0 + 6, lim):
            if is_iconish(x, y):
                icon_pixels.append((x, y))
    if not icon_pixels:
        print("NO ICON", out_name)
        return
    xs = [p[0] for p in icon_pixels]
    ys = [p[1] for p in icon_pixels]
    # pad to square around content
    cx0, cx1 = min(xs), max(xs)
    cy0, cy1 = min(ys), max(ys)
    # expand to ~24px area centered
    side = max(cx1 - cx0, cy1 - cy0, icon_size - 2)
    midx = (cx0 + cx1) / 2
    midy = (cy0 + cy1) / 2
    half = side / 2 + 1
    crop = im.crop((int(midx - half), int(midy - half), int(midx + half), int(midy + half)))
    # make badge gray transparent so only logo remains when useful
    cp = crop.copy().convert("RGBA")
    cpx = cp.load()
    cw, ch = cp.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = cpx[x, y]
            if near((r, g, b), BADGE, 14) or near((r, g, b), (255, 255, 255), 6):
                cpx[x, y] = (0, 0, 0, 0)
    # tiles with intentional bg: keep as-is for known tiles
    keep_bg = out_name in {
        "photoshop.png",
        "illustrator.png",
        "miro.png",
        "comfyui.png",
        "yandex-telemost.png",
    }
    out = crop if keep_bg else cp
    # for keep_bg: still kill only outer page gray via flood later — here just save tight crop with badge gray
    if keep_bg:
        # replace badge gray with transparency outside tile
        out = crop.convert("RGBA")
        opx = out.load()
        for y in range(out.size[1]):
            for x in range(out.size[0]):
                r, g, b, a = opx[x, y]
                if near((r, g, b), BADGE, 14):
                    opx[x, y] = (0, 0, 0, 0)
    out = out.resize((96, 96), Image.Resampling.LANCZOS)
    path = os.path.join(dst, out_name)
    out.save(path)
    out.save(os.path.join(dbg, out_name))
    print("saved", out_name)


# Expected order reading L->R, T->B from screenshot layout:
# Product left: Figma, Photoshop / Illustrator, Miro / Jira, Confluence
# UX right: Figma, Pathway / Metrika, Telemost (maybe wrapped)
# AI left: ChatGPT, Cursor / Krea, Perplexity / Clipdrop, ComfyUI
# 3D: Blender, Krea

names = [
    "figma.png",
    "photoshop.png",
    "illustrator.png",
    "miro.png",
    "jira.png",
    "confluence.png",
    "figma2.png",  # skip duplicate
    "pathway.png",
    "yandex-metrika.png",
    "yandex-telemost.png",
    "chatgpt.png",
    "cursorai.png",
    "krea.png",
    "perplexity.png",
    "clipdrop.png",
    "comfyui.png",
    "blender.png",
    "krea2.png",
]

if len(badges) != len(names):
    print("WARN count mismatch badges", len(badges), "names", len(names))

for b, name in zip(badges, names):
    if name.endswith("2.png"):
        continue
    crop_icon_from_badge(b, name)

print("done")
