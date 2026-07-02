import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { PropertyListing } from '../types';
import { MapPin, X, AlertCircle } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

interface PropertyMapProps {
  properties: PropertyListing[];
  onSelectProperty: (property: PropertyListing) => void;
  selectedProperty?: PropertyListing | null;
  height?: string;
}

// Map city/location to latitude & longitude for seed properties
export function getPropertyCoordinates(property: PropertyListing): { lat: number; lng: number } {
  if (property.latitude !== undefined && property.longitude !== undefined) {
    return { lat: property.latitude, lng: property.longitude };
  }

  const loc = property.location.toLowerCase();
  if (loc.includes('malibu')) {
    return { lat: 34.0259, lng: -118.7798 };
  } else if (loc.includes('new york') || loc.includes('soho')) {
    return { lat: 40.7233, lng: -74.0030 };
  } else if (loc.includes('frankfurt')) {
    return { lat: 50.1109, lng: 8.6821 };
  } else if (loc.includes('paris')) {
    return { lat: 48.8566, lng: 2.3522 };
  } else if (loc.includes('st ives') || loc.includes('ives')) {
    return { lat: 50.2111, lng: -5.4800 };
  } else if (loc.includes('cornwall')) {
    return { lat: 50.4136, lng: -4.6738 };
  }

  // Generates somewhat deterministic coordinates based on the listing ID to avoid piling markers at the same spot
  const hash = property.id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const latOffset = (hash % 100) / 1000;
  const lngOffset = ((hash >> 2) % 100) / 1000;

  return { lat: 34.0522 + latOffset, lng: -118.2437 + lngOffset }; // Default to LA area with offset
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  onSelectProperty,
  selectedProperty,
  height = '550px',
}) => {
  const { language } = useAppContext();
  const [activeProperty, setActiveProperty] = useState<PropertyListing | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Filter valid properties
    const validProps = properties.filter(p => p !== null && p !== undefined);

    // Determine initial center and zoom
    let center: [number, number] = [37.0902, -95.7129]; // US Center
    let zoom = 4;

    if (validProps.length === 1) {
      const coords = getPropertyCoordinates(validProps[0]);
      center = [coords.lat, coords.lng];
      zoom = 11;
    } else if (validProps.length > 1) {
      let totalLat = 0;
      let totalLng = 0;
      validProps.forEach(p => {
        const coords = getPropertyCoordinates(p);
        totalLat += coords.lat;
        totalLng += coords.lng;
      });
      center = [totalLat / validProps.length, totalLng / validProps.length];

      const latitudes = validProps.map(p => getPropertyCoordinates(p).lat);
      const longitudes = validProps.map(p => getPropertyCoordinates(p).lng);
      const latDiff = Math.max(...latitudes) - Math.min(...latitudes);
      const lngDiff = Math.max(...longitudes) - Math.min(...longitudes);
      
      if (latDiff < 1 && lngDiff < 1) {
        zoom = 11;
      } else if (latDiff < 15 && lngDiff < 15) {
        zoom = 5;
      } else {
        zoom = 2;
      }
    }

    // Clean up existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create Leaflet Map
    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    }).addTo(map);

    mapRef.current = map;

    // Force tile redraw to avoid partial grey screens in tab layout changes
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync selectedProperty from external prop
  useEffect(() => {
    if (selectedProperty && mapRef.current) {
      setActiveProperty(selectedProperty);
      const coords = getPropertyCoordinates(selectedProperty);
      mapRef.current.setView([coords.lat, coords.lng], 13);
    }
  }, [selectedProperty]);

  // Handle markers rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id]?.remove();
    });
    markersRef.current = {};

    const validProps = properties.filter(p => p !== null && p !== undefined);

    validProps.forEach(p => {
      const coords = getPropertyCoordinates(p);
      const isSelected = activeProperty?.id === p.id;

      // Create high-contrast Tailwind HTML elements inside Leaflet DivIcon
      const icon = L.divIcon({
        className: 'custom-leaflet-marker-icon',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="px-2.5 py-1 rounded-xl text-xs font-sans font-black shadow-lg border transition-all duration-200 ${
              isSelected 
                ? 'bg-emerald-600 text-white border-emerald-500 scale-110 ring-2 ring-emerald-300' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-800'
            }">
              $${p.price}
            </div>
            <div class="w-2.5 h-2.5 -mt-1 rotate-45 border-r border-b ${
              isSelected 
                ? 'bg-emerald-600 border-emerald-500 ring-2 ring-emerald-300 ring-t-0 ring-l-0' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }"></div>
          </div>
        `,
        iconSize: [64, 40],
        iconAnchor: [32, 40],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon })
        .addTo(map)
        .on('click', () => {
          setActiveProperty(p);
          map.setView([coords.lat, coords.lng], map.getZoom() < 12 ? 12 : map.getZoom());
        });

      markersRef.current[p.id] = marker;
    });

    // Adjust map center if properties array changed but no specific selectedProperty
    if (validProps.length > 0 && !selectedProperty) {
      let totalLat = 0;
      let totalLng = 0;
      validProps.forEach(p => {
        const coords = getPropertyCoordinates(p);
        totalLat += coords.lat;
        totalLng += coords.lng;
      });
      const centerLat = totalLat / validProps.length;
      const centerLng = totalLng / validProps.length;
      
      // Check if current center is far from calculated center
      const currentCenter = map.getCenter();
      const distance = Math.sqrt(Math.pow(currentCenter.lat - centerLat, 2) + Math.pow(currentCenter.lng - centerLng, 2));
      if (distance > 2) {
        map.setView([centerLat, centerLng]);
      }
    }
  }, [properties, activeProperty, selectedProperty]);

  // Adjust Leaflet map sizing if height changes or layout adjusts
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [height, properties]);

  return (
    <div 
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs relative z-0" 
      id="interactive-map-wrapper"
    >
      {/* Leaflet DOM container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Elegant floating React card to display active property details */}
      {activeProperty && (
        <div 
          className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-3 z-[1000] animate-fadeIn flex flex-col sm:flex-row gap-3"
          id="map-floating-preview-card"
        >
          <div className="relative rounded-xl overflow-hidden h-24 w-full sm:w-28 bg-gray-100 dark:bg-slate-800 shrink-0">
            <img 
              src={activeProperty.image} 
              alt={activeProperty.title} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              {language === 'en' 
                ? activeProperty.type 
                : (activeProperty.type === 'house' ? 'ቤት' 
                   : activeProperty.type === 'apartment' ? 'አፓርታማ' 
                   : activeProperty.type === 'villa' ? 'ቪላ' 
                   : activeProperty.type === 'studio' ? 'ስቱዲዮ' 
                   : activeProperty.type === 'office' ? 'ቢሮ' 
                   : 'ሌላ')}
            </span>
          </div>
          
          <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
            <div>
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-sans font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                  {activeProperty.title}
                </h4>
                <button 
                  onClick={() => setActiveProperty(null)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">
                <MapPin className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
                <span className="truncate">{activeProperty.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${activeProperty.price}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400"> / night</span>
              </div>
              <button
                onClick={() => onSelectProperty(activeProperty)}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {language === 'en' ? 'Details' : 'ዝርዝር'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
