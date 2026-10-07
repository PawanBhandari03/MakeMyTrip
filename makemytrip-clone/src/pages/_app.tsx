import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import store, { setUser, clearUser, markReady } from "@/store";
import { Provider } from "react-redux";
import Navbar from "@/components/Navbar";

import { useEffect } from "react";
import { useRouter } from "next/router";
import Footer from "@/components/Fotter";
import { getuserbyemail } from "@/api";

const Myapp = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  // The marketing footer is for customers; the admin area has its own layout.
  const isAdminArea = router.pathname.startsWith("/admin");
  useEffect(() => {
    const restore = async () => {
      let saved: any = null;
      try {
        const raw = localStorage.getItem("user");
        saved = raw ? JSON.parse(raw) : null;
      } catch (e) {
        saved = null;
      }
      if (saved) {
        store.dispatch(setUser(saved));
      }
      store.dispatch(markReady());
      // Refresh from the server so bookings and role are never stale.
      if (saved?.email) {
        try {
          const fresh = await getuserbyemail(saved.email);
          if (fresh) store.dispatch(setUser(fresh));
        } catch (error: any) {
          if (error?.response?.status === 404) store.dispatch(clearUser());
        }
      }
    };
    restore();
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="flex-1">
        <Component {...pageProps} />
      </div>
      {!isAdminArea && <Footer />}
    </div>
  );
};
export default function App(props: AppProps) {
  return (
    <Provider store={store}>
      <Head>
        <title key="title">MakeMyTrip</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Myapp {...props} />
    </Provider>
  );
}
