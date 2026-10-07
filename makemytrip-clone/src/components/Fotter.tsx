import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Github } from "lucide-react";
import { AUTHOR, GITHUB_URL, SITE_NAME } from "@/lib/site";

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <li>
    <Link href={href} className="transition-colors hover:text-white">
      {children}
    </Link>
  </li>
);

const Footer = () => {
  const router = useRouter();
  // The long marketing text only belongs on the landing page.
  const showAbout = router.pathname === "/";

  return (
    <footer className="bg-slate-950 pb-5 pt-8 text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4">
        {showAbout && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Why MakeMyTrip?</h3>
              <p className="leading-relaxed">
                MakeMyTrip is a full-stack learning project that brings flights, hotels, trains, buses, cabs,
                holidays, forex and insurance together in one place, with real search, booking, cancellation and live
                status, all backed by a Spring Boot and MongoDB API.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Booking Flights with MakeMyTrip</h3>
              <p className="leading-relaxed">
                Search flights between more than 60 cities in India and abroad, compare fares by time and price, apply
                promo codes and see the full tax breakdown before you book. Every booking can be managed from My Trips.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Domestic Flights with MakeMyTrip</h3>
              <p className="leading-relaxed">
                Explore hundreds of domestic and international routes on the Routes page, then follow your flight, train
                or bus with live status once it is booked.
              </p>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <h4 className="mb-2 font-semibold tracking-wide text-slate-200">ABOUT THE SITE</h4>
            <ul className="space-y-1.5">
              <FooterLink href="/info/about">About Us</FooterLink>
              <FooterLink href="/info/investors">Investor Relations</FooterLink>
              <FooterLink href="/info/careers">Careers</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold tracking-wide text-slate-200">POPULAR HOTELS</h4>
            <ul className="space-y-1.5">
              <FooterLink href="/?tab=hotels&city=Delhi">Hotels in Delhi</FooterLink>
              <FooterLink href="/?tab=hotels&city=Mumbai">Hotels in Mumbai</FooterLink>
              <FooterLink href="/?tab=hotels&city=Goa">Hotels in Goa</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold tracking-wide text-slate-200">QUICK LINKS</h4>
            <ul className="space-y-1.5">
              <FooterLink href="/info/travel-updates">COVID-19 Update</FooterLink>
              <FooterLink href="/flight-status">Flight Schedule</FooterLink>
              <FooterLink href="/?tab=trains">Train Schedule</FooterLink>
              <FooterLink href="/routes">Routes &amp; Destinations</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold tracking-wide text-slate-200">IMPORTANT LINKS</h4>
            <ul className="space-y-1.5">
              <FooterLink href="/info/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/info/terms">Terms &amp; Conditions</FooterLink>
              <FooterLink href="/info/agreement">User Agreement</FooterLink>
              <FooterLink href="/info/pricing">How Pricing Works</FooterLink>
              <FooterLink href="/info/cancellation">Cancellation &amp; Refunds</FooterLink>
            </ul>
          </div>
        </div>

        {/* Credits */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-4 md:flex-row">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View the source code on GitHub"
            className="flex items-center gap-2 hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span>View source on GitHub</span>
          </a>
          <p className="text-center md:text-right">
            © {new Date().getFullYear()} {SITE_NAME} · Built by {AUTHOR}
            <br />
            A learning project. All flights, hotels and prices are demo data and no real payments are taken.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
