# MakeMyTrip Clone

A full-stack travel booking site: **Spring Boot 3 + MongoDB** backend and a **Next.js (React) + Redux + Tailwind** frontend.

Flights, hotels, homestays, holiday packages, trains, buses, cabs, forex and travel insurance can all be searched and booked.
All data is demo data; no real payments are processed.

## Run it

1. **Database** – create a free MongoDB Atlas cluster and copy `.env.example` to `.env`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>.mongodb.net/?retryWrites=true&w=majority
   ```
2. **Backend** (port 8080), from the project root:
   ```
   ./mvnw spring-boot:run
   ```
   On first start it fills the database with demo data and creates an admin account.
3. **Frontend** (port 3000):
   ```
   cd makemytrip-clone
   npm install
   npm run dev
   ```
   Open http://localhost:3000. To point at another backend set `NEXT_PUBLIC_BACKEND_URL` (for example in `makemytrip-clone/.env.local`).

## Accounts

| Role     | How to get one                                                                  |
|----------|---------------------------------------------------------------------------------|
| Customer | Click **Login / Sign Up** and register with any email. Signup always creates a customer. |
| Admin    | `admin@makemytrip.com` / `admin123` (created on first start). Change the password in the database for real use. An admin can promote another user on the admin page → Users. |

Customers can search, book, view and cancel their trips and edit their profile. Admins can additionally open **Admin**
(dashboard, flights, hotels, services, users).

## What is in the demo data

- **Flights** – about 2,900 flights over the next 7 days on 400+ routes between 35 Indian cities and about 25 international
  cities (Dubai, London, Singapore, Bangkok, New York, Paris, Tokyo, Honolulu, Maldives and more).
- **Trains, buses and cabs** – generated between Indian cities from their real coordinates, so prices and durations grow with distance.
- **Hotels, homestays, holiday packages, forex and insurance** across India and abroad.
- **Live flight status** – every flight leaving in the next 3 days has a status; search by number such as `6E-126` or `AI101`.
- The **Routes** page in the navbar lists every place you can travel to and from, split into National and International.

Trains, buses and cabs run only inside India; international travel is by flight, plus hotels and holiday packages abroad.
The network is built in `services/TravelNetwork.java`: add a row to `CITY_ROWS` and the new city automatically gets flights,
trains, buses, cabs and hotels. Search understands common spellings (Bangalore, Bombay, Calcutta, Hawaii...).

## Adding data

**From the admin page (easiest)** – log in as admin → *ADMIN* → Flights / Hotels / Services → **Add**.
Services covers homestays, holidays, trains, buses, cabs, forex and insurance; choose the category in the form.
Fields that matter per category:

| Category  | Fill in                                                                 |
|-----------|-------------------------------------------------------------------------|
| HOMESTAY  | name, location (city), price (per night), available, image URL, features |
| HOLIDAY   | name, location (destination), price (per person), duration, features    |
| TRAIN/BUS | name, from, to, departure/arrival time, duration, type (class), price   |
| CAB       | name, from, to, type (Hatchback/Sedan/SUV), price                       |
| FOREX     | name, type (currency code such as USD), price (INR per unit), available = -1 |
| INSURANCE | name, location (Domestic/International), type (cover), price, features  |

Use `available = -1` for "unlimited".

**From code** – the demo data lives in
`src/main/java/com/makemytrip/makemytrip/services/DummyDataService.java`. Add a row to the matching table, then
admin → Dashboard → **Reset demo data** (or restart the backend after clearing the collection).
Reset only replaces rows flagged `demo`; anything you added in the admin page is kept.

**Through the API** – for example:
```
curl -X POST localhost:8080/admin/listing -H "Content-Type: application/json" \
  -d '{"category":"BUS","name":"Orange Travels","from":"Pune","to":"Goa","departureTime":"21:00","arrivalTime":"06:00 +1","duration":"9h","type":"Volvo AC Sleeper","price":1200,"unit":"per seat","available":30}'
```

## Promo codes

`TRIP10`, `WELCOME500`, `FLY20`, `MMTSECURE`, `SPECIALUPI`, `LUXE15`, `HOLIDAY20`, `ROADTRIP`, `INSURE10`.
Defined in `PricingService.java`; each is limited to certain categories and has a minimum amount.

## Main endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/user/signup`, `/user/login` | accounts |
| GET  | `/flight`, `/hotel`, `/listing?category=TRAIN` | catalogue |
| GET  | `/pricing/quote?category=&itemId=&quantity=&nights=&promo=` | price breakdown (also used when booking) |
| POST | `/booking`, `/booking/cancel` | book / cancel |
| GET  | `/flight-status/{flightNumber}` | live flight status (simulated) |
| *    | `/admin/**` | admin management and `/admin/stats` |

## SEO

Every page sets its own title, description, canonical link, Open Graph and Twitter card through `components/Seo.tsx`,
and the home page adds schema.org structured data. `/sitemap.xml` and `/robots.txt` are generated by the app; admin,
profile and booking pages are marked `noindex`. Set `NEXT_PUBLIC_SITE_URL` to your deployed address (for example
`https://your-site.vercel.app`) so canonical links and the sitemap use it. Brand name and defaults live in `src/lib/site.ts`.

## Known limitations

- Admin endpoints are not protected by authentication on the server (the admin page is only hidden in the UI).
  Add Spring Security with JWT before using this for anything real.
- Payments are simulated.
