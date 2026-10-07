import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Seo from "@/components/Seo";

type Page = { title: string; intro: string; sections: { heading: string; body: string }[] };

const PAGES: Record<string, Page> = {
  about: {
    title: "About Us",
    intro: "MakeMyTrip is a learning project that shows how a complete travel booking site works.",
    sections: [
      { heading: "Who we are", body: "MakeMyTrip was built by Pawan Bhandari as an internship project. It brings flights, hotels, homestays, trains, buses, cabs, holidays, forex and insurance together in one place, using a Spring Boot API, MongoDB and a Next.js front end." },
      { heading: "What we believe", body: "Travel should be simple, transparent and affordable. Every fare you see includes a clear breakdown of taxes and fees, and every booking can be managed from a single account." },
      { heading: "This project", body: "This site is a learning project. All flights, hotels, trains, buses and prices are demo data, and no real payments are taken." },
    ],
  },
  investors: {
    title: "Investor Relations",
    intro: "Information for shareholders and analysts.",
    sections: [
      { heading: "Financial reports", body: "Quarterly and annual reports are published here once available. This is a demo page, so no real filings are listed." },
      { heading: "Contact", body: "For investor queries, please write to investors@example.com." },
    ],
  },
  careers: {
    title: "Careers",
    intro: "Help build the future of travel.",
    sections: [
      { heading: "Open roles", body: "Software engineers, product designers and customer-experience specialists. This is a demo page, so there are no real openings." },
      { heading: "Life here", body: "Flexible work, learning budgets and an annual team trip." },
    ],
  },
  "travel-updates": {
    title: "COVID-19 Update",
    intro: "Travel advisories and health guidance.",
    sections: [
      { heading: "Before you travel", body: "Check the latest entry requirements of your destination and carry valid identification for every traveller." },
      { heading: "Flexible changes", body: "Many fares and stays allow free date changes or cancellation. Open My Trips to manage a booking." },
    ],
  },
  pricing: {
    title: "How Pricing Works",
    intro: "Every price is built from a base fare plus a short, visible list of adjustments. Nothing is hidden.",
    sections: [
      { heading: "What moves a price", body: "Season (festivals, long weekends and off-season sales), weekend travel, how close the trip is, time of day, how many seats or rooms are left, and a small market movement that refreshes every 15 minutes. On any booking page, press \"Why this price?\" to see every adjustment and the reason for it." },
      { heading: "Limits you can rely on", body: "A price never goes more than 60% above or 15% below the base fare. If the factors add up to more than that, a line called Price protection shows the cap." },
      { heading: "Peak periods", body: "Festival and holiday periods add about 10% to 20%. For example, Diwali week is +20%. Off-season sales, such as the monsoon saver for hotels, take about 10% off." },
      { heading: "Booking early and last minute", body: "Booking 45 or more days ahead is cheaper. Prices climb as the trip gets closer, and are highest in the last 24 hours before departure." },
      { heading: "Price history and forecast", body: "Each booking page shows how the price has moved and where it is heading if demand stays the same, with a note on whether to book now or wait. Earlier history is estimated from past demand patterns and is marked as such; later points are recorded live." },
      { heading: "Price freeze", body: "Lock today's price for 6, 24 or 48 hours for a small fee (about 1%, 2% or 3.5% of the fare). If the price goes up you still pay the frozen price; if it goes down you pay the lower one. The fee is credited against your booking if you book before the freeze ends, and lost if you do not." },
      { heading: "If the price changes while you book", body: "Prices update live. If the price moves between seeing it and pressing Book, nothing is charged: you are shown the new total and asked to confirm." },
      { heading: "Demo notice", body: "All prices are demo data and no real payments are taken." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "How your information is handled.",
    sections: [
      { heading: "What we store", body: "Your name, email address, phone number and booking history, so that you can sign in and view your trips." },
      { heading: "Passwords", body: "Passwords are stored as one-way hashes and are never shown back to you or to administrators." },
      { heading: "Demo notice", body: "This site is for learning purposes. Please do not enter real payment details; no real payments are processed." },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro: "The rules for using this service.",
    sections: [
      { heading: "Bookings", body: "A booking is confirmed when it appears in My Trips with a reference number. You can cancel a confirmed booking from the same page." },
      { heading: "Prices", body: "Prices are calculated on our servers at the time of booking and include the taxes and fees shown in the fare summary." },
      { heading: "Demo notice", body: "All inventory on this site is demo data and cannot be used for real travel." },
    ],
  },
  agreement: {
    title: "User Agreement",
    intro: "Your agreement with MakeMyTrip.",
    sections: [
      { heading: "Your account", body: "You are responsible for keeping your password safe and for all activity under your account." },
      { heading: "Acceptable use", body: "Do not attempt to disrupt the service or access data that belongs to other users." },
    ],
  },
};

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: Object.keys(PAGES).map((slug) => ({ params: { slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ slug: string }> = async ({ params }) => ({
  props: { slug: String(params?.slug || "") },
});

export default function InfoPage({ slug }: { slug: string }) {
  const page = PAGES[slug];

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Seo title={page.title} description={page.intro} path={`/info/${slug}`} />
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{page.title}</h1>
      <p className="mt-2 text-lg text-slate-600">{page.intro}</p>
      <div className="mt-8 space-y-6">
        {page.sections.map((s) => (
          <section key={s.heading} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">{s.heading}</h2>
            <p className="leading-relaxed text-slate-600">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
