"""
Traduit les PDFs arabes en français via Google Translate (gratuit, sans clé API)
et les ré-indexe dans ChromaDB. Les chunks arabes sont remplacés par des chunks français.
Le nom de fichier source est conservé pour que la recherche par référence continue de fonctionner.

Usage:
  python translate_reindex_arabic.py --limit 3      # test sur 3 docs
  python translate_reindex_arabic.py                # tous les docs arabes
  python translate_reindex_arabic.py --force        # re-traduit même les déjà faits
"""
import argparse
import sys
import time
from pathlib import Path
from io import BytesIO

import fitz  # pymupdf — meilleure extraction Arabic que pdfplumber
from deep_translator import GoogleTranslator

sys.path.insert(0, str(Path(__file__).parent))
from rag import vectorstore, pipeline

DOCS_DIR   = Path(__file__).parent / "documents"
MAX_CHARS  = 4500   # limite Google Translate free
REQ_DELAY  = 1.2    # délai entre chaque appel API (éviter rate-limit)
DOC_DELAY  = 3.0    # délai entre chaque document

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"


def _split(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    segments = []
    text = text.strip()
    while len(text) > max_chars:
        cut = text[:max_chars].rfind(" ")
        if cut <= 0:
            cut = max_chars
        segments.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        segments.append(text)
    return segments


def translate_ar_fr(text: str) -> str:
    if not text.strip():
        return ""
    translator = GoogleTranslator(source="ar", target="fr")
    parts = []
    for seg in _split(text):
        for attempt in range(3):
            try:
                result = translator.translate(seg)
                parts.append(result or "")
                time.sleep(REQ_DELAY)
                break
            except Exception as e:
                if attempt == 2:
                    print(f"    {RED}[ERR traduction]{RESET} {e}")
                else:
                    time.sleep(2 ** attempt)
    return " ".join(parts)


def _is_arabic(text: str) -> bool:
    arabic = sum(1 for c in text if "؀" <= c <= "ۿ")
    return arabic / max(len(text), 1) > 0.15


def _has_cid_garbage(text: str) -> bool:
    """Détecte les PDFs avec encodage non-standard (polices CID)."""
    return "(cid:" in text


def process(pdf_path: Path, force: bool = False) -> str:
    """Traduit et ré-indexe un PDF arabe. Retourne 'done', 'skip' ou 'error'."""
    src = pdf_path.name

    if not force:
        existing = vectorstore.get_chunks_by_source(src, max_chunks=1)
        if existing and not _is_arabic(existing[0]["text"]):
            print(f"  {YELLOW}[SKIP]{RESET} {src} — déjà traduit")
            return "skip"

    print(f"\n  {GREEN}[TRAITEMENT]{RESET} {src}")

    # Extraction du texte arabe avec pymupdf (meilleure gestion des polices arabes)
    try:
        pages_text = []
        doc = fitz.open(str(pdf_path))
        for page in doc:
            # "words" mode regroupe correctement les chars arabes RTL
            # "text" mode les fragmente avec des espaces parasites
            words = page.get_text("words")
            t = " ".join(w[4] for w in words) if words else ""
            if not t.strip():
                t = page.get_text("text") or ""  # fallback
            if t.strip():
                pages_text.append(t)
        doc.close()
    except Exception as e:
        print(f"  {RED}[ERR PDF]{RESET} {e}")
        return "error"

    if not pages_text:
        print(f"  {YELLOW}[SKIP]{RESET} aucun texte extrait")
        return "skip"

    # Détecte les PDFs scannés avec encodage CID non-standard
    sample = " ".join(pages_text[:2])
    if _has_cid_garbage(sample):
        print(f"  {YELLOW}[SKIP]{RESET} PDF scanné/encodage non-standard (CID) — OCR requis")
        return "skip"

    # Vérifie qu'il y a vraiment du texte arabe
    arabic_chars = sum(1 for c in sample if 0x0600 <= ord(c) <= 0x06FF)
    if arabic_chars < 20:
        print(f"  {YELLOW}[SKIP]{RESET} pas de texte arabe détecté")
        return "skip"

    # Traduction page par page
    translated_pages = []
    for i, page_text in enumerate(pages_text, 1):
        print(f"    Page {i}/{len(pages_text)}...", end="\r")
        tr = translate_ar_fr(page_text)
        if tr:
            translated_pages.append(tr)

    if not translated_pages:
        print(f"  {RED}[ERR]{RESET} traduction vide")
        return "error"

    full_fr = "\n\n".join(translated_pages)
    print(f"    Traduction OK — {len(full_fr)} caractères français")

    # Supprime les chunks arabes
    deleted = vectorstore.delete_document(src)
    print(f"    {deleted} chunks arabes supprimés")

    # Ré-indexe en français (même nom de source)
    try:
        n = pipeline.ingest_text(full_fr, src)
        print(f"    {GREEN}{n} chunks français indexés{RESET}")
        return "done"
    except Exception as e:
        print(f"  {RED}[ERR indexation]{RESET} {e}")
        return "error"


def main():
    parser = argparse.ArgumentParser(description="Traduit et ré-indexe les PDFs arabes BCT")
    parser.add_argument("--limit", type=int, default=0,
                        help="Nombre max de docs à traiter (0 = tous)")
    parser.add_argument("--force", action="store_true",
                        help="Re-traduit même les docs déjà traduits")
    args = parser.parse_args()

    ar_pdfs = sorted(DOCS_DIR.rglob("*_ar.pdf"))
    print(f"PDFs arabes trouvés : {len(ar_pdfs)}")

    if args.limit:
        ar_pdfs = ar_pdfs[: args.limit]
        print(f"Limite : {args.limit} document(s)")

    done = skipped = errors = 0

    for pdf_path in ar_pdfs:
        try:
            r = process(pdf_path, force=args.force)
            if r == "done":
                done += 1
                time.sleep(DOC_DELAY)
            elif r == "skip":
                skipped += 1
            else:
                errors += 1
        except KeyboardInterrupt:
            print(f"\n{YELLOW}[ARRÊT]{RESET} Interrompu — reprenez sans --force pour continuer là où vous en étiez.")
            break
        except Exception as e:
            print(f"  {RED}[ERR]{RESET} {pdf_path.name} : {e}")
            errors += 1

    print(f"\n{'='*40}")
    print(f"  Traduits   : {GREEN}{done}{RESET}")
    print(f"  Ignorés    : {skipped}")
    print(f"  Erreurs    : {RED}{errors}{RESET}")
    print(f"{'='*40}")


if __name__ == "__main__":
    main()
