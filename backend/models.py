from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    prenom = Column(String, nullable=False)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    date_naissance = Column(Date, nullable=True)
    mot_de_passe = Column(String, nullable=False)
    role = Column(String, default="comptable")
    cabinet = Column(String, nullable=True)
    compte_biat = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    regulations = relationship("Regulation", back_populates="categorie")


class Regulation(Base):
    __tablename__ = "regulations"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String, nullable=False)
    reference = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    categorie_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    date_publication = Column(Date, nullable=True)
    date_mise_a_jour = Column(Date, nullable=True)
    organisme_emetteur = Column(String, nullable=True)
    fichier_pdf = Column(String, nullable=True)
    mots_cles = Column(String, nullable=True)
    statut = Column(String, default="actif")
    roles_concernes = Column(String, nullable=True)
    source = Column(String, default="interne")   # "bct" | "interne"
    bct_url = Column(String, nullable=True)       # URL source sur bct.gov.tn
    note_interne = Column(Text, nullable=True)    # note admin privée
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    categorie = relationship("Category", back_populates="regulations")


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    sujet        = Column(String, nullable=False)
    message      = Column(Text, nullable=False)
    reponse      = Column(Text, nullable=True)
    lu           = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=utcnow)
    repondu_at   = Column(DateTime, nullable=True)

    user = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    type       = Column(String, nullable=False)       # new_message | new_reply | new_regulation
    payload    = Column(JSON, nullable=False)          # données complètes
    lu         = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")
