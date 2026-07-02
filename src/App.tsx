import { useState, useEffect } from 'react';
import { PropertyListing, Booking, AppUser } from './types';
import { Navbar } from './components/Navbar';
import { ListingExplorer } from './components/ListingExplorer';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import { CheckoutPaymentModal } from './components/CheckoutPaymentModal';
import { RenterDashboard } from './components/RenterDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { EnterpriseHub } from './components/EnterpriseHub';
import { AuthPage } from './components/AuthPage';
import { 
  getAllListings, 
  createListing, 
  deleteListing, 
  getBookingsByRenter, 
  getBookingsByOwner, 
  createBooking, 
  createPaymentRecord, 
  updateBookingStatus,
  updateBookingContract
} from './lib/firebase';
import { ShieldCheck, Heart, KeyRound } from 'lucide-react';
import { useAppContext } from './lib/AppContext';

export default function App() {
  const { language, theme, t } = useAppContext();
  // Navigation & Auth State

  const [currentTab, setCurrentTab] = useState<'explore' | 'renter-dashboard' | 'owner-dashboard' | 'enterprise' | 'auth'>('explore');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem('renthub_user');
    return stored ? JSON.parse(stored) : null;
  });

  // DB Collections State
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Active Interactive Modal States
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [checkoutDetails, setCheckoutDetails] = useState<{
    property: PropertyListing;
    startDate: string;
    endDate: string;
    nights: number;
    totalPrice: number;
  } | null>(null);

  // Fetch Listings on Mount
  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const data = await getAllListings();
      setListings(data);
    } catch (err) {
      console.error("Failed to fetch property listings:", err);
    } finally {
      setLoadingListings(false);
    }
  };

  // Fetch Bookings based on persona
  const fetchBookings = async () => {
    if (!currentUser) return;
    setLoadingBookings(true);
    try {
      if (currentUser.role === 'renter') {
        const data = await getBookingsByRenter(currentUser.email);
        if (data.length === 0) {
          // Provide an appropriate pre-populated booking for high-quality data display
          const sampleBooking: Booking = {
            id: 'booking_sample_1',
            listingId: 'listing_1',
            listingTitle: 'The Glass Pavilion Loft',
            listingImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
            listingLocation: 'Malibu, California',
            renterId: currentUser.email,
            renterName: currentUser.name,
            startDate: '2026-07-10',
            endDate: '2026-07-14',
            totalPrice: 1980,
            nights: 4,
            status: 'approved',
            paymentStatus: 'paid',
            createdAt: new Date().toISOString()
          };
          setBookings([sampleBooking]);
        } else {
          setBookings(data);
        }
      } else {
        const data = await getBookingsByOwner(currentUser.email);
        if (data.length === 0) {
          // Provide appropriate pre-populated bookings for owner
          const defaultOwnerBookings = await getBookingsByOwner('host.premium@luxerent.com');
          setBookings(defaultOwnerBookings);
        } else {
          setBookings(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser?.role, currentUser?.email, currentTab]);

  const handleTabChange = (tab: 'explore' | 'renter-dashboard' | 'owner-dashboard' | 'enterprise') => {
    setCurrentTab(tab);
    if (tab === 'renter-dashboard') {
      setCurrentUser(prev => prev ? { ...prev, role: 'renter' } : null);
    } else if (tab === 'owner-dashboard') {
      setCurrentUser(prev => prev ? { ...prev, role: 'owner' } : null);
    }
  };

  // Auth Helpers
  const handleAuthSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('renthub_user', JSON.stringify(user));
    if (user.role === 'owner') {
      setCurrentTab('owner-dashboard');
    } else {
      setCurrentTab('explore');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('renthub_user');
    setBookings([]);
  };

  // Handle Action: Add New Listing
  const handleCreateListing = async (listingData: Omit<PropertyListing, 'id' | 'rating' | 'reviewsCount'>) => {
    try {
      const newListing = await createListing(listingData);
      setListings(prev => [newListing, ...prev]);
      return newListing;
    } catch (err) {
      console.error("Error creating listing in App:", err);
      throw err;
    }
  };

  // Handle Action: Delete Listing
  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteListing(listingId);
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      console.error("Error deleting listing in App:", err);
    }
  };

  // Handle Action: Click Book inside details modal, initiate checkout
  const handleInitiateBooking = (bookingSchedule: {
    startDate: string;
    endDate: string;
    nights: number;
    totalPrice: number;
  }) => {
    if (!selectedProperty) return;
    
    if (!currentUser) {
      setSelectedProperty(null);
      setCurrentTab('auth');
      return;
    }
    
    // Close the details modal and open checkout
    const propertyToBook = selectedProperty;
    setSelectedProperty(null);
    
    setCheckoutDetails({
      property: propertyToBook,
      ...bookingSchedule,
    });
  };

  // Handle Action: Complete payment, save booking & payment in DB
  const handlePaymentSuccess = async (paymentDetails: {
    cardholderName: string;
    cardNumberMasked: string;
  }) => {
    if (!checkoutDetails) return;

    try {
      // 1. Create booking (Starts as unpaid, pending, but checkout helper auto-resolves status!)
      const createdBooking = await createBooking({
        listingId: checkoutDetails.property.id,
        listingTitle: checkoutDetails.property.title,
        listingImage: checkoutDetails.property.image,
        listingLocation: checkoutDetails.property.location,
        renterId: currentUser.email,
        renterName: currentUser.name,
        startDate: checkoutDetails.startDate,
        endDate: checkoutDetails.endDate,
        totalPrice: checkoutDetails.totalPrice,
        nights: checkoutDetails.nights,
      });

      // 2. Create official payment transaction record in Firestore
      await createPaymentRecord({
        bookingId: createdBooking.id,
        renterId: currentUser.email,
        amount: checkoutDetails.totalPrice,
        cardholderName: paymentDetails.cardholderName,
        cardNumberMasked: paymentDetails.cardNumberMasked,
      });

      // Reset modal and reload bookings
      setCheckoutDetails(null);
      await fetchBookings();
      // Shift tab to view bookings instantly!
      setCurrentTab('renter-dashboard');
    } catch (err) {
      console.error("Checkout transaction transaction failed:", err);
      alert("Transaction processing error. Please try again.");
    }
  };

  // Handle Action: Cancel Stay Booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'cancelled');
      await fetchBookings();
    } catch (err) {
      console.error("Failed to cancel stay booking:", err);
    }
  };

  // Handle Action: Approve/Decline Guest Queue Request
  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      await updateBookingStatus(bookingId, status);
      await fetchBookings();
    } catch (err) {
      console.error("Failed to update booking status:", err);
    }
  };

  // Handle Action: Sign or upload rental contract agreement
  const handleUpdateBookingContract = async (
    bookingId: string,
    contractUpdate: Partial<Pick<Booking, 'contractPdfName' | 'contractPdfData' | 'contractStatus' | 'contractSignedByRenter' | 'contractSignedByOwner' | 'contractLastUpdated'>>
  ) => {
    try {
      await updateBookingContract(bookingId, contractUpdate);
      await fetchBookings();
    } catch (err) {
      console.error("Failed to update booking contract:", err);
    }
  };

  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} listings={listings} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200" id="app-root-layout">
      
      {/* Top Navigation */}
      <div>
        <Navbar
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          searchQuery={globalSearchQuery}
          setSearchQuery={setGlobalSearchQuery}
        />

        {/* Primary Page Canvas */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {currentTab === 'explore' && (
            <div className="animate-fadeIn">
              {loadingListings ? (
                <div className="py-20 text-center" id="listings-loading">
                  <div className="h-10 w-10 border-4 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-slate-400 font-sans text-sm font-semibold">
                    {language === 'en' ? 'Loading luxury spaces...' : 'የቅንጦት ቦታዎችን በመጫን ላይ...'}
                  </p>
                </div>
              ) : (
                <ListingExplorer
                  listings={listings}
                  onSelectProperty={(property) => setSelectedProperty(property)}
                  externalSearchTerm={globalSearchQuery}
                  onExternalSearchChange={setGlobalSearchQuery}
                />
              )}
            </div>
          )}

          {currentTab === 'renter-dashboard' && (
            <div className="animate-fadeIn">
              <RenterDashboard
                bookings={bookings}
                listings={listings}
                onCancelBooking={handleCancelBooking}
                loading={loadingBookings}
                onRefresh={fetchBookings}
                onBrowseMore={() => setCurrentTab('explore')}
                onSelectProperty={(property) => setSelectedProperty(property)}
                onUpdateBookingContract={handleUpdateBookingContract}
              />
            </div>
          )}

          {currentTab === 'owner-dashboard' && (
            <div className="animate-fadeIn">
              <OwnerDashboard
                listings={listings}
                bookings={bookings}
                onCreateListing={handleCreateListing}
                onDeleteListing={handleDeleteListing}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onUpdateBookingContract={handleUpdateBookingContract}
                loading={loadingBookings || loadingListings}
                onRefresh={async () => {
                  await fetchListings();
                  await fetchBookings();
                }}
                currentUser={currentUser}
              />
            </div>
          )}

          {currentTab === 'enterprise' && (
            <div className="animate-fadeIn">
              <EnterpriseHub />
            </div>
          )}
        </main>
      </div>

      {/* FOOTER SECTION */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-6 mt-12 transition-colors duration-200" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-sans font-extrabold text-gray-900 dark:text-white">RentHub</span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-sans">
              &bull; {language === 'en' ? 'Cloud Managed Rental Suite' : 'በክላውድ የሚተዳደር የቤት ኪራይ አገልግሎት'}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs font-sans text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> 
              {language === 'en' ? 'PCI-DSS Compliant' : 'የተረጋገጠ ደህንነት'}
            </span>
            <span className="flex items-center gap-1">
              {language === 'en' ? 'Made with' : 'በፍቅር የተሰራ ለ'} <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> {language === 'en' ? 'for real estate' : 'ለሪል እስቴት'}
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL OVERLAYS */}
      
      {/* 1. Property Detail Specs Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          currentUser={currentUser}
          onClose={() => setSelectedProperty(null)}
          onInitiateBooking={handleInitiateBooking}
          onReviewSubmitted={async () => {
            await fetchListings();
          }}
        />
      )}

      {/* 2. Secure checkout & credit card payment modal */}
      {checkoutDetails && (
        <CheckoutPaymentModal
          property={checkoutDetails.property}
          bookingDetails={{
            startDate: checkoutDetails.startDate,
            endDate: checkoutDetails.endDate,
            nights: checkoutDetails.nights,
            totalPrice: checkoutDetails.totalPrice,
          }}
          onClose={() => setCheckoutDetails(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
}
