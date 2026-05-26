# 🎬 FlickVault

FlickVault is a personal movie and TV show journal built with FastAPI and a vanilla HTML/CSS/JavaScript frontend. It lets you keep a small local vault of media you have watched or want to watch, including IMDb IDs, posters, ratings, comments, and release years.

The app serves both a browser UI and a JSON API from the same FastAPI server.

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
- **Storage:** Local JSON file at `data/db.json`
- **Server:** Uvicorn

## 📁 Project Structure

```text
FlickVault/
├── app/
│   ├── app.py                  # FastAPI app and API routes
│   └── schema/
│       └── validation.py       # Pydantic models and validation rules
├── data/
│   ├── db.json                 # Local media database
│   └── helpers.py              # JSON load/save helpers
├── static/
│   ├── index.html              # Main frontend page
│   ├── style.css               # Frontend styles
│   └── app.js                  # Frontend behavior and API calls
├── requirements.txt
└── README.md
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

### 4. Prepare the database file

The app expects a writable JSON file at `data/db.json`.

To start with an empty vault, create `data/db.json` with an empty JSON array:

```json
[]
```

You can also seed it manually with any valid media items that match the data model below.

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

- This project uses `data/db.json` as a simple local database. It is easy to inspect and edit, but it is not designed for concurrent writes or production-scale persistence.
- The frontend loads Lucide icons and Google Fonts from CDNs, so those assets require an internet connection.
- FastAPI exposes interactive API documentation at `/docs` and OpenAPI JSON at `/openapi.json`.

## 📄 License

This project is licensed under the MIT License.
