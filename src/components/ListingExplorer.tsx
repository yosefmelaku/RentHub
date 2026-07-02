import React, { useState, useMemo } from 'react';
import { PropertyListing } from '../types';
import { PropertyCard } from './PropertyCard';
import { Search, SlidersHorizontal, Check, X, Building, Compass, Sparkles, Home, Bed, LayoutGrid, Map as MapIcon, Briefcase, Layers } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { PropertyMap } from './PropertyMap';

interface ListingExplorerProps {
  listings: PropertyListing[];
  onSelectProperty: (property: PropertyListing) => void;
  externalSearchTerm?: string;
  onExternalSearchChange?: (term: string) => void;
}

export const ListingExplorer: React.FC<ListingExplorerProps> = ({ 
  listings, 
  onSelectProperty,
  externalSearchTerm = '',
  onExternalSearchChange,
}) => {
  const { language, t } = useAppContext();
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const searchTerm = onExternalSearchChange ? externalSearchTerm : localSearchTerm;
  const setSearchTerm = onExternalSearchChange ? onExternalSearchChange : setLocalSearchTerm;
  const [selectedType, setSelectedType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [minBeds, setMinBeds] = useState<number>(0);
  const [minBaths, setMinBaths] = useState<number>(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(item => {
      item.amenities?.forEach(amenity => set.add(amenity));
    });
    return Array.from(set).sort();
  }, [listings]);

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setMinPrice(0);
    setMaxPrice(3000);
    setMinBeds(0);
    setMinBaths(0);
    setSelectedAmenities([]);
  };

  const filteredListings = useMemo(() => {
    return listings.filter((property) => {
      const searchLower = searchTerm.toLowerCase().trim();
      let matchesSearch = true;
      
      if (searchLower) {
        const matchesId = property.id.toLowerCase().includes(searchLower);
        const matchesTitle = property.title.toLowerCase().includes(searchLower);
        const matchesLocation = property.location.toLowerCase().includes(searchLower);
        const matchesTypeField = property.type.toLowerCase().includes(searchLower);
        const matchesDesc = property.description?.toLowerCase().includes(searchLower) || false;
        const matchesAnyAmenity = property.amenities?.some(a => a.toLowerCase().includes(searchLower)) || false;
        
        const cleanPriceQuery = searchLower.replace(/[\$,]/g, '');
        const matchesPriceValue = cleanPriceQuery && !isNaN(Number(cleanPriceQuery)) && (
          property.price.toString().includes(cleanPriceQuery) ||
          Math.abs(property.price - Number(cleanPriceQuery)) <= 100
        );
        
        const numberInSearch = searchLower.match(/\d+/)?.[0];
        const matchesBedsText = numberInSearch && (searchLower.includes('bed') || searchLower.includes('room')) && property.beds.toString() === numberInSearch;
        const matchesBathsText = numberInSearch && searchLower.includes('bath') && property.baths.toString() === numberInSearch;
        const matchesRating = property.rating.toString().includes(searchLower);

        matchesSearch = matchesId || matchesTitle || matchesLocation || matchesTypeField || matchesDesc || matchesAnyAmenity || matchesPriceValue || matchesBedsText || matchesBathsText || matchesRating;
      }
      
      const matchesType = selectedType === 'all' || property.type === selectedType;
      const matchesPrice = property.price >= minPrice && property.price <= maxPrice;
      const matchesBeds = property.beds >= minBeds;
      const matchesBaths = property.baths >= minBaths;
      const matchesAmenities = selectedAmenities.every(
        (amenity) => property.amenities?.includes(amenity)
      );

      return matchesSearch && matchesType && matchesPrice && matchesBeds && matchesBaths && matchesAmenities;
    });
  }, [listings, searchTerm, selectedType, minPrice, maxPrice, minBeds, minBaths, selectedAmenities]);

  const propertyTypes = ['all', 'house', 'apartment', 'villa', 'studio', 'office', 'other'];

  const getTranslatedTypeName = (type: string) => {
    if (language === 'am') {
      if (type === 'all') return 'ሁሉም ዓይነቶች';
      if (type === 'house') return 'ቤት';
      if (type === 'apartment') return 'አፓርታማ';
      if (type === 'villa') return 'ቪላ';
      if (type === 'studio') return 'ስቱዲዮ';
      if (type === 'office') return 'ቢሮ';
      if (type === 'other') return 'ሌላ';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTranslatedAmenity = (amenity: string) => {
    if (language === 'am') {
      if (amenity === 'Wifi') return 'ዋይፋይ (WiFi)';
      if (amenity === 'Pool') return 'ዋና ገንዳ (Pool)';
      if (amenity === 'AC') return 'የአየር ማቀዝቀዣ (AC)';
      if (amenity === 'Gym') return 'ጂም (Gym)';
      if (amenity === 'Kitchen') return 'ማብሰያ ክፍል (Kitchen)';
      if (amenity === 'Parking') return 'የመኪና ማቆሚያ (Parking)';
      if (amenity === 'TV') return 'ቴሌቪዥን (TV)';
      if (amenity === 'Hot Tub') return 'ሙቅ ውሃ (Hot Tub)';
    }
    return amenity;
  };

  return (
    <div className="space-y-6" id="listing-explorer-container">
      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden transition-colors" id="explorer-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 via-transparent to-transparent opacity-60"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-sans text-xs px-3.5 py-1 rounded-full font-bold">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'en' ? 'Rent Houses Easily' : 'ቤቶችን በቀላሉ ይከራዩ'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight leading-none text-slate-900 dark:text-white">
            {language === 'en' ? 'Welcome to' : 'እንኳን ወደ'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500">RentHub Easy</span> {language === 'am' ? 'በደህና መጡ' : ''}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
            {language === 'en'
              ? 'We help you find nice houses and apartments to rent. We connect good renters with trusted owners. Look around, choose your favorite home, and sign simple papers.'
              : 'የሚያማምሩ ቤቶችን እና አፓርታማዎችን እንዲያገኟቸው እንረዳዎታለን። ተከራዮችን እና ባለቤቶችን እናገናኛለን። ይመልከቱ፣ የሚወዱትን ቤት ይምረጡ፣ እና ውል ይፈራረሙ።'}
          </p>
        </div>
      </div>

      {/* Main Search and Quick Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            {language === 'en' ? 'Search listings by ID, Title, or Address' : 'ቤቶችን በምድብ ኮድ፣ ርዕስ ወይም አድራሻ ይፈልጉ'}
          </label>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search bar input */}
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
              <input
                id="explorer-search-input"
                type="text"
                placeholder={language === 'en' ? "Type Listing ID (e.g. listing_1), Title, Address, City..." : "መለያ ኮድ (ለምሳሌ listing_1)፣ ርዕስ፣ ሰፈር..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-sans text-sm text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
              />
            </div>

            {/* Quick Property Type Selector */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {propertyTypes.map((type) => {
                const getIcon = () => {
                  switch (type) {
                    case 'house': return <Home className="h-3.5 w-3.5" />;
                    case 'apartment': return <Building className="h-3.5 w-3.5" />;
                    case 'villa': return <Sparkles className="h-3.5 w-3.5" />;
                    case 'studio': return <Bed className="h-3.5 w-3.5" />;
                    case 'office': return <Briefcase className="h-3.5 w-3.5" />;
                    case 'other': return <Layers className="h-3.5 w-3.5" />;
                    default: return <Compass className="h-3.5 w-3.5" />;
                  }
                };

                return (
                  <button
                    key={type}
                    id={`filter-type-${type}`}
                    onClick={() => setSelectedType(type)}
                    className={`px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedType === type
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-800'
                    }`}
                  >
                    {getIcon()}
                    <span>{getTranslatedTypeName(type)}</span>
                  </button>
                );
              })}

              {/* Detailed Filter Toggle Button */}
              <button
                id="filter-details-toggle"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition-all ${
                  showFilters || selectedAmenities.length > 0 || maxPrice < 3000 || minPrice > 0 || minBeds > 0 || minBaths > 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline font-bold">
                  {language === 'en' ? 'Advanced Filters' : 'ተጨማሪ ማጣሪያዎች'}
                </span>
                {(selectedAmenities.length > 0 || maxPrice < 3000 || minPrice > 0 || minBeds > 0 || minBaths > 0) && (
                  <span className="bg-emerald-600 text-white h-4 px-1.5 rounded-full text-[10px] flex items-center justify-center font-bold">
                    {selectedAmenities.length + (maxPrice < 3000 ? 1 : 0) + (minPrice > 0 ? 1 : 0) + (minBeds > 0 ? 1 : 0) + (minBaths > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Informative Search Help Tag */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
          <span className="text-gray-700 dark:text-slate-300 font-extrabold font-sans text-xs">
            {language === 'en' ? 'Search Anything:' : 'የፍለጋ አማራጮች:'}
          </span>
          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-100 dark:border-emerald-900/60">ID</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">"listing_1"</span>
          <span className="text-slate-350 dark:text-slate-600">|</span>
          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-100 dark:border-emerald-900/60">Location</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">"Malibu"</span>
          <span className="text-slate-350 dark:text-slate-600">|</span>
          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-100 dark:border-emerald-900/60">Price</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">"$450"</span>
          <span className="text-slate-350 dark:text-slate-600">|</span>
          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-100 dark:border-emerald-900/60">Amenities</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">"Pool"</span>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showFilters && (
          <div className="border-t border-gray-100 dark:border-slate-800 pt-5 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn" id="advanced-filters-panel">
            
            {/* Price Sliders */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider font-sans">
                {language === 'en' ? 'Price Range (Per Night)' : 'የኪራይ መጠን (በሌሊት)'}
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-slate-400">{language === 'en' ? 'Min Price' : 'አነስተኛ ዋጋ'}</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">${minPrice}</span>
                </div>
                <input
                  id="min-price-slider"
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-slate-400">{language === 'en' ? 'Max Price' : 'ከፍተኛ ዋጋ'}</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">${maxPrice}</span>
                </div>
                <input
                  id="price-range-slider"
                  type="range"
                  min="100"
                  max="3000"
                  step="25"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>

            {/* Beds and Baths selectors */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider font-sans">
                {language === 'en' ? 'Capacity Filters' : 'የክፍሎች ብዛት ማጣሪያ'}
              </h4>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 block">{language === 'en' ? 'Minimum Bedrooms' : 'አነስተኛ የመኝታ ክፍል'}</label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((bedsNum) => (
                    <button
                      key={bedsNum}
                      type="button"
                      onClick={() => setMinBeds(bedsNum)}
                      className={`py-1.5 text-xs rounded-lg border font-sans font-semibold transition-all cursor-pointer ${
                        minBeds === bedsNum
                          ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-700'
                          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                      }`}
                    >
                      {bedsNum === 0 ? (language === 'en' ? 'Any' : 'ሁሉም') : `${bedsNum}+`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 block">{language === 'en' ? 'Minimum Bathrooms' : 'አነስተኛ መታጠቢያ ቤት'}</label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((bathsNum) => (
                    <button
                      key={bathsNum}
                      type="button"
                      onClick={() => setMinBaths(bathsNum)}
                      className={`py-1.5 text-xs rounded-lg border font-sans font-semibold transition-all cursor-pointer ${
                        minBaths === bathsNum
                          ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-700'
                          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                      }`}
                    >
                      {bathsNum === 0 ? (language === 'en' ? 'Any' : 'ሁሉም') : `${bathsNum}+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amenities Selectors */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider font-sans block mb-2.5">
                  {language === 'en' ? 'Verified Amenities' : 'ምቹ ነገሮች'}
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {allAmenities.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        id={`amenity-chip-${amenity.replace(/\s+/g, '-')}`}
                        onClick={() => toggleAmenity(amenity)}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-sans flex items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-medium'
                            : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
                        <span>{getTranslatedAmenity(amenity)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end items-center space-x-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                id="clear-filters-btn"
                onClick={clearFilters}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {language === 'en' ? 'Clear All Filters' : 'ሁሉንም አጽዳ'}
              </button>
              <button
                id="close-filters-btn"
                onClick={() => setShowFilters(false)}
                className="bg-gray-900 dark:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                {language === 'en' ? 'Apply & Close' : 'አረጋግጥ እና ዝጋ'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listing Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-xl font-sans font-extrabold text-gray-900 dark:text-white">
            {filteredListings.length === 0 
              ? (language === 'en' ? 'No Properties Match' : 'ምንም የሚስማማ ቤት አልተገኘም') 
              : (language === 'en' ? `Available Spaces (${filteredListings.length})` : `ለመከራየት ዝግጁ የሆኑ ቤቶች (${filteredListings.length})`)}
          </h2>
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle Group */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-850 p-1 rounded-xl border border-gray-150 dark:border-slate-800">
              <button
                type="button"
                id="view-toggle-grid"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-bold cursor-pointer transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'Grid' : 'ሰንጠረዥ'}</span>
              </button>
              <button
                type="button"
                id="view-toggle-map"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-bold cursor-pointer transition-all ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'Map' : 'ካርታ'}</span>
              </button>
            </div>

            <span className="text-xs font-mono text-gray-400 dark:text-slate-500 hidden sm:inline">
              {language === 'en' ? 'Sort: Recommended' : 'ደረጃ: የተመረጡ'}
            </span>
          </div>
        </div>

        {filteredListings.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="listings-grid">
              {filteredListings.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => onSelectProperty(property)}
                />
              ))}
            </div>
          ) : (
            <div className="w-full animate-fadeIn" id="listings-map-container">
              <PropertyMap
                properties={filteredListings}
                onSelectProperty={onSelectProperty}
              />
            </div>
          )
        ) : (
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4" id="empty-search-state">
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full inline-block text-gray-400 dark:text-slate-500">
              <Compass className="h-8 w-8" />
            </div>
            <h3 className="font-sans font-bold text-gray-800 dark:text-white text-lg">{language === 'en' ? 'No properties found' : 'ምንም ቤቶች አልተገኙም'}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              {language === 'en'
                ? "We couldn't find any premium properties matching your exact filter parameters. Try removing some amenities or broadening your search range."
                : "ማጣሪያውን የሚያሟላ ቤት አልተገኘም። እባክዎ ተጨማሪ ማጣሪያዎችን ወይም የምቾት ነገሮች ምርጫን በመቀነስ እንደገና ይሞክሩ።"}
            </p>
            <button
              id="empty-reset-filters-btn"
              onClick={clearFilters}
              className="bg-emerald-600 dark:bg-emerald-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-xs transition-colors"
            >
              {language === 'en' ? 'Reset Search Parameters' : 'የፍለጋ ማጣሪያውን አስተካክል'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
