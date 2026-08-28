import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ExternalLink,
  Building2,
  Pill,
  X,
  Phone,
} from 'lucide-react';
import { Hospital, Pharmacy } from '../../types/shared';

interface InteractiveMapProps {
  hospital?: Hospital | null;
  hospitalsList?: Hospital[];
  patientLocation?: { latitude: number; longitude: number } | null;
  pharmacies?: Pharmacy[];
  selectedPharmacy?: Pharmacy | null;
  onSelectPharmacy?: (pharmacy: Pharmacy) => void;
  onSelectHospital?: (hospital: Hospital) => void;
  radiusKm?: number;
  onRadiusChange?: (radius: number) => void;
  heightClass?: string;
  isGoogleLoaded?: boolean; // Kept for backwards compatibility
  mapAuthError?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  hospital,
  hospitalsList = [],
  patientLocation = null,
  pharmacies = [],
  selectedPharmacy,
  onSelectPharmacy,
  onSelectHospital,
  heightClass = 'h-96',
}) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Helper to build a directions URL using patient location or hospital origin
  const getDirectionsUrl = (destLat: number, destLng: number) => {
    if (patientLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.latitude},${patientLocation.longitude}&destination=${destLat},${destLng}`;
    }
    if (hospital) {
      return `https://www.google.com/maps/dir/?api=1&origin=${hospital.latitude},${hospital.longitude}&destination=${destLat},${destLng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = patientLocation?.latitude ?? hospital?.latitude ?? 11.1271;
      const initialLng = patientLocation?.longitude ?? hospital?.longitude ?? 78.6569;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
      });

      // OpenStreetMap TileLayer with standard attribution
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Patient Location Marker
    if (patientLocation) {
      const patientIcon = L.divIcon({
        className: 'custom-patient-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const patientMarker = L.marker([patientLocation.latitude, patientLocation.longitude], {
        icon: patientIcon,
        title: 'Your Current Location',
        zIndexOffset: 1000,
      });
      patientMarker.bindTooltip('📍 You are here', { permanent: false, direction: 'top' });
      markersGroup.addLayer(patientMarker);
    }

    // 2. Hospital Markers
    const hospitalsToShow = hospitalsList.length > 0 ? hospitalsList : (hospital ? [hospital] : []);
    hospitalsToShow.forEach((h) => {
      const hospitalIcon = L.divIcon({
        className: 'custom-hospital-marker',
        html: `
          <div style="background-color: #E11D48; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.35);">
            <div style="transform: rotate(45deg); font-size: 14px; font-weight: bold;">🏥</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([h.latitude, h.longitude], {
        icon: hospitalIcon,
        title: h.name,
      });

      marker.on('click', () => {
        setActivePopup(`hospital-${h.id}`);
        if (onSelectHospital) onSelectHospital(h);
      });

      markersGroup.addLayer(marker);
    });

    // 3. Pharmacy Markers
    pharmacies.forEach((p) => {
      const isSelected = selectedPharmacy?.id === p.id;
      const bgColor = isSelected ? '#2563EB' : '#10B981';
      const pharmacyIcon = L.divIcon({
        className: 'custom-pharmacy-marker',
        html: `
          <div style="background-color: ${bgColor}; color: white; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); transition: all 0.2s ease;">
            <div style="transform: rotate(45deg); font-size: 13px;">💊</div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([p.latitude, p.longitude], {
        icon: pharmacyIcon,
        title: p.name,
        zIndexOffset: isSelected ? 500 : 100,
      });

      marker.on('click', () => {
        setActivePopup(`pharmacy-${p.id}`);
        if (onSelectPharmacy) onSelectPharmacy(p);
      });

      markersGroup.addLayer(marker);
    });
  }, [hospital, hospitalsList, patientLocation, pharmacies, selectedPharmacy, onSelectHospital, onSelectPharmacy]);

  // Center/Pan on selected pharmacy or patient location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedPharmacy) {
      map.setView([selectedPharmacy.latitude, selectedPharmacy.longitude], 15, { animate: true });
    } else if (patientLocation) {
      map.setView([patientLocation.latitude, patientLocation.longitude], 13, { animate: true });
    } else if (hospital) {
      map.setView([hospital.latitude, hospital.longitude], 13, { animate: true });
    }
  }, [selectedPharmacy, patientLocation, hospital]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-secondary shadow-sm ${heightClass}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Hospital Info Popup */}
      {activePopup && activePopup.startsWith('hospital-') && (
        <div className="absolute bottom-4 left-4 right-4 sm:w-80 z-[1000] p-4 rounded-2xl bg-white border border-secondary shadow-xl animate-in fade-in">
          {(() => {
            const hospId = activePopup.replace('hospital-', '');
            const targetHosp = hospital && hospital.id === hospId 
              ? hospital 
              : hospitalsList.find(h => h.id === hospId);
            if (!targetHosp) return null;
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-500 flex items-center">
                    <Building2 className="w-3.5 h-3.5 mr-1" /> {targetHosp.hospitalType || 'Hospital'}
                  </span>
                  <button onClick={() => setActivePopup(null)} className="text-slate-400 hover:text-slate-900 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-base text-slate-900 mt-1">{targetHosp.name}</h4>
                <p className="text-sm text-slate-600">
                  {targetHosp.address}, {targetHosp.city}
                </p>
                <p className="text-sm text-slate-500 font-mono flex items-center mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 mr-1" /> {targetHosp.phone}
                </p>
                <div className="pt-3 flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(targetHosp.latitude, targetHosp.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 font-bold text-sm flex items-center justify-center space-x-1 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
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
        <div className="absolute bottom-4 left-4 right-4 sm:w-80 z-[1000] p-4 rounded-2xl bg-white border border-secondary shadow-xl animate-in fade-in">
          {(() => {
            const pharmId = activePopup.replace('pharmacy-', '');
            const pharm = pharmacies.find((p) => p.id === pharmId);
            if (!pharm) return null;
            return (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center">
                    <Pill className="w-3.5 h-3.5 mr-1" /> Nearby Pharmacy
                  </span>
                  <button onClick={() => setActivePopup(null)} className="text-slate-400 hover:text-slate-900 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-base text-slate-900 mt-1">{pharm.name}</h4>
                <p className="text-sm text-slate-600">{pharm.address}, {pharm.city}</p>
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2">
                  <span className="font-bold text-primary">
                    📍 {pharm.distanceKm !== undefined ? `${pharm.distanceKm} km` : 'Road distance'}
                  </span>
                  <span className="text-emerald-600 font-bold">{pharm.isOpen24Hours ? 'Open 24/7' : 'Open'}</span>
                </div>
                <div className="pt-3 flex items-center space-x-2">
                  <a
                    href={getDirectionsUrl(pharm.latitude, pharm.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex items-center justify-center space-x-1 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
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

