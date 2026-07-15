from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# ─── AUTH ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    prenom: str
    nom: str
    email: str
    date_naissance: Optional[date] = None
    mot_de_passe: str
    role: str = "comptable"
    cabinet: Optional[str] = None
    compte_biat: bool = False


class UserLogin(BaseModel):
    email: str
    mot_de_passe: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EmailVerificationRequest(BaseModel):
    email: str
    code: str


class ResendVerificationRequest(BaseModel):
    email: str


# ─── USER ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    prenom: str
    nom: str
    email: str
    date_naissance: Optional[date] = None
    role: str
    cabinet: Optional[str] = None
    compte_biat: bool
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    prenom: Optional[str] = None
    nom: Optional[str] = None
    role: Optional[str] = None
    cabinet: Optional[str] = None
    is_active: Optional[bool] = None


# ─── CATEGORY ────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    nom: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    nom: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    nom: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── REGULATION ──────────────────────────────────────────────────────────────

class RegulationCreate(BaseModel):
    titre: str
    reference: Optional[str] = None
    description: Optional[str] = None
    categorie_id: Optional[int] = None
    date_publication: Optional[date] = None
    date_mise_a_jour: Optional[date] = None
    organisme_emetteur: Optional[str] = None
    mots_cles: Optional[str] = None
    statut: str = "nouveau"
    roles_concernes: Optional[str] = None
    source: str = "interne"
    bct_url: Optional[str] = None
    note_interne: Optional[str] = None


class RegulationUpdate(BaseModel):
    titre: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    categorie_id: Optional[int] = None
    date_publication: Optional[date] = None
    date_mise_a_jour: Optional[date] = None
    organisme_emetteur: Optional[str] = None
    mots_cles: Optional[str] = None
    statut: Optional[str] = None
    roles_concernes: Optional[str] = None
    source: Optional[str] = None
    bct_url: Optional[str] = None
    note_interne: Optional[str] = None


class RegulationOut(BaseModel):
    id: int
    titre: str
    reference: Optional[str] = None
    description: Optional[str] = None
    categorie_id: Optional[int] = None
    categorie: Optional[CategoryOut] = None
    date_publication: Optional[date] = None
    date_mise_a_jour: Optional[date] = None
    organisme_emetteur: Optional[str] = None
    fichier_pdf: Optional[str] = None
    mots_cles: Optional[str] = None
    statut: str
    roles_concernes: Optional[str] = None
    source: str = "interne"
    bct_url: Optional[str] = None
    note_interne: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── STATS ───────────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_regulations: int
    active_regulations: int
    archived_regulations: int
    total_categories: int
