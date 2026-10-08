# Admin guide

Log in as `admin` / `admin123` and press **Admin** in the navbar. The sections are tabs on the left.

| Tab | What it is for |
|---|---|
| Dashboard | Totals (bookings, revenue, users), recent bookings, and the **Demo data** buttons |
| Flights | Add, edit and delete flights |
| Flight Ops | Act as the airline: delay, change the gate, board or cancel a flight (Task 1) |
| Hotels | Add, edit and delete hotels |
| Services | Homestays, holidays, trains, buses, cabs, forex and insurance |
| Pricing | Season rules that move prices (Task 2) |
| Refunds | The refund queue, totals and cancellation reasons (Task 3) |
| Reviews | Moderate reported reviews (Task 4) |
| Recommendations | Feedback totals, similarity-model size, and **Inspect a customer** (Task 5) |
| Users | See users and promote or demote admins |

## Demo data buttons

| Button | What it does |
|---|---|
| **Load missing demo data** | Adds only what is missing or out of date. Deletes nothing. The back end also does this by itself at every start-up. |
| **Reset demo data** | Deletes every demo flight, hotel and service, their price history, demo reviews and demo travellers, then creates fresh ones. Accounts, bookings, refunds and anything added by hand are kept. Old items get new ids, so a link to an old item may stop working. |

Run **Reset** once after a new deployment, and once more just before showing the project so that flights cover the coming days.

## Adding data by hand

Use **Add** on the Flights, Hotels or Services tab. Fields that matter per category:

| Category | Fill in |
|---|---|
| HOMESTAY | name, location (city), price per night, available, image URL, features |
| HOLIDAY | name, location (destination), price per person, duration, features |
| TRAIN / BUS | name, from, to, departure and arrival time, duration, type (class), price |
| CAB | name, from, to, type (Hatchback, Sedan, SUV), price |
| FOREX | name, type (currency code such as USD), price (INR per unit), available = -1 |
| INSURANCE | name, location (Domestic or International), type (cover), price, features |

Use `available = -1` for "unlimited". Rows added here are never removed by **Reset demo data**.

Through the API, for example:

```
curl -X POST localhost:8080/admin/listing -H "Content-Type: application/json" \
  -d '{"category":"BUS","name":"Orange Travels","from":"Pune","to":"Goa","departureTime":"21:00","arrivalTime":"06:00 +1","duration":"9h","type":"Volvo AC Sleeper","price":1200,"unit":"per seat","available":30}'
```

## Adding a city

The travel network is generated in `services/TravelNetwork.java`. Add a row to `CITY_ROWS` and the new city automatically gets flights, trains, buses, cabs and hotels. Search understands common spellings (Bangalore, Bombay, Calcutta, Hawaii and more).

## Season rules

Under **Pricing**, each rule has a name, a category (or all), a start and end date and a percentage (positive raises the price, negative lowers it). Changes apply to new price calculations within about 30 seconds.
