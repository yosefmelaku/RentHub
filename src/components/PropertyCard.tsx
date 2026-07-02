import React from 'react';
import { PropertyListing } from '../types';
import { Star, MapPin, Bed, Bath, Home } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

interface PropertyCardProps {
  property: PropertyListing;
  onClick: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const { language, formatPrice } = useAppContext();
  
  const getPropertyTypeName = (type: string) => {
    if (language === 'am') {
      if (type === 'apartment') return 'አፓርታማ';
      if (type === 'house') return 'ቤት';
      if (type === 'villa') return 'ቪላ';
      if (type === 'loft') return 'ሎፍት';
      if (type === 'studio') return 'ስቱዲዮ';
      if (type === 'office') return 'ቢሮ';
      if (type === 'other') return 'ሌላ';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div 
      id={`property-card-${property.id}`}
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Property Image Container */}
      <div className="relative overflow-hidden aspect-video bg-gray-100 dark:bg-slate-800">
        <img 
          src={property.image} 
          alt={property.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-gray-900 dark:text-white text-[10px] font-sans font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
            <Home className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {getPropertyTypeName(property.type)}
          </span>
          {property.featured && (
            <span className="bg-emerald-600 dark:bg-emerald-700 text-white text-[9px] font-sans font-bold tracking-wider uppercase px-2 py-1 rounded-md shadow-xs">
              ★ {language === 'en' ? 'Premium' : 'ልዩ ማሳያ'}
            </span>
          )}
        </div>

        {/* Rating Badge Overlay */}
        <div className="absolute bottom-3 right-3 bg-gray-900/80 backdrop-blur-xs text-white text-xs font-sans font-semibold px-2 py-1 rounded-lg flex items-center space-x-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{property.rating.toFixed(2)}</span>
          <span className="text-[10px] text-gray-300 font-normal">({property.reviewsCount})</span>
        </div>
      </div>

      {/* Property Content */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 font-sans mb-1.5">
            <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          {/* Title */}
          <h3 className="font-sans font-bold text-gray-900 dark:text-white text-base leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mb-2">
            {property.title}
          </h3>

          {/* Core Features / Specs */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-slate-400 border-b border-gray-50 dark:border-slate-800 pb-3.5 mb-3.5">
            <div className="flex items-center space-x-1">
              <Bed className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              <span>
                {property.beds} {language === 'en' ? (property.beds === 1 ? 'Bed' : 'Beds') : 'መኝታ'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Bath className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              <span>
                {property.baths} {language === 'en' ? (property.baths === 1 ? 'Bath' : 'Baths') : 'መታጠቢያ'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing footer */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline">
            <span className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">{formatPrice(property.price)}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400 font-sans ml-1">
              / {language === 'en' ? 'night' : 'ሌሊት'}
            </span>
          </div>
          <span className="text-xs font-sans font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center">
            {language === 'en' ? 'View details' : 'ዝርዝር እይ'} &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};

