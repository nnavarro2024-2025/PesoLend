from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sklearn.model_selection import train_test_split
from sqlalchemy.exc import SQLAlchemyError

from . import database


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
MODEL_DIR = BACKEND_DIR / "models"
MAX_LOAN_AMOUNT = 60_000
MIN_LOAN_AMOUNT = 1_000

BORROWER_FEATURES = [
    "income",
    "expenses",
    "age",
    "credit_score",
    "years_of_work",
    "debts",
    "loan_amount",
    "late_payments",
    "payment_history",
]
REGRESSION_FEATURES = ["income", "expenses", "credit_score", "years_of_work"]
PAYMENT_HISTORY_ENCODING = {
    "Poor": 0,
    "Fair": 1,
    "Good": 2,
    "Excellent": 3,
    "Always on time": 3,
    "1–2 late payments": 1,
    "1-2 late payments": 1,
}
DEFAULT_PROFILE = {
    "income": 42_000,
    "expenses": 18_500,
    "age": 35,
    "credit_score": 712,
    "years_of_work": 8.0,
    "debts": 3_000,
    "loan_amount": 50_000,
    "late_payments": 0,
    "payment_history": 3,
}
MODEL_FILES = {
    "loan-amount": "loan_amount.joblib",
    "decision": "decision_tree.joblib",
    "similar-borrowers": "knn.joblib",
    "classify-message": "message_classifier.joblib",
    "risk-label": "svm.joblib",
    "default-probability": "mlp.joblib",
}
LOGGER = logging.getLogger("pesolend")


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class PredictionRequest(BaseModel):
    income: float | None = Field(default=None, gt=0, le=10_000_000)
    expenses: float | None = Field(default=None, ge=0, le=10_000_000)
    age: int | None = Field(default=None, ge=18, le=100)
    credit_score: int | None = Field(default=None, ge=300, le=850)
    years_of_work: float | None = Field(default=None, ge=0, le=80)
    debts: float | None = Field(default=None, ge=0, le=10_000_000)
    loan_amount: float | None = None
    amount: float | None = None
    late_payments: int | None = Field(default=None, ge=0, le=100)
    payment_history: str | None = Field(default=None, max_length=64)
    message: str | None = Field(default=None, min_length=1, max_length=2_000)
    term: int | None = Field(default=None, ge=1, le=60)
    applicant_name: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("loan_amount", "amount")
    @classmethod
    def validate_loan_amount(cls, value: float | None) -> float | None:
        if value is not None and not MIN_LOAN_AMOUNT <= value <= MAX_LOAN_AMOUNT:
            raise ValueError("Loan amount must be between PHP 1,000 and PHP 60,000.")
        return value

    @field_validator("payment_history")
    @classmethod
    def validate_payment_history(cls, value: str | None) -> str | None:
        if value is not None and value not in PAYMENT_HISTORY_ENCODING:
            allowed = ", ".join(PAYMENT_HISTORY_ENCODING)
            raise ValueError(f"payment_history must be one of: {allowed}")
        return value


def _tree_json(model: Any, node: int = 0) -> dict[str, Any]:
    tree = model.tree_
    if tree.children_left[node] == tree.children_right[node]:
        class_index = int(np.argmax(tree.value[node][0]))
        return {
            "prediction": str(model.classes_[class_index]),
            "samples": int(tree.n_node_samples[node]),
        }

    return {
        "feature": str(model.feature_names_in_[tree.feature[node]]),
        "threshold": float(tree.threshold[node]),
        "samples": int(tree.n_node_samples[node]),
        "left": _tree_json(model, int(tree.children_left[node])),
        "right": _tree_json(model, int(tree.children_right[node])),
    }


