#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/process-assistants-bg.py
خط لوله هوش مصنوعی حذف بک‌گراند (پرده سبز + بک‌گراندهای خاکستری/طوسی/سفید استودیویی)
و بهینه‌سازی فوق‌سریع تصاویر دستیاران کارآگاه (تولید نسخه WebP سبک برای گالری + نسخه PNG شفاف برای دانلود).
منطبق با سند مرجع: MASTER_VAULT_AND_PORTRAITS_V2.md
"""

import argparse
import glob
import os
import sys
import numpy as np
from PIL import Image

REMBG_SESSION = None


def get_rembg_session():
    global REMBG_SESSION
    if REMBG_SESSION is None:
        from rembg import new_session
        # مدل تخصصی تفکیک پرتره و لباس انسان (بدون خوردگی لباس‌های هم‌رنگ پس‌زمینه)
        REMBG_SESSION = new_session("u2net_human_seg")
    return REMBG_SESSION


def is_green_corner(rgb):
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    return g > 65 and (g - max(r, b)) > 30


def remove_green_screen_numpy(im: Image.Image) -> Image.Image:
    """
    حذف دقیق پرده سبز استودیویی + حذف هاله سبز لبه‌های کلاه، عینک و پالتو (Despill) با NumPy
    """
    rgba = np.array(im.convert("RGBA"), dtype=np.float32)
    r = rgba[:, :, 0]
    g = rgba[:, :, 1]
    b = rgba[:, :, 2]
    a = rgba[:, :, 3]

    max_rb = np.maximum(r, b)
    green_excess = g - max_rb
    green_vs_r = g - r
    green_vs_b = g - b

    # ۱. ناحیه اصلی پرده سبز: شفافیت کامل
    core_green = (g > 68) & (green_vs_r > 44) & (green_vs_b > 26) & (green_excess > 36)
    a = np.where(core_green, 0.0, a)

    # ۲. ناحیه لبه نرم (Feathering) دور موها و کلاه + Despill
    edge_green = (~core_green) & (g > 52) & (green_vs_r > 18) & (green_vs_b > 10) & (green_excess > 10)
    ratio = np.clip((green_excess - 10.0) / (36.0 - 10.0), 0.0, 1.0)
    a = np.where(edge_green, a * (1.0 - ratio), a)
    g = np.where(edge_green, max_rb * 0.92 + g * 0.08, g)

    # ۳. حذف بازتاب خفیف سبز روی لبه‌های لباس و صورت
    spill_mask = (~core_green) & (~edge_green) & (green_excess > 3) & (g > r * 1.06)
    g = np.where(spill_mask, max_rb * 0.95 + g * 0.05, g)

    rgba[:, :, 1] = np.clip(g, 0, 255)
    rgba[:, :, 3] = np.clip(a, 0, 255)
    out_arr = rgba.astype(np.uint8)
    h, w = out_arr.shape[:2]
    corner_x = int(w * 0.89)
    corner_y = int(h * 0.89)
    if np.mean(out_arr[corner_y:, corner_x:, 3] < 20) > 0.35:
        out_arr[corner_y:, corner_x:, 3] = 0
    return Image.fromarray(out_arr, mode="RGBA")


def remove_studio_bg_ai(im: Image.Image) -> Image.Image:
    """
    حذف هوش مصنوعی انواع بک‌گراندهای استودیویی غیرسبز (خاکستری، طوسی، سفید، گرادینت)
    با مدل شبکه عصبی u2net_human_seg بدون آسیب به بارانی بژ، پیراهن سفید یا پالتوی طوسی
    """
    from rembg import remove

    session = get_rembg_session()
    out = remove(
        im.convert("RGBA"),
        session=session,
        post_process_mask=True,
    )
    rgba = np.array(out.convert("RGBA"), dtype=np.uint8)
    h, w = rgba.shape[:2]

    # حذف واترمارک ستاره گوشه پایین سمت راست فقط در صورتی که آن گوشه جزو پس‌زمینه باشد (نه آستین لباس!)
    corner_x = int(w * 0.90)
    corner_y = int(h * 0.90)
    if np.mean(rgba[corner_y:, corner_x:, 3] < 20) > 0.45:
        rgba[corner_y:, corner_x:, 3] = 0

    return Image.fromarray(rgba, mode="RGBA")


def process_single_portrait(src_path: str) -> tuple[str, str]:
    """
    پردازش یک تصویر، تولید فایل WebP سبک (برای کارت گالری) و فایل PNG باکیفیت (_hd.png برای دانلود)
    برمی‌گرداند: (webp_path, hd_png_path)
    """
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size

    # بررسی اینکه آیا قبلاً شفاف شده است یا خیر
    alpha_arr = np.array(im.getchannel("A"))
    already_transparent = (np.sum(alpha_arr < 16) / float(w * h)) > 0.08

    if already_transparent:
        clean_rgba = im
    else:
        tl = im.getpixel((min(8, w - 1), min(8, h - 1)))
        tr = im.getpixel((max(0, w - 9), min(8, h - 1)))
        if is_green_corner(tl) or is_green_corner(tr):
            clean_rgba = remove_green_screen_numpy(im)
        else:
            clean_rgba = remove_studio_bg_ai(im)

    base_no_ext = os.path.splitext(src_path)[0]
    if base_no_ext.endswith("_hd"):
        base_no_ext = base_no_ext[:-3]

    webp_path = f"{base_no_ext}.webp"
    hd_png_path = f"{base_no_ext}_hd.png"

    # ۱. ذخیره نسخه PNG شفاف باکیفیت برای دانلود و بزرگ‌نمایی (حداکثر 1000x1333)
    hd_im = clean_rgba.copy()
    hd_im.thumbnail((1000, 1333), Image.Resampling.LANCZOS)
    hd_im.save(hd_png_path, format="PNG", optimize=True)

    # ۲. ذخیره نسخه WebP فوق‌سریع برای کارت‌های گالری (حداکثر 520x693 — حدود ۲۵ تا ۴۵ کیلوبایت)
    card_im = clean_rgba.copy()
    card_im.thumbnail((520, 693), Image.Resampling.LANCZOS)
    card_im.save(webp_path, format="WEBP", quality=86, method=4)

    # حذف فایل خام قدیمی در صورتی که نامش متفاوت از webp_path و hd_png_path باشد
    if os.path.abspath(src_path) not in (os.path.abspath(webp_path), os.path.abspath(hd_png_path)):
        try:
            os.remove(src_path)
        except OSError:
            pass

    return webp_path, hd_png_path


def process_all_in_project(project_root: str):
    uploads_root = os.path.join(project_root, "public", "uploads", "assistants")
    if not os.path.exists(uploads_root):
        print("No assistants upload directory found.", flush=True)
        return

    all_files = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        all_files.extend(glob.glob(os.path.join(uploads_root, "**", ext), recursive=True))

    # فیلتر کردن فایل‌های _hd.png تا دوباره پردازش نشوند
    candidates = [f for f in sorted(set(all_files)) if not f.endswith("_hd.png")]
    print(f"Found {len(candidates)} portrait files to optimize & cutout...", flush=True)

    processed_count = 0
    for idx, fpath in enumerate(candidates, 1):
        try:
            webp_p, _ = process_single_portrait(fpath)
            processed_count += 1
            if idx % 15 == 0 or idx == len(candidates):
                print(f"[{idx}/{len(candidates)}] Processed -> {os.path.basename(webp_p)}", flush=True)
        except Exception as exc:
            print(f"Error processing {fpath}: {exc}", file=sys.stderr, flush=True)

    print(f"DONE_FILES:{processed_count}", flush=True)


def main():
    parser = argparse.ArgumentParser(description="AI Background Removal & WebP Optimizer for Detective Assistants")
    parser.add_argument("--single", help="Process a single image file and print its resulting webp path")
    parser.add_argument("--root", default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), help="Project root")
    args = parser.parse_args()

    if args.single:
        webp_p, hd_p = process_single_portrait(os.path.abspath(args.single))
        print(f"OK:{webp_p}|{hd_p}", flush=True)
    else:
        process_all_in_project(os.path.abspath(args.root))


if __name__ == "__main__":
    main()
