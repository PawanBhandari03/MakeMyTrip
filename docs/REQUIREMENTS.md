# Requirements checklist

Every requirement of the five internship tasks, whether it is done, where to see it working on the live site, and where it is implemented in the code.

- **Live site:** https://make-my-trip-theta.vercel.app
- **Logins:** customer `user` / `user123`, admin `admin` / `admin123`
- **Status:** all 25 requirements below are implemented and working.

Paths in the *Code* column are relative to `src/main/java/com/makemytrip/makemytrip/` (back end) and `makemytrip-clone/src/` (front end).

---

## Task 1: Live flight status with a mock API

| # | Requirement | Status | Where to see it | Code |
|---|---|---|---|---|
| 1.1 | A mock API that provides delay and boarding updates | Done | Open `https://makemytrip-qgai.onrender.com/mock-api/flights/board`; trigger events with `POST /mock-api/flights/{no}/events`; or use **Admin → Flight Ops** | `controllers/MockFlightApiController`, `services/MockFlightFeedService` |
| 1.2 | Push notifications for time changes, delays and ETAs | Done | Follow a flight, then press **+1h** in **Admin → Flight Ops**. A pop-up, the bell badge and a browser notification arrive within seconds | `services/FlightEventService`, `services/NotificationService`; `components/NotificationBell` |
| 1.3 | Delay reasons and revised schedules | Done | **My Flights** (`/tracker`) or **Live Flight Status**: each flight shows the delay reason, the new departure and arrival, gate and terminal, and a timeline of changes | `services/FlightStatusService`, `models/FlightEvent`; `components/FlightStatusCard` |
| 1.4 | Tracking multiple flights | Done | **My Flights** lists every followed flight. Booking a flight follows it automatically; any flight number can be followed from **Live Flight Status** | `services/FlightTrackingService`; `pages/tracker.tsx`, `pages/flight-status` |
| 1.5 | Dynamic ETA | Done | The estimated arrival moves with the delay on every flight card, and "Departs in" counts down | `services/FlightStatusService`, `services/BookingStatusService`; `components/LiveStatus` |

More detail: [TASK-1-FLIGHT-STATUS.md](TASK-1-FLIGHT-STATUS.md)

---

## Task 2: Dynamic pricing engine

| # | Requirement | Status | Where to see it | Code |
|---|---|---|---|---|
| 2.1 | Demand and season adjustments (for example +20% in holidays) | Done | On any booking page press **Why this price?** to see lines such as *Diwali week +20%* and *Departing within 24 hours +28%*. Season rules are edited in **Admin → Pricing** | `services/DynamicPricingService`, `models/PricingRule`; `components/admin/PricingAdmin` |
| 2.2 | Price history graphs | Done | Every flight, hotel and service page has **Price history & forecast** with 7 and 30 day views, lowest, highest and average, and a forecast | `services/PriceHistoryService`; `components/PriceInsights` |
| 2.3 | Price freeze | Done | In the booking panel press **Freeze for 24 hours**. See and use it under **My Trips → Price freezes**; the fee is credited on booking | `services/PriceFreezeService`; `components/PriceFreezeCard`, `components/PriceFreezeList` |
| 2.4 | Real-time updates | Done | Prices on search results and booking pages refresh every 20 seconds and flash green or red; if the price moves while booking, the customer must confirm the new total | `services/PricingService`, `services/PriceChangedException`; `lib/useLivePrices`, `components/BookingPanel` |
| 2.5 | Transparency | Done | The adjustment list, a "Price protection" line when the -15% to +60% cap applies, and the explanation page `/info/pricing` | `components/PriceBreakdown`; `pages/info/[slug].tsx` |

More detail: [TASK-2-DYNAMIC-PRICING.md](TASK-2-DYNAMIC-PRICING.md)

---

## Task 3: Cancellation and refund system

| # | Requirement | Status | Where to see it | Code |
|---|---|---|---|---|
| 3.1 | Cancel from the dashboard | Done | **My Trips → Cancel / modify** on any confirmed booking | `services/BookingService` (`cancel`); `components/CancelDialog`, `pages/profile` |
| 3.2 | Auto-calculated refunds by a predefined policy (for example 50% within 24 hours) | Done | The cancel dialog shows the refund, the percentage and the reason for it. Policy: 50% within 24h of booking, 25% more than 48h before travel, 10% less than 48h, 0% after departure, 100% if the airline cancels. Also at `/info/cancellation` and on every booking page | `services/RefundPolicyService`; `components/RefundPolicyCard` |
| 3.3 | Partial refunds | Done | In the cancel dialog, choose how many seats, rooms or tickets to cancel; the booking becomes **Partly cancelled** with **Cancel the rest** | `services/BookingService`, `services/RefundPolicyService` |
| 3.4 | A required reason dropdown | Done | The dialog will not confirm without choosing one of seven reasons | `services/RefundPolicyService` (`REASONS`); `components/CancelDialog` |
| 3.5 | A refund status tracker with expected timelines | Done | **My Trips → Refunds** shows Requested, Processed, Completed with timestamps and an expected credit date; bell notifications at each step; **Admin → Refunds** shows the queue | `services/RefundService`, `models/Refund`; `components/RefundList`, `components/admin/RefundsAdmin` |

