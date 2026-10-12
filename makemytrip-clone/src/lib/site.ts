/** Brand and SEO settings used across the site. Set NEXT_PUBLIC_SITE_URL to your deployed address. */
export const SITE_NAME = "Voyago";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const AUTHOR = "Pawan Bhandari";
export const GITHUB_URL = "https://github.com/PawanBhandari03/Voyago";

export const DEFAULT_TITLE = `${SITE_NAME} – Full-Stack Travel Booking Platform`;
export const DEFAULT_DESCRIPTION =
  "Voyago is a full-stack travel booking platform built with React, TypeScript, Tailwind CSS, Java Spring Boot and MongoDB. Search and book flights, hotels, homestays, holiday packages, trains, buses, cabs, forex and travel insurance, and track live flight, train and bus status.";
export const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80";
export const KEYWORDS =
  "Voyago, travel booking platform, flight booking, hotel booking, train tickets, bus tickets, cab booking, holiday packages, travel insurance, forex, live flight status, React, TypeScript, Tailwind CSS, Java, Spring Boot, MongoDB";
