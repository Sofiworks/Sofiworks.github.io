#!/usr/bin/env python3
"""
Pawlock site görsel işleyici.

Kaynak görselleri (Xcode asset klasörü ya da site-assets/) alır, web için
optimize eder ve website/assets/img/ altına sitenin beklediği adlarla .webp
olarak yazar. Şeffaf olması gereken hero/CTA görsellerinin "sahte şeffaflık"
(satranç deseni) arka planını otomatik temizler.

Kullanım:  python3 website/optimize-images.py
Gereksinim: pillow, numpy, scipy  (pip install pillow numpy scipy)
"""
import os, sys
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XC   = os.path.join(ROOT, "DetoxLockify/Assets.xcassets/images")
SITE = os.path.join(ROOT, "site-assets")
DST  = os.path.join(ROOT, "website/assets/img")
os.makedirs(DST, exist_ok=True)


def find(*cands):
    for c in cands:
        if c and os.path.isfile(c):
            return c
    return None


def strip_fake_bg(im):
    """Flood/label ile açık-gri satranç (sahte şeffaflık) arka planını sil."""
    arr = np.array(im.convert("RGB")).astype(np.int16)
    mx, mn = arr.max(2), arr.min(2)
    gray = (mn >= 222) & ((mx - mn) <= 16)          # açık + neredeyse gri
    lbl, n = ndimage.label(gray)
    if n == 0:
        return im.convert("RGBA")
    border = set(lbl[0]) | set(lbl[-1]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    big = [i + 1 for i, s in enumerate(sizes) if s > 400]
    bg = bg | np.isin(lbl, big)                     # iç boşlukları da süpür
    out = np.dstack([arr.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


def save_webp(im, name, maxdim=None, maxw=None, q=84, alpha=False):
    im = im.convert("RGBA") if alpha else im.convert("RGB")
    w, h = im.size
    if maxw and w > maxw:
        im = im.resize((maxw, round(h * maxw / w)), Image.LANCZOS)
    elif maxdim and max(w, h) > maxdim:
        s = maxdim / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    path = os.path.join(DST, name)
    im.save(path, "WEBP", quality=q, method=6)
    print(f"  {name:22} {os.path.getsize(path)//1024:4} KB")


# (hedef-webp, [kaynak adaylari], secenekler, sahte-bg-temizle?)
JOBS = [
    # ekran goruntuleri
    ("s1-locknow.webp",  ["screenshots/01-locknow.PNG"],      dict(maxw=820, q=88), False),
    ("s2-stats.webp",    ["screenshots/04-statistics1.PNG"],  dict(maxw=820, q=88), False),
    ("s3-stats-daily.webp",["screenshots/05-statistics2.PNG"],dict(maxw=820, q=88), False),
    ("s4-programs.webp", ["screenshots/03-schedules.PNG"],    dict(maxw=820, q=88), False),
    ("s5-editor.webp",   ["screenshots/12-schedulesEdit.PNG"],dict(maxw=820, q=88), False),
    ("s6-report.webp",   ["screenshots/08-yesterdaysReport1.PNG"], dict(maxw=820, q=88), False),
    ("s7-locked.webp",   ["screenshots/02-lockedView.PNG"],   dict(maxw=820, q=88), False),
    # maskot gorselleri  (g1/g11 seffaf olmali -> sahte-bg temizle)
    ("g1-hero.webp",     ["promptImages/g1-hero.png"],            dict(maxdim=1000, q=88, alpha=True), True),
    ("g2-problem.webp",  ["promptImages/g2-problem.png"],         dict(maxdim=1200, q=82), False),
    ("g3-freedom.webp",  ["promptImages/g3-cozum_ozgurluk.png"],  dict(maxdim=1200, q=82), False),
    ("g4-step1.webp",    ["promptImages/g4-uygulama_sec.png"],    dict(maxdim=1100, q=84), False),
    ("g5-step2.webp",    ["promptImages/g5-kilitle.png"],         dict(maxdim=1100, q=84), False),
    ("g6-step3.webp",    ["promptImages/g6-hayatini_yasa.png"],   dict(maxdim=1100, q=84), False),
    ("g7-guard.webp",    ["promptImages/g7-kati_mod.png"],        dict(maxdim=1200, q=83), False),
    ("g8-sleep.webp",    ["promptImages/g8-uyku_zamani.png"],     dict(maxdim=1200, q=82), False),
    ("g9-stats.webp",    ["promptImages/g9-istatistik_buyume.png"],dict(maxdim=1100, q=84), False),
    ("g10-pro.webp",     ["promptImages/g10-pro_premium.png"],    dict(maxdim=1400, q=84), False),
    ("g11-cta.webp",     ["promptImages/g11-final_cta_davet.png"],dict(maxdim=1000, q=88, alpha=True), True),
    ("g12-avatars.webp", ["promptImages/g12-yorum_avatarlari.png"],dict(maxdim=1000, q=86), False),
]


def main():
    print("Görseller optimize ediliyor -> website/assets/img/")
    for name, cands, opts, cut in JOBS:
        src = find(*[os.path.join(XC, c) for c in cands],
                   *[os.path.join(SITE, os.path.basename(c)) for c in cands])
        if not src:
            print(f"  {name:22} atlandı (kaynak yok)")
            continue
        im = Image.open(src)
        if cut:
            im = strip_fake_bg(im)
        save_webp(im, name, **opts)
    # app ikonu (apple-touch-icon PNG olmali)
    icon = find(os.path.join(ROOT, "DetoxLockify/Assets.xcassets/AppIcon.appiconset/icon-1024.png"),
                os.path.join(SITE, "brand/app-icon.png"))
    if icon:
        Image.open(icon).convert("RGB").resize((256, 256), Image.LANCZOS).save(os.path.join(DST, "app-icon.png"))
        print("  app-icon.png          256px")
    print("Bitti.")


if __name__ == "__main__":
    main()
