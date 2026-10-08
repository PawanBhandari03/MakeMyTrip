# Testing guide

A step-by-step list for anyone checking the project. It takes about 15 minutes and covers every task.

**Accounts** (also shown on the login dialog)

| Role | Username | Password |
|---|---|---|
| Customer | `user` | `user123` |
| Admin | `admin` | `admin123` |

> Tip: open a second browser window (or a private window) and log in as admin there, so you can act as the airline and the moderator while watching the customer side.
>
> If the site is slow on the first click, the free back end is waking up; wait a minute and refresh.

---

## 0. Browse and book

| Step | What to do | You should see |
|---|---|---|
| 1 | Open the home page and the **Flights** tab; search any route | Flights with prices that refresh and flash when they change, and star ratings on hotels |
| 2 | Try the other tabs: Hotels, Homestays, Holiday Packages, Trains, Buses, Cabs, Forex, Insurance | Real results for each; trains, buses and cabs only inside India |
| 3 | Open **Routes** in the navbar | Every place you can travel, split into National and International |
| 4 | Log in as `user`, open a flight and press **Book Now** | A confirmation with a booking reference, and the booking in **My Trips** |

## Task 1: Live flight status

| Step | What to do | You should see |
|---|---|---|
| 1 | Open **My Flights** | The flight you just booked, already followed, with gate, terminal and revised times |
| 2 | Open **Live Flight Status**, search `6E-126` (or a number from the list) and press **Follow this flight** | A live card; the flight joins My Flights |
| 3 | As admin: **Admin → Flight Ops**, press **+1h** on a followed flight | Within seconds: a pop-up, the bell badge goes up, and My Flights shows the delay reason and the new departure and estimated arrival |
| 4 | As admin press **Change gate**, then **Cancel flight** | Further notifications; the card turns red when cancelled |

## Task 2: Dynamic pricing, history and freeze

| Step | What to do | You should see |
|---|---|---|
| 1 | On any booking page press **Why this price?** | A list such as *Departing within 24 hours +28%*, *Peak-hour departure +4%* |
| 2 | Scroll to **Price history & forecast**; switch 7 / 30 days | A chart with recorded points, estimated history and a dashed forecast, plus a book-now-or-wait tip |
| 3 | As admin: **Admin → Pricing**, change a season rule's percent or dates | Prices for travel in that period move accordingly |
| 4 | In the booking panel press **Freeze for 24 hours** | A freeze appears in **My Trips → Price freezes**; booking afterwards uses the frozen price and credits the fee |
| 5 | Read `/info/pricing` | A plain-language explanation of every factor |

## Task 3: Cancellation and refunds

| Step | What to do | You should see |
|---|---|---|
| 1 | **My Trips → Cancel / modify** on a booking | A dialog with a reason list, a seat stepper (if more than one) and a refund breakdown |
| 2 | Try to confirm without a reason | It refuses and asks for one |
| 3 | Pick a reason and cancel part of a multi-seat booking | The booking becomes **Partly cancelled**; a refund for only that part appears |
| 4 | Watch **Refunds** at the bottom of My Trips | Requested → Processed → Completed within a few minutes, with an expected-by date; a bell notification at each step |
| 5 | As admin: **Admin → Refunds** | Queue, totals, the reasons chart and buttons to move a refund forward |
| 6 | Read `/info/cancellation` or the policy card on a booking page | The tiers with real dates and rupee amounts |

## Task 4: Reviews and ratings

| Step | What to do | You should see |
|---|---|---|
| 1 | Open any hotel page and scroll to **Ratings & reviews** | The average, a star breakdown and a list of reviews |
| 2 | Press the sort buttons | Order changes: most helpful, newest, highest, lowest |
| 3 | Press **Write a review**; choose stars, write a few sentences, add a photo; submit | Your review at the top marked "Your review"; the hotel's rating updates |
| 4 | Press **Edit** on it, change the stars, save | The same review, updated |
| 5 | Press **Helpful** and **Reply** on someone else's review | The vote count changes; the reply appears under the review |
| 6 | Press **Report**, choose a reason | The button changes to "Reported". Reported by three different accounts, the review is hidden |
| 7 | As admin: **Admin → Reviews** | The reported review with its reasons; press **Keep** or **Remove** |

## Responsive check

Resize the window or use the browser's phone view. Every page, including the booking pages, My Trips and the admin area, should fit without sideways scrolling.

---

## Resetting for a clean run

As admin, open **Admin → Dashboard → Demo data** and press **Reset demo data** (see the [README](../README.md#demo-data)). It regenerates the demo flights, hotels, services and reviews and keeps accounts and bookings.
