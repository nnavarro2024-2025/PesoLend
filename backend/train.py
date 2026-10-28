import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier


SEED = 42
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

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
REGRESSION_FEATURES = [
    "income",
    "expenses",
    "credit_score",
    "years_of_work",
]
PAYMENT_HISTORY_ENCODING = {
    "Poor": 0,
    "Fair": 1,
    "Good": 2,
    "Excellent": 3,
}
MESSAGE_STOP_WORDS = sorted(
    set(ENGLISH_STOP_WORDS)
    | {
        "po",
        "ako",
        "ang",
        "ng",
        "sa",
        "na",
        "ko",
        "mo",
        "ka",
        "ba",
        "lang",
        "naman",
        "pa",
        "ito",
        "yung",
    }
)


def load_borrowers() -> pd.DataFrame:
    path = DATA_DIR / "borrowers.csv"
    borrowers = pd.read_csv(path)
    required_columns = set(
        BORROWER_FEATURES + REGRESSION_FEATURES + ["paid_back", "safe_loan_amount"]
    )
    missing_columns = required_columns.difference(borrowers.columns)
    if missing_columns:
        raise ValueError(f"{path} is missing columns: {sorted(missing_columns)}")

    borrowers = borrowers.copy()
    borrowers["payment_history"] = borrowers["payment_history"].map(
        PAYMENT_HISTORY_ENCODING
    )
    if borrowers["payment_history"].isna().any():
        raise ValueError(
            "payment_history contains values outside Poor, Fair, Good, Excellent"
        )
    if not set(borrowers["paid_back"].unique()).issubset({0, 1}):
        raise ValueError("paid_back must contain only 0 and 1")
    return borrowers


def load_messages() -> pd.DataFrame:
    path = DATA_DIR / "messages.csv"
    messages = pd.read_csv(path)
    required_columns = {"message", "topic"}
    missing_columns = required_columns.difference(messages.columns)
    if missing_columns:
        raise ValueError(f"{path} is missing columns: {sorted(missing_columns)}")

    messages = messages.drop_duplicates(subset="message").dropna(
        subset=["message", "topic"]
    )
    if messages.empty:
        raise ValueError(f"{path} has no unique labeled messages to train on")
    return messages


def classification_metrics(
    actual: np.ndarray,
    predicted: np.ndarray,
    *,
    class_labels: list[Any],
    approval_predictions: np.ndarray | None = None,
    accuracy_by_k: dict[str, float] | None = None,
    majority_class_baseline_accuracy: float,
) -> dict[str, Any]:
    is_borrower_model = approval_predictions is not None
    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(actual, predicted)),
        "majority_class_baseline_accuracy": majority_class_baseline_accuracy,
        "recall_on_risky_borrowers": None,
        "mae": None,
        "r2": None,
        "confusion_matrix": confusion_matrix(
            actual, predicted, labels=class_labels
        ).tolist(),
        "confusion_matrix_labels": class_labels,
        "risky_wrongly_approved": None,
        "accuracy_by_k": accuracy_by_k,
    }

    if is_borrower_model:
        actual_binary = actual.astype(int)
        predicted_binary = approval_predictions.astype(int)
        metrics["recall_on_risky_borrowers"] = float(
            recall_score(actual_binary, predicted_binary, pos_label=0, zero_division=0)
        )
        metrics["risky_wrongly_approved"] = int(
            np.sum((actual_binary == 0) & (predicted_binary == 1))
        )
    return metrics


