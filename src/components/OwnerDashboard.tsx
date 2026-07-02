import React, { useState, useMemo } from 'react';
import { PropertyListing, Booking, AppUser } from '../types';
import { 
  TrendingUp, DollarSign, CalendarCheck2, LayoutGrid, PlusCircle, CheckCircle, XCircle, 
  Trash2, Image, Sparkles, Building, Bed, Bath, Plus, MapPin, RefreshCw, Upload, FileSignature
} from 'lucide-react';
import { ContractAgreementModal } from './ContractAgreementModal';
import { useAppContext } from '../lib/AppContext';

interface OwnerDashboardProps {
  listings: PropertyListing[];
  bookings: Booking[];
  onCreateListing: (listingData: Omit<PropertyListing, 'id' | 'rating' | 'reviewsCount'>) => Promise<PropertyListing>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => Promise<void>;
  onUpdateBookingContract?: (
    bookingId: string, 
    contractFields: Partial<Pick<Booking, 'contractPdfName' | 'contractPdfData' | 'contractStatus' | 'contractSignedByRenter' | 'contractSignedByOwner' | 'contractLastUpdated'>>
  ) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
  currentUser: AppUser;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  listings,
  bookings,
  onCreateListing,
  onDeleteListing,
  onUpdateBookingStatus,
  onUpdateBookingContract,
  loading,
  onRefresh,
  currentUser,
}) => {
  const { language, activeTenant } = useAppContext();
  // Tabs: 'stats' | 'listings' | 'bookings' | 'add' | 'maintenance'
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'listings' | 'bookings' | 'add' | 'maintenance'>('stats');
  const [activeContractBooking, setActiveContractBooking] = useState<Booking | null>(null);

  // AI Tenant Background Screening & Maintenance States
  const [backgroundChecks, setBackgroundChecks] = useState<any[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [screeningLoading, setScreeningLoading] = useState<string | null>(null); // bookingId
  const [isUpdatingMaint, setIsUpdatingMaint] = useState<string | null>(null); // request.id

  const loadOwnerData = async () => {
    try {
      const tenantId = activeTenant?.id || 'active';
      const [bgRes, maintRes] = await Promise.all([
        fetch('/api/background-checks', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/maintenance', { headers: { 'x-tenant-id': tenantId } })
      ]);
      if (bgRes.ok) setBackgroundChecks(await bgRes.json());
      if (maintRes.ok) setMaintenanceRequests(await maintRes.json());
    } catch (err) {
      console.error("Failed to load owner's AI dashboard data:", err);
    }
  };

  React.useEffect(() => {
    loadOwnerData();
  }, [activeTenant]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'house' | 'apartment' | 'villa' | 'studio' | 'office' | 'other'>('apartment');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState<number>(150);
  const [beds, setBeds] = useState<number>(2);
  const [baths, setBaths] = useState<number>(2);
  
  // High-quality category-specific default images
  const CATEGORY_DEFAULT_IMAGES = {
    apartment: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    villa: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
    house: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    studio: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
    office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    other: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
  };

  const [imageUrl, setImageUrl] = useState(CATEGORY_DEFAULT_IMAGES.apartment);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [customAmenity, setCustomAmenity] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Fast Wi-Fi', 'AC', 'Workspace']);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Curated list of premium royalty-free images to let user auto-fill
  const PRESET_IMAGES = [
    { name: "Modern Villa", url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80" },
    { name: "Nordic House", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80" },
    { name: "Chic Apartment", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80" },
    { name: "Cosy Studio", url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80" },
    { name: "Luxury Estate", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80" },
    { name: "Traditional House", url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80" },
    { name: "Urban Loft", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80" },
    { name: "Modern Penthouse", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80" }
  ];

  // Calculate Owner Analytics (Filtered for currentUser's email or listings owned by this owner)
  const ownerListings = useMemo(() => {
    const userOwned = listings.filter(l => l.ownerId === currentUser.email);
    const defaults = listings.filter(l => l.ownerId === 'host.premium@luxerent.com' || l.ownerId === 'owner_default');
    return [...userOwned, ...defaults];
  }, [listings, currentUser.email]);

  const ownerListingIds = useMemo(() => {
    return new Set(ownerListings.map(l => l.id));
  }, [ownerListings]);

  const ownerBookings = useMemo(() => {
    return bookings.filter(b => ownerListingIds.has(b.listingId));
  }, [bookings, ownerListingIds]);

  const stats = useMemo(() => {
    const totalEarnings = ownerBookings
      .filter(b => b.paymentStatus === 'paid' && b.status !== 'declined' && b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const approvedCount = ownerBookings.filter(b => b.status === 'approved').length;
    const totalCount = ownerBookings.length;
    
    const occupancyRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    return {
      totalEarnings,
      occupancyRate,
      totalBookings: totalCount,
      activeListingsCount: ownerListings.length
    };
  }, [ownerBookings, ownerListings]);

  const handleAddAmenity = () => {
    if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
      setAmenities([...amenities, customAmenity.trim()]);
      setCustomAmenity('');
    }
  };

  const handleRemoveAmenity = (name: string) => {
    setAmenities(amenities.filter(a => a !== name));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim() || !imageUrl.trim()) {
      setFormError(language === 'en' ? 'Please fill out all mandatory fields (Title, Description, Location, Image URL)' : 'እባክዎ ሁሉንም ግዴታ የሆኑ ክፍሎችን ይሙሉ (ርዕስ፣ መግለጫ፣ አድራሻ፣ ምስል)');
      return;
    }
    if (price <= 0) {
      setFormError(language === 'en' ? 'Price must be greater than $0' : 'ዋጋው ከ 0 ዶላር በላይ መሆን አለበት');
      return;
    }

    setFormError('');
    try {
      await onCreateListing({
        title,
        description,
        type,
        location,
        price,
        beds,
        baths,
        image: imageUrl,
        amenities,
        ownerId: currentUser.email,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined
      });
      
      setFormSuccess(true);
      setTitle('');
      setDescription('');
      setLocation('');
      setPrice(150);
      setBeds(2);
      setBaths(2);
      setImageUrl(CATEGORY_DEFAULT_IMAGES.apartment);
      setLatitude('');
      setLongitude('');
      setAmenities(['Fast Wi-Fi', 'AC', 'Workspace']);
      
      setTimeout(() => {
        setFormSuccess(false);
        setActiveSubTab('listings');
      }, 1500);
    } catch (err) {
      setFormError(language === 'en' ? 'Failed to publish listing. Please try again.' : 'ቤቱን ለመመዝገብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    }
  };

  const getTranslatedStatus = (status: Booking['status']) => {
    if (language === 'am') {
      switch (status) {
        case 'approved': return 'የጸደቀ ✓';
        case 'pending': return 'በመጠባበቅ ላይ';
        case 'declined': return 'ያልተቀበሉት';
        case 'cancelled': return 'የተሰረዘ';
        default: return status;
      }
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6" id="owner-dashboard-container">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">
            {language === 'en' ? 'Host Management Suite' : 'የአከራይ መቆጣጠሪያ ማዕከል'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-sans mt-0.5">
            {language === 'en'
              ? 'Control properties, approve guest schedules, and monitor marketplace performance.'
              : 'ቤቶችዎን ይቆጣጠሩ፣ የተከራዮች ቀጠሮዎችን ያጽድቁ፣ እና አጠቃላይ ገቢዎን ይከታተሉ።'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="owner-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-600 dark:text-slate-300 disabled:opacity-50 cursor-pointer transition-all"
            title="Refresh database"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="subtab-toggle-add"
            onClick={() => setActiveSubTab('add')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'en' ? 'List New Property' : 'አዲስ ቤት ይመዝግብ'}</span>
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 pb-px" id="owner-sub-tabs">
        <button
          id="btn-subtab-stats"
          onClick={() => setActiveSubTab('stats')}
          className={`px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'stats'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'en' ? 'Performance Stats' : 'የአፈጻጸም መረጃ'}
        </button>
        <button
          id="btn-subtab-listings"
          onClick={() => setActiveSubTab('listings')}
          className={`px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'listings'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'en' ? `My Listings (${ownerListings.length})` : `የእኔ ቤቶች (${ownerListings.length})`}
        </button>
        <button
          id="btn-subtab-bookings"
          onClick={() => setActiveSubTab('bookings')}
          className={`px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'bookings'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'en' ? `Guest Stays Queue (${ownerBookings.length})` : `የተከራዮች ወረፋ (${ownerBookings.length})`}
        </button>
        <button
          id="btn-subtab-maintenance"
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'maintenance'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'en' ? `Maintenance & Dispatch (${maintenanceRequests.length})` : `ጥገና እና መላኪያ (${maintenanceRequests.length})`}
        </button>
      </div>

      {/* SUB-TAB: STATS INDEX */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6" id="subtab-panel-stats">
          {/* Bento Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs flex items-center space-x-4 transition-colors">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Total Earnings' : 'ጠቅላላ ገቢ'}</span>
                <span className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">${stats.totalEarnings}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs flex items-center space-x-4 transition-colors">
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Occupancy Rate' : 'የመከራየት ፍጥነት'}</span>
                <span className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">{stats.occupancyRate}%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs flex items-center space-x-4 transition-colors">
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50">
                <CalendarCheck2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Total Bookings' : 'ጠቅላላ የተያዙ'}</span>
                <span className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">{stats.totalBookings}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs flex items-center space-x-4 transition-colors">
              <div className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Active Listings' : 'ንቁ የሆኑ ቤቶች'}</span>
                <span className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">{stats.activeListingsCount}</span>
              </div>
            </div>
          </div>

          {/* Quick guide card */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="h-40 w-40" />
            </div>
            <div className="max-w-xl space-y-2">
              <h4 className="font-sans font-extrabold text-base flex items-center gap-2 text-emerald-400">
                <Sparkles className="h-5 w-5" /> {language === 'en' ? 'Quick Hosting Tip' : 'ፈጣን የአከራይ ምክር'}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {language === 'en' 
                  ? 'Add premium amenities like "Infinity Pool" or "Chef\'s Kitchen" to elevate your visibility score. Listings with verified, rich amenities generate up to 45% more booking traffic!'
                  : 'የእይታ ነጥብዎን ከፍ ለማድረግ እንደ "ዋና ገንዳ" ወይም "የላቀ ማብሰያ ክፍል" ያሉ ምቹ ነገሮችን ያክሉ። በርካታ ምቹ ነገሮች ያሏቸው ቤቶች እስከ 45% የበለጠ ተከራዮችን ይስባሉ!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: MY LISTINGS GRID */}
      {activeSubTab === 'listings' && (
        <div className="space-y-4" id="subtab-panel-listings">
          {ownerListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownerListings.map((property) => (
                <div 
                  key={property.id} 
                  id={`owner-property-card-${property.id}`}
                  className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-gray-50 dark:bg-slate-800">
                    <img src={property.image} alt={property.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <button
                      id={`btn-delete-${property.id}`}
                      onClick={async () => {
                        const deleteConfirm = language === 'en'
                          ? 'Are you absolutely sure you want to remove this property listing from the live rental network?'
                          : 'ይህንን ቤት ከኪራይ ዝርዝር ውስጥ ሙሉ በሙሉ ለማስወገድ እርግጠኛ ነዎት?';
                        if (window.confirm(deleteConfirm)) {
                          await onDeleteListing(property.id);
                        }
                      }}
                      className="absolute top-3 right-3 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-gray-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-850 transition-colors cursor-pointer"
                      title="Remove Property"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur-xs text-white text-[10px] font-sans font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {language === 'en' 
                        ? property.type 
                        : (property.type === 'house' ? 'ቤት' 
                           : property.type === 'apartment' ? 'አፓርታማ' 
                           : property.type === 'villa' ? 'ቪላ' 
                           : property.type === 'studio' ? 'ስቱዲዮ' 
                           : property.type === 'office' ? 'ቢሮ' 
                           : 'ሌላ')}
                    </span>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <h4 className="font-sans font-bold text-gray-900 dark:text-white text-base leading-snug truncate">{property.title}</h4>
                    <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 font-sans">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-slate-500" />
                      <span>{property.location}</span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-gray-50 dark:border-slate-800">
                      <span className="text-sm font-sans font-bold text-gray-900 dark:text-white">${property.price} / {language === 'en' ? 'night' : 'ሌሊት'}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">★ {property.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-sm mx-auto transition-colors">
              <Building className="h-10 w-10 text-gray-400 dark:text-slate-600 mx-auto" />
              <h4 className="font-sans font-bold text-gray-800 dark:text-white text-base">{language === 'en' ? 'No active listings' : 'ምንም የቤት ምዝገባ የለም'}</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {language === 'en' 
                  ? "You haven't listed any real-estate properties for rental yet. Get started by clicking list below." 
                  : "እስካሁን ምንም ቤት አላስመዘገቡም። ከታች ያለውን ቁልፍ በመጫን የመጀመሪያዎን ቤት ያስመዝግቡ።"}
              </p>
              <button
                id="empty-listings-create-btn"
                onClick={() => setActiveSubTab('add')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                {language === 'en' ? 'List My First Property' : 'የመጀመሪያ ቤቴን አስመዝግብ'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: GUEST STAYS QUEUE */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-4" id="subtab-panel-bookings">
          {ownerBookings.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-850 border-b border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                      <th className="p-4">{language === 'en' ? 'Listing Space' : 'የቤት ርዕስ'}</th>
                      <th className="p-4">{language === 'en' ? 'Guest / Renter' : 'ተከራይ ስም'}</th>
                      <th className="p-4">{language === 'en' ? 'Stay Period' : 'የቆይታ ጊዜ'}</th>
                      <th className="p-4">{language === 'en' ? 'Paid Total' : 'ጠቅላላ የተከፈለ'}</th>
                      <th className="p-4">{language === 'en' ? 'State Status' : 'ሁኔታ'}</th>
                      <th className="p-4">{language === 'en' ? 'Lease Contract' : 'የኪራይ ውል'}</th>
                      <th className="p-4">{language === 'en' ? 'Tenant Vetting (AI)' : 'የተከራይ ዳራ ፍተሻ (AI)'}</th>
                      <th className="p-4 text-right">{language === 'en' ? 'Approval controls' : 'የማጽደቂያ መቆጣጠሪያ'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-sm">
                    {ownerBookings.map((booking) => (
                      <tr key={booking.id} id={`owner-queue-row-${booking.id}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-sans font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                          {booking.listingTitle}
                        </td>
                        <td className="p-4">
                          <span className="font-sans font-medium text-gray-800 dark:text-slate-300">{booking.renterName}</span>
                        </td>
                        <td className="p-4 font-sans text-xs text-gray-500 dark:text-slate-400">
                          {booking.startDate} &rarr; {booking.endDate} <span className="block font-mono text-[10px]">({booking.nights} {language === 'en' ? 'nights' : 'ሌሊት'})</span>
                        </td>
                        <td className="p-4">
                          <span className="font-sans font-bold text-gray-900 dark:text-white">${booking.totalPrice}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                            booking.status === 'approved' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40'
                              : booking.status === 'pending'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40 animate-pulse'
                                : booking.status === 'declined'
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40'
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                          }`}>
                            {getTranslatedStatus(booking.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          {booking.status !== 'cancelled' && booking.status !== 'declined' && onUpdateBookingContract ? (
                            <button
                              id={`owner-contract-btn-${booking.id}`}
                              onClick={() => setActiveContractBooking(booking)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1 cursor-pointer transition-all border ${
                                booking.contractStatus === 'fully_signed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-850 hover:bg-emerald-100'
                                  : booking.contractStatus === 'pending_owner_signature'
                                    ? 'bg-amber-500 text-white border-transparent hover:bg-amber-600 shadow-xs'
                                    : booking.contractStatus === 'pending_renter_signature'
                                      ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 border-sky-100 dark:border-sky-900/50 hover:bg-sky-100'
                                      : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-emerald-700 border-transparent shadow-xs'
                              }`}
                            >
                              <FileSignature className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <span>
                                {booking.contractStatus === 'fully_signed'
                                  ? (language === 'en' ? 'Active ✓' : 'ጸንቷል ✓')
                                  : booking.contractStatus === 'pending_owner_signature'
                                    ? (language === 'en' ? 'Sign Contract' : 'ፈርም')
                                    : booking.contractStatus === 'pending_renter_signature'
                                      ? (language === 'en' ? 'Sent to Guest' : 'ለእንግዳ ተልኳል')
                                      : (language === 'en' ? 'Manage Agreement' : 'ውል አስተዳድር')}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500 font-sans italic">&mdash;</span>
                          )}
                        </td>
                        <td className="p-4">
                          {(() => {
                            const bg = backgroundChecks.find(c => c.bookingId === booking.id);
                            if (bg) {
                              return (
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                                    bg.status === 'approved'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40'
                                      : bg.status === 'low_risk'
                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40 animate-pulse'
                                  }`}>
                                    Risk: {bg.riskScore}/100 ({bg.status.replace('_', ' ')})
                                  </span>
                                  <p className="text-[10px] text-gray-500 max-w-[150px] truncate" title={bg.reportSummary}>{bg.reportSummary}</p>
                                </div>
                              );
                            }

                            const isLoading = screeningLoading === booking.id;
                            return (
                              <button
                                onClick={async () => {
                                  try {
                                    setScreeningLoading(booking.id);
                                    const res = await fetch('/api/background-check/run', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-tenant-id': activeTenant?.id || 'active'
                                      },
                                      body: JSON.stringify({
                                        bookingId: booking.id,
                                        renterEmail: booking.renterId
                                      })
                                    });
                                    if (res.ok) {
                                      await loadOwnerData();
                                    } else {
                                      alert("Background screening service temporarily offline.");
                                    }
                                  } catch (err) {
                                    console.error("Failed to run screening:", err);
                                  } finally {
                                    setScreeningLoading(null);
                                  }
                                }}
                                disabled={isLoading}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-bold font-sans flex items-center gap-1 cursor-pointer transition-all border-0 shadow-xs"
                              >
                                {isLoading ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Vetting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3 text-amber-400" />
                                    <span>Screen Tenant</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-right">
                          {booking.status === 'pending' ? (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                id={`queue-decline-${booking.id}`}
                                onClick={async () => {
                                  if (window.confirm(language === 'en' ? 'Reject this reservation stay?' : 'ይህንን የተያዘ ቦታ አይቀበሉም?')) {
                                    await onUpdateBookingStatus(booking.id, 'declined');
                                  }
                                }}
                                className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200/50 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Reject Request"
                              >
                                <XCircle className="h-4.5 w-4.5" />
                              </button>
                              <button
                                id={`queue-approve-${booking.id}`}
                                onClick={async () => {
                                  await onUpdateBookingStatus(booking.id, 'approved');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                                title="Approve Request"
                              >
                                <CheckCircle className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">{language === 'en' ? 'Processed' : 'ተከናውኗል'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-sm mx-auto transition-colors">
              <CalendarCheck2 className="h-10 w-10 text-gray-400 dark:text-slate-600 mx-auto" />
              <h4 className="font-sans font-bold text-gray-800 dark:text-white text-base">{language === 'en' ? 'Stay requests queue empty' : 'ምንም የቆይታ ጥያቄዎች የሉም'}</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">{language === 'en' ? "Guests haven't requested bookings on your active properties yet." : 'እስካሁን በእርስዎ ቤቶች ላይ ጥያቄ ያቀረበ እንግዳ የለም።'}</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: PUBLISH NEW LISTING */}
      {activeSubTab === 'add' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs max-w-2xl mx-auto transition-colors" id="subtab-panel-publish">
          <div className="border-b border-gray-100 dark:border-slate-800 p-5 flex justify-between items-center bg-slate-50 dark:bg-slate-850 rounded-t-3xl transition-colors">
            <div>
              <h3 className="font-sans font-bold text-gray-900 dark:text-white text-base">{language === 'en' ? 'New Property Publication Wizard' : 'አዲስ ቤት መመዝገቢያ ማውጫ'}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-sans mt-0.5">{language === 'en' ? 'Publish your luxury spaces to the marketplace networks instantly.' : 'የሚያምረውን ቤትዎን ወዲያውኑ ለገበያ ያቅርቡ።'}</p>
            </div>
            <PlusCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            
            {formSuccess && (
              <div id="publish-success-message" className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'en' ? 'Listing published live to networks successfully!' : 'ቤትዎ በተሳካ ሁኔታ ተመዝግቧል!'}</span>
              </div>
            )}

            {formError && (
              <div id="publish-error-message" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 p-4 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Core Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="publish-title" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Property Title *' : 'የቤት ርዕስ *'}</label>
                <input
                  id="publish-title"
                  type="text"
                  required
                  placeholder={language === 'en' ? "e.g. Architectural Cliffside Villa" : "ለምሳሌ፡ ቪላ ቤት አያት ሪል እስቴት"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-type" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Property Category' : 'የቤት ዓይነት'}</label>
                <select
                  id="publish-type"
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as 'house' | 'apartment' | 'villa' | 'studio' | 'office' | 'other';
                    setType(newType);
                    // Automatically pre-fill the sample image if the image URL is empty or is currently one of the default category images
                    const defaults = Object.values(CATEGORY_DEFAULT_IMAGES);
                    if (!imageUrl || defaults.includes(imageUrl)) {
                      setImageUrl(CATEGORY_DEFAULT_IMAGES[newType]);
                    }
                  }}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 capitalize"
                >
                  <option value="apartment">{language === 'en' ? 'apartment' : 'አፓርታማ'}</option>
                  <option value="villa">{language === 'en' ? 'villa' : 'ቪላ'}</option>
                  <option value="house">{language === 'en' ? 'house' : 'ቤት'}</option>
                  <option value="studio">{language === 'en' ? 'studio' : 'ስቱዲዮ'}</option>
                  <option value="office">{language === 'en' ? 'office' : 'ቢሮ'}</option>
                  <option value="other">{language === 'en' ? 'other' : 'ሌላ'}</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="publish-description" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Property Description *' : 'የቤት መግለጫ *'}</label>
                <textarea
                  id="publish-description"
                  required
                  rows={3}
                  placeholder={language === 'en' ? "Tell potential guests what makes this listing unique and distinct." : "ስለ ቤቱ ምቾት እና ልዩ መገለጫዎች በዝርዝር ይጻፉ።"}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-location" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Location Address *' : 'የቤት አድራሻ (ሰፈር) *'}</label>
                <input
                  id="publish-location"
                  type="text"
                  required
                  placeholder={language === 'en' ? "e.g. Aspen, Colorado" : "ለምሳሌ፡ ቦሌ፣ አዲስ አበባ"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-latitude" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Latitude (Optional)' : 'ላትቲውድ (አማራጭ)'}</label>
                <input
                  id="publish-latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 34.0259"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-longitude" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Longitude (Optional)' : 'ሎንግቲውድ (አማራጭ)'}</label>
                <input
                  id="publish-longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. -118.7798"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-price" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Rent Price (USD / night) *' : 'የኪራይ ዋጋ (በሌሊት ዶላር) *'}</label>
                <input
                  id="publish-price"
                  type="number"
                  required
                  min="10"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-beds" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Beds count' : 'የመኝታ ክፍል ብዛት'}</label>
                <input
                  id="publish-beds"
                  type="number"
                  min="1"
                  value={beds}
                  onChange={(e) => setBeds(Number(e.target.value))}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="publish-baths" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Baths count' : 'የመታጠቢያ ክፍል ብዛት'}</label>
                <input
                  id="publish-baths"
                  type="number"
                  min="1"
                  step="0.5"
                  value={baths}
                  onChange={(e) => setBaths(Number(e.target.value))}
                  className="w-full mt-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                />
              </div>
            </div>

            {/* Image select helper */}
            <div className="space-y-3">
              <div>
                <label htmlFor="publish-image-url" className="text-xs font-semibold text-gray-600 dark:text-slate-350 block">{language === 'en' ? 'Cover Image URL *' : 'የፊት ምስል አድራሻ (URL) *'}</label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                  <input
                    id="publish-image-url"
                    type="text"
                    required
                    placeholder="https://images.unsplash.com/photo-... or select a local file"
                    value={imageUrl.startsWith('data:image/') ? '[Local Uploaded Image]' : imageUrl}
                    onChange={(e) => {
                      if (!e.target.value.startsWith('[Local')) {
                        setImageUrl(e.target.value);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950"
                  />
                  <label className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-850 border border-emerald-200 dark:border-emerald-800 rounded-xl font-sans font-medium text-xs cursor-pointer transition-all shrink-0">
                    <Upload className="h-4 w-4" />
                    <span>{language === 'en' ? 'Upload Local File' : 'ፋይል ከኮምፒውተርህ ስቀል'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setImageUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {imageUrl.startsWith('data:image/') && (
                  <div className="mt-2 flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium font-mono truncate max-w-[80%]">{language === 'en' ? 'Local image loaded successfully!' : 'ምስሉ በተሳካ ሁኔታ ተጭኗል!'}</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      {language === 'en' ? 'Clear' : 'አጽዳ'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Presets picker */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Or Quick Select Curated Preset Image:' : 'ወይም ከተመረጡ ምስሎች ውስጥ በፍጥነት ይምረጡ፡'}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      id={`btn-preset-${img.name.toLowerCase().replace(/\s+/g, '-')}`}
                      type="button"
                      onClick={() => setImageUrl(img.url)}
                      className={`p-1.5 rounded-lg border text-left flex items-center space-x-2 cursor-pointer transition-all ${
                        imageUrl === img.url
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Image className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-sans font-medium truncate">{img.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amenities Creator */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-350 block">{language === 'en' ? 'List of Amenities' : 'የምቾት ዕቃዎች ዝርዝር'}</label>
              <div className="flex gap-2">
                <input
                  id="publish-amenity-input"
                  type="text"
                  placeholder={language === 'en' ? "e.g. Ocean View, Smart TV, Chef Kitchen" : "ለምሳሌ፡ ዋይፋይ፣ የመኪና ማቆሚያ..."}
                  value={customAmenity}
                  onChange={(e) => setCustomAmenity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(); } }}
                  className="flex-grow px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  id="add-amenity-btn"
                  type="button"
                  onClick={handleAddAmenity}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
                >
                  {language === 'en' ? 'Add' : 'አክል'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {amenities.map((amenity, idx) => (
                  <span key={idx} className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-xs font-sans px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span>{amenity}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAmenity(amenity)}
                      className="hover:text-rose-600 text-gray-400 dark:text-slate-500 font-bold focus:outline-hidden"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Submit btn */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                id="submit-new-listing"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-extrabold text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer transition-colors"
              >
                {language === 'en' ? 'Publish Listing' : 'ቤት አስመዝግብ'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* SUB-TAB: MAINTENANCE DISPATCH LISTINGS */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-6" id="subtab-panel-maintenance">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-5 border border-gray-100 dark:border-slate-800 rounded-3xl">
            <div>
              <h3 className="font-sans font-extrabold text-gray-900 dark:text-white text-base">
                {language === 'en' ? 'AI Contractor Routing Console' : 'የአርቴፊሻል ኢንተለጀንስ የጥገና መላኪያ ማዕከል'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-sans mt-0.5">
                {language === 'en'
                  ? 'Active property repairs are automatically routed by trade classification with calculated General Ledger impact.'
                  : 'የቤት ጥገና ጥያቄዎች በክፍል ተለይተው በቀጥታ ለባለሙያዎች ይላካሉ፤ የፋይናንስ መዝገብ ላይም ወዲያው ይከተባሉ።'}
              </p>
            </div>
          </div>

          {maintenanceRequests.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {maintenanceRequests.map((req) => (
                <div key={req.id} id={`maint-card-${req.id}`} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-sm transition-all space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-gray-50 dark:border-slate-800/60 pb-4">
                    <div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold block">CASE #{req.id.substring(0, 8).toUpperCase()}</span>
                      <h4 className="font-sans font-bold text-gray-900 dark:text-white text-base mt-1">{req.listingTitle || 'Rental Property'}</h4>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{language === 'en' ? 'Reported by' : 'ሪፖርት ያደረገው'} {req.renterEmail}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        req.aiPriority === 'Urgent'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40 animate-pulse'
                          : req.aiPriority === 'High'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40'
                      }`}>
                        Priority: {req.aiPriority || 'Medium'}
                      </span>

                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                        Trade: {req.aiTradeClass || 'General 🔨'}
                      </span>

                      <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        req.status === 'resolved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100'
                          : req.status === 'in_progress'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Issue Reported:' : 'ያጋጠመው ችግር፡'}</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{req.issueDescription}</p>

                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800 rounded-2xl space-y-1.5">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-sans font-extrabold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" />
                          {language === 'en' ? 'Gemini Autonomous Contractor Dispatch Guide' : 'የጌሚኒ ራስ-ሰር የጥገና ባለሙያ መመሪያ'}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium">{req.aiRoutingReason}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Estimated Ledger Cost' : 'የሂሳብ መዝገብ የተገመተ ዋጋ'}</span>
                        <span className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">${req.estimatedCost || '0.00'}</span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans leading-normal">
                          ✓ {language === 'en' ? 'Debited to Maintenance Account' : 'በጥገና ወጪ መዝገብ ላይ ተመዝግቧል'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80 mt-4 space-y-2">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-sans font-bold block">{language === 'en' ? 'Update Repair Status' : 'የጥገና ደረጃን አዘምን'}</span>
                        <div className="flex gap-1.5">
                          {['reported', 'in_progress', 'resolved'].map((st) => (
                            <button
                              key={st}
                              onClick={async () => {
                                try {
                                  setIsUpdatingMaint(req.id);
                                  const res = await fetch(`/api/maintenance/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-tenant-id': activeTenant?.id || 'active'
                                    },
                                    body: JSON.stringify({ status: st })
                                  });
                                  if (res.ok) {
                                    await loadOwnerData();
                                  } else {
                                    alert("Unable to update maintenance status.");
                                  }
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setIsUpdatingMaint(null);
                                }
                              }}
                              disabled={isUpdatingMaint === req.id}
                              className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider font-sans cursor-pointer transition-all ${
                                req.status === st
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-extrabold'
                                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                              }`}
                            >
                              {st.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-sm mx-auto transition-colors">
              <RefreshCw className="h-10 w-10 text-gray-400 dark:text-slate-600 mx-auto animate-pulse" />
              <h4 className="font-sans font-bold text-gray-800 dark:text-white text-base">{language === 'en' ? 'No reported maintenance tickets' : 'ምንም የጥገና ጥያቄ የለም'}</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">{language === 'en' ? "Tenants have not flagged any broken utilities or requests yet." : "እስካሁን ተከራዮች ያስገቡት የጥገና ጥያቄ የለም።"}</p>
            </div>
          )}
        </div>
      )}

      {activeContractBooking && onUpdateBookingContract && (
        <ContractAgreementModal
          booking={activeContractBooking}
          listing={listings.find(l => l.id === activeContractBooking.listingId)}
          userRole="owner"
          onClose={() => setActiveContractBooking(null)}
          onUpdateContract={async (bookingId, contractFields) => {
            await onUpdateBookingContract(bookingId, contractFields);
            setActiveContractBooking(prev => prev ? { ...prev, ...contractFields } : null);
          }}
        />
      )}
    </div>
  );
};
