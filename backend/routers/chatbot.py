import json as _json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

import models
from auth import get_current_user, require_admin, get_db
from database import SessionLocal
from rag import pipeline, vectorstore, llm

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


class ChatRequest(BaseModel):
    question: str
    n_results: int = 6


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]


# ─── CHAT ────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question ne peut pas être vide")

    try:
        result = pipeline.ask(req.question, n_results=req.n_results)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Sauvegarde de l'interaction
    db.add(models.ChatHistory(
        user_id=current_user.id,
        question=req.question,
        answer=result["answer"],
        sources=result["sources"],
    ))
    db.commit()

    return result


@router.post("/stream")
def stream_chat(
    req: ChatRequest,
    current_user: models.User = Depends(get_current_user),
):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question ne peut pas être vide")

    user_id  = current_user.id
    question = req.question
    n_results = req.n_results

    def event_generator():
        full_parts: list[str] = []
        final_sources: list   = []
        try:
            for event_type, content in pipeline.ask_stream(question, n_results=n_results):
                if event_type == "token":
                    full_parts.append(content)
                    yield f"data: {_json.dumps({'type': 'token', 'content': content}, ensure_ascii=False)}\n\n"
                elif event_type == "sources":
                    final_sources = content
                    yield f"data: {_json.dumps({'type': 'sources', 'sources': content}, ensure_ascii=False)}\n\n"
                elif event_type == "done":
                    db = SessionLocal()
                    try:
                        db.add(models.ChatHistory(
                            user_id=user_id,
                            question=question,
                            answer="".join(full_parts),
                            sources=final_sources,
                        ))
                        db.commit()
                    finally:
                        db.close()
                    yield f"data: {_json.dumps({'type': 'done'})}\n\n"
        except RuntimeError as e:
            yield f"data: {_json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {_json.dumps({'type': 'error', 'message': f'Erreur inattendue : {e}'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history")
def get_history(
    limit: int = Query(20, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.ChatHistory)
        .filter(models.ChatHistory.user_id == current_user.id)
        .order_by(models.ChatHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "question": r.question,
            "answer": r.answer,
            "sources": r.sources,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.delete("/history/{history_id}", status_code=204)
def delete_history(
    history_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.ChatHistory)
        .filter(
            models.ChatHistory.id == history_id,
            models.ChatHistory.user_id == current_user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    db.delete(row)
    db.commit()


@router.delete("/history", status_code=204)
def clear_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.ChatHistory).filter(
        models.ChatHistory.user_id == current_user.id
    ).delete()
    db.commit()


# ─── STATUS ──────────────────────────────────────────────────────────────────

@router.get("/status")
def status(_: models.User = Depends(get_current_user)):
    ollama_ok = llm.check_ollama()
    model_ok = llm.check_model_available() if ollama_ok else False
    chunks = vectorstore.total_chunks()
    docs = vectorstore.list_documents()
    return {
        "ollama_running": ollama_ok,
        "model_available": model_ok,
        "ollama_model": llm.OLLAMA_MODEL,
        "total_chunks": chunks,
        "total_documents": len(docs),
    }


# ─── ADMIN : DOCUMENTS ───────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    _: models.User = Depends(require_admin),
):
    import os
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté ({ext}). Formats acceptés : PDF, TXT",
        )

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB max
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 20 Mo)")

    try:
        if ext == ".pdf":
            chunks = pipeline.ingest_pdf(content, file.filename)
        else:
            chunks = pipeline.ingest_text(content.decode("utf-8", errors="ignore"), file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'ingestion : {e}")

    return {
        "message": f"Document indexé avec succès",
        "filename": file.filename,
        "chunks_created": chunks,
    }


@router.get("/documents")
def list_documents(_: models.User = Depends(require_admin)):
    return vectorstore.list_documents()


@router.delete("/documents/{source:path}")
def delete_document(
    source: str,
    _: models.User = Depends(require_admin),
):
    deleted = vectorstore.delete_document(source)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Document non trouvé dans la base")
    return {"message": f"{deleted} morceaux supprimés", "source": source}