def baseline_accuracy(actual_train: pd.Series, actual_test: pd.Series) -> float:
    majority_class = actual_train.mode().iloc[0]
    return float(accuracy_score(actual_test, np.full(len(actual_test), majority_class)))


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    borrowers = load_borrowers()
    messages = load_messages()

    features = borrowers[BORROWER_FEATURES]
    target = borrowers["paid_back"].astype(int)
    train_indices, test_indices = train_test_split(
        np.arange(len(borrowers)),
        test_size=0.2,
        random_state=SEED,
        stratify=target,
    )
    x_train = features.iloc[train_indices]
    x_test = features.iloc[test_indices]
    y_train = target.iloc[train_indices]
    y_test = target.iloc[test_indices]

    borrower_baseline = baseline_accuracy(y_train, y_test)
    approval_tree = DecisionTreeClassifier(
        max_depth=4,
        class_weight="balanced",
        random_state=SEED,
    )
    approval_tree.fit(x_train, np.where(y_train == 1, "approve", "reject"))
    tree_labels = approval_tree.predict(x_test)
    tree_predictions = (tree_labels == "approve").astype(int)
    tree_model_metrics = classification_metrics(
        y_test.to_numpy(),
        tree_predictions,
        class_labels=[0, 1],
        approval_predictions=tree_predictions,
        majority_class_baseline_accuracy=borrower_baseline,
    )
    joblib.dump(approval_tree, MODEL_DIR / "decision_tree.joblib")

    knn_metrics_by_k: dict[str, float] = {}
    knn_models: dict[int, Pipeline] = {}
    for k in (3, 5, 7):
        model = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("classifier", KNeighborsClassifier(n_neighbors=k)),
            ]
        )
        model.fit(x_train, y_train)
        knn_models[k] = model
        knn_metrics_by_k[str(k)] = float(accuracy_score(y_test, model.predict(x_test)))

    knn_model = knn_models[5]
    knn_predictions = knn_model.predict(x_test)
    knn_model_metrics = classification_metrics(
        y_test.to_numpy(),
        knn_predictions,
        class_labels=[0, 1],
        approval_predictions=knn_predictions,
        accuracy_by_k=knn_metrics_by_k,
        majority_class_baseline_accuracy=borrower_baseline,
    )
    joblib.dump(knn_model, MODEL_DIR / "knn.joblib")

    message_train, message_test = train_test_split(
        messages,
        test_size=0.2,
        random_state=SEED,
        stratify=messages["topic"],
    )
    message_model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    stop_words=MESSAGE_STOP_WORDS,
                    ngram_range=(1, 2),
                    min_df=1,
                ),
            ),
            ("classifier", MultinomialNB()),
        ]
    )
    message_model.fit(message_train["message"], message_train["topic"])
    message_predictions = message_model.predict(message_test["message"])
    message_labels = sorted(messages["topic"].unique().tolist())
    message_model_metrics = classification_metrics(
        message_test["topic"].to_numpy(),
        message_predictions,
        class_labels=message_labels,
        majority_class_baseline_accuracy=baseline_accuracy(
            message_train["topic"], message_test["topic"]
        ),
    )
    joblib.dump(message_model, MODEL_DIR / "message_classifier.joblib")
    print(f"Naive Bayes accuracy: {message_model_metrics['accuracy']:.4f}")
    print(
        "Naive Bayes confusion matrix "
        f"(labels {message_model_metrics['confusion_matrix_labels']}):"
    )
    print(json.dumps(message_model_metrics["confusion_matrix"]))

    svm_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                SVC(class_weight="balanced", probability=True, random_state=SEED),
            ),
        ]
    )
    svm_model.fit(x_train, y_train)
    svm_predictions = svm_model.predict(x_test)
    svm_model_metrics = classification_metrics(
        y_test.to_numpy(),
        svm_predictions,
        class_labels=[0, 1],
        approval_predictions=svm_predictions,
        majority_class_baseline_accuracy=borrower_baseline,
    )
    joblib.dump(svm_model, MODEL_DIR / "svm.joblib")

    svm_2d_features = ["income", "credit_score"]
    svm_2d_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("classifier", SVC(class_weight="balanced", random_state=SEED)),
        ]
    )
    svm_2d_model.fit(
        borrowers.iloc[train_indices][svm_2d_features],
        y_train,
    )
    svm_2d_predictions = svm_2d_model.predict(
        borrowers.iloc[test_indices][svm_2d_features]
    )
    svm_2d_metrics = {
        "accuracy": float(accuracy_score(y_test, svm_2d_predictions)),
        "recall_on_risky_borrowers": float(
            recall_score(y_test, svm_2d_predictions, pos_label=0, zero_division=0)
        ),
    }
    joblib.dump(svm_2d_model, MODEL_DIR / "svm_2d.joblib")

    chart_sample = borrowers.iloc[test_indices][
        svm_2d_features + ["paid_back"]
    ].sample(n=min(150, len(test_indices)), random_state=SEED)
    sample_points = [
        {
            "income": int(row["income"]),
            "credit_score": int(row["credit_score"]),
            "actual": int(row["paid_back"]),
        }
        for _, row in chart_sample.iterrows()
    ]

    income_values = np.linspace(
        float(borrowers["income"].min()),
        float(borrowers["income"].max()),
        40,
    )
    credit_score_values = np.linspace(
        float(borrowers["credit_score"].min()),
        float(borrowers["credit_score"].max()),
        40,
    )
    income_grid, credit_score_grid = np.meshgrid(income_values, credit_score_values)
    grid_features = pd.DataFrame(
        {
            "income": income_grid.ravel(),
            "credit_score": credit_score_grid.ravel(),
        }
    )
    grid_predictions = svm_2d_model.predict(grid_features).reshape(40, 40)
    boundary_coordinates: set[tuple[float, float]] = set()
    for row_index in range(40):
        for column_index in range(40):
            current = grid_predictions[row_index, column_index]
            if (
                column_index < 39
                and current != grid_predictions[row_index, column_index + 1]
            ):
                boundary_coordinates.add(
                    (
                        float(
                            (income_values[column_index] + income_values[column_index + 1])
                            / 2
                        ),
                        float(credit_score_values[row_index]),
                    )
                )
            if row_index < 39 and current != grid_predictions[row_index + 1, column_index]:
                boundary_coordinates.add(
                    (
                        float(income_values[column_index]),
                        float(
                            (
                                credit_score_values[row_index]
                                + credit_score_values[row_index + 1]
                            )
                            / 2
                        ),
                    )
                )
    boundary_points = [
        {"income": income, "credit_score": credit_score}
        for income, credit_score in sorted(boundary_coordinates)
    ]
    chart_data = {
        "features": svm_2d_features,
        "sample_points": sample_points,
        "boundary_points": boundary_points,
        "grid": {
            "income_values": income_values.tolist(),
            "credit_score_values": credit_score_values.tolist(),
            "predictions": grid_predictions.astype(int).tolist(),
            "labels": {"0": "Not paid", "1": "Paid back"},
        },
    }
    (MODEL_DIR / "svm_2d_chart.json").write_text(
        json.dumps(chart_data, indent=2),
        encoding="utf-8",
    )

    mlp_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                MLPClassifier(
                    hidden_layer_sizes=(32, 16),
                    max_iter=3000,
                    early_stopping=True,
                    random_state=42,
                ),
            ),
        ]
    )
    mlp_model.fit(x_train, y_train)
    mlp_classifier = mlp_model.named_steps["classifier"]
    positive_class_index = list(mlp_model.classes_).index(1)
    mlp_probabilities = mlp_model.predict_proba(x_test)[:, positive_class_index]
    mlp_predictions = (mlp_probabilities >= 0.5).astype(int)
    if mlp_classifier.n_iter_ >= mlp_classifier.max_iter:
        print(
            "Warning: MLPClassifier did not converge within "
            f"{mlp_classifier.max_iter} iterations."
        )
    mlp_model_metrics = classification_metrics(
        y_test.to_numpy(),
        mlp_predictions,
        class_labels=[0, 1],
        approval_predictions=mlp_predictions,
        majority_class_baseline_accuracy=borrower_baseline,
    )
    joblib.dump(mlp_model, MODEL_DIR / "mlp.joblib")

    regression_features = borrowers[REGRESSION_FEATURES]
    safe_amount_target = borrowers["safe_loan_amount"].to_numpy()
    safe_amount_model = LinearRegression()
    safe_amount_model.fit(
        regression_features.iloc[train_indices],
        safe_amount_target[train_indices],
    )
    safe_amount_predictions = np.maximum(
        safe_amount_model.predict(regression_features.iloc[test_indices]), 0
    )
    safe_amount_metrics: dict[str, Any] = {
        "accuracy": None,
        "recall_on_risky_borrowers": None,
        "mae": float(
            mean_absolute_error(safe_amount_target[test_indices], safe_amount_predictions)
        ),
        "rmse": float(
            np.sqrt(mean_squared_error(safe_amount_target[test_indices], safe_amount_predictions))
        ),
        "r2": float(r2_score(safe_amount_target[test_indices], safe_amount_predictions)),
        "confusion_matrix": None,
        "confusion_matrix_labels": None,
        "risky_wrongly_approved": None,
        "accuracy_by_k": None,
        "target_definition": "safe_loan_amount",
        "features": REGRESSION_FEATURES,
    }
    joblib.dump(safe_amount_model, MODEL_DIR / "loan_amount.joblib")

    metrics = {
        "split": {
            "train_fraction": 0.8,
            "test_fraction": 0.2,
            "random_state": SEED,
        },
        "models": {
            "loan-amount": safe_amount_metrics,
            "decision": tree_model_metrics,
            "similar-borrowers": knn_model_metrics,
            "classify-message": message_model_metrics,
            "risk-label": svm_model_metrics,
            "risk-label-2d": svm_2d_metrics,
            "default-probability": mlp_model_metrics,
        },
    }
    metrics_path = MODEL_DIR / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Saved model metrics to {metrics_path}")
    for model_name, model_metrics in metrics["models"].items():
        print(f"\n{model_name} metrics:")
        print(json.dumps(model_metrics, indent=2))


if __name__ == "__main__":
    main()