def _tree_rules(model: Any, values: pd.DataFrame) -> list[str]:
    tree = model.tree_
    path = model.decision_path(values).indices
    rules: list[str] = []
    for node in path:
        if tree.children_left[node] == tree.children_right[node]:
            continue
        feature = str(model.feature_names_in_[tree.feature[node]])
        threshold = float(tree.threshold[node])
        value = float(values.iloc[0][feature])
        display_feature = feature.replace("_", " ")
        display_value = (
            f"{value:g} ({['Poor', 'Fair', 'Good', 'Excellent'][int(value)]})"
            if feature == "payment_history" and 0 <= int(value) <= 3
            else f"{value:g}"
        )
        if tree.children_left[node] in path:
            rules.append(
                f"{display_feature} {display_value} is at most {threshold:.2f}"
            )
        else:
            rules.append(
                f"{display_feature} {display_value} is greater than {threshold:.2f}"
            )
    return rules


def _probability_for_class(model: Any, values: pd.DataFrame, label: Any) -> float:
    classes = list(model.classes_)
    class_index = classes.index(label)
    return float(model.predict_proba(values)[0, class_index])


def _borrower_values(
    payload: PredictionRequest | dict[str, Any],
) -> tuple[dict[str, Any], pd.DataFrame]:
    supplied = (
        payload.model_dump(exclude_none=True)
        if isinstance(payload, PredictionRequest)
        else {key: value for key, value in payload.items() if value is not None}
    )
    profile = DEFAULT_PROFILE | supplied
    if "amount" in supplied:
        profile["loan_amount"] = supplied["amount"]
    profile["payment_history"] = PAYMENT_HISTORY_ENCODING.get(
        str(profile["payment_history"]),
        profile["payment_history"],
    )
    row = pd.DataFrame(
        [{feature: profile[feature] for feature in BORROWER_FEATURES}],
        columns=BORROWER_FEATURES,
    )
    return profile, row


def _get_model_metrics(state: Any, name: str) -> dict[str, Any]:
    try:
        return state.metrics["models"][name]
    except KeyError as error:
        raise RuntimeError(f"Metrics file is missing the '{name}' model entry") from error


def _top_words(model: Any, count: int = 5) -> dict[str, list[str]]:
    vectorizer = model.named_steps["tfidf"]
    classifier = model.named_steps["classifier"]
    words = vectorizer.get_feature_names_out()
    stop_words = vectorizer.get_stop_words() or set()
    result: dict[str, list[str]] = {}
    for topic, log_probabilities in zip(classifier.classes_, classifier.feature_log_prob_):
        indices = np.argsort(log_probabilities)[::-1]
        top_words = [
            str(words[index])
            for index in indices
            if not set(str(words[index]).split()).intersection(stop_words)
        ]
        result[str(topic)] = top_words[:count]
    return result


