import os
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "BIAT IT Plateforme")


def generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _build_email_html(prenom: str, code: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 36px;">
              <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">BIAT IT</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Plateforme Réglementaire Bancaire</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="color:#e2e8f0;font-size:16px;margin:0 0 16px;">Bonjour <strong>{prenom}</strong>,</p>
              <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.6;">
                Voici votre code de vérification pour activer votre compte sur la plateforme BIAT IT.
                Ce code est valable <strong style="color:#e2e8f0;">15 minutes</strong>.
              </p>
              <!-- Code box -->
              <div style="background:#0f172a;border:2px solid #1d4ed8;border-radius:10px;
                          padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:2px;
                           text-transform:uppercase;margin-bottom:12px;">Code de vérification</p>
                <p style="margin:0;color:#fff;font-size:40px;font-weight:bold;
                           letter-spacing:12px;font-family:monospace;">{code}</p>
              </div>
              <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6;">
                Si vous n'avez pas créé de compte sur BIAT IT, ignorez cet email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #334155;">
              <p style="margin:0;color:#475569;font-size:12px;">
                BIAT IT · Plateforme interne de gestion des réglementations bancaires
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_verification_email(to_email: str, prenom: str, code: str) -> None:
    """Envoie le code par email. En mode dev (pas de SMTP configuré), affiche dans la console."""
    if not SMTP_USER or not SMTP_PASSWORD:
        # Mode développement : afficher dans la console
        print("=" * 50)
        print(f"[DEV] Email de vérification pour : {to_email}")
        print(f"[DEV] Prénom : {prenom}")
        print(f"[DEV] CODE : {code}")
        print("=" * 50)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[BIAT IT] Votre code de vérification : {code}"
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email

    text_body = (
        f"Bonjour {prenom},\n\n"
        f"Votre code de vérification BIAT IT est : {code}\n\n"
        f"Ce code expire dans 15 minutes.\n\n"
        f"Si vous n'avez pas créé ce compte, ignorez cet email."
    )
    html_body = _build_email_html(prenom, code)

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
