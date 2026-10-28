from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


SEED = 42
BORROWER_ROWS = 800
MESSAGE_ROWS = 200
TOPICS = ("Payment", "Loan application", "Account problem", "Complaint")


def make_borrowers(rng: np.random.Generator) -> pd.DataFrame:
    age = rng.integers(21, 61, size=BORROWER_ROWS)
    years_of_work = np.round(
        np.minimum(
            np.maximum(age - 18, 0),
            rng.gamma(shape=2.2, scale=4.2, size=BORROWER_ROWS),
        ),
        1,
    )

    income = np.clip(
        18_000 + years_of_work * 2_250 + rng.normal(0, 13_000, BORROWER_ROWS),
        12_000,
        145_000,
    )
    expenses = np.clip(
        income * rng.normal(0.61, 0.09, BORROWER_ROWS),
        5_000,
        income * 0.91,
    )
    credit_score = np.clip(
        np.round(
            615
            + years_of_work * 2.4
            + rng.normal(0, 48, BORROWER_ROWS)
        ),
        300,
        850,
    ).astype(int)
    debts = np.clip(
        np.round(
            income * rng.normal(0.22, 0.13, BORROWER_ROWS)
            + np.maximum(660 - credit_score, 0) * 55
        ),
        0,
        100_000,
    )

    payment_capacity = np.maximum(income - expenses - debts * 0.08, 1_000)
    loan_amount = np.clip(
        np.round(
            payment_capacity
            * rng.uniform(2.0, 5.2, BORROWER_ROWS)
            / 500
        )
        * 500,
        5_000,
        180_000,
    )

    risk_score = (
        (680 - credit_score) / 75
        + debts / np.maximum(income, 1) * 1.8
        + loan_amount / np.maximum(payment_capacity, 1) * 0.17
        + (expenses / np.maximum(income, 1) - 0.58) * 2.2
        - years_of_work / 35
        + rng.normal(0, 0.45, BORROWER_ROWS)
    )
    late_payments = np.clip(
        np.round(rng.poisson(lam=np.clip(0.65 + risk_score * 0.48, 0.08, 3.2))),
        0,
        8,
    ).astype(int)

    payment_history = np.select(
        [late_payments == 0, late_payments <= 2, late_payments <= 4],
        ["Excellent", "Good", "Fair"],
        default="Poor",
    )
    history_risk = pd.Series(payment_history).map(
        {"Poor": 3.0, "Fair": 2.0, "Good": 1.0, "Excellent": 0.0}
    ).to_numpy()
    outcome_risk = (
        3.0 * (700 - credit_score) / 100
        + 2.5 * late_payments
        + 3.0 * debts / np.maximum(income, 1)
        + 2.0 * loan_amount / np.maximum(income, 1)
        - 0.2 * years_of_work
        + 1.5 * history_risk
    )
    outcome_risk = (outcome_risk - outcome_risk.mean()) / outcome_risk.std()
    noisy_risk = outcome_risk + rng.normal(0, 0.7, BORROWER_ROWS)
    threshold = np.quantile(noisy_risk, 0.72)
    paid_back = (noisy_risk <= threshold).astype(int)

    surplus = np.maximum(income - expenses, 1_000)
    credit_multiplier = np.clip(
        0.65 + (credit_score - 300) / 550 * 0.8,
        0.65,
        1.45,
    )
    work_multiplier = 0.85 + np.minimum(years_of_work, 20) * 0.012
    safe_loan_amount = np.clip(
        np.round(
            (
                surplus * 3.5 * credit_multiplier * work_multiplier
                + rng.normal(0, 1_000, BORROWER_ROWS)
            )
            / 500
        )
        * 500,
        5_000,
        300_000,
    ).astype(int)

    return pd.DataFrame(
        {
            "income": np.round(income).astype(int),
            "expenses": np.round(expenses).astype(int),
            "age": age,
            "credit_score": credit_score,
            "years_of_work": years_of_work,
            "debts": debts.astype(int),
            "loan_amount": loan_amount.astype(int),
            "late_payments": late_payments,
            "payment_history": payment_history,
            "paid_back": paid_back,
            "safe_loan_amount": safe_loan_amount,
        }
    )


