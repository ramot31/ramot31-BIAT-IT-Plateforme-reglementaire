"""
Migration manuelle pour ajouter les colonnes source, bct_url, note_interne
à la table regulations. Exécutée automatiquement au démarrage du serveur.
PostgreSQL: ADD COLUMN IF NOT EXISTS évite les erreurs si déjà présentes.
"""
from sqlalchemy import text
from database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE regulations
                ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'interne',
                ADD COLUMN IF NOT EXISTS bct_url VARCHAR,
                ADD COLUMN IF NOT EXISTS note_interne TEXT
        """))
        conn.commit()
    print("[Migration] Colonnes regulations (source, bct_url, note_interne) OK")
