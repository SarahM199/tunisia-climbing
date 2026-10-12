# Tunisia Climbing

A guide to rock climbing in Tunisia. Browse crags, sectors and routes, see them on a map, check whether conditions look good for the coming week, and get sector recommendations based on the grade you want to project. Climbers can create an account to rate sectors, leave comments and upload photos.

## Features

- **Crags, sectors and routes** — browse the topo data (location, rock type, orientation, grades, approach, number of quickdraws, rope length).
- **Map view** — every crag and sector on an interactive Leaflet map.
- **Climbing forecast** — a 7-day weather forecast per crag from [Open-Meteo](https://open-meteo.com/) (no API key needed), turned into a "climbability" score that accounts for temperature, rain, wind and when each sector goes into shade.
- **Recommendations** — enter a project grade (and optionally a day and time) to find sectors that have that grade *and* enough easier routes to warm up on, ranked by forecast conditions. There is also a "best crag today" endpoint.
- **Ratings and comments** — signed-in users can rate sectors, comment and attach photos. Rankings use a Bayesian average so that a sector with one 5★ rating doesn't outrank one with twenty ratings averaging 4.6 (see [`ml/ratings/shrinkage.py`](ml/ratings/shrinkage.py)).
- **Contact form**.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, React Leaflet, lucide-react |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic Settings, JWT auth |
| Database & storage | PostgreSQL (Supabase), Supabase Storage for comment photos |
| Forecasting / ML | Python modules in `ml/` (Open-Meteo client, rule-based scoring, recommender, rating shrinkage) |

## Repository layout

```
backend/        FastAPI app
  app/api/        endpoints (crags, sectors, routes, forecast, recommend, auth, comments, contact)
  app/core/       config, security, auth dependencies, image handling, storage, ratings
  app/db/         SQLAlchemy session and Alembic migrations
  app/models/     database models
  app/schemas/    request/response schemas
  import_to_db.py loads data/processed/*.csv into the database
  tests/          pytest tests
frontend/       React + Vite single-page app
  src/pages/      crag list, crag/sector detail, all routes, map, recommend, login/register, about, contact
  src/lib/api.js  fetch wrapper that adds the auth token
data/processed/ crags.csv, sectors.csv, routes.csv (the topo data)
ml/             forecasting, grading, recommendation and rating code used by the backend
docs/  infra/  qa/   placeholders for documentation, deployment and end-to-end tests
```

The backend imports the `ml/` package directly from the repository (it adds `ml/` to `sys.path`), so keep both folders together.

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A PostgreSQL database and a Supabase Storage bucket (a free Supabase project provides both)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
SECRET_KEY=<random value>                # python -c "import secrets; print(secrets.token_urlsafe(32))"
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service role key>  # backend only, never expose it to the frontend
SUPABASE_BUCKET=comment-photos           # optional, this is the default
```

Create the tables, load the topo data, and start the API:

```bash
alembic upgrade head
python import_to_db.py
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000. Interactive docs are at http://localhost:8000/docs, and `GET /health` returns `{"status": "ok"}`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173. It talks to `http://localhost:8000` by default. To point it at another backend, create `frontend/.env`:

```env
VITE_API_URL=https://your-api.example.com
```

The backend only allows CORS requests from `http://localhost:5173`. If you deploy the frontend elsewhere, add its origin in [`backend/app/main.py`](backend/app/main.py).

## API overview

| Method | Path | Description |
| --- | --- | --- |
| GET | `/crags`, `/crags/{id}` | List crags / crag detail with sectors |
| GET | `/sectors`, `/sectors/{id}` | List sectors / sector detail with routes |
| GET | `/routes`, `/routes/{id}` | List routes / route detail |
| GET | `/stats` | Totals for the home page |
| GET | `/crags/{id}/forecast` | 7-day forecast and climbability score |
| GET | `/recommend` | Sectors for a project grade, ranked by conditions |
| GET | `/best-today` | Best place to climb today |
| POST | `/auth/register`, `/auth/login` | Create an account / get a token |
| GET | `/auth/me` | Current user |
| GET / POST | `/sectors/{id}/comments` | Read / add comments on a sector |
| PATCH / DELETE | `/comments/{id}` | Edit / delete your comment |
| PUT / DELETE | `/sectors/{id}/ratings` | Set / remove your rating |
| POST, DELETE | comment photos, `/photos/{id}` | Upload / delete photos |
| POST | contact endpoint | Send a message through the contact form |

See http://localhost:8000/docs for the full request and response schemas.

## Tests

```bash
cd backend
pytest
```

## Data

The topo data lives in `data/processed/` as three CSV files linked by ID: `crags.csv` → `sectors.csv` (via `crag_id`) → `routes.csv` (via `sector_id`). Grades use the French system (e.g. `5c`, `6a+`, `7b`). To update the data, edit the CSVs and run `python import_to_db.py` from `backend/` again.
