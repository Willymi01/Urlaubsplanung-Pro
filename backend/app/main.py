from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Generator

from fastapi import Depends, FastAPI, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from .database import Base, SessionLocal, engine
from .models import AuditLog, Department, User, UserRole
from .security import hash_pin, new_csrf_token, validate_pin, verify_pin

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Urlaubsplaner – Phase 1")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev-only-change-this-secret"),
    max_age=60 * 60 * 8,
    same_site="lax",
    https_only=os.getenv("HTTPS_ONLY", "false").lower() == "true",
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

LOCK_AFTER_ATTEMPTS = 5
LOCK_MINUTES = 15


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else None


def audit(db: Session, request: Request, action: str, user_id: int | None = None, details: str | None = None) -> None:
    db.add(AuditLog(user_id=user_id, action=action, details=details, ip_address=client_ip(request)))
    db.commit()


def csrf_token(request: Request) -> str:
    token = request.session.get("csrf_token")
    if not token:
        token = new_csrf_token()
        request.session["csrf_token"] = token
    return token


def verify_csrf(request: Request, token: str) -> None:
    expected = request.session.get("csrf_token")
    if not expected or token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ungültiges Formular-Token")


def current_user(request: Request, db: Session) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if not user or not user.is_active:
        request.session.clear()
        return None
    return user


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = current_user(request, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.role == UserRole.ADMIN.value))
        if admin is None:
            admin_name = os.getenv("ADMIN_NAME", "Admin")
            admin_pin = os.getenv("ADMIN_PIN", "1234")
            db.add(
                User(
                    display_name=admin_name,
                    pin_hash=hash_pin(admin_pin),
                    role=UserRole.ADMIN.value,
                    must_change_pin=True,
                )
            )
            db.commit()


@app.get("/", response_class=HTMLResponse)
def index(request: Request, db: Session = Depends(get_db)):
    if current_user(request, db):
        return RedirectResponse("/dashboard", status_code=303)
    return RedirectResponse("/login", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    if current_user(request, db):
        return RedirectResponse("/dashboard", status_code=303)
    users = db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.display_name)).all()
    return templates.TemplateResponse(
        request,
        "login.html",
        {"users": users, "csrf_token": csrf_token(request), "error": None},
    )


@app.post("/login", response_class=HTMLResponse)
def login(
    request: Request,
    display_name: str = Form(...),
    pin: str = Form(...),
    csrf: str = Form(...),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf)
    user = db.scalar(select(User).where(User.display_name == display_name, User.is_active.is_(True)))
    now = datetime.utcnow()

    if user and user.locked_until and user.locked_until > now:
        remaining = max(1, int((user.locked_until - now).total_seconds() // 60) + 1)
        audit(db, request, "login_locked", user.id, f"Noch {remaining} Minute(n) gesperrt")
        users = db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.display_name)).all()
        return templates.TemplateResponse(
            request,
            "login.html",
            {"users": users, "csrf_token": csrf_token(request), "error": f"Zugang vorübergehend gesperrt. Bitte in {remaining} Minute(n) erneut versuchen."},
            status_code=429,
        )

    if not user or not verify_pin(pin, user.pin_hash):
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= LOCK_AFTER_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_attempts = 0
            db.commit()
            audit(db, request, "login_failed", user.id)
        else:
            audit(db, request, "login_failed_unknown", details=f"Name: {display_name}")
        users = db.scalars(select(User).where(User.is_active.is_(True)).order_by(User.display_name)).all()
        return templates.TemplateResponse(
            request,
            "login.html",
            {"users": users, "csrf_token": csrf_token(request), "error": "Name oder PIN ist falsch."},
            status_code=401,
        )

    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    request.session.clear()
    request.session["user_id"] = user.id
    request.session["csrf_token"] = new_csrf_token()
    audit(db, request, "login_success", user.id)
    return RedirectResponse("/change-pin" if user.must_change_pin else "/dashboard", status_code=303)


@app.post("/logout")
def logout(request: Request, csrf: str = Form(...), db: Session = Depends(get_db)):
    verify_csrf(request, csrf)
    user_id = request.session.get("user_id")
    if user_id:
        audit(db, request, "logout", user_id)
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user: User = Depends(require_user), db: Session = Depends(get_db)):
    department_count = db.scalar(select(Department).where(Department.active.is_(True)).count()) if False else db.query(Department).filter(Department.active.is_(True)).count()
    manager_count = db.query(User).filter(User.is_active.is_(True), User.role == UserRole.DEPARTMENT_MANAGER.value).count()
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "user": user,
            "csrf_token": csrf_token(request),
            "department_count": department_count,
            "manager_count": manager_count,
        },
    )


