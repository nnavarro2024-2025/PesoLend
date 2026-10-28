# PesoLend backend

This is a small FastAPI service for the PesoLend school prototype. The CSV
datasets are synthetic, models are trained locally with scikit-learn, and
predictions are served from saved joblib files. Demo accounts and new
applications are stored in MySQL when it is available; if MySQL cannot be
reached, the API logs a warning and uses in-memory demo storage.

## Run locally

Open PowerShell and change to the `backend` folder:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

If starting from a fresh checkout, install the listed packages and generate
the data and model files:

```powershell
pip install -r requirements.txt
python data\make_data.py
python train.py
```

## MySQL setup (XAMPP)

Start MySQL in the XAMPP control panel. Import `schema.sql` in phpMyAdmin (or
run it in MySQL) to create the `pesolend` database and its four tables. The API
also creates any missing tables at startup.

Create `backend\.env` with these settings:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pesolend
```

The first successful startup seeds these accounts with the password
`demo1234`:

| Email | Role | Demo data |
|---|---|---|
| `maria@pesolend.demo` | Borrower | Active loan, PHP 18,240 balance; PHP 3,040 next payment; 6 of 12 payments made |
| `new@pesolend.demo` | Borrower | No loans |
| `officer@pesolend.demo` | Loan officer | Officer access |

Passwords are stored as salted PBKDF2-SHA256 hashes, never as plain text.

Start the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs> to try the endpoints.

The server loads the saved models, metrics, and CSVs once at startup. Run
`make_data.py` and `train.py` before starting it if those files are missing.
The API allows browser requests from `http://localhost:8443`.

## What the pieces do

- `data\make_data.py` creates the borrower and customer-message CSV files.
- `train.py` trains the six models, writes their joblib files, and saves
  evaluation results in `models\metrics.json`.
- `app\database.py` reads MySQL configuration from `.env`, defines the database
  tables, seeds demo users and Maria's loan, and hashes demo passwords.
- `schema.sql` creates the database and tables for importing in phpMyAdmin.
- `app\main.py` validates requests, calls saved models, authenticates the
  seeded demo accounts, and provides prediction, application, and dataset
  endpoints. `/api/me` requires the bearer token returned by login.
- Applications and classified customer messages are saved to MySQL. The
  officer application list reads saved application results.
- If MySQL is not reachable, the three demo accounts and newly submitted
  application/message records use in-memory storage for that server run.

## Prediction inputs

The current frontend model demo supplies `income` and `amount`. Other borrower
fields may be supplied using the CSV column names, including `expenses`,
`credit_score`, `years_of_work`, `debts`, `age`, `late_payments`, and
`payment_history`. The message classifier requires a `message` string.
Application requests may also include `term` and `applicant_name`.
