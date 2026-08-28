import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Search,
  Send,
  Truck,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Pharmacy, Hospital } from '../../types/shared';
import { InteractiveMap } from '../../components/map/InteractiveMap';

export const PharmacyFinderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hospitalIdParam = searchParams.get('hospitalId');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [rawPharmacies, setRawPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(0); // 0 = all
  const [open24HoursFilter, setOpen24HoursFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [routedSuccess, setRoutedSuccess] = useState(false);
  
  // Patient's current location (may be null if permission denied)
  const [patientLocation, setPatientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  
  // Google Maps load state
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [mapAuthError, setMapAuthError] = useState(false);

  // 1. Load Google Maps API Script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).google && (window as any).google.maps) {
      setIsGoogleLoaded(true);
      return;
    }
    
    // Check if script is already injecting
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkInterval = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          setIsGoogleLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    (window as any).gm_authFailure = () => {
      setMapAuthError(true);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => setIsGoogleLoaded(true);
    script.onerror = () => setLocationError('Failed to load Google Maps API. Please check your connection or API key.');
    document.head.appendChild(script);
  }, []);

  // 2. Request patient location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPatientLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocationError('');
        },
        (err) => {
          console.warn('Geolocation permission denied or unavailable:', err);
          setLocationError('Location permission is required to calculate your exact distance from nearby pharmacies.');
        },
        { timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  // 3. Fetch Hospitals & Pharmacies (Data only, no distance calculation)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const hospRes = await api.get('/hospitals');
        setHospitals(hospRes.data);

        // Determine active hospital
        let activeHosp = null;
        if (hospitalIdParam) {
          activeHosp = hospRes.data.find((h: Hospital) => h.id === hospitalIdParam);
        }
        if (!activeHosp && hospRes.data.length > 0) {
          activeHosp = hospRes.data[0];
        }
        setSelectedHospital(activeHosp);

        const queryParams = new URLSearchParams();
        if (patientLocation) {
          queryParams.set('lat', patientLocation.latitude.toString());
          queryParams.set('lng', patientLocation.longitude.toString());
        } else if (activeHosp) {
          queryParams.set('lat', activeHosp.latitude.toString());
          queryParams.set('lng', activeHosp.longitude.toString());
        } else if (latParam && lngParam) {
          queryParams.set('lat', latParam);
          queryParams.set('lng', lngParam);
        }
        
        if (activeHosp) {
          queryParams.set('hospitalId', activeHosp.id);
        }
        if (radiusKm > 0) {
          queryParams.set('radiusKm', radiusKm.toString());
        }
        
        const pharmRes = await api.get(`/pharmacies?${queryParams.toString()}`);
        setRawPharmacies(pharmRes.data);
      } catch (err) {
        console.error('Failed to load pharmacies and hospitals:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [hospitalIdParam, latParam, lngParam, radiusKm, patientLocation]);

  // 4. Calculate real road distances using Google Distance Matrix API
  useEffect(() => {
    if (!rawPharmacies.length) {
      setPharmacies([]);
      return;
    }

    const calculateDistances = async () => {
      const originLat = patientLocation?.latitude ?? selectedHospital?.latitude;
      const originLng = patientLocation?.longitude ?? selectedHospital?.longitude;

      // If we don't have an origin or Google Maps isn't loaded yet, fallback to Haversine
      if (!originLat || !originLng || !isGoogleLoaded || !(window as any).google?.maps?.DistanceMatrixService) {
        if (originLat && originLng) {
          const updated = rawPharmacies.map((p) => {
            const d = Math.sqrt(
              Math.pow((p.latitude - originLat) * 111.12, 2) +
              Math.pow((p.longitude - originLng) * 111.12 * Math.cos((originLat * Math.PI) / 180), 2)
            );
            return { ...p, distanceKm: Math.round(d * 10) / 10 };
          }).sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setPharmacies(updated);
          if (updated.length > 0 && !selectedPharmacy) setSelectedPharmacy(updated[0]);
        } else {
          setPharmacies(rawPharmacies);
        }
        return;
      }

      setCalculatingDistance(true);
      try {
        const service = new google.maps.DistanceMatrixService();
        const origin = new google.maps.LatLng(originLat, originLng);
        const destinations = rawPharmacies.map(p => new google.maps.LatLng(p.latitude, p.longitude));

        // Note: DistanceMatrix allows up to 25 destinations per request. 
        // For production with >25 pharmacies, this needs to be chunked.
        const response = await service.getDistanceMatrix({
          origins: [origin],
          destinations: destinations,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (response && response.rows && response.rows[0]) {
          const results = response.rows[0].elements;
          const updatedPharmacies = rawPharmacies.map((p, index) => {
            const element = results[index];
            if (element && element.status === 'OK' && element.distance) {
              // Convert meters to km and round to 1 decimal
              return { ...p, distanceKm: Math.round(element.distance.value / 100) / 10 };
            } else {
              // Fallback to straight line if route fails for this specific pharmacy
              const d = Math.sqrt(
                Math.pow((p.latitude - originLat) * 111.12, 2) +
                Math.pow((p.longitude - originLng) * 111.12 * Math.cos((originLat * Math.PI) / 180), 2)
              );
              return { ...p, distanceKm: Math.round(d * 10) / 10 };
            }
          });
          
          updatedPharmacies.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setPharmacies(updatedPharmacies);
          
          // Select nearest if none selected
          if (updatedPharmacies.length > 0 && !selectedPharmacy) {
            setSelectedPharmacy(updatedPharmacies[0]);
          }
        } else {
          throw new Error("Invalid or empty response from Distance Matrix API");
        }
      } catch (error) {
        console.error("Google Maps Distance Matrix failed:", error);
        // Graceful fallback to Haversine
        const updated = rawPharmacies.map((p) => {
          const d = Math.sqrt(
            Math.pow((p.latitude - originLat) * 111.12, 2) +
            Math.pow((p.longitude - originLng) * 111.12 * Math.cos((originLat * Math.PI) / 180), 2)
          );
          return { ...p, distanceKm: Math.round(d * 10) / 10 };
        }).sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
        setPharmacies(updated);
      } finally {
        setCalculatingDistance(false);
      }
    };

    calculateDistances();
  }, [rawPharmacies, isGoogleLoaded, patientLocation, selectedHospital]);

  const handleHospitalChange = async (hospId: string) => {
    const found = hospitals.find((h) => h.id === hospId);
    if (!found) return;
    setSelectedHospital(found);

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (patientLocation) {
        queryParams.set('lat', patientLocation.latitude.toString());
        queryParams.set('lng', patientLocation.longitude.toString());
      } else {
        queryParams.set('lat', found.latitude.toString());
        queryParams.set('lng', found.longitude.toString());
      }
      queryParams.set('hospitalId', found.id);
      if (radiusKm > 0) queryParams.set('radiusKm', radiusKm.toString());

      const res = await api.get(`/pharmacies?${queryParams.toString()}`);
      setRawPharmacies(res.data);
    } catch (err) {
      console.error('Failed to update pharmacies for new hospital:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoutePrescription = () => {
    setRoutedSuccess(true);
    setTimeout(() => setRoutedSuccess(false), 4000);
  };

  const getDirectionsUrl = (pharmacy: Pharmacy) => {
    const origin = patientLocation
      ? `${patientLocation.latitude},${patientLocation.longitude}`
      : selectedHospital
      ? `${selectedHospital.latitude},${selectedHospital.longitude}`
      : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${pharmacy.latitude},${pharmacy.longitude}`;
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matches24H = !open24HoursFilter || p.isOpen24Hours;
    
    // Apply exact road distance filter (since API might return pharmacies outside radius based on straight line)
    const matchesRadius = radiusKm === 0 || (p.distanceKm !== undefined && p.distanceKm <= radiusKm);
    
    return matchesSearch && matches24H && matchesRadius;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Nearby Partner Pharmacies</h1>
            {patientLocation ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Your Current Location
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Hospital Anchor Geolocation
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Real-time pharmacy network sorted by real road distance from {patientLocation ? 'your current location' : 'the consultation hospital'}
          </p>
        </div>
      </div>

      {locationError && (
        <p className="text-sm text-amber-400 mb-2">{locationError}</p>
      )}

      {/* Hospital Anchor Context Banner */}
      {selectedHospital && (
        <div className="p-4 rounded-2xl glass-card border border-brand-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-brand-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-rose-400 font-mono">
                  Consultation Hospital Anchor:
                </span>
                <span className="font-bold text-sm text-white">{selectedHospital.name}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                📍 {selectedHospital.address}, {selectedHospital.city} • (Lat: {selectedHospital.latitude}° N, Lng: {selectedHospital.longitude}° W)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Change Hospital:</span>
            <select
              value={selectedHospital.id}
              onChange={(e) => handleHospitalChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700 focus:outline-none"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Filters & Radius Controls */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by pharmacy name, address, or neighborhood..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Radius Selector */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">Distance:</span>
            {[1, 3, 5, 0].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  radiusKm === r
                    ? 'bg-brand-500 text-slate-950 shadow-glow-cyan'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {r === 0 ? 'All' : `${r} km`}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={open24HoursFilter}
              onChange={(e) => setOpen24HoursFilter(e.target.checked)}
              className="rounded accent-brand-500"
            />
            <span>Open 24/7</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Top/Right) + Pharmacy List (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pharmacy Directory List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {filteredPharmacies.length} pharmacies sorted by nearest distance</span>
            {calculatingDistance ? (
              <span className="font-mono text-cyan-400 animate-pulse">Calculating...</span>
            ) : patientLocation ? (
              <span className="font-mono text-cyan-400">from Your Location</span>
            ) : selectedHospital ? (
              <span className="font-mono text-cyan-400">from {selectedHospital.name.split(' ')[0]}</span>
            ) : null}
          </div>

          {loading || calculatingDistance ? (
            <div className="p-8 text-center glass-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
               <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm text-slate-400">{calculatingDistance ? 'Calculating real road distances...' : 'Loading pharmacies...'}</p>
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
               <MapPin className="w-8 h-8 text-slate-600" />
               <p className="text-sm text-slate-400">No pharmacies found within criteria.</p>
            </div>
          ) : (
            filteredPharmacies.map((pharmacy) => {
              const isSelected = selectedPharmacy?.id === pharmacy.id;
              return (
                <div
                  key={pharmacy.id}
                  onClick={() => setSelectedPharmacy(pharmacy)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-500/20 border-brand-500/60 shadow-glow-cyan'
                      : 'glass-card border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white">{pharmacy.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-400 mr-1 flex-shrink-0" />
                        {pharmacy.address}, {pharmacy.city}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 whitespace-nowrap">
                      📍 {pharmacy.distanceKm !== undefined ? `${pharmacy.distanceKm} km` : '...'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 text-[10px]">
                    {pharmacy.isOpen24Hours ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Open 24/7</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {pharmacy.openingHours || '08:00 AM - 09:00 PM'}
                      </span>
                    )}

                    {pharmacy.deliveryAvailable && (
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold flex items-center space-x-1">
                        <Truck className="w-3 h-3" />
                        <span>Delivery</span>
                      </span>
                    )}

                    <a
                      href={getDirectionsUrl(pharmacy)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto text-brand-400 hover:text-brand-300 font-bold flex items-center space-x-1 hover:underline"
                    >
                      <span>Get Directions</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Interactive Map + Dispensing Station Action (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            isGoogleLoaded={isGoogleLoaded}
            mapAuthError={mapAuthError}
            hospital={selectedHospital}
            patientLocation={patientLocation}
            pharmacies={filteredPharmacies}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={(p) => setSelectedPharmacy(p)}
            radiusKm={radiusKm}
            onRadiusChange={(r) => setRadiusKm(r)}
            heightClass="h-96"
          />

          {selectedPharmacy && (
            <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Selected Dispensing Facility
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedPharmacy.name}</h3>
                  <p className="text-xs text-slate-300">
                    📍 {selectedPharmacy.address}, {selectedPharmacy.city}
                  </p>
                  <p className="text-xs text-emerald-400 font-mono mt-1 font-bold">
                    Distance: {selectedPharmacy.distanceKm || '...'} km from {patientLocation ? 'your location' : (selectedHospital?.name || 'Hospital')}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(selectedPharmacy)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Get Directions</span>
                  </a>

                  <button
                    onClick={handleRoutePrescription}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 hover:from-brand-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Route Active Prescription</span>
                  </button>
                </div>
              </div>

              {routedSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    Successfully transmitted patient e-prescription to <strong>{selectedPharmacy.name}</strong> over secure HL7/FHIR pharmacy network.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase">Operating Hours</span>
                  <p className="font-bold text-white">
                    {selectedPharmacy.isOpen24Hours ? 'Open 24/7' : selectedPharmacy.openingHours || '08:00 AM - 09:00 PM'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase">Contact Phone</span>
                  <p className="font-bold text-white font-mono">{selectedPharmacy.phone}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase">Direct Email</span>
                  <p className="font-bold text-brand-300 font-mono truncate">{selectedPharmacy.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
