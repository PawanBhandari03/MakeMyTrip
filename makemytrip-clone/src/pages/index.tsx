import { getflight, gethotel } from "@/api";
import Loader from "@/components/Loader";
import { SearchSelect } from "@/components/SearchSelect";
import SignupDialog from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import {
  Bus,
  Calendar,
  Car,
  CreditCard,
  HomeIcon,
  Hotel,
  MapPin,
  Plane,
  QrCode,
  Shield,
  Train,
  Umbrella,
  Users,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

export default function Home() {
  const [bookingtype, setbookingtype] = useState("flights");
  const [from, setfrom] = useState("");
  const [to, setto] = useState("");
  const [date, setdate] = useState("");
  const [travelers, settravelers] = useState(1);
  const [searchresults, setsearchresult] = useState<any[]>([]);
  const [hotel, sethotel] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [flight, setflight] = useState<any[]>([]);
  const [maintenancePopup, setMaintenancePopup] = useState(false);
  const user = useSelector((state: any) => state.user.user);
  
  const handleMaintenanceClick = () => {
    setMaintenancePopup(true);
    setTimeout(() => setMaintenancePopup(false), 3000);
  };
  const router = useRouter();
  const flightD = [
    { id: 1, from: "Delhi", to: "Mumbai", date: "2025-01-15", price: 5000 },
    { id: 2, from: "Mumbai", to: "Bengaluru", date: "2025-01-16", price: 4500 },
    { id: 3, from: "Bengaluru", to: "Delhi", date: "2025-01-17", price: 5500 },
    { id: 4, from: "Delhi", to: "Kolkata", date: "2025-01-18", price: 6000 },
  ];

  const hotelData = [
    { id: 1, name: "Luxury Palace", city: "Mumbai", price: 15000 },
    { id: 2, name: "Comfort Inn", city: "Delhi", price: 8000 },
    { id: 3, name: "Seaside Resort", city: "Goa", price: 12000 },
    { id: 4, name: "Mountain View Hotel", city: "Shimla", price: 10000 },
  ];
  const offers = [
    {
      title: "Domestic Flights",
      description: "Get up to 20% off on domestic flights",
      imageUrl:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800",
    },
    {
      title: "International Hotels",
      description: "Book luxury hotels worldwide",
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800",
    },
    {
      title: "Holiday Packages",
      description: "Exclusive deals on holiday packages",
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800",
    },
  ];

  const collections = [
    {
      title: "Stays in & Around Delhi",
      imageUrl:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800",
      tag: "TOP 8",
    },
    {
      title: "Stays in & Around Mumbai",
      imageUrl:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800",
      tag: "TOP 8",
    },
    {
      title: "Stays in & Around Bangalore",
      imageUrl:
        "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800",
      tag: "TOP 9",
    },
    {
      title: "Beach Destinations",
      imageUrl:
        "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=800",
      tag: "TOP 11",
    },
  ];

  const wonders = [
    {
      title: "Shimla's Best Kept Secret",
      imageUrl:
        "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800",
    },
    {
      title: "Tamil Nadu's Charming Hill Town",
      imageUrl:
        "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800",
    },
    {
      title: "Quaint Little Hill Station in Gujarat",
      imageUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800",
    },
    {
      title: "A pleasant summer retreat",
      imageUrl:
        "https://images.unsplash.com/photo-1593181629936-11c609b8db9b?auto=format&fit=crop&w=800",
    },
  ];

  useEffect(() => {
    const fetchdata = async () => {
      try {
        const data = await gethotel();
        sethotel(data);
        const flightdata = await getflight();
        setflight(flightdata);
      } catch (error) {
        console.error(error);
      } finally {
        setloading(false);
      }
    };

    fetchdata();
  }, [user]);

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    flight.forEach((flight) => {
      cities.add(flight.from);
      cities.add(flight.to);
    });
    hotel.forEach((hotel) => {
      cities.add(hotel.location);
    });
    return Array.from(cities).map((city) => ({ value: city, label: city }));
  }, [flight, hotel]);

  if (loading) {
    return <Loader />;
  }
  const handlesearch = () => {
    if (bookingtype === "flights") {
      const results = flight.filter(
        (FLIGHT) =>
          FLIGHT.from.toLowerCase() === from.toLowerCase() &&
          FLIGHT.to.toLowerCase() === to.toLowerCase()
      );
      setsearchresult(results);
    } else if (bookingtype === "hotels") {
      const results = hotel.filter(
        (hotel) => hotel.location.toLowerCase() === to.toLowerCase()
      );
      setsearchresult(results);
    }
  };
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(dateString);
    return date.toLocaleString("en-US", options);
  };
  const handlebooknow = (id: any) => {
    if (bookingtype === "flights") {
      router.push(`/book-flight/${id}`);
    } else {
      router.push(`/book-hotel/${id}`);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <div className="absolute top-0 left-0 w-full h-[650px] overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=2940&q=80')] bg-cover bg-center opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/50 via-[#0a192f]/40 to-gray-50"></div>
      </div>
      <main className="container mx-auto px-4 relative z-10 pt-24 pb-6">
        <nav className="bg-white rounded-2xl shadow-xl mx-auto max-w-5xl mb-6 p-4 overflow-x-auto border border-gray-100">
          <div className="flex justify-between items-center min-w-max space-x-8">
            <NavItem
              icon={<Plane />}
              text="Flights"
              active={bookingtype === "flights"}
              onClick={() => setbookingtype("flights")}
            />
            <NavItem
              icon={<Hotel />}
              text="Hotels"
              active={bookingtype === "hotels"}
              onClick={() => setbookingtype("hotels")}
            />
            <NavItem icon={<HomeIcon />} text="Homestays" onClick={handleMaintenanceClick} />
            <NavItem icon={<Umbrella />} text="Holiday" onClick={handleMaintenanceClick} />
            <NavItem icon={<Train />} text="Trains" onClick={handleMaintenanceClick} />
            <NavItem icon={<Bus />} text="Buses" onClick={handleMaintenanceClick} />
            <NavItem icon={<Car />} text="Cabs" onClick={handleMaintenanceClick} />
            <NavItem icon={<CreditCard />} text="Forex" onClick={handleMaintenanceClick} />
            <NavItem icon={<Shield />} text="Insurance" onClick={handleMaintenanceClick} />
          </div>
        </nav>
        
        {maintenancePopup && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center space-x-2">
            <span className="text-amber-400">🛠️</span>
            <span className="font-medium text-sm">This feature is under construction. Check back soon!</span>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl mx-auto max-w-5xl p-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {bookingtype === "flights" && (
              <div className="col-span-1">
                <SearchSelect
                  options={cityOptions}
                  placeholder="From"
                  value={from}
                  onChange={setfrom}
                  icon={<MapPin className="text-gray-400" />}
                  subtitle="Enter city or airport"
                />
              </div>
            )}

            <div className="col-span-1">
              <SearchSelect
                options={cityOptions}
                placeholder={bookingtype === "flights" ? "To" : "City"}
                value={to}
                onChange={setto}
                icon={<MapPin className="text-gray-400" />}
                subtitle={
                  bookingtype === "flights"
                    ? "Enter city or airport"
                    : "Enter city"
                }
              />
            </div>

            <div className="col-span-1">
              <SearchInput
                icon={<Calendar className="text-gray-400" />}
                placeholder="Date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setdate(e.target.value)
                }
                subtitle="Select a date"
                type="date"
              />
            </div>

            <div className="col-span-1">
              <SearchInput
                icon={<Users className="text-gray-400" />}
                placeholder="Travelers"
                value={travelers.toString()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  settravelers(parseInt(e.target.value) || 1)
                }
                subtitle="Number of travelers"
                type="number"
              />
            </div>

            <Button className="col-span-1 h-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all" onClick={handlesearch}>
              SEARCH
            </Button>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Search Results
            </h2>
            {searchresults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchresults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white rounded-lg shadow p-4 border border-gray-200"
                  >
                    {bookingtype === "flights" ? (
                      <>
                        <p className="font-semibold text-lg">
                          Flight Name: {result.flightName}
                        </p>
                        <h3 className="font-semibold text-lg">
                          {result.from} to {result.to}
                        </h3>
                        <p className="text-gray-600">
                          Departure Time: {formatDate(result.departureTime)}
                        </p>
                        <p className="text-gray-600">
                          Arrival Time: {formatDate(result.arrivalTime)}
                        </p>
                        <p className="text-lg font-bold mt-2">
                          ₹{result.price}
                        </p>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handlebooknow(result.id)}
                        >
                          Book Now
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg">
                          {result.hotelName}
                        </h3>
                        <p className="text-gray-600">City: {result.location}</p>
                        <p className="text-lg font-bold mt-2">
                          ₹{result.pricePerNight} per night
                        </p>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handlebooknow(result.id)}
                        >
                          Book Now
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No {bookingtype} available for the selected criteria.
              </p>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12">
          {/* Offers Section */}
          <section className="my-16">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Best Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {offers.map((offer, index) => (
                <OfferCard 
                  key={index} 
                  {...offer} 
                />
              ))}
            </div>
          </section>

          {/* Collections Section */}
          <section className="my-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                Handpicked Collections for You
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection, index) => (
                <CollectionCard 
                  key={index} 
                  {...collection} 
                />
              ))}
            </div>
          </section>

          {/* Wonders Section */}
          <section className="my-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                Unlock Lesser-Known <span></span> Wonders of India
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wonders.map((wonder, index) => (
                <WonderCard 
                  key={index} 
                  {...wonder} 
                />
              ))}
            </div>
          </section>

          {/* Download App Section */}
          <DownloadApp />
        </div>
      </main>
    </div>
  );
}
const OfferCard = ({ title, description, imageUrl }: any) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          {showDetails ? "Hide Details" : "Book Now"}
        </button>
        {showDetails && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-700 shadow-inner">
            <p className="font-semibold text-blue-800 mb-1">🎉 Exclusive Offer Unlocked!</p>
            <p>Use code <strong className="text-blue-600 font-mono">MMT2024</strong> at checkout to get an extra 10% off on this booking. Valid for a limited time only.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CollectionCard = ({ title, imageUrl, tag }: any) => {
  return (
    <div 
      className="relative group overflow-hidden rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100/10"
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/90 transition-opacity duration-300 group-hover:opacity-90">
        <div className="absolute top-4 left-4">
          <span className="bg-white/95 backdrop-blur-sm text-blue-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {tag}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 transform transition-transform duration-300 group-hover:-translate-y-2">
          <h3 className="text-white text-xl font-bold mb-1">{title}</h3>
          <p className="text-blue-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
            Explore Collection &rarr;
          </p>
        </div>
      </div>
    </div>
  );
};
const DownloadApp = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto my-12">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-6 md:mb-0">
          <h3 className="text-xl font-bold mb-2">Download App Now!</h3>
          <p className="text-gray-600 mb-4">
            Get India's #1 travel super app with best deals on flights
          </p>
          <div className="flex space-x-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
              alt="App Store"
              className="h-10"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
              alt="Play Store"
              className="h-10"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <QrCode className="w-24 h-24" />
          <p className="text-sm text-gray-600">
            Scan QR code to download the app
          </p>
        </div>
      </div>
    </div>
  );
};

