# API reference

The back end is a JSON REST API on port 8080 (locally `http://localhost:8080`). Errors are returned as `{ "message": "..." }` with status 400; a price that moved during booking returns **409** with `code: "PRICE_CHANGED"`.

Most customer calls take the logged-in user's id as `userId`.

## Accounts

| Method | Path | Purpose |
|---|---|---|
| POST | `/user/signup` | Create a customer account |
| POST | `/user/login?email=&password=` | Log in (accepts an email, or `user` / `admin`) |
| POST | `/user/edit` | Edit profile |

## Catalogue

| Method | Path | Purpose |
|---|---|---|
| GET | `/flight`, `/flight/{id}` | Flights |
| GET | `/hotel`, `/hotel/{id}` | Hotels |
| GET | `/listing?category=TRAIN`, `/listing/{id}` | Homestays, holidays, trains, buses, cabs, forex, insurance |

## Pricing (Task 2)

| Method | Path | Purpose |
|---|---|---|
| GET | `/pricing/quote?category=&itemId=&quantity=&nights=&promo=&travelDate=&userId=&freezeId=` | Price with every adjustment, taxes, fees, promo and freeze credit |
| GET | `/pricing/prices?category=&ids=` | Live prices for many items (search results) |
| GET | `/pricing/history?category=&itemId=&date=&days=` | History, forecast and advice |
| GET | `/promos?category=` | Promo codes, optionally for one category |
| GET | `/price-freeze/options?category=&itemId=&quantity=&nights=&travelDate=` | Freeze choices and fees for an item |
| POST | `/price-freeze?userId=&category=&itemId=&quantity=&nights=&travelDate=&hours=` | Freeze a price for 6, 24 or 48 hours |
| GET | `/price-freeze?userId=` | A user's freezes |
| GET | `/price-freeze/active?userId=&category=&itemId=&travelDate=` | The active freeze for an item |

## Booking and cancellation (Task 3)

| Method | Path | Purpose |
|---|---|---|
| POST | `/booking?userId=&category=&itemId=&quantity=&nights=&promo=&travelDate=&freezeId=&expectedTotal=` | Book anything; the server recalculates the price |
| GET | `/booking/cancel/preview?userId=&reference=&quantity=` | The refund and the reason for it, before cancelling |
| POST | `/booking/cancel?userId=&reference=&reason=&note=&quantity=` | Cancel all or part; opens a refund |
| GET | `/cancellation/policy` | The policy tiers, fees and reasons |
| GET | `/refunds?userId=` | A user's refunds |
| GET | `/status/booking?category=&itemId=&travelDate=` | Live status shown on a booking |

## Flight status and tracking (Task 1)

| Method | Path | Purpose |
|---|---|---|
| GET | `/flight-status/upcoming` | Upcoming flights with status |
| GET | `/flight-status/{flightNumber}` | One flight's live status |
| GET | `/tracking?userId=` | Flights a user follows |
| GET | `/tracking/flight?flightNumber=&userId=` | One followed flight |
| POST / DELETE | `/tracking?userId=&flightNumber=` | Follow or unfollow a flight |
| GET | `/notifications?userId=` | Bell notifications (flights, refunds, reviews) and the unread count |
| POST | `/notifications/read?userId=&id=` | Mark one (or, without `id`, all) as read |
| GET | `/mock-api/flights/board` | The airline's departure board |
| GET | `/mock-api/flights/{no}` , `/{no}/events` | A flight and its timeline |
| POST | `/mock-api/flights/{no}/events` | Trigger `DELAY`, `ADD_DELAY`, `CLEAR_DELAY`, `GATE_CHANGE`, `BOARDING`, `CANCEL` |

## Reviews (Task 4)

| Method | Path | Purpose |
|---|---|---|
| GET | `/reviews?category=&itemId=&sort=&page=&userId=` | Summary and a page of reviews; `sort` is `helpful`, `newest`, `highest` or `lowest` |
| POST | `/reviews` | Write or update a review (JSON body with stars, text, photos) |
| DELETE | `/reviews/{id}?userId=` | Delete your own review |
| POST | `/reviews/{id}/helpful?userId=` | Add or remove a helpful vote |
| POST | `/reviews/{id}/reply?userId=` | Reply (JSON `{ "text": "..." }`) |
| POST | `/reviews/{id}/flag?userId=&reason=` | Report a review |
| GET | `/reviews/flag-reasons` | Report reasons |

## Recommendations (Task 5)

| Method | Path | Purpose |
|---|---|---|
| GET | `/recommendations?userId=&limit=&category=` | Suggestions with reasons and a score breakdown; popular items when there is no user or no history |
| POST | `/recommendations/feedback?userId=&category=&itemId=&verdict=` | `HELPFUL` or `IRRELEVANT` |
| DELETE | `/recommendations/feedback?userId=&category=&itemId=` | Undo an answer |
| POST | `/activity?userId=&type=&category=&itemId=&query=&source=` | Record a `VIEW` or a `SEARCH` |

## Admin

These are used by the Admin pages. Note the known limitation: they are not protected by server-side authentication.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | Dashboard numbers |
| GET | `/admin/users`, PUT `/admin/user/{id}/role` | Users and roles |
| POST / PUT / DELETE | `/admin/flight`, `/admin/hotel`, `/admin/listing` | Create, edit and delete catalogue rows |
| POST | `/admin/seed?reset=` | Load missing demo data, or reset it |
| GET / POST / PUT / DELETE | `/admin/pricing-rules` | Season rules |
| GET | `/admin/refunds`, `/admin/refunds/stats` | Refund queue and totals |
| POST | `/admin/refunds/{id}/advance` | Move a refund one step forward |
| GET | `/admin/reviews?filter=`, `/admin/reviews/stats` | Moderation queue (`FLAGGED`, `HIDDEN`, `REMOVED`, `ALL`) and totals |
| POST | `/admin/reviews/{id}/moderate?action=` | `KEEP`, `REMOVE` or `RESTORE` |
| GET | `/admin/recommendations/stats?inspectUserId=` | Feedback totals, model size, and optionally one customer's profile and suggestions |
