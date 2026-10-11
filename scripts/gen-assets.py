#!/usr/bin/env python3
"""从国家电投 logo 源图（白底 RGB）提取本插件需要的四张资产。

用法：
    python3 scripts/gen-assets.py <logo_spic.png>
    python3 scripts/gen-assets.py            # 回退到 --src 的默认路径

源图为 470x150 白底 PNG，实测墨迹分区：
      mark   图形标  x26-108, y17-120  (丝带徽记)
      CN     「国家电投」x127-302, y28-66
      SPIC   「SPIC」    x127-257, y76-110

产出（写入 assets/）：
  mark.png    图形标，白底转透明，保留原色（红/绿/橙丝带）
  cn.png      「国家电投」字标
  spic.png    「SPIC」字标
  lockup.png  图形标右侧的文字锁定组（国家电投 / SPIC 两行）

  三张字标以「白色 RGB + 墨迹 alpha」存储，浏览器侧用 CSS mask 着色，
  这样浅色/深色主题都能自动取色。

注意：assets/ 里已提交的 PNG 就是用官方 logo 生成的成品，日常改插件不需要
重跑本脚本；只有换 logo 源图时才需要，且需自备该源图（版权见 README）。
"""
from PIL import Image, ImageChops
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# 换 logo 时改这里，或把源图路径作为第一个参数传入。
DEFAULT_SRC = os.path.join(ROOT, "assets", "logo_spic.png")

SRC = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
if not os.path.exists(SRC):
    raise SystemExit(
        f"找不到 logo 源图：{SRC}\n"
        f"用法：python3 scripts/gen-assets.py <logo_spic.png>"
    )

OUT = os.path.join(ROOT, "assets")

im = Image.open(SRC).convert("RGB")


def tight(box, thr=248):
    """box 内裁掉白边，返回 RGBA 素材。"""
    sub = im.crop(box)
    diff = ImageChops.difference(sub, Image.new("RGB", sub.size, (255, 255, 255))).convert("L")
    bb = diff.point(lambda v: 255 if v > (255 - thr) else 0).getbbox()
    if bb is None:
        raise SystemExit(f"empty region {box}")
    l, t, r, b = bb
    return sub.crop((l, t, r, b))


def unpremultiply(img):
    """白底 RGB -> 透明 RGBA：alpha = 255-min(r,g,b)，再反解真实颜色。"""
    img = img.convert("RGB")
    src = img.load()
    out = Image.new("RGBA", img.size)
    dst = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = src[x, y]
            a = 255 - min(r, g, b)
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            f = 255.0 / a
            dst[x, y] = (
                max(0, min(255, int(round((r - 255 + a) * f)))),
                max(0, min(255, int(round((g - 255 + a) * f)))),
                max(0, min(255, int(round((b - 255 + a) * f)))),
                a,
            )
    return out


def ink_mask(img, gain=1.0):
    """白底 RGB -> 白色 RGB + 墨迹 alpha（供 CSS mask 着色）。"""
    img = img.convert("RGB")
    diff = ImageChops.difference(img, Image.new("RGB", img.size, (255, 255, 255))).convert("L")
    if gain != 1.0:
        diff = diff.point(lambda v: min(255, int(v * gain)))
    out = Image.new("RGBA", img.size, (255, 255, 255, 255))
    out.putalpha(diff)
    return out


mark = unpremultiply(tight((0, 0, 120, 150)))
cn = ink_mask(tight((115, 0, 470, 72)))       # 第一行「国家电投」
spic = ink_mask(tight((115, 72, 470, 150)))   # 第二行「SPIC」
lockup = ink_mask(tight((115, 0, 470, 150)))  # 两行锁定组

for name, img in (("mark.png", mark), ("cn.png", cn), ("spic.png", spic), ("lockup.png", lockup)):
    p = os.path.join(OUT, name)
    img.save(p, "PNG", optimize=True)  # type: ignore[arg-type]
    print(f"{name:12s} {img.size[0]:>4}x{img.size[1]:<4} {os.path.getsize(p):>6} B")
