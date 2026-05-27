# 🎬 FlickVault

FlickVault is a personal movie and TV show journal built with FastAPI and a vanilla HTML/CSS/JavaScript frontend. It lets you keep a small local vault of media you have watched or want to watch, including IMDb IDs, posters, ratings, comments, and release years.

The app serves both a browser UI and an API from the same FastAPI server.

## ✨ Features

- Browse all saved movies and TV shows in a card-based vault
- Separate Watchlist and Watched views
- Search by title or IMDb ID
- Filter by year and sort by date added, rating, title, or release year
- Add new media with live preview
- Edit existing media
- Delete media with confirmation
- Mark watchlist items as watched
- Dashboard stats for total items, watched count, average rating, and completion rate
- Automatic API documentation through FastAPI at `/docs`

## 🧰 Tech Stack

- **Backend:** FastAPI, Pydantic
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Storage:** PostgreSQL through SQLAlchemy, with a local SQLite fallback
- **Auth:** Supabase Auth JWTs verified by FastAPI
- **Server:** Uvicorn

## 📁 Project Structure

```text
FlickVault/
├─ app/
│  ├─ schema/
│  │  ├─ __init__.py
│  │  └─ validation.py
│  ├─ __init__.py
│  ├─ app.py
│  ├─ auth.py
│  └─ config.py
├─ data/
│  ├─ __init__.py
│  ├─ database.py
│  └─ helpers.py
├─ static/
│  ├─ app.js
│  ├─ index.html
│  └─ style.css
├─ .env.example
├─ .gitignore
├─ LICENSE
├─ README.md
├─ requirements.txt
└─ supabase_schema.sql
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ByteBard58/FlickVault.git
cd FlickVault
```

### 2. Create and activate a virtual environment

```bash
python -m venv .venv
```

```bash
source .venv/bin/activate
```

On Windows:

```bash
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

For local no-auth development, you can use the default SQLite database:

```bash
export AUTH_DISABLED=true
```

For cloud deployment, copy `.env.example` into your hosting provider's environment variables and set:

- `DATABASE_URL`: Supabase PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase public anon key
- `SUPABASE_JWT_AUDIENCE`: usually `authenticated`
- `SUPABASE_JWT_ALGORITHMS`: usually `RS256,ES256`

The app creates the required table on startup. You can also run `supabase_schema.sql` in the Supabase SQL editor.

### 5. Run the app

```bash
uvicorn app.app:app --reload
```

Then open:

- App UI: <http://127.0.0.1:8000>
- API docs: <http://127.0.0.1:8000/docs>

## 🔌 API Overview

### 🔎 Search media

```http
GET /search
```

Optional query parameters:

- `imdb_id`: IMDb title ID, such as `tt0407887`
- `name`: partial title search
- `year`: release year
- `watched`: `true` or `false`

Example:

```bash
curl "http://127.0.0.1:8000/search?name=arrival"
```

### 📌 Get watchlist

```http
GET /watchlist
```

Returns all items where `watched` is `false`.

### ✅ Get watched list

```http
GET /watchedlist
```

Returns all items where `watched` is `true`.

### 🆔 Get item by UUID

```http
GET /item_uuid/{uuid}
```

### 🎞️ Get item by IMDb ID

```http
GET /item_id/{imdb_id}
```

Example:

```bash
curl "http://127.0.0.1:8000/item_id/tt2543164"
```

### ➕ Add item

```http
POST /add_item
```

Example:

```bash
curl -X POST "http://127.0.0.1:8000/add_item" \
  -H "Content-Type: application/json" \
  -d '{
    "imdb_id": "tt2543164",
    "title": "Arrival",
    "year": 2016,
    "end_year": null,
    "poster_url": ["https://upload.wikimedia.org/wikipedia/en/d/df/Arrival%2C_Main_Poster.jpg"],
    "watched": true,
    "rating": 9.0,
    "comment": "An incredibly smart and emotionally resonant sci-fi."
  }'
```

### ✏️ Update item

```http
PUT /update_item/{imdb_id}
```

Only include the fields you want to update.

Example:

```bash
curl -X PUT "http://127.0.0.1:8000/update_item/tt2543164" \
  -H "Content-Type: application/json" \
  -d '{
    "watched": true,
    "rating": 9.5,
    "comment": "Even better on rewatch."
  }'
```

### 🗑️ Delete item

```http
DELETE /delete_item/{imdb_id}
```

Example:

```bash
curl -X DELETE "http://127.0.0.1:8000/delete_item/tt2543164"
```

## 🧾 Data Model

Each media item is stored as JSON with the following shape:

```json
{
  "uuid": "f8eac85e-6f90-4776-ade4-ca035afa0953",
  "imdb_id": "tt0407887",
  "title": "The Departed",
  "year": 2006,
  "end_year": null,
  "poster_url": ["https://example.com/poster.jpg"],
  "watched": true,
  "rating": 8.5,
  "comment": "One of the most complex plots I have ever seen in a movie.",
  "date_added": "2026-05-24T05:27:02.275112Z"
}
```

Validation rules:

- `imdb_id` must match the format `tt` followed by 7 to 10 digits.
- `title` must be 1 to 300 characters and cannot start or end with whitespace.
- `year` and `end_year` must be between 1900 and 2050.
- `rating`, when provided, must be between 0 and 10.
- `comment`, when provided, must be between 5 and 1000 characters.
- If `watched` is `false`, `rating` and `comment` must be `null` or omitted.

The API also computes an `imdb_link` field from the IMDb ID when returning items.

## 📝 Notes

- This project stores vault items in SQL and scopes every record by authenticated user ID.
- `data/db.json` is kept only as legacy seed/reference data.
- The frontend loads Lucide icons and Google Fonts from CDNs, so those assets require an internet connection.
- FastAPI exposes interactive API documentation at `/docs` and OpenAPI JSON at `/openapi.json`.

## ☁️ Deployment

### Supabase

1. Create a Supabase project.
2. Copy the pooled PostgreSQL connection string into `DATABASE_URL`.
3. Copy the project URL into `SUPABASE_URL`.
4. Copy the public anon key into `SUPABASE_ANON_KEY`.
5. Run `supabase_schema.sql` in the SQL editor, or let the app create the table on first startup.

### Render

Create a Web Service with this build command:

```bash
pip install -r requirements.txt
```

Use this start command:

```bash
uvicorn app.app:app --host 0.0.0.0 --port $PORT
```

Add the same environment variables from `.env.example` in Render's Environment tab.

## 📄 License

This project is licensed under the MIT License.

## 😃 Appreciation

Thank you for taking the time to assess my work. I hope you liked it and found it interesting. Please report any problems you notice in the `Issues` area.

Don't hesitate to contact me if you have any queries, recommendations, or topics you would want to talk about. My [profile page](https://github.com/ByteBard58) has my contact details.

Have a great day!
