import React, { useState } from 'react';
import { Booking, PropertyListing } from '../types';
import { Calendar, CreditCard, Receipt, FileText, Compass, AlertCircle, RefreshCw, Star, MapPin, ChevronDown, ChevronUp, Bed, Bath, Sparkles, Building2, FileSignature } from 'lucide-react';
import { ContractAgreementModal } from './ContractAgreementModal';
import { useAppContext } from '../lib/AppContext';

interface RenterDashboardProps {
  bookings: Booking[];
  listings: PropertyListing[];
  onCancelBooking: (bookingId: string) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
  onBrowseMore: () => void;
  onSelectProperty?: (property: PropertyListing) => void;
  onUpdateBookingContract?: (
    bookingId: string, 
    contractFields: Partial<Pick<Booking, 'contractPdfName' | 'contractPdfData' | 'contractStatus' | 'contractSignedByRenter' | 'contractSignedByOwner' | 'contractLastUpdated'>>
  ) => Promise<void>;
}

export const RenterDashboard: React.FC<RenterDashboardProps> = ({
  bookings,
  listings,
  onCancelBooking,
  loading,
  onRefresh,
  onBrowseMore,
  onSelectProperty,
  onUpdateBookingContract,
}) => {
  const { language, activeTenant } = useAppContext();
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [activeContractBooking, setActiveContractBooking] = useState<Booking | null>(null);

  // Maintenance states
  const [issueText, setIssueText] = useState<{ [bookingId: string]: string }>({});
  const [submittingMaint, setSubmittingMaint] = useState<string | null>(null); // bookingId
  const [maintSuccessMsg, setMaintSuccessMsg] = useState<{ [bookingId: string]: any }>({});

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50';
      case 'pending':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/50';
      case 'declined':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/50';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';
      default:
        return 'bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 border-gray-100 dark:border-slate-800';
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

  const handleCancelClick = async (bookingId: string) => {
    const confirmationMsg = language === 'en'
      ? 'Are you sure you want to cancel this booking? This will immediately free up the property vacancy.'
      : 'እርግጠኛ ነዎት ይህንን የተያዘ ቦታ መሰረዝ ይፈልጋሉ? ይህ ቤቱን ወዲያውኑ ክፍት ያደርገዋል።';
    if (window.confirm(confirmationMsg)) {
      await onCancelBooking(bookingId);
    }
  };

  return (
    <div className="space-y-6" id="renter-dashboard-container">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white">
            {language === 'en' ? 'My Stay Bookings' : 'የእኔ የተያዙ ቤቶች'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-sans mt-0.5">
            {language === 'en' 
              ? 'Manage stays, check validation records, and generate secure transaction receipts.' 
              : 'የቆይታ ጊዜዎን ያስተዳድሩ፣ የደህንነት ሰነዶችን ያረጋግጡ እና ደረሰኞችን ያመንጩ።'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            id="renter-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-600 dark:text-slate-300 disabled:opacity-50 cursor-pointer transition-all"
            title="Refresh bookings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="renter-browse-more-btn"
            onClick={onBrowseMore}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            {language === 'en' ? 'Browse More Homes' : 'ተጨማሪ ቤቶችን ፈልግ'}
          </button>
        </div>
      </div>

      {/* Main Grid / Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Bookings List (Col 1-8) */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center" id="renter-loading-state">
              <RefreshCw className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-sans text-gray-500 dark:text-slate-400 font-medium">
                {language === 'en' ? 'Fetching secure reservations database...' : 'ደህንነቱ የተጠበቀ የይዞታ መረጃዎችን በማምጣት ላይ...'}
              </p>
            </div>
          ) : bookings.length > 0 ? (
            bookings.map((booking) => {
              const property = listings.find((l) => l.id === booking.listingId);
              const isExpanded = expandedBookingId === booking.id;

              return (
                <div 
                  key={booking.id} 
                  id={`renter-booking-card-${booking.id}`}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col space-y-4"
                >
                  {/* Upper Main Info Block */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {/* Stay Info */}
                    <div className="flex gap-4">
                      {booking.listingImage && (
                        <img 
                          src={booking.listingImage} 
                          alt={booking.listingTitle || 'Listing'} 
                          referrerPolicy="no-referrer"
                          className="h-20 w-28 object-cover rounded-xl border border-gray-100 dark:border-slate-800 shrink-0"
                        />
                      )}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${getStatusColor(booking.status)}`}>
                            {getTranslatedStatus(booking.status)}
                          </span>
                          <span className={`text-[10px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                            booking.paymentStatus === 'paid' 
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50' 
                              : 'bg-rose-50/70 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-900/50'
                          }`}>
                            {booking.paymentStatus === 'paid' 
                              ? (language === 'en' ? 'Paid' : 'ተከፍሏል') 
                              : (language === 'en' ? 'Unpaid' : 'አልተከፈለም')}
                          </span>
                        </div>

                        <h3 className="font-sans font-bold text-gray-900 dark:text-white text-base leading-snug truncate">
                          {booking.listingTitle || 'Premium Residence'}
                        </h3>

                        <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 font-sans gap-3">
                          {booking.listingLocation && (
                            <div className="flex items-center shrink-0">
                              <MapPin className="h-3.5 w-3.5 mr-0.5 text-gray-400 dark:text-slate-500" />
                              <span>{booking.listingLocation}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-slate-500" />
                            <span>{booking.startDate} &rarr; {booking.endDate}</span>
                          </div>
                        </div>

                        <p className="text-xs font-mono text-gray-400 dark:text-slate-500">
                          {language === 'en' ? 'Booking ID' : 'የመለያ ኮድ'}: {booking.id.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Pricing & Control Actions */}
                    <div className="md:text-right flex flex-col justify-between items-start md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-slate-800 gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-sans font-semibold block">
                          {language === 'en' ? 'Total Amount' : 'ጠቅላላ ክፍያ'}
                        </span>
                        <span className="text-lg font-extrabold text-gray-900 dark:text-white font-sans">${booking.totalPrice}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-sans block mt-0.5">
                          ({booking.nights} {language === 'en' ? 'nights' : 'ሌሊት'})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Invoice Receipt option */}
                        {booking.paymentStatus === 'paid' && (
                          <button
                            id={`btn-receipt-${booking.id}`}
                            onClick={() => setSelectedReceipt(booking)}
                            className="flex-1 md:flex-initial px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/50 dark:border-emerald-800 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Receipt className="h-4 w-4" />
                            <span>{language === 'en' ? 'Receipt' : 'ደረሰኝ'}</span>
                          </button>
                        )}

                        {/* Rate Service option */}
                        {booking.paymentStatus === 'paid' && property && onSelectProperty && (
                          <button
                            id={`btn-rate-${booking.id}`}
                            onClick={() => onSelectProperty(property)}
                            className="flex-1 md:flex-initial px-3.5 py-2 bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/50 dark:border-amber-800 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            <span>{language === 'en' ? 'Rate Service' : 'አገልግሎት ደረጃ ስጥ'}</span>
                          </button>
                        )}

                        {/* Lease Agreement / Contract option */}
                        {booking.status !== 'cancelled' && booking.status !== 'declined' && onUpdateBookingContract && (
                          <button
                            id={`btn-contract-${booking.id}`}
                            onClick={() => setActiveContractBooking(booking)}
                            className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                              booking.contractStatus === 'fully_signed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-850 hover:bg-emerald-100 dark:hover:bg-slate-800'
                                : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500 border-transparent shadow-xs'
                            }`}
                          >
                            <FileSignature className="h-4 w-4 text-emerald-500 dark:text-white shrink-0" />
                            <span>
                              {booking.contractStatus === 'fully_signed' 
                                ? (language === 'en' ? 'Lease Active ✓' : 'የኪራይ ውል ጸንቷል ✓') 
                                : (language === 'en' ? 'Sign Lease' : 'ውል ፈርም')}
                            </span>
                          </button>
                        )}

                        {/* Cancel action */}
                        {(booking.status === 'pending' || booking.status === 'approved') && (
                          <button
                            id={`btn-cancel-${booking.id}`}
                            onClick={() => handleCancelClick(booking.id)}
                            className="flex-1 md:flex-initial px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/50 dark:border-rose-900/50 rounded-xl text-xs font-semibold font-sans flex items-center justify-center cursor-pointer transition-all"
                          >
                            {language === 'en' ? 'Cancel Stay' : 'ሰርዝ'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Specifications Area */}
                  {property && (
                    <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
                      <div className="flex justify-between items-center">
                        <button
                          id={`toggle-specs-${booking.id}`}
                          onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              <span>{language === 'en' ? 'Hide Property Specifications' : 'የቤቱን ዝርዝር መረጃ ደብቅ'}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              <span>{language === 'en' ? 'View Property Specifications' : 'የቤቱን ዝርዝር መረጃ እይ'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100/50 dark:border-slate-800/60 rounded-xl p-4 space-y-3 animate-fadeIn">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300 font-sans">
                              <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-semibold capitalize">
                                {language === 'en' ? `${property.type} Space` : `${property.type === 'house' ? 'ቤት' : 'አፓርታማ'}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300 font-sans">
                              <Bed className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                <strong className="font-bold">{property.beds}</strong> {language === 'en' ? 'Beds count' : 'መኝታ ክፍሎች'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300 font-sans">
                              <Bath className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                <strong className="font-bold">{property.baths}</strong> {language === 'en' ? 'Bathrooms' : 'መታጠቢያ ክፍሎች'}
                              </span>
                            </div>
                          </div>

                          {property.description && (
                            <div className="space-y-1">
                              <h5 className="text-[10px] uppercase font-sans font-bold tracking-wider text-gray-400 dark:text-slate-500">
                                {language === 'en' ? 'About this property' : 'ስለዚህ ቤት መግለጫ'}
                              </h5>
                              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-sans">{property.description}</p>
                            </div>
                          )}

                          {property.amenities && property.amenities.length > 0 && (
                            <div className="space-y-1">
                              <h5 className="text-[10px] uppercase font-sans font-bold tracking-wider text-gray-400 dark:text-slate-500">
                                {language === 'en' ? 'Reserved Highlights & Amenities' : 'የተካተቱ ምቹ ነገሮች'}
                              </h5>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {property.amenities.map((amenity, idx) => (
                                  <span key={idx} className="bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200/60 dark:border-slate-800 text-[10px] font-sans px-2.5 py-1 rounded-md flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>{amenity}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI-driven Maintenance Reporting */}
                          <div className="border-t border-gray-150 dark:border-slate-800/85 pt-3 mt-3 space-y-3">
                            <h5 className="text-[10px] uppercase font-sans font-bold tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              {language === 'en' ? 'AI-Driven Smart Maintenance Desk' : 'የጌሚኒ ስማርት የጥገና ጥያቄ መቀበያ'}
                            </h5>

                            {maintSuccessMsg[booking.id] ? (
                              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 space-y-2">
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                                  ✓ {language === 'en' ? 'Issue Routed Successfully!' : 'ጥያቄዎ በተሳካ ሁኔታ ተልኳል!'}
                                </p>
                                <div className="text-xs space-y-1 text-emerald-700 dark:text-emerald-400 font-sans">
                                  <p><strong>Trade Class:</strong> {maintSuccessMsg[booking.id].aiTradeClass}</p>
                                  <p><strong>Priority Level:</strong> {maintSuccessMsg[booking.id].aiPriority}</p>
                                  <p><strong>Repair Estimate:</strong> ${maintSuccessMsg[booking.id].estimatedCost}</p>
                                  <p><strong>AI Routing Note:</strong> {maintSuccessMsg[booking.id].aiRoutingReason}</p>
                                </div>
                                <button
                                  onClick={() => setMaintSuccessMsg({ ...maintSuccessMsg, [booking.id]: null })}
                                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                                >
                                  {language === 'en' ? 'Report another issue' : 'ሌላ ጥያቄ አስገባ'}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  placeholder={language === 'en' ? "e.g., Faucet in kitchen is leaking water rapidly or heating is broken..." : "ለምሳሌ የኩሽና ቧንቧ እየፈሰሰ ነው ወይም ማሞቂያው አልሰራም..."}
                                  value={issueText[booking.id] || ''}
                                  onChange={(e) => setIssueText({ ...issueText, [booking.id]: e.target.value })}
                                  className="w-full min-h-[70px] px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-sans focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex justify-end">
                                  <button
                                    onClick={async () => {
                                      const text = issueText[booking.id];
                                      if (!text || !text.trim()) {
                                        alert("Please describe the maintenance issue.");
                                        return;
                                      }
                                      try {
                                        setSubmittingMaint(booking.id);
                                        const res = await fetch('/api/maintenance/submit', {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'x-tenant-id': activeTenant?.id || 'active'
                                          },
                                          body: JSON.stringify({
                                            listingId: booking.listingId,
                                            issueDescription: text
                                          })
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          setMaintSuccessMsg({ ...maintSuccessMsg, [booking.id]: data });
                                          setIssueText({ ...issueText, [booking.id]: '' });
                                        } else {
                                          alert("Failed to route issue. Please try again.");
                                        }
                                      } catch (err) {
                                        console.error("Maintenance submit fail:", err);
                                      } finally {
                                        setSubmittingMaint(null);
                                      }
                                    }}
                                    disabled={submittingMaint === booking.id}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-0"
                                  >
                                    {submittingMaint === booking.id ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span>AI Routing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                        <span>Submit to AI Dispatch Desk</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-md mx-auto" id="no-bookings-state">
              <div className="bg-gray-50 dark:bg-slate-850 p-4 rounded-full inline-block text-gray-400 dark:text-slate-500">
                <Compass className="h-8 w-8" />
              </div>
              <h3 className="font-sans font-bold text-gray-800 dark:text-white text-lg">
                {language === 'en' ? 'No Active Bookings' : 'ምንም የያዙት ቤት የለም'}
              </h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                {language === 'en'
                  ? "You haven't booked any premium real estate yet. Browse our selection of luxury rentals and complete your first secure booking."
                  : 'እስካሁን ምንም ቤት አልያዙም። የእኛን ምርጥ ቤቶች ይመልከቱ እና የመጀመሪያውን ደህንነቱ የተጠበቀ ቦታ ይያዙ።'}
              </p>
              <button
                id="empty-bookings-browse-btn"
                onClick={onBrowseMore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {language === 'en' ? 'Start Exploring Properties' : 'ቤቶችን መፈለግ ጀምር'}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Invoice Receipt Panel (Col 9-12) */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs sticky top-20 space-y-4 transition-colors" id="receipt-preview-panel">
            <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> 
              {language === 'en' ? 'Invoice Drawer' : 'የደረሰኝ ዝርዝር'}
            </h4>

            {selectedReceipt ? (
              <div className="space-y-4 animate-scaleUp">
                {/* Official Invoice representation */}
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 font-sans space-y-3 bg-gray-50 dark:bg-slate-800 shadow-inner">
                  <div className="flex justify-between items-baseline border-b border-gray-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">RentHub Receipt</span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">STATION: ONLINE</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{language === 'en' ? 'Guest / Customer' : 'ተከራይ ስም'}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white block">{selectedReceipt.renterName}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">ID: {selectedReceipt.renterId}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{language === 'en' ? 'Property Reserved' : 'የተከራዩት ቤት'}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white block truncate">{selectedReceipt.listingTitle}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate">{selectedReceipt.listingLocation}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-gray-200/60 dark:border-slate-700 py-2">
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 uppercase block">{language === 'en' ? 'Check-in' : 'መግቢያ ቀን'}</span>
                      <span className="font-bold text-gray-700 dark:text-slate-300">{selectedReceipt.startDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 uppercase block">{language === 'en' ? 'Check-out' : 'መውጫ ቀን'}</span>
                      <span className="font-bold text-gray-700 dark:text-slate-300">{selectedReceipt.endDate}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{language === 'en' ? 'Transaction ID' : 'የክፍያ መለያ ኮድ'}</span>
                    <span className="font-mono text-[10px] font-bold text-gray-700 dark:text-slate-300">TXN-RES-{selectedReceipt.id.substring(8).toUpperCase()}</span>
                  </div>

                  <div className="pt-2 flex justify-between items-baseline border-t border-gray-200/60 dark:border-slate-700 font-sans">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">{language === 'en' ? 'Total Charged' : 'ጠቅላላ ክፍያ'}</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">${selectedReceipt.totalPrice} USD</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-slate-400 font-mono px-1">
                  <AlertCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{language === 'en' ? 'Verified via PCI-DSS Secure Vault Core' : 'ደህንነቱ በባንክ ደረጃ የተጠበቀ ነው'}</span>
                </div>

                <button
                  id="receipt-print-btn"
                  onClick={() => window.print()}
                  className="w-full bg-gray-900 dark:bg-slate-800 hover:bg-gray-800 dark:hover:bg-slate-700 text-white font-sans text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-colors text-center block"
                >
                  {language === 'en' ? 'Print Official Receipt' : 'ደረሰኙን ማተምያ አውርድ'}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 px-4 text-gray-400 dark:text-slate-500 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl space-y-2">
                <Receipt className="h-8 w-8 mx-auto text-gray-300 dark:text-slate-700" />
                <p className="text-xs font-medium font-sans">
                  {language === 'en' 
                    ? 'Select a paid booking from your history list to view the dynamic invoice receipt.' 
                    : 'ደረሰኙን ለማየት ከተከፈሉ ዝርዝሮች ውስጥ አንዱን ይምረጡ።'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {activeContractBooking && onUpdateBookingContract && (
        <ContractAgreementModal
          booking={activeContractBooking}
          listing={listings.find(l => l.id === activeContractBooking.listingId)}
          userRole="renter"
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
