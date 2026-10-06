import React, { useState, useEffect } from "react";
import { Search, MapPin, Clock, Info } from "lucide-react";
import { getflightstatus, getupcomingflightstatus } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Seo from "@/components/Seo";

const FlightStatus = () => {
  const [flightNumber, setFlightNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flightStatus, setFlightStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    getupcomingflightstatus().then(setSuggestions);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (flightNumber.trim()) {
      setSearchQuery(flightNumber.trim().toUpperCase());
      setError("");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      if (!searchQuery) return;
      
      try {
        setLoading(true);
        const data = await getflightstatus(searchQuery);
        if (data) {
          setFlightStatus(data);
          setError("");
        } else {
          setFlightStatus(null);
          setError("Flight not found. Please try again.");
        }
      } catch (err) {
        setFlightStatus(null);
        setError("Error fetching flight status.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    if (searchQuery) {
      // Poll every 10 seconds for real-time updates
      interval = setInterval(fetchStatus, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Time": return "text-green-600 bg-green-50";
      case "Boarding": return "text-blue-600 bg-blue-50";
      case "Delayed": return "text-orange-600 bg-orange-50";
      case "Cancelled": return "text-red-600 bg-red-50";
      case "Landed": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Seo
        title="Live Flight Status"
        description="Check the live status of any flight: on time, delayed, boarding or landed, with gate and terminal. Search by flight number such as 6E-126 or AI101."
        path="/flight-status"
      />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Live Flight Status
            </h1>
            <p className="text-lg text-gray-600">
              Get real-time updates on your flight's departure, arrival, and gate information.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter Flight Number (e.g., 6E-126 or AI101)"
                  className="pl-10 h-12 text-lg uppercase"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 px-8 text-lg bg-blue-600 hover:bg-blue-700">
                Check Status
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Next departures:</span>
              {(suggestions.length ? suggestions.map((x) => x.flightNumber) : ["AI101", "IN202", "SJ303", "UK404"]).map((n: string) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setFlightNumber(n);
                    setSearchQuery(n);
                    setError("");
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {loading && !flightStatus && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 font-medium">Fetching live updates...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {flightStatus && (
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden transform transition-all hover:scale-[1.01]">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{flightStatus.flightNumber}</h2>
                    <p className="text-gray-500 font-medium mt-1">
                      {flightStatus.flightName}
                      {flightStatus.from && flightStatus.to ? ` • ${flightStatus.from} → ${flightStatus.to}` : ""}
                    </p>
                  </div>
                  <div className={`mt-4 sm:mt-0 px-4 py-2 rounded-full font-bold text-sm tracking-wide ${getStatusColor(flightStatus.status)}`}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                      {flightStatus.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Departure</p>
                        <p className="text-xl font-bold text-gray-900">{flightStatus.departureTime}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Terminal & Gate</p>
                        <p className="text-xl font-bold text-gray-900">
                          Terminal {String(flightStatus.terminal).replace(/^T/i, "")} • Gate {flightStatus.gate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Arrival (Est.)</p>
                        <p className="text-xl font-bold text-gray-900">{flightStatus.arrivalTime}</p>
                      </div>
                    </div>

                    {flightStatus.delayReason && (
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                          <Info className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Notice</p>
                          <p className="text-base font-semibold text-orange-600">
                            {flightStatus.delayReason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 text-center border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Last updated just now. Status refreshes automatically.</p>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default FlightStatus;
