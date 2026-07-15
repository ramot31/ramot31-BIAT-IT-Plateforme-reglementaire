from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt

import models
import schemas
from auth import create_access_token, get_current_user, get_db
from email_service import generate_code, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_ROLES = {"comptable", "avocat", "risk_manager", "auditeur"}
CODE_EXPIRY_MINUTES = 15


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


@router.post("/register", status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Cette adresse e-mail est déjà utilisée")

    code = generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRY_MINUTES)

    new_user = models.User(
        prenom=user.prenom,
        nom=user.nom,
        email=user.email,
        date_naissance=user.date_naissance,
        mot_de_passe=hash_password(user.mot_de_passe),
        role=user.role,
        cabinet=user.cabinet,
        compte_biat=user.compte_biat,
        email_verified=False,
        verification_code=code,
        verification_code_expires=expires,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    send_verification_email(user.email, user.prenom, code)

    return {
        "message": "Compte créé. Vérifiez votre email pour activer votre compte.",
        "email": user.email,
    }


@router.post("/verify-email")
def verify_email(data: schemas.EmailVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé pour cet email")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Ce compte est déjà vérifié")

    if not user.verification_code or user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Code incorrect")

    # Vérifier l'expiration — les deux datetimes doivent être comparables
    expires = user.verification_code_expires
    if expires is not None:
        now = datetime.now(timezone.utc)
        # Si expires est naive, le rendre aware
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            raise HTTPException(status_code=400, detail="Code expiré. Demandez un nouveau code.")

    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "message": "Email vérifié avec succès.",
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/resend-verification")
def resend_verification(data: schemas.ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé pour cet email")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Ce compte est déjà vérifié")

    code = generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRY_MINUTES)

    user.verification_code = code
    user.verification_code_expires = expires
    db.commit()

    send_verification_email(data.email, user.prenom, code)

    return {"message": "Nouveau code envoyé. Vérifiez votre email."}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()

    if not user or not verify_password(credentials.mot_de_passe, user.mot_de_passe):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="EMAIL_NOT_VERIFIED",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
