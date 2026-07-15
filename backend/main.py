import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routers import auth, users, regulations, categories, admin, chatbot, contact, ws


async def _scheduled_scrape():
    """Tâche de fond : scrape BCT toutes les 6 heures."""
    await asyncio.sleep(60)  # laisse le serveur démarrer avant le 1er scraping
    while True:
        try:
            from scraper.bct_scraper import run_scrape
            await run_scrape()
        except Exception as e:
            print(f"[Scheduler] Erreur scraping BCT : {e}")
        await asyncio.sleep(6 * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Démarrage ──
    import migration
    migration.run()
    Base.metadata.create_all(bind=engine)
    task = asyncio.create_task(_scheduled_scrape())
    yield
    # ── Arrêt ──
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="BIAT IT - Plateforme Réglementaire",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(regulations.router)
app.include_router(categories.router)
app.include_router(admin.router)
app.include_router(chatbot.router)
app.include_router(contact.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"message": "BIAT IT API — Plateforme Réglementaire Bancaire"}