@app.get("/change-pin", response_class=HTMLResponse)
def change_pin_page(request: Request, user: User = Depends(require_user)):
    return templates.TemplateResponse(
        request,
        "change_pin.html",
        {"user": user, "csrf_token": csrf_token(request), "error": None, "success": None},
    )


@app.post("/change-pin", response_class=HTMLResponse)
def change_pin(
    request: Request,
    current_pin: str = Form(...),
    new_pin: str = Form(...),
    new_pin_repeat: str = Form(...),
    csrf: str = Form(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf)
    error = None
    if not verify_pin(current_pin, user.pin_hash):
        error = "Die bisherige PIN ist falsch."
    elif new_pin != new_pin_repeat:
        error = "Die neuen PINs stimmen nicht überein."
    else:
        valid, message = validate_pin(new_pin)
        if not valid:
            error = message
        elif verify_pin(new_pin, user.pin_hash):
            error = "Die neue PIN muss sich von der bisherigen PIN unterscheiden."

    if error:
        return templates.TemplateResponse(
            request,
            "change_pin.html",
            {"user": user, "csrf_token": csrf_token(request), "error": error, "success": None},
            status_code=400,
        )

    user.pin_hash = hash_pin(new_pin)
    user.must_change_pin = False
    db.commit()
    audit(db, request, "pin_changed", user.id)
    return templates.TemplateResponse(
        request,
        "change_pin.html",
        {"user": user, "csrf_token": csrf_token(request), "error": None, "success": "PIN wurde erfolgreich geändert."},
    )


@app.get("/admin/users", response_class=HTMLResponse)
def admin_users(request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.display_name)).all()
    departments = db.scalars(select(Department).where(Department.active.is_(True)).order_by(Department.name)).all()
    return templates.TemplateResponse(
        request,
        "admin_users.html",
        {"user": admin, "users": users, "departments": departments, "csrf_token": csrf_token(request), "error": None},
    )


@app.post("/admin/users")
def create_user(
    request: Request,
    display_name: str = Form(...),
    pin: str = Form(...),
    role: str = Form(...),
    department_id: str = Form(""),
    csrf: str = Form(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf)
    display_name = display_name.strip()
    valid, message = validate_pin(pin)
    if not display_name or not valid or role not in {r.value for r in UserRole}:
        raise HTTPException(status_code=400, detail=message or "Ungültige Eingabe")
    if db.scalar(select(User).where(User.display_name == display_name)):
        raise HTTPException(status_code=409, detail="Dieser Name ist bereits vergeben")

    dep_id = int(department_id) if department_id.isdigit() else None
    new_user = User(
        display_name=display_name,
        pin_hash=hash_pin(pin),
        role=role,
        department_id=dep_id,
        must_change_pin=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    audit(db, request, "user_created", admin.id, f"Benutzer {new_user.display_name}, Rolle {new_user.role}")
    return RedirectResponse("/admin/users", status_code=303)


@app.post("/admin/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    request: Request,
    csrf: str = Form(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf)
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404)
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Der eigene Zugang kann nicht deaktiviert werden")
    target.is_active = not target.is_active
    db.commit()
    audit(db, request, "user_toggled", admin.id, f"{target.display_name}: aktiv={target.is_active}")
    return RedirectResponse("/admin/users", status_code=303)


@app.get("/admin/departments", response_class=HTMLResponse)
def admin_departments(request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    departments = db.scalars(select(Department).order_by(Department.name)).all()
    return templates.TemplateResponse(
        request,
        "admin_departments.html",
        {"user": admin, "departments": departments, "csrf_token": csrf_token(request)},
    )


@app.post("/admin/departments")
def create_department(
    request: Request,
    name: str = Form(...),
    csrf: str = Form(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    verify_csrf(request, csrf)
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name fehlt")
    if db.scalar(select(Department).where(Department.name == name)):
        raise HTTPException(status_code=409, detail="Abteilung existiert bereits")
    department = Department(name=name)
    db.add(department)
    db.commit()
    audit(db, request, "department_created", admin.id, name)
    return RedirectResponse("/admin/departments", status_code=303)


@app.get("/health")
def health():
    return {"status": "ok", "phase": 1}
