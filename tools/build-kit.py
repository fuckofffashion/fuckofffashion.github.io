"""Druckt das Verbreiten-Kit (Sticker-Bogen, Flyer) als PDF und legt Vorschaubilder an.

Aufruf:  python tools/build-kit.py [domain]
Die Domain landet als Text und QR-Code auf dem Flyer. Ohne Angabe gilt DOMAIN unten.
"""
import subprocess
import sys
from pathlib import Path

import fitz  # PyMuPDF
import segno
from PIL import Image

DOMAIN = "fuckofffashion.github.io"  # Adresse der GitHub-Organisationsseite; bei eigener Domain als Argument übergeben
CHROME = Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe")

SITE = Path(__file__).resolve().parent.parent
KIT, OUT = SITE / "kit", SITE / "assets" / "kit"
PAGES = {"sticker.html": "fof-sticker-bogen-a4", "sticker-2.html": "fof-sticker-bogen-2-a4", "flyer.html": "fof-flyer-a6"}


def main():
    domain = sys.argv[1] if len(sys.argv) > 1 else DOMAIN
    OUT.mkdir(parents=True, exist_ok=True)
    segno.make(f"https://{domain}", error="m").save(KIT / "qr.svg", dark="#0b0a0a", border=0)

    for page, name in PAGES.items():
        pdf = OUT / f"{name}.pdf"
        url = (KIT / page).as_uri() + f"?url={domain}"
        subprocess.run([str(CHROME), "--headless=new", "--disable-gpu", "--allow-file-access-from-files",
                        "--no-pdf-header-footer", "--virtual-time-budget=4000",
                        f"--print-to-pdf={pdf}", url], check=True, capture_output=True, timeout=120)
        doc = fitz.open(pdf)
        pix = doc[0].get_pixmap(dpi=110)
        Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(OUT / f"{name}-vorschau.webp", quality=82)
        print(f"{pdf.name}: {doc.page_count} Seite(n), {pdf.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
