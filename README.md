# NeedARide

Community-driven, peer-to-peer car rental platform — CS110 final project.

## Setup

1. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

2. Create a `.env` file in `backend/` (copy `.env.example`) with your
   MongoDB connection string:
   ```
   MONGODB_URI=<your MongoDB connection string>
   MONGODB_DB=NeedARide
   PORT=3000
   ```
   (`.env` is loaded automatically via the `dotenv` package — no extra
   flags needed.)

3. (Optional but recommended) Seed the database with sample data:
   ```
   node seed.js
   ```
   This creates sample listings with real owners (so booking actually
   works), plus two test accounts:
   - Owner: `owner@needaride.test` / `NeedARide123!`
   - Renter: `renter@needaride.test` / `NeedARide123!`

4. Start the server:
   ```
   node index.js
   ```

5. Open the app at **http://localhost:3000/index.html**
   (must go through the server, not opened as a local file — the
   pages call the backend API directly).

## Project structure

- `backend/` — Express + MongoDB API (auth, listings, bookings,
  messages, reviews)
- `public/` — frontend (plain HTML/CSS/JS, no build step)

## Known gaps (as of this version)

- No "List your vehicle" page yet — there's no UI to create a listing,
  only the API route (`POST /api/listings`).
- No booking-approval UI on the owner's side yet — the API supports it
  (`PATCH /api/bookings/:id/status`), but there's no button for it.
