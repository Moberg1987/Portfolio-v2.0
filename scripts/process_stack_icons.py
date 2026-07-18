from PIL import Image, ImageDraw
import os
import re
import shutil

stage = r"E:\vibecoding-folder\portfolio v2.0\src\assets\img\stack\_stage"
dst = r"E:\vibecoding-folder\portfolio v2.0\src\assets\img\stack"
svg_dst = r"E:\vibecoding-folder\portfolio v2.0\src\assets\svg\stack"

os.makedirs(dst, exist_ok=True)
os.makedirs(svg_dst, exist_ok=True)


def save_icon(im: Image.Image, path: str, size: int = 96) -> None:
    im = im.convert("RGBA")
    bb = im.split()[-1].getbbox()
    if bb:
        im = im.crop(bb)
    side = max(im.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    sq.resize((size, size), Image.Resampling.LANCZOS).save(path)
    print("png", os.path.basename(path))


# Miro sprite crop from Figma frame transforms
miro = Image.open(os.path.join(stage, "miro.png")).convert("RGBA")
mw, mh = miro.size
xf0, xf1 = 0.0286 / 2.7429, 1.0286 / 2.7429
yf0, yf1 = 0.2941 / 1.5882, 1.2941 / 1.5882
box = (int(xf0 * mw), int(yf0 * mh), int(xf1 * mw), int(yf1 * mh))
print("miro crop", box, "full", miro.size)
save_icon(miro.crop(box), os.path.join(dst, "miro.png"))

# Metrika sprite
met = Image.open(os.path.join(stage, "yandex-metrika.png")).convert("RGBA")
mw, mh = met.size
xf0, xf1 = 0.9467 / 2.8889, 1.9467 / 2.8889
yf0, yf1 = 0.5357 / 2.9018, 1.5357 / 2.9018
box = (int(xf0 * mw), int(yf0 * mh), int(xf1 * mw), int(yf1 * mh))
print("metrika crop", box, "full", met.size)
save_icon(met.crop(box), os.path.join(dst, "yandex-metrika.png"))

for name in ["confluence", "yandex-telemost", "chatgpt", "clipdrop"]:
    im = Image.open(os.path.join(stage, f"{name}.png")).convert("RGBA")
    print(name, im.size, "mid", im.getpixel((im.size[0] // 2, im.size[1] // 2)))
    save_icon(im, os.path.join(dst, f"{name}.png"))

# ComfyUI blue tile + yellow mark
mark = Image.open(os.path.join(stage, "comfyui-mark.png")).convert("RGBA")
tile = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
draw = ImageDraw.Draw(tile)
margin = 8
draw.rounded_rectangle(
    [margin, margin, 96 - margin, 96 - margin],
    radius=12,
    fill=(23, 53, 225, 255),
)
mark_sz = 64
m = mark.copy()
mbb = m.split()[-1].getbbox()
if mbb:
    m = m.crop(mbb)
m = m.resize((mark_sz, mark_sz), Image.Resampling.LANCZOS)
tile.paste(m, ((96 - mark_sz) // 2, (96 - mark_sz) // 2), m)
tile.save(os.path.join(dst, "comfyui.png"))
print("comfyui ok")

# SVGs from Figma (real paths, not invented)
for name in [
    "figma",
    "photoshop",
    "illustrator",
    "jira",
    "pathway",
    "cursorai",
    "krea",
    "perplexity",
    "blender",
]:
    src = os.path.join(stage, f"{name}.svg")
    txt = open(src, encoding="utf-8").read()
    txt = txt.replace('fill="black"', 'fill="#050715"')
    txt = re.sub(
        r'fill="var\(--fill-0,\s*black\)"',
        'fill="#050715"',
        txt,
    )
    open(os.path.join(svg_dst, f"{name}.svg"), "w", encoding="utf-8").write(txt)
    open(os.path.join(dst, f"{name}.svg"), "w", encoding="utf-8").write(txt)
    print("svg", name)

shutil.copy(os.path.join(dst, "photoshop.svg"), os.path.join(dst, "ps.svg"))
shutil.copy(os.path.join(dst, "illustrator.svg"), os.path.join(dst, "ai.svg"))
shutil.copy(os.path.join(dst, "cursorai.svg"), os.path.join(dst, "cursor.svg"))
print("DONE")