def _predict_bundle(state: Any, payload: PredictionRequest | dict[str, Any]) -> dict[str, Any]:
    profile, borrower_row = _borrower_values(payload)
    regression_row = pd.DataFrame(
        [{feature: profile[feature] for feature in REGRESSION_FEATURES}],
        columns=REGRESSION_FEATURES,
    )
    model_estimate = float(state.models["loan-amount"].predict(regression_row)[0])
    suggested_amount = max(
        MIN_LOAN_AMOUNT,
        min(model_estimate, MAX_LOAN_AMOUNT),
    )
    adjusted = (
        "capped" if model_estimate > MAX_LOAN_AMOUNT
        else "raised" if model_estimate < MIN_LOAN_AMOUNT
        else None
    )

    tree_model = state.models["decision"]
    tree_prediction = str(tree_model.predict(borrower_row)[0])
    approved = tree_prediction == "approve"
    rules_path = _tree_rules(tree_model, borrower_row)

    knn_model = state.models["similar-borrowers"]
    classifier = knn_model.named_steps["classifier"]
    scaler = knn_model.named_steps["scaler"]
    scaled_row = scaler.transform(borrower_row)
    distances, neighbor_indices = classifier.kneighbors(
        scaled_row,
        n_neighbors=min(5, int(classifier.n_samples_fit_)),
    )
    train_indices, _ = train_test_split(
        np.arange(len(state.borrowers)),
        test_size=0.2,
        random_state=42,
        stratify=state.borrowers["paid_back"],
    )
    neighbors = []
    paid_back_count = 0
    for distance, local_index in zip(distances[0], neighbor_indices[0]):
        borrower_index = int(train_indices[int(local_index)])
        borrower = state.borrowers.iloc[borrower_index]
        paid_back = int(borrower["paid_back"])
        paid_back_count += paid_back
        neighbors.append(
            {
                "borrower_id": f"PL-{borrower_index + 1:04d}",
                "income": int(borrower["income"]),
                "loan_amount": int(borrower["loan_amount"]),
                "credit_score": int(borrower["credit_score"]),
                "paid_back": paid_back,
                "outcome": "Paid back" if paid_back else "Not paid",
                "distance": float(distance),
            }
        )

    svm_model = state.models["risk-label"]
    svm_prediction = int(svm_model.predict(borrower_row)[0])
    risk_label = "Low" if svm_prediction == 1 else "High"

    mlp_model = state.models["default-probability"]
    default_probability = _probability_for_class(mlp_model, borrower_row, 0)
    risk_percent = round(default_probability * 100, 1)

    common = {
        "amount": suggested_amount,
        "approved": approved,
        "risk": risk_percent,
        "model": None,
    }
    return {
        "profile": profile,
        "borrower_row": borrower_row,
        "regression_row": regression_row,
        "common": common,
        "model_estimate": model_estimate,
        "suggested_amount": suggested_amount,
        "min_loan": MIN_LOAN_AMOUNT,
        "max_loan": MAX_LOAN_AMOUNT,
        "adjusted": adjusted,
        "decision": "Approved" if approved else "Rejected",
        "approved": approved,
        "rules_path": rules_path,
        "tree": _tree_json(tree_model),
        "neighbors": neighbors,
        "paid_back_count": paid_back_count,
        "svm_prediction": svm_prediction,
        "risk_label": risk_label,
        "default_probability": default_probability,
        "risk_percent": risk_percent,
    }


def _interpretation(slug: str, result: dict[str, Any]) -> str:
    if slug == "loan-amount":
        if result["adjusted"] == "capped":
            return (
                f"The regression model estimates PHP {result['model_estimate']:,.0f}. "
                f"PesoLend's maximum loan is PHP {MAX_LOAN_AMOUNT:,}, so the "
                f"suggested amount is PHP {result['suggested_amount']:,.0f}."
            )
        if result["adjusted"] == "raised":
            return (
                f"The regression model estimates PHP {result['model_estimate']:,.0f}, "
                f"which is below PesoLend's minimum loan of PHP {MIN_LOAN_AMOUNT:,}, "
                f"so the suggested amount is PHP {result['suggested_amount']:,.0f}. "
                "This applicant's details are outside the range the model was trained on."
            )
        return (
            f"The regression model suggests PHP {result['suggested_amount']:,.0f}."
        )
    if slug == "decision":
        return (
            f"The decision tree recommends {result['decision'].lower()} "
            f"after {len(result['rules_path'])} rule checks."
        )
    if slug == "similar-borrowers":
        return (
            f"{result['paid_back_count']} of the {result['k']} closest borrowers "
            "paid back their loans."
        )
    if slug == "classify-message":
        return (
            f"The message model classifies this as {result['topic']} "
            f"with {result['confidence']:.0%} probability."
        )
    if slug == "risk-label":
        return (
            f"The SVM labels this profile {result['label'].lower()} risk "
            f"with {result['accuracy']:.0%} test accuracy."
        )
    return (
        f"The neural network estimates a {result['probability']:.0%} chance "
        "that this borrower will not pay back."
    )


def _fallback_accounts() -> dict[str, dict[str, Any]]:
    return {
        "maria@pesolend.demo": {
            "id": 1,
            "name": "Maria Santos",
            "email": "maria@pesolend.demo",
            "password_hash": database.hash_password("demo1234"),
            "role": "borrower",
            "active_loan": {
                "id": 1,
                "product": "Personal loan",
                "principal": 36_480,
                "balance": 18_240,
                "monthly_payment": 3_040,
                "next_due_date": "2026-11-11",
                "paid_count": 6,
                "total_count": 12,
                "status": "Active",
            },
        },
        "new@pesolend.demo": {
            "id": 2,
            "name": "New Borrower",
            "email": "new@pesolend.demo",
            "password_hash": database.hash_password("demo1234"),
            "role": "borrower",
            "active_loan": None,
        },
        "officer@pesolend.demo": {
            "id": 3,
            "name": "Loan Officer",
            "email": "officer@pesolend.demo",
            "password_hash": database.hash_password("demo1234"),
            "role": "officer",
            "active_loan": None,
        },
    }