More detail: [TASK-3-CANCELLATION-REFUNDS.md](TASK-3-CANCELLATION-REFUNDS.md)

---

## Task 4: Reviews and ratings

| # | Requirement | Status | Where to see it | Code |
|---|---|---|---|---|
| 4.1 | 1 to 5 star ratings | Done | Any hotel, stay, holiday or flight page, section **Ratings & reviews → Write a review**; the average and star breakdown are shown, and the rating appears on search cards | `services/ReviewService`; `components/Reviews`, `components/StarRating` |
| 4.2 | Written reviews | Done | The same dialog (title and text); customers can edit or delete their own review | `services/ReviewService`; `components/Reviews` |
| 4.3 | Photo upload | Done | Add up to three photos in the review dialog; they are shrunk in the browser and shown with the review | `models/Review`; `components/Reviews` |
| 4.4 | Replies | Done | **Reply** under any review; admin replies are marked **Official** and the author gets a notification | `services/ReviewService` (`reply`) |
| 4.5 | Flagging with moderation | Done | **Report** a review with a reason; three different reports hide it until an admin presses Keep, Remove or Restore in **Admin → Reviews** | `services/ReviewService` (`flag`, `moderate`); `components/admin/ReviewsAdmin` |
| 4.6 | Sorting (most helpful, newest, highest rated) | Done | Sort buttons above the reviews: Most helpful, Newest, Highest rated, Lowest rated; **Helpful** votes feed the first | `services/ReviewService` (`list`) |

More detail: [TASK-4-REVIEWS-RATINGS.md](TASK-4-REVIEWS-RATINGS.md)

---

## Task 5: Personalised recommendations

| # | Requirement | Status | Where to see it | Code |
|---|---|---|---|---|
| 5.1 | History-based suggestions | Done | Log in as `user` and scroll the home page to **Recommended for you**; suggestions follow bookings, reviews, searches and page views. A new account sees popular places until it browses | `services/RecommendationService`; `components/Recommendations`, `lib/useTrackView` |
| 5.2 | A "Why this recommendation?" tooltip | Done | Press **Why this?** on any card: the reasons and a score breakdown (history, similar travellers, ratings, budget) | `components/Recommendations` |
| 5.3 | Collaborative filtering | Done | Reasons such as "Travellers who liked X also chose this (5 travellers)", built from item-to-item similarity across travellers; about 60 demo travellers provide the data | `services/RecommendationService`, `services/RecommendationSeeder` |
| 5.4 | A helpful / irrelevant feedback loop | Done | Thumbs up and down on each card: a not-relevant answer removes the card (with Undo) and lowers similar suggestions; helpful raises them. Totals are in **Admin → Recommendations** | `models/RecommendationFeedback`; `components/admin/RecommendationsAdmin` |

More detail: [TASK-5-RECOMMENDATIONS.md](TASK-5-RECOMMENDATIONS.md)

---

## Also built, beyond the brief

| Extra | Where to see it |
|---|---|
| Smart place suggestions: city, state, country, other names and typos (type `assam`, `kerala`, `dheradun`) | The From and To boxes on the home page |
| Fast loading: the back end keeps its large lists in memory and refreshes them in the background | Any page; see [ARCHITECTURE.md](ARCHITECTURE.md#6-speed-on-a-small-server) |
| A full admin area: dashboard, flights, hotels, services, pricing rules, refunds, review moderation, recommendations, users (with delete) and demo data buttons | **Admin** in the navbar; see [ADMIN-GUIDE.md](ADMIN-GUIDE.md) |
| Realistic demo activity: ten made-up customers with bookings, cancellations and refunds, about 1,800 reviews and 60 demo travellers | **Admin → Users, Refunds, Reviews** |
| Responsive on phone, tablet and desktop; SEO pages (sitemap, robots) | Resize the browser window |
| Documentation with 21 diagrams, a testing guide and a deployment guide | The [docs folder](.) |

## How to check everything in about ten minutes

The step-by-step list is in [TESTING-GUIDE.md](TESTING-GUIDE.md). In short: log in as `user`, book a flight, follow it, delay it from the admin window, cancel it with a reason and watch the refund; write a review with a photo; look at **Recommended for you**.