def make_messages(rng: np.random.Generator) -> pd.DataFrame:
    message_templates = {
        "Payment": [
            "I paid my installment {when}; when should it appear in my account?",
            "What's the easiest way to settle this month's due using {channel}?",
            "Nagbayad na po ako {when}, pero hindi pa nag-a-update yung balance.",
            "Could my due date be moved to {time}? I can pay then.",
            "How much do I still owe after the payment I sent {when}?",
            "Please send a receipt for my latest {kind} payment.",
            "Paano po magbayad ng installment gamit ang {channel}?",
            "The payment screen failed, pero nabawasan yung {wallet}.",
            "Is there a way to split this payment into two smaller amounts?",
            "I think my payment went through twice; can you check the transactions?",
            "Can I pay ahead of schedule, or should I wait for the due date?",
            "My bank transfer says complete but the loan page still says unpaid.",
        ],
        "Loan application": [
            "I'm planning to apply for a personal loan; which documents should I prepare?",
            "Usually, how many days does an application review take?",
            "Nag-submit na po ako ng application kahapon. Approved na kaya?",
            "I already sent my application; can I still adjust the requested amount?",
            "What monthly income is needed to qualify for a small loan?",
            "My application remains under review—may update na po ba?",
            "If my last request was declined, when may I apply again?",
            "Where in the app can I check my loan application's status?",
            "Do you accept proof of income from freelance work?",
            "Can I request a longer term so the monthly installment is lower?",
            "I entered the wrong amount on my application; how can I correct it?",
            "Pwede po ba mag-apply kahit bagong trabaho pa lang ako?",
        ],
        "Account problem": [
            "I reset my password, but I still can't sign in to my account.",
            "I changed my mobile number; where can I update it on my profile?",
            "Hindi ko po ma-open yung account ko; error lang ang lumalabas.",
            "The verification code never arrived on my phone. What can I do?",
            "My account profile has an old email address—please help me change it.",
            "Paano po i-update yung personal details sa account?",
            "The app logs me out every time I try to view my account.",
            "I forgot my password and the reset link won't load.",
            "My account is locked even though I entered the correct password.",
            "I can't see my payment history after signing in; is this an account issue?",
            "Hindi dumarating yung OTP sa bagong number ko.",
            "The profile page keeps showing an error when I save my address.",
        ],
        "Complaint": [
            "I was charged a fee nobody mentioned when I applied; please explain.",
            "I've contacted support several times and still haven't received a reply.",
            "Hindi tama yung amount sa statement ko; I want this reviewed.",
            "I want to complain about how my loan application was handled.",
            "The app error erased my application details and no one has fixed it.",
            "May promised callback po ako, pero wala pa ring tumatawag.",
            "My account shows two charges for one payment—please investigate.",
            "I'm really unhappy with the service I received from your team.",
            "I made a payment, but the staff say they can't find it. This is frustrating.",
            "Your representative gave me incorrect information about my loan.",
            "Bakit po may extra charge sa account ko? I was not informed.",
            "I have waited a week for a correction and this is unacceptable.",
        ],
    }

    greetings = ("Hi, ", "Hello, ", "Good day, ", "Hey there, ", "")
    closings = (
        " Please advise.",
        " Thanks in advance.",
        " Salamat po.",
        " Can you help?",
        "",
    )
    variations = {
        "when": ("this morning", "last night", "two days ago", "on Monday"),
        "channel": ("GCash", "Maya", "my bank app", "online banking"),
        "time": ("Friday", "next week", "the 25th", "payday"),
        "kind": ("loan", "monthly", "final", "regular"),
        "wallet": ("e-wallet", "GCash", "bank account", "Maya"),
    }
    noisy_messages = {
        "Payment": [
            "Due date?",
            "Paid, still pending.",
            "Nagbayad na, pero error.",
            "Payment app crash.",
            "GCash sent, balance same.",
            "Why is the app stuck after I paid?",
            "Paid the loan; app won't open now.",
            "My payment went through but the account page crashed.",
            "Nagbayad po ako, then nag-error yung app.",
            "The payment is late and support hasn't replied.",
            "I paid, but my loan application page disappeared.",
            "Payment posted? Di ko ma-open account ko.",
            "Can I pay? Login keeps failing.",
            "Mali yung payment status, nakakainis.",
            "Paid twice, and the app keeps crashing.",
        ],
        "Loan application": [
            "Apply ulit?",
            "Application update pls.",
            "Loan request, still waiting.",
            "Applied, pero ayaw mag-login.",
            "My loan application is stuck after payment.",
            "The app crashed while I was applying for a loan.",
            "Nag-apply po ako, then na-lock yung account.",
            "Application pending and support won't answer.",
            "I paid a fee to apply but got an error.",
            "Loan form won't load; my account is okay?",
            "Can I apply? I can't access my profile.",
            "Submitted na, pero payment page ang lumalabas.",
            "My application disappeared after the app froze.",
            "Loan status? The account page says error.",
            "Nag-apply ako pero wrong payment notice.",
        ],
        "Account problem": [
            "OTP missing.",
            "Login error po.",
            "Account locked again.",
            "App won't open.",
            "Can't log in to make a payment.",
            "My account crashes during loan application.",
            "Payment page keeps appearing after I sign in.",
            "Hindi maka-login; may loan application pa naman.",
            "The app freezes when I check my account balance.",
            "Wrong account details after submitting my loan form.",
            "Can't access profile or payment history.",
            "Account error, payment due na.",
            "Nag-error yung app habang nag-a-apply ako.",
            "Login not working; I need to check my loan.",
            "OTP won't arrive and the payment is due today.",
        ],
        "Complaint": [
            "Not fair po.",
            "Still no reply!",
            "This is so frustrating.",
            "Bad service, payment issue.",
            "Complaint about my loan application.",
            "I paid but the app crashed; this is unacceptable.",
            "Your application process charged me twice.",
            "Nakakainis, account locked after payment.",
            "Support ignored my complaint about the loan.",
            "The payment failed and nobody will help me.",
            "Unfair decision, my application was never reviewed.",
            "Mali yung balance at ayaw mag-open ng app.",
            "I can't log in to complain about this charge.",
            "Your app crashed and my loan request is gone.",
            "Payment problem again. This service is terrible.",
        ],
    }

    messages = []
    for topic in TOPICS:
        templates = message_templates[topic]
        for index in range(MESSAGE_ROWS // len(TOPICS)):
            if index < len(noisy_messages[topic]):
                text = noisy_messages[topic][index]
            else:
                base = templates[index % len(templates)]
                fields = {
                    name: values[int(rng.integers(0, len(values)))]
                    for name, values in variations.items()
                }
                text = base.format(**fields)
            if rng.random() < 0.12:
                text = text.replace("payment", "paymant", 1)
            if rng.random() < 0.12:
                text = text.replace("application", "aplication", 1)
            prefix = greetings[int(rng.integers(0, len(greetings)))]
            suffix = closings[int(rng.integers(0, len(closings)))]
            messages.append(
                {
                    "message": f"{prefix}{text}{suffix}",
                    "topic": topic,
                }
            )

    rng.shuffle(messages)
    return pd.DataFrame(messages, columns=["message", "topic"])


def measure_logistic_accuracy(borrowers: pd.DataFrame) -> float:
    features = borrowers[
        [
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
    ].copy()
    features["payment_history"] = features["payment_history"].map(
        {"Poor": 0, "Fair": 1, "Good": 2, "Excellent": 3}
    )
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        borrowers["paid_back"],
        test_size=0.2,
        random_state=SEED,
        stratify=borrowers["paid_back"],
    )
    model = make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=1_000, random_state=SEED),
    )
    model.fit(x_train, y_train)
    return float(accuracy_score(y_test, model.predict(x_test)))


def main() -> None:
    output_dir = Path(__file__).resolve().parent
    rng = np.random.default_rng(SEED)

    borrowers = make_borrowers(rng)
    messages = make_messages(rng)
    logistic_accuracy = measure_logistic_accuracy(borrowers)
    borrowers.to_csv(output_dir / "borrowers.csv", index=False)
    messages.to_csv(output_dir / "messages.csv", index=False)

    print(f"Borrower rows: {len(borrowers)}")
    print(f"Message rows: {len(messages)}")
    print(f"paid_back mean: {borrowers['paid_back'].mean():.3f}")
    print(f"LogisticRegression accuracy: {logistic_accuracy:.3f}")
    print(f"Unique messages: {messages['message'].nunique()}")
    print("\nFirst 5 borrower rows:")
    print(borrowers.head().to_string(index=False))
    print("\nFirst 5 message rows:")
    print(messages.head().to_string(index=False))
    print(f"\nCSV files written to: {output_dir}")


if __name__ == "__main__":
    main()
