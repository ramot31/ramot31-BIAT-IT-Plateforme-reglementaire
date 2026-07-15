"""
Scraper automatique du site BCT (Banque Centrale de Tunisie).
Détecte les nouveaux règlements publiés et les crée automatiquement en base.

Pages ciblées :
  - Circulaires aux banques
  - Textes législatifs et réglementaires
  - Notes de la Banque Centrale

Le scraper déduplique par bct_url : un document déjà en base n'est jamais recréé.
"""
import hashlib
import os
import re
import time
import asyncio
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
import models
from notif import notify_all_users

# ── Configuration ────────────────────────────────────────────────────────────

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8",
}

# Proxy d'entreprise — laisser vide si pas de proxy
# Exemple : "http://proxy.biat.com.tn:8080"
HTTP_PROXY = os.getenv("HTTP_PROXY", "")
PROXIES = {"http": HTTP_PROXY, "https": HTTP_PROXY} if HTTP_PROXY else None

REQUEST_TIMEOUT = 20   # secondes par requête HTTP
PDF_TIMEOUT     = 60   # secondes pour télécharger un PDF
RATE_DELAY      = 0.8  # délai entre chaque PDF téléchargé

# Pages BCT à surveiller — ajouter ici d'autres URLs si nécessaire
BCT_SOURCES = [
    {
        "list_url":  "https://www.bct.gov.tn/bct/siteprod/circulaires.jsp",
        "base_url":  "https://www.bct.gov.tn",
        "organisme": "Banque Centrale de Tunisie",
        "type_hint": "Circulaire",
    },
    {
        "list_url":  "https://www.bct.gov.tn/bct/siteprod/textes.jsp",
        "base_url":  "https://www.bct.gov.tn",
        "organisme": "Banque Centrale de Tunisie",
        "type_hint": "Texte réglementaire",
    },
    {
        "list_url":  "https://www.bct.gov.tn/bct/siteprod/notes.jsp",
        "base_url":  "https://www.bct.gov.tn",
        "organisme": "Banque Centrale de Tunisie",
        "type_hint": "Note BCT",
    },
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _full_url(href: str, base_url: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return base_url + href
    return base_url + "/" + href


def _extract_date(text: str) -> date | None:
    """Extrait une date depuis un texte (formats courants BCT)."""
    patterns = [
        r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})",   # 2024-03-15
        r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",    # 15/03/2024
        r"(\d{4})",                                # année seule → 1er janvier
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if not m:
            continue
        g = m.groups()
        try:
            if len(g) == 3 and len(g[0]) == 4:
                return date(int(g[0]), int(g[1]), int(g[2]))
            elif len(g) == 3:
                return date(int(g[2]), int(g[1]), int(g[0]))
            elif len(g) == 1:
                return date(int(g[0]), 1, 1)
        except ValueError:
            continue
    return None


def _clean_title(raw: str, type_hint: str) -> str:
    """Nettoie le titre extrait depuis la page."""
    text = re.sub(r"\s+", " ", raw).strip()
    text = re.sub(r"^(télécharger|download|pdf|voir)\s*", "", text, flags=re.IGNORECASE)
    if len(text) < 8:
        text = type_hint
    return text[:250]


def _pdf_filename(pdf_url: str) -> str:
    """Génère un nom de fichier unique pour un PDF BCT."""
    digest = hashlib.md5(pdf_url.encode()).hexdigest()[:10]
    original = Path(pdf_url.split("?")[0]).name or "document.pdf"
    return f"bct_{digest}_{original}"


def _download_pdf(pdf_url: str, filename: str) -> bool:
    """Télécharge un PDF vers uploads/. Retourne True si succès."""
    dest = UPLOAD_DIR / filename
    if dest.exists():
        return True
    try:
        r = requests.get(pdf_url, headers=HEADERS, timeout=PDF_TIMEOUT, stream=True, proxies=PROXIES)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"[BCTScraper] PDF téléchargé : {filename}")
        return True
    except Exception as e:
        print(f"[BCTScraper] Erreur download {pdf_url} : {e}")
        return False


# ── Scraping d'une source ────────────────────────────────────────────────────

def _scrape_source(source: dict, db) -> list[dict]:
    """
    Scrape une page BCT, crée les nouveaux règlements en base.
    Retourne la liste des nouveaux règlements créés : [{"id": ..., "titre": ...}]
    """
    list_url  = source["list_url"]
    base_url  = source["base_url"]
    organisme = source["organisme"]
    type_hint = source["type_hint"]

    print(f"[BCTScraper] Scraping : {list_url}")
    try:
        r = requests.get(list_url, headers=HEADERS, timeout=REQUEST_TIMEOUT, proxies=PROXIES)
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
    except Exception as e:
        err_short = str(e).split("(Caused by")[0].strip()
        print(f"[BCTScraper] Inaccessible : {list_url} — {err_short}")
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    new_regs = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if not href.lower().endswith(".pdf"):
            continue

        pdf_url = _full_url(href, base_url)

        # Déduplication : déjà en base ?
        existing = db.query(models.Regulation).filter(
            models.Regulation.bct_url == pdf_url
        ).first()
        if existing:
            continue

        # Titre : texte du lien, sinon texte du conteneur parent
        link_text   = a.get_text(separator=" ", strip=True)
        parent_text = a.parent.get_text(separator=" ", strip=True) if a.parent else link_text
        title = _clean_title(link_text or parent_text, type_hint)
        if len(title) < 8:
            title = _clean_title(parent_text, type_hint)

        # Date de publication depuis le contexte ou le nom de fichier
        pub_date = _extract_date(parent_text) or _extract_date(href)

        # Téléchargement PDF
        filename = _pdf_filename(pdf_url)
        ok = _download_pdf(pdf_url, filename)

        # Création en base
        reg = models.Regulation(
            titre             = title,
            organisme_emetteur= organisme,
            source            = "bct",
            bct_url           = pdf_url,
            fichier_pdf       = filename if ok else None,
            date_publication  = pub_date,
            statut            = "nouveau",
        )
        db.add(reg)
        try:
            db.commit()
            db.refresh(reg)
            new_regs.append({"id": reg.id, "titre": reg.titre, "reference": reg.reference})
            print(f"[BCTScraper] Nouveau règlement : {reg.titre[:70]}")
        except Exception as e:
            db.rollback()
            print(f"[BCTScraper] Erreur DB : {e}")

        time.sleep(RATE_DELAY)

    return new_regs


# ── Point d'entrée principal ─────────────────────────────────────────────────

async def run_scrape() -> dict:
    """
    Lance le scraping de toutes les sources BCT configurées.
    Notifie tous les utilisateurs pour chaque nouveau règlement trouvé.
    Retourne un résumé {"new": n, "regulations": [...]}.
    """
    print("[BCTScraper] ── Démarrage scraping BCT ──")
    db = SessionLocal()
    all_new: list[dict] = []

    try:
        for source in BCT_SOURCES:
            try:
                new = _scrape_source(source, db)
                all_new.extend(new)
            except Exception as e:
                print(f"[BCTScraper] Erreur sur {source['list_url']} : {e}")
    finally:
        db.close()

    # Notifications pour chaque nouveau règlement
    for reg in all_new:
        try:
            await notify_all_users(
                "new_regulation",
                {"id": reg["id"], "titre": reg["titre"], "reference": reg.get("reference")},
            )
        except Exception as e:
            print(f"[BCTScraper] Erreur notif règlement {reg['id']} : {e}")

    print(f"[BCTScraper] ── Terminé : {len(all_new)} nouveau(x) règlement(s) ──")
    return {"new": len(all_new), "regulations": all_new}
