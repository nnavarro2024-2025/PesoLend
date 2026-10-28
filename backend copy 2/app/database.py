import os
import hashlib
import hmac
import secrets
from datetime import date, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "pesolend")

DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    query={"charset": "utf8mb4"},
)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    product: Mapped[str] = mapped_column(String(120), nullable=False)
    principal: Mapped[float] = mapped_column(Float, nullable=False)
    balance: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_payment: Mapped[float] = mapped_column(Float, nullable=False)
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    input_json: Mapped[str] = mapped_column(Text, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"pbkdf2_sha256$310000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, rounds, salt_hex, digest_hex = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        calculated = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(rounds),
        )
        return hmac.compare_digest(calculated.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def initialize_database() -> None:
    with engine.connect() as connection:
        connection.exec_driver_sql("SELECT 1")
    Base.metadata.create_all(engine)

    seeded_accounts = (
        ("Maria Santos", "maria@pesolend.demo", "borrower"),
        ("New Borrower", "new@pesolend.demo", "borrower"),
        ("Loan Officer", "officer@pesolend.demo", "officer"),
    )
    with SessionLocal.begin() as session:
        for name, email, role in seeded_accounts:
            user = session.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    name=name,
                    email=email,
                    password_hash=hash_password("demo1234"),
                    role=role,
                )
                session.add(user)
                session.flush()
            if email == "maria@pesolend.demo":
                active_loan = session.scalar(
                    select(Loan).where(Loan.user_id == user.id, Loan.status == "Active")
                )
                if active_loan is None:
                    session.add(
                        Loan(
                            user_id=user.id,
                            product="Personal loan",
                            principal=36_480,
                            balance=18_240,
                            monthly_payment=3_040,
                            next_due_date=date(2026, 11, 11),
                            paid_count=6,
                            total_count=12,
                            status="Active",
                        )
                    )


def find_user_by_email(email: str) -> dict[str, Any] | None:
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            return None
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "password_hash": user.password_hash,
            "role": user.role,
        }


def find_user_by_email_with_loan(email: str) -> dict[str, Any] | None:
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            return None
        loan = session.scalar(
            select(Loan)
            .where(Loan.user_id == user.id, Loan.status == "Active")
            .order_by(Loan.id)
            .limit(1)
        )
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "active_loan": _loan_json(loan),
        }


def _loan_json(loan: Loan | None) -> dict[str, Any] | None:
    if loan is None:
        return None
    return {
        "id": loan.id,
        "product": loan.product,
        "principal": loan.principal,
        "balance": loan.balance,
        "monthly_payment": loan.monthly_payment,
        "next_due_date": loan.next_due_date.isoformat(),
        "paid_count": loan.paid_count,
        "total_count": loan.total_count,
        "status": loan.status,
    }


def save_application(
    *,
    user_id: int,
    input_json: str,
    result_json: str,
    status: str,
    created_at: Any,
) -> None:
    with SessionLocal.begin() as session:
        session.add(
            Application(
                user_id=user_id,
                input_json=input_json,
                result_json=result_json,
                status=status,
                created_at=created_at,
            )
        )


def list_applications() -> list[dict[str, Any]]:
    import json

    with SessionLocal() as session:
        records = session.scalars(
            select(Application).order_by(Application.created_at.desc(), Application.id.desc())
        )
        return [json.loads(record.result_json) for record in records]


def save_support_message(
    *,
    user_id: int,
    message: str,
    topic: str,
    created_at: Any,
) -> None:
    with SessionLocal.begin() as session:
        session.add(
            SupportMessage(
                user_id=user_id,
                message=message,
                topic=topic,
                created_at=created_at,
            )
        )
