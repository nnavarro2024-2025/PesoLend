# PesoLend backend

This is a small FastAPI service for the PesoLend school prototype. The CSV
datasets are synthetic, models are trained locally with scikit-learn, and
predictions are served from saved joblib files.

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
- `app\main.py` validates requests, calls those saved models, and provides
  prediction, application-demo, and dataset endpoints.
- The login endpoint is only a demo role selector. It does not authenticate
  users or protect application data.

## Prediction inputs

The current frontend model demo supplies `income` and `amount`. Other borrower
fields may be supplied using the CSV column names, including `expenses`,
`credit_score`, `years_of_work`, `debts`, `age`, `late_payments`, and
`payment_history`. The message classifier requires a `message` string.
Application requests may also include `term` and `applicant_name`.