def _use_memory_database(error: SQLAlchemyError) -> None:
    if app.state.db_available:
        LOGGER.warning(
            "MySQL is unavailable; switching to in-memory demo storage: %s", error
        )
    app.state.db_available = False


def _email_for_authorization(authorization: str | None) -> str:
    prefix = "Bearer "
    if authorization and authorization.startswith(prefix):
        token = authorization[len(prefix):]
        email = app.state.tokens.get(token)
        if email:
            return email
    return "maria@pesolend.demo"


def _save_application_record(
    record: dict[str, Any],
    payload: dict[str, Any],
    email: str,
) -> None:
    state = app.state
    if not state.db_available:
        state.applications.append(record)
        return
    try:
        account = database.find_user_by_email(email)
        if account is None:
            account = database.find_user_by_email("maria@pesolend.demo")
        if account is None:
            raise RuntimeError("The demo borrower account is missing from MySQL.")
        created_at = datetime.fromisoformat(record["submitted_at"]).replace(tzinfo=None)
        database.save_application(
            user_id=account["id"],
            input_json=json.dumps(payload, default=str),
            result_json=json.dumps(record, default=str),
            status=str(record["decision"]).lower(),
            created_at=created_at,
        )
    except SQLAlchemyError as error:
        _use_memory_database(error)
        state.applications.append(record)


def _prediction_response(
    state: Any,
    slug: str,
    payload: PredictionRequest | dict[str, Any],
) -> dict[str, Any]:
    if slug not in MODEL_FILES:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown model slug '{slug}'. Choose from: {', '.join(MODEL_FILES)}",
        )
    result = _predict_bundle(state, payload)
    response = result["common"] | {"model": slug}

    if slug == "loan-amount":
        metrics = _get_model_metrics(state, slug)
        response |= {
            "model_estimate": result["model_estimate"],
            "suggested_amount": result["suggested_amount"],
            "min_loan": MIN_LOAN_AMOUNT,
            "max_loan": MAX_LOAN_AMOUNT,
            "adjusted": result["adjusted"],
            "mae": metrics["mae"],
            "r2": metrics["r2"],
        }
        response["interpretation"] = _interpretation(slug, response)
    elif slug == "decision":
        metrics = _get_model_metrics(state, slug)
        response |= {
            "decision": result["decision"],
            "rules_path": result["rules_path"],
            "tree": result["tree"],
            "accuracy": metrics["accuracy"],
            "risky_wrongly_approved": metrics["risky_wrongly_approved"],
        }
        response["interpretation"] = _interpretation(slug, response)
    elif slug == "similar-borrowers":
        metrics = _get_model_metrics(state, slug)
        response |= {
            "neighbors": result["neighbors"],
            "paid_back_count": result["paid_back_count"],
            "k": 5,
            "accuracy_by_k": metrics["accuracy_by_k"],
        }
        response["interpretation"] = _interpretation(slug, response)
    elif slug == "classify-message":
        if isinstance(payload, PredictionRequest):
            message = payload.message
        else:
            message = payload.get("message")
        if not message:
            raise HTTPException(
                status_code=422,
                detail="The classify-message model requires a non-empty 'message'.",
            )
        model = state.models[slug]
        topic = str(model.predict([message])[0])
        probabilities = {
            str(label): float(probability)
            for label, probability in zip(model.classes_, model.predict_proba([message])[0])
        }
        response |= {
            "topic": topic,
            "probabilities": probabilities,
            "top_words": _top_words(model),
            "confidence": probabilities[topic],
        }
        response["interpretation"] = _interpretation(slug, response)
    elif slug == "risk-label":
        metrics = _get_model_metrics(state, slug)
        response |= {
            "label": result["risk_label"],
            "accuracy": metrics["accuracy"],
            "recall_risky": metrics["recall_on_risky_borrowers"],
            "confusion_matrix": metrics["confusion_matrix"],
            "boundary_points": state.svm_2d_chart["boundary_points"],
            "sample_points": state.svm_2d_chart["sample_points"],
            "chart_grid": state.svm_2d_chart["grid"],
            "chart_model_accuracy": state.metrics["models"]["risk-label-2d"][
                "accuracy"
            ],
            "chart_model_recall_risky": state.metrics["models"]["risk-label-2d"][
                "recall_on_risky_borrowers"
            ],
        }
        response["interpretation"] = _interpretation(slug, response)
    else:
        metrics = _get_model_metrics(state, slug)
        response |= {
            "probability": result["default_probability"],
            "default_probability": result["default_probability"],
            "accuracy": metrics["accuracy"],
            "recall_risky": metrics["recall_on_risky_borrowers"],
        }
        response["interpretation"] = _interpretation(slug, response)
    return response


