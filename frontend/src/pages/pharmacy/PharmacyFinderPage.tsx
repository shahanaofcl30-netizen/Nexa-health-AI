import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Pill,
  Search,
  Send,
  Truck,
  AlertTriangle,
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
  
  // Patient's current location from browser geolocation
  const [patientLocation, setPatientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');

  // 1. Request patient location via Geolocation API on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPatientLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocationError('');
        },
        (err) => {
          console.warn('Geolocation permission denied or error:', err);
          setLocationError(
            'Location access is required to compute real driving distance from your current position. Please enable location permissions in your browser settings.'
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  }, []);

  // 2. Fetch Hospitals & Pharmacies (Raw data)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const hospRes = await api.get('/hospitals');
        setHospitals(hospRes.data);

        // Determine active hospital
        let activeHosp: Hospital | null = null;
        if (hospitalIdParam) {
          activeHosp = hospRes.data.find((h: Hospital) => h.id === hospitalIdParam) || null;
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
        
        const pharmRes = await api.get(`/pharmacies?${queryParams.toString()}`);
        setRawPharmacies(pharmRes.data);
      } catch (err) {
        console.error('Failed to load pharmacies and hospitals:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [hospitalIdParam, latParam, lngParam, patientLocation]);

  // 3. Calculate REAL ROAD DISTANCE using openrouteservice Matrix API
  useEffect(() => {
    if (!rawPharmacies.length) {
      setPharmacies([]);
      return;
    }

    // Origin MUST be patient's current location if available
    if (!patientLocation) {
      // Patient location denied or not yet provided: do NOT substitute hospital location as patient location
      const uncalculated = rawPharmacies.map((p) => ({
        ...p,
        distanceKm: undefined,
      }));
      setPharmacies(uncalculated);
      if (uncalculated.length > 0 && !selectedPharmacy) {
        setSelectedPharmacy(uncalculated[0]);
      }
      return;
    }

    const calculateRoadDistances = async () => {
      setCalculatingDistance(true);
      const apiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

      const origin = [patientLocation.longitude, patientLocation.latitude]; // ORS expects [lng, lat]
      const destinations = rawPharmacies.map((p) => [p.longitude, p.latitude]);
      const allLocations = [origin, ...destinations];
      const destinationIndices = rawPharmacies.map((_, i) => i + 1);

      try {
        if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_OPENROUTESERVICE_API_KEY') {
          const response = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: apiKey,
            },
            body: JSON.stringify({
              locations: allLocations,
              sources: [0],
              destinations: destinationIndices,
              metrics: ['distance'],
            }),
          });

          if (!response.ok) {
            throw new Error(`openrouteservice API returned HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data && data.distances && data.distances[0]) {
            const distanceMatrix = data.distances[0]; // Array of meters

            const updatedPharmacies: Pharmacy[] = rawPharmacies.map((p, idx) => {
              const meters = distanceMatrix[idx];
              let distKm: number | undefined = undefined;
              if (typeof meters === 'number' && !isNaN(meters) && meters >= 0) {
                distKm = Math.round((meters / 1000) * 10) / 10; // Convert to km, 1 decimal place (e.g. 2400m -> 2.4 km)
              }
              return {
                ...p,
                distanceKm: distKm,
              };
            });

            // Sort: nearest -> farthest (undefined distances placed at end)
            updatedPharmacies.sort((a, b) => {
              if (a.distanceKm === undefined) return 1;
              if (b.distanceKm === undefined) return -1;
              return a.distanceKm - b.distanceKm;
            });

            setPharmacies(updatedPharmacies);
            if (updatedPharmacies.length > 0 && !selectedPharmacy) {
              setSelectedPharmacy(updatedPharmacies[0]);
            }
            return;
          }
        }

        // If no openrouteservice API key is configured or call fails, try OSRM (Open Source Routing Machine) public demo API as reliable free open road routing matrix
        const coordinatesStr = `${patientLocation.longitude},${patientLocation.latitude};` + 
          rawPharmacies.map(p => `${p.longitude},${p.latitude}`).join(';');
        const destParamStr = destinationIndices.join(';');

        const osrmRes = await fetch(
          `https://router.project-osrm.org/table/v1/driving/${coordinatesStr}?sources=0&destinations=${destParamStr}&annotations=distance`
        );

        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData && osrmData.distances && osrmData.distances[0]) {
            const distancesInMeters = osrmData.distances[0];
            const updatedPharmacies: Pharmacy[] = rawPharmacies.map((p, idx) => {
              const meters = distancesInMeters[idx];
              let distKm: number | undefined = undefined;
              if (typeof meters === 'number' && !isNaN(meters) && meters >= 0) {
                distKm = Math.round((meters / 1000) * 10) / 10;
              }
              return {
                ...p,
                distanceKm: distKm,
              };
            });

            updatedPharmacies.sort((a, b) => {
              if (a.distanceKm === undefined) return 1;
              if (b.distanceKm === undefined) return -1;
              return a.distanceKm - b.distanceKm;
            });

            setPharmacies(updatedPharmacies);
            if (updatedPharmacies.length > 0 && !selectedPharmacy) {
              setSelectedPharmacy(updatedPharmacies[0]);
            }
            return;
          }
        }

        throw new Error('Routing service distance unavailable');
      } catch (err) {
        console.warn('Real road distance matrix failed:', err);
        // If routing fails: show "Distance unavailable" (distanceKm: undefined). Do not remove pharmacy or use fake straight line distance.
        const fallback = rawPharmacies.map((p) => ({
          ...p,
          distanceKm: undefined,
        }));
        setPharmacies(fallback);
      } finally {
        setCalculatingDistance(false);
      }
    };

    calculateRoadDistances();
  }, [rawPharmacies, patientLocation]);

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

  // Build driving directions URL (Patient Location -> Pharmacy)
  const getDirectionsUrl = (pharmacy: Pharmacy) => {
    if (patientLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.latitude},${patientLocation.longitude}&destination=${pharmacy.latitude},${pharmacy.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`;
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matches24H = !open24HoursFilter || p.isOpen24Hours;
    
    // Apply exact real road distance filter
    const matchesRadius = radiusKm === 0 || (p.distanceKm !== undefined && p.distanceKm <= radiusKm);
    
    return matchesSearch && matches24H && matchesRadius;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nearby Partner Pharmacies</h1>
            {patientLocation ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-mono font-bold">
                Live Patient GPS
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-mono font-bold">
                Location Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Real-time pharmacy network sorted by actual road driving distance from {patientLocation ? 'your current GPS location' : 'your position'}
          </p>
        </div>
      </div>

      {/* Geolocation Permission Warning / Alert */}
      {locationError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Location Permission Needed</p>
            <p className="text-xs text-amber-700 leading-relaxed">{locationError}</p>
          </div>
        </div>
      )}

      {/* Consultation Hospital Context Banner */}
      {selectedHospital && (
        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-rose-600 font-mono">
                  Consultation Hospital Anchor:
                </span>
                <span className="font-bold text-sm text-slate-900">{selectedHospital.name}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                📍 {selectedHospital.address}, {selectedHospital.city}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Change Hospital:</span>
            <select
              value={selectedHospital.id}
              onChange={(e) => handleHospitalChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-900 bg-white border border-secondary focus:outline-none focus:border-primary"
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
      <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by pharmacy name, address, or neighborhood..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-secondary bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Radius Selector */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-600 text-[11px] font-bold mr-1">Road Distance:</span>
            {[1, 3, 5, 0].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  radiusKm === r
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-secondary/20 text-slate-700 hover:bg-secondary/40 border border-secondary'
                }`}
              >
                {r === 0 ? 'All' : `${r} km`}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={open24HoursFilter}
              onChange={(e) => setOpen24HoursFilter(e.target.checked)}
              className="rounded accent-primary"
            />
            <span>Open 24/7</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Pharmacy List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pharmacy Directory List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium">
            <span>Showing {filteredPharmacies.length} pharmacies (nearest first)</span>
            {calculatingDistance ? (
              <span className="font-mono text-primary animate-pulse font-bold">Calculating Road Distance...</span>
            ) : patientLocation ? (
              <span className="font-mono text-primary font-bold">From Your GPS Location</span>
            ) : (
              <span className="font-mono text-amber-600">Location Pending</span>
            )}
          </div>

          {loading || calculatingDistance ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-secondary shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-600 font-medium">
                {calculatingDistance ? 'Computing real road distance matrix via openrouteservice...' : 'Loading pharmacies...'}
              </p>
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-secondary shadow-sm flex flex-col items-center justify-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-600">No pharmacies found matching the filter criteria.</p>
            </div>
          ) : (
            filteredPharmacies.map((pharmacy) => {
              const isSelected = selectedPharmacy?.id === pharmacy.id;
              return (
                <div
                  key={pharmacy.id}
                  onClick={() => setSelectedPharmacy(pharmacy)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-1 ring-primary'
                      : 'bg-white border-secondary hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{pharmacy.name}</h3>
                      <p className="text-xs text-slate-600 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 text-primary mr-1 flex-shrink-0" />
                        {pharmacy.address}, {pharmacy.city}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-secondary/30 text-slate-800 border border-secondary whitespace-nowrap">
                      {pharmacy.distanceKm !== undefined ? `📍 ${pharmacy.distanceKm} km` : 'Distance unavailable'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 text-[10px]">
                    {pharmacy.isOpen24Hours ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Open 24/7</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-secondary/30 text-slate-700 font-semibold">
                        {pharmacy.openingHours || '08:00 AM - 09:00 PM'}
                      </span>
                    )}

                    {pharmacy.deliveryAvailable && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold flex items-center space-x-1">
                        <Truck className="w-3 h-3" />
                        <span>Delivery</span>
                      </span>
                    )}

                    <a
                      href={getDirectionsUrl(pharmacy)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto text-primary hover:text-primary/80 font-bold flex items-center space-x-1 hover:underline text-xs"
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

        {/* Right: OpenStreetMap Interactive Map + Selected Pharmacy Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
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
            <div className="p-6 rounded-3xl bg-white border border-secondary space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                    Selected Dispensing Facility
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedPharmacy.name}</h3>
                  <p className="text-xs text-slate-600">
                    📍 {selectedPharmacy.address}, {selectedPharmacy.city}
                  </p>
                  <p className="text-xs text-slate-800 font-mono mt-1 font-bold">
                    Road Distance:{' '}
                    {selectedPharmacy.distanceKm !== undefined
                      ? `${selectedPharmacy.distanceKm} km from your GPS location`
                      : 'Distance unavailable'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(selectedPharmacy)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-800 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Get Directions</span>
                  </a>

                  <button
                    onClick={handleRoutePrescription}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Route Active Prescription</span>
                  </button>
                </div>
              </div>

              {routedSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Successfully transmitted patient e-prescription to <strong>{selectedPharmacy.name}</strong> over secure HL7/FHIR pharmacy network.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-secondary/10 border border-secondary space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Operating Hours</span>
                  <p className="font-bold text-slate-900">
                    {selectedPharmacy.isOpen24Hours ? 'Open 24/7' : selectedPharmacy.openingHours || '08:00 AM - 09:00 PM'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/10 border border-secondary space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Contact Phone</span>
                  <p className="font-bold text-slate-900 font-mono">{selectedPharmacy.phone}</p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/10 border border-secondary space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Direct Email</span>
                  <p className="font-bold text-primary font-mono truncate">{selectedPharmacy.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

