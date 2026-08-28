import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Building2,
  Pill,
  X,
  Phone,
} from 'lucide-react';
import { Hospital, Pharmacy } from '../../types/shared';

interface InteractiveMapProps {
  isGoogleLoaded?: boolean;
  mapAuthError?: boolean;
  hospital?: Hospital | null;
  patientLocation?: { latitude: number; longitude: number } | null;
  pharmacies?: Pharmacy[];
  selectedPharmacy?: Pharmacy | null;
  onSelectPharmacy?: (pharmacy: Pharmacy) => void;
  onSelectHospital?: (hospital: Hospital) => void;
  radiusKm?: number;
  onRadiusChange?: (radius: number) => void;
  heightClass?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  isGoogleLoaded = false,
  mapAuthError = false,
  hospital,
  patientLocation = null,
  pharmacies = [],
  selectedPharmacy,
  onSelectPharmacy,
  onSelectHospital,
  radiusKm,
  onRadiusChange,
  heightClass = 'h-96',
}) => {
  // State for which popup is active (hospital-<id> or pharmacy-<id>)
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const patientMarkerRef = useRef<google.maps.Marker | null>(null);

  // Helper to build a Google Maps directions URL using the appropriate origin.
  const getDirectionsUrl = (destLat: number, destLng: number) => {
    const origin = patientLocation
      ? `${patientLocation.latitude},${patientLocation.longitude}`
      : hospital
      ? `${hospital.latitude},${hospital.longitude}`
      : '';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destLat},${destLng}`;
  };

  // Initialise the map instance once Google is loaded
  const initMap = () => {
    if (!mapContainerRef.current || mapInstance.current) return;
    const center = patientLocation
      ? { lat: patientLocation.latitude, lng: patientLocation.longitude }
      : hospital
      ? { lat: hospital.latitude, lng: hospital.longitude }
      : { lat: 11.1271, lng: 78.6569 }; // fallback (Tamil Nadu centre)
    
    const mapOpts: google.maps.MapOptions = {
      center,
      zoom: 13,
      mapTypeId: 'roadmap',
    };
    mapInstance.current = new google.maps.Map(mapContainerRef.current, mapOpts);
    updateAllMarkers();
  };

  useEffect(() => {
    if (isGoogleLoaded) {
      initMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleLoaded]);

  // Update markers whenever relevant data changes
  useEffect(() => {
    if (mapInstance.current && isGoogleLoaded) {
      updateAllMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital, patientLocation, pharmacies, isGoogleLoaded]);

  // Helper to clear existing markers
  const clearMarkers = () => {
    Object.values(markersRef.current).forEach((m) => m.setMap(null));
    markersRef.current = {};
    if (patientMarkerRef.current) {
      patientMarkerRef.current.setMap(null);
      patientMarkerRef.current = null;
    }
  };

  // Create markers for hospital(s), patient and pharmacies
  const updateAllMarkers = () => {
    clearMarkers();
    if (!mapInstance.current || !isGoogleLoaded) return;

    // Hospital markers (single or list)
    const hospitalsToShow = hospital ? [hospital] : [];
    hospitalsToShow.forEach((h) => {
      const marker = new google.maps.Marker({
        position: { lat: h.latitude, lng: h.longitude },
        map: mapInstance.current,
        title: h.name,
        icon: {
          url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
          scaledSize: new google.maps.Size(30, 30),
        },
      });
      marker.addListener('click', () => {
        setActivePopup(`hospital-${h.id}`);
        if (onSelectHospital) onSelectHospital(h);
      });
      markersRef.current[`hospital-${h.id}`] = marker;
    });

    // Patient location marker
    if (patientLocation) {
      const marker = new google.maps.Marker({
        position: { lat: patientLocation.latitude, lng: patientLocation.longitude },
        map: mapInstance.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#00BFFF',
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: '#ffffff',
        },
      });
      patientMarkerRef.current = marker;
    }

    // Pharmacy markers
    pharmacies.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapInstance.current,
        title: p.name,
        icon: {
          url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
          scaledSize: new google.maps.Size(30, 30),
        },
      });
      marker.addListener('click', () => {
        setActivePopup(`pharmacy-${p.id}`);
        if (onSelectPharmacy) onSelectPharmacy(p);
      });
      markersRef.current[`pharmacy-${p.id}`] = marker;
    });
  };

  // Keep map centered on patient location when it changes
  useEffect(() => {
    if (mapInstance.current && patientLocation && isGoogleLoaded) {
      mapInstance.current.setCenter({ lat: patientLocation.latitude, lng: patientLocation.longitude });
    }
  }, [patientLocation, isGoogleLoaded]);

  return (
    <div className={`relative w-full ${heightClass}`} ref={mapContainerRef}>
      {mapAuthError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900 rounded-3xl border border-rose-500/30 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-3">
            <X className="w-6 h-6 text-rose-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Map Unavailable</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            Google Maps requires a valid API key and billing account. Please check your configuration.
          </p>
        </div>
      )}
      
      {!isGoogleLoaded && !mapAuthError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 rounded-3xl border border-slate-800">
           <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-400 text-sm">Loading Google Maps...</p>
        </div>
      )}
      
      {/* Hospital Info Popup */}
      {activePopup && activePopup.startsWith('hospital-') && (
        <div className="absolute bottom-4 left-4 right-4 sm:w-80 z-40 p-4 rounded-2xl glass-card border border-rose-500/40 shadow-2xl animate-in fade-in">
          {(() => {
            const hospId = activePopup.replace('hospital-', '');
            const targetHosp = hospital && hospital.id === hospId ? hospital : null;
            if (!targetHosp) return null;
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-rose-400 flex items-center">
                    <Building2 className="w-3.5 h-3.5 mr-1" /> {targetHosp.hospitalType || 'Hospital Anchor'}
                  </span>
                  <button onClick={() => setActivePopup(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="font-bold text-sm text-white">{targetHosp.name}</h4>
                <p className="text-xs text-slate-300">
                  {targetHosp.address}, {targetHosp.city}, {targetHosp.district}
                </p>
                <p className="text-[11px] text-slate-400 font-mono flex items-center">
                  <Phone className="w-3 h-3 text-slate-500 mr-1" /> {targetHosp.phone}
                  {targetHosp.emergencyPhone && (
                    <span className="text-rose-400 ml-2 font-bold">ER: {targetHosp.emergencyPhone}</span>
                  )}
                </p>
                <div className="pt-2 flex items-center space-x-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                    {targetHosp.openingHours}
                  </span>
                  {targetHosp.distanceKm !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      📍 {targetHosp.distanceKm} km
                    </span>
                  )}
                </div>
                <div className="pt-2 flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(targetHosp.latitude, targetHosp.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center space-x-1 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Get Directions</span>
                  </a>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Pharmacy Info Popup */}
      {activePopup && activePopup.startsWith('pharmacy-') && (
        <div className="absolute bottom-4 left-4 right-4 sm:w-80 z-40 p-4 rounded-2xl glass-card border border-brand-500/40 shadow-2xl animate-in fade-in">
          {(() => {
            const pharmId = activePopup.replace('pharmacy-', '');
            const pharm = pharmacies.find((p) => p.id === pharmId);
            if (!pharm) return null;
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-brand-400 flex items-center">
                    <Pill className="w-3.5 h-3.5 mr-1" /> Nearby Pharmacy
                  </span>
                  <button onClick={() => setActivePopup(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="font-bold text-sm text-white">{pharm.name}</h4>
                <p className="text-xs text-slate-300">{pharm.address}, {pharm.city}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                  <span>📍 {pharm.distanceKm !== undefined ? `${pharm.distanceKm} km from Hospital` : 'Nearby'}</span>
                  <span className="text-emerald-400">{pharm.isOpen24Hours ? 'Open 24/7' : 'Open'}</span>
                </div>
                <div className="pt-2 flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(pharm.latitude, pharm.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-[11px] flex items-center justify-center space-x-1 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Get Directions</span>
                  </a>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