def _application_record(
    state: Any,
    payload: PredictionRequest | dict[str, Any],
    *,
    applicant_name: str,
    term: int = 6,
) -> dict[str, Any]:
    result = _predict_bundle(state, payload)
    profile = result["profile"]
    requested_amount = max(
        MIN_LOAN_AMOUNT,
        min(
            int(round(profile.get("amount", profile.get("loan_amount", DEFAULT_PROFILE["loan_amount"])))),
            MAX_LOAN_AMOUNT,
        ),
    )
    suggested_amount = max(
        MIN_LOAN_AMOUNT,
        min(result["suggested_amount"], MAX_LOAN_AMOUNT),
    )
    interest_rate = round(3.0 + result["default_probability"] * 15.0, 2)
    monthly_payment = round(
        requested_amount * (1 + interest_rate / 100) / max(term, 1),
        2,
    )
    submitted_at = datetime.now(timezone.utc).isoformat()
    application_id = f"PL-APP-{uuid4().hex[:8].upper()}"
    reasons = result["rules_path"] or [
        "The decision tree reached its approval result without a split."
    ]
    record = {
        "id": application_id,
        "applicant_name": applicant_name,
        "submitted_at": submitted_at,
        "amount": requested_amount,
        "term": term,
        "decision": result["decision"],
        "reasons": reasons,
        "similar_borrowers": result["neighbors"],
        "paid_back_count": result["paid_back_count"],
        "suggested_amount": suggested_amount,
        "interest_rate": interest_rate,
        "monthly_payment": monthly_payment,
        "risk_label": result["risk_label"],
        "default_probability": result["default_probability"],
        "approved": result["approved"],
        "risk": result["risk_percent"],
        "interpretation": (
            f"The models recommend {result['decision'].lower()}; estimated default "
            f"probability is {result['default_probability']:.0%}, and the suggested "
            f"amount is PHP {suggested_amount:,.0f}."
        ),
    }
    message = profile.get("message")
    if message:
        message_model = state.models["classify-message"]
        record["message_topic"] = str(message_model.predict([message])[0])
    return record


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing_artifacts = [
        str(MODEL_DIR / filename)
        for filename in [
            *MODEL_FILES.values(),
            "svm_2d.joblib",
            "svm_2d_chart.json",
            "metrics.json",
        ]
        if not (MODEL_DIR / filename).is_file()
    ]
    missing_data = [
        str(DATA_DIR / filename)
        for filename in ("borrowers.csv", "messages.csv")
        if not (DATA_DIR / filename).is_file()
    ]
    if missing_artifacts or missing_data:
        missing = missing_artifacts + missing_data
        raise RuntimeError(
            "Required backend files are missing: "
            + ", ".join(missing)
            + ". Generate data and run train.py before starting the API."
        )

    app.state.models = {
        slug: joblib.load(MODEL_DIR / filename)
        for slug, filename in MODEL_FILES.items()
    }
    app.state.models["svm-2d"] = joblib.load(MODEL_DIR / "svm_2d.joblib")
    app.state.svm_2d_chart = json.loads(
        (MODEL_DIR / "svm_2d_chart.json").read_text(encoding="utf-8")
    )
    app.state.metrics = json.loads(
        (MODEL_DIR / "metrics.json").read_text(encoding="utf-8")
    )
    app.state.borrowers = pd.read_csv(DATA_DIR / "borrowers.csv")
    app.state.messages = pd.read_csv(DATA_DIR / "messages.csv")
    app.state.applications = []
    app.state.support_messages = []
    app.state.tokens = {}
    app.state.users = _fallback_accounts()
    app.state.db_available = False
    try:
        database.initialize_database()
        app.state.db_available = True
    except SQLAlchemyError as error:
        LOGGER.warning(
            "MySQL is unavailable; using in-memory demo storage instead: %s", error
        )

    seed_train_indices, _ = train_test_split(
        np.arange(len(app.state.borrowers)),
        test_size=0.2,
        random_state=42,
        stratify=app.state.borrowers["paid_back"],
    )
    if app.state.db_available:
        try:
            existing_applications = database.list_applications()
            app.state.applications = existing_applications
            should_seed_applications = not existing_applications
        except SQLAlchemyError as error:
            _use_memory_database(error)
            should_seed_applications = True
    else:
        should_seed_applications = True

    eligible_seed_indices = [
        int(index)
        for index in seed_train_indices
        if float(app.state.borrowers.iloc[int(index)]["loan_amount"]) <= MAX_LOAN_AMOUNT
    ]
    seed_indices = eligible_seed_indices[:10] if should_seed_applications else []
    for seed_number, index in enumerate(seed_indices, start=1):
        row = app.state.borrowers.iloc[int(index)]
        payload = {
            feature: row[feature]
            for feature in BORROWER_FEATURES
            if feature != "payment_history"
        }
        payload["payment_history"] = str(row["payment_history"])
        record = _application_record(
            app.state,
            payload,
            applicant_name=f"Demo applicant {seed_number}",
            term=6,
        )
        if app.state.db_available:
            _save_application_record(record, payload, "maria@pesolend.demo")
        else:
            app.state.applications.append(record)
    if app.state.db_available:
        try:
            app.state.applications = database.list_applications()
        except SQLAlchemyError as error:
            _use_memory_database(error)
    yield