const WonderCard = ({ title, imageUrl }: any) => {
  return (
    <div 
      className="relative group overflow-hidden rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <div className="absolute bottom-6 left-6 right-6">
          <h3 className="text-white text-lg font-bold leading-tight mb-2 group-hover:text-amber-300 transition-colors duration-300">{title}</h3>
          <div className="w-0 h-0.5 bg-amber-400 group-hover:w-12 transition-all duration-300"></div>
        </div>
      </div>
    </div>
  );
};
function NavItem({ icon, text, active = false, onClick }: any) {
  return (
    <button
      className={`flex flex-col items-center px-4 py-3 rounded-xl transition-all duration-300 ${
        active
          ? "text-blue-600 bg-blue-50 shadow-md transform scale-105"
          : "text-gray-500 hover:text-blue-500 hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className={`mb-1 transition-colors ${active ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"}`}>
        {icon}
      </div>
      <span className="text-sm font-bold whitespace-nowrap">{text}</span>
    </button>
  );
}

function SearchInput({
  icon,
  placeholder,
  value,
  onChange,
  subtitle,
  type = "text",
}: any) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 hover:border-blue-500 transition-colors cursor-pointer h-full bg-gray-50 hover:bg-white">
      <div className="flex items-center space-x-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 truncate">{placeholder}</div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            className="font-semibold w-full bg-transparent outline-none"
            placeholder={placeholder}
          />
          <div className="text-xs text-gray-400 truncate">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