app = FastAPI(
    title="PesoLend ML API",
    description="Explainable lending model endpoints for the PesoLend school prototype.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8443",
        "http://127.0.0.1:8443",
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|10\.\d+\.\d+\.\d+):(5173|8443)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/login")
def login(request: LoginRequest) -> dict[str, str]:
    email = request.email.strip().lower()
    account: dict[str, Any] | None = None
    if app.state.db_available:
        try:
            account = database.find_user_by_email(email)
        except SQLAlchemyError as error:
            _use_memory_database(error)
    if account is None and not app.state.db_available:
        account = app.state.users.get(email)
    if account is None or not database.verify_password(
        request.password, account["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = uuid4().hex
    app.state.tokens[token] = account["email"]
    if account["role"] not in {"officer", "borrower"}:
        raise HTTPException(status_code=403, detail="This account has an unsupported role.")
    role: Literal["officer", "borrower"] = (
        "officer" if account["role"] == "officer" else "borrower"
    )
    return {"token": token, "role": role}


@app.get("/api/me")
def get_me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    state = app.state
    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="A valid bearer token is required.")
    email = state.tokens.get(authorization[len(prefix):])
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    account: dict[str, Any] | None = None
    if state.db_available:
        try:
            account = database.find_user_by_email_with_loan(email)
        except SQLAlchemyError as error:
            _use_memory_database(error)
    if account is None and not state.db_available:
        account = state.users.get(email)
    if account is None:
        raise HTTPException(status_code=401, detail="The account for this token was not found.")
    profile, _ = _borrower_values({})
    model_loan_limit = state.models["loan-amount"].predict(
        pd.DataFrame(
            [
                {
                    feature: profile[feature]
                    for feature in REGRESSION_FEATURES
                }
            ],
            columns=REGRESSION_FEATURES,
        )
    )[0]
    loan_limit = max(
        MIN_LOAN_AMOUNT,
        min(int(round(model_loan_limit)), MAX_LOAN_AMOUNT),
    )
    return {
        "name": account["name"],
        "email": account["email"],
        "role": account["role"],
        "kyc_status": "Verified",
        "loan_limit": loan_limit,
        "active_loan": account.get("active_loan"),
    }


@app.post("/api/applications")
def submit_application(
    request: PredictionRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    payload = request.model_dump(exclude_none=True)
    record = _application_record(
        app.state,
        request,
        applicant_name=request.applicant_name or "Demo applicant",
        term=request.term or 6,
    )
    _save_application_record(record, payload, _email_for_authorization(authorization))
    return record


def _cap_application_amounts(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    capped_records = []
    for record in records:
        capped_record = record.copy()
        for field in ("amount", "suggested_amount"):
            value = capped_record.get(field)
            if isinstance(value, (int, float)):
                capped_record[field] = max(
                    MIN_LOAN_AMOUNT,
                    min(value, MAX_LOAN_AMOUNT),
                )
        capped_records.append(capped_record)
    return capped_records


@app.get("/api/officer/applications")
def list_applications() -> list[dict[str, Any]]:
    if app.state.db_available:
        try:
            return _cap_application_amounts(database.list_applications())
        except SQLAlchemyError as error:
            _use_memory_database(error)
    return _cap_application_amounts(app.state.applications)


@app.get("/api/datasets/{name}")
def get_dataset(
    name: str,
    limit: int = Query(default=20, ge=1, le=1000),
) -> dict[str, Any]:
    datasets = {
        "borrowers": app.state.borrowers,
        "messages": app.state.messages,
    }
    if name not in datasets:
        raise HTTPException(
            status_code=404,
            detail="Unknown dataset. Choose 'borrowers' or 'messages'.",
        )
    dataset = datasets[name]
    if name == "borrowers":
        counts = dataset["paid_back"].value_counts().sort_index()
        class_balance = {
            "Paid back" if int(label) == 1 else "Not paid": int(count)
            for label, count in counts.items()
        }
    else:
        class_balance = {
            str(label): int(count)
            for label, count in dataset["topic"].value_counts().sort_index().items()
        }
    rows = (
        dataset.head(limit)
        .astype(object)
        .where(pd.notna(dataset.head(limit)), None)
        .to_dict(orient="records")
    )
    return {
        "rows": rows,
        "columns": list(dataset.columns),
        "total_rows": int(len(dataset)),
        "source": "synthetic (generated by make_data.py)",
        "class_balance": class_balance,
    }


@app.get("/api/datasets/{name}/download")
def download_dataset(name: str) -> FileResponse:
    if name not in {"borrowers", "messages"}:
        raise HTTPException(
            status_code=404,
            detail="Unknown dataset. Choose 'borrowers' or 'messages'.",
        )
    path = DATA_DIR / f"{name}.csv"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {name}.csv")
    return FileResponse(path, media_type="text/csv", filename=f"{name}.csv")


@app.get("/api/metrics")
def get_metrics() -> dict[str, Any]:
    return app.state.metrics


@app.post("/api/{slug}")
def predict(
    slug: str,
    request: PredictionRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    response = _prediction_response(app.state, slug, request)
    if slug == "classify-message" and request.message:
        email = _email_for_authorization(authorization)
        created_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if app.state.db_available:
            try:
                account = database.find_user_by_email(email)
                if account is None:
                    account = database.find_user_by_email("maria@pesolend.demo")
                if account is None:
                    raise RuntimeError("The demo borrower account is missing from MySQL.")
                database.save_support_message(
                    user_id=account["id"],
                    message=request.message,
                    topic=str(response["topic"]),
                    created_at=created_at,
                )
            except SQLAlchemyError as error:
                _use_memory_database(error)
                app.state.support_messages.append({
                    "email": email,
                    "message": request.message,
                    "topic": response["topic"],
                    "created_at": created_at.isoformat(),
                })
        else:
            app.state.support_messages.append({
                "email": email,
                "message": request.message,
                "topic": response["topic"],
                "created_at": created_at.isoformat(),
            })
    return response
