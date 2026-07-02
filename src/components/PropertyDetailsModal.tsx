import React, { useState, useEffect } from 'react';
import { PropertyListing, AppUser, Review } from '../types';
import { X, Calendar, ShieldCheck, MapPin, Bed, Bath, Star, Sparkles, AlertCircle, Send, User } from 'lucide-react';
import { getReviewsForListing, createReview } from '../lib/firebase';
import { useAppContext } from '../lib/AppContext';
import { PropertyMap } from './PropertyMap';

interface PropertyDetailsModalProps {
  property: PropertyListing | null;
  currentUser: AppUser | null;
  onClose: () => void;
  onInitiateBooking: (bookingData: {
    startDate: string;
    endDate: string;
    nights: number;
    totalPrice: number;
  }) => void;
  onReviewSubmitted: () => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  currentUser,
  onClose,
  onInitiateBooking,
  onReviewSubmitted,
}) => {
  const { language } = useAppContext();
  
  // Setup default dates: Tomorrow to 4 days later
  const getTomorrowString = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  };

  const getFutureDateString = (daysAhead: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTomorrowString());
  const [endDate, setEndDate] = useState(getFutureDateString(5));
  const [nights, setNights] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');

  // Reviews-related state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch reviews when property changes
  useEffect(() => {
    if (!property) return;
    
    let isMounted = true;
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const fetched = await getReviewsForListing(property.id);
        if (isMounted) {
          setReviews(fetched);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        if (isMounted) {
          setLoadingReviews(false);
        }
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [property?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !property) return;
    if (!comment.trim()) {
      setReviewError(language === 'en' ? 'Please write a comment before submitting.' : 'እባክዎ ከመላክዎ በፊት አስተያየት ይጻፉ።');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess(false);

    try {
      await createReview({
        listingId: property.id,
        renterId: currentUser.email,
        renterName: currentUser.name,
        rating: newRating,
        comment: comment.trim(),
      });
      setComment('');
      setNewRating(5);
      setReviewSuccess(true);
      // Reload reviews
      const updatedReviews = await getReviewsForListing(property.id);
      setReviews(updatedReviews);
      // Trigger update in main App component
      onReviewSubmitted();
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to submit review:", err);
      setReviewError(language === 'en' ? 'Could not save your review. Please try again.' : 'አስተያየትዎን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderInteractiveStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setNewRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            className="p-1 hover:scale-115 transition-transform bg-transparent border-0 cursor-pointer text-amber-400 focus:outline-hidden animate-none"
          >
            <Star
              className={`h-5 w-5 ${
                star <= (hoveredRating ?? newRating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300 dark:text-slate-650'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      setErrorMsg(language === 'en' ? 'Check-out date must be after check-in date' : 'የመውጫ ቀን ከመግቢያ ቀን በኋላ መሆን አለበት');
      setNights(0);
      return;
    }
    
    setErrorMsg('');
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const calculatedNights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    setNights(calculatedNights);
  }, [startDate, endDate]);

  if (!property) return null;

  // Price Calculation Breakdown
  const baseTotal = property.price * nights;
  const cleaningFee = nights > 0 ? 75 : 0;
  const serviceFee = nights > 0 ? 55 : 0;
  const taxRate = 0.12; // 12%
  const taxFee = Math.round(baseTotal * taxRate);
  const totalAmount = baseTotal + cleaningFee + serviceFee + taxFee;

  const handleBookClick = () => {
    if (nights <= 0) {
      setErrorMsg(language === 'en' ? 'Please select a valid stay duration' : 'እባክዎ ትክክለኛ የቆይታ ቀናትን ይምረጡ');
      return;
    }
    onInitiateBooking({
      startDate,
      endDate,
      nights,
      totalPrice: totalAmount,
    });
  };

  return (
    <div id="property-details-modal-overlay" className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        id="property-details-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[90vh] md:max-h-[85vh] animate-scaleUp transition-colors"
      >
        {/* Left Side: Property Gallery & Details (Col 1-7) */}
        <div className="lg:col-span-7 overflow-y-auto p-6 space-y-6 max-h-[40vh] lg:max-h-full">
          {/* Header row */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-sans font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-2.5 py-1 rounded-md">
                {language === 'en' ? 'Verified Premium Space' : 'የተረጋገጠ ልዩ ይዞታ'}
              </span>
              <h2 className="text-xl sm:text-2xl font-sans font-extrabold text-gray-900 dark:text-white mt-2">
                {property.title}
              </h2>
              <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 mt-1">
                <MapPin className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span>{property.location}</span>
              </div>
            </div>
            <button 
              id="close-details-modal-btn"
              onClick={onClose} 
              className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Property Image Cover */}
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800">
            <img 
              src={property.image} 
              alt={property.title} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg font-sans font-medium flex items-center space-x-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{property.rating.toFixed(2)} {language === 'en' ? 'rating' : 'ደረጃ'}</span>
              <span className="text-gray-300">({property.reviewsCount} {language === 'en' ? 'reviews' : 'አስተያየቶች'})</span>
            </div>
          </div>

          {/* Key specs */}
          <div className="grid grid-cols-3 gap-3 border-y border-gray-100 dark:border-slate-800 py-4 text-center">
            <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100/50 dark:border-slate-800">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans font-bold block">{language === 'en' ? 'Beds' : 'መኝታ ክፍል'}</span>
              <span className="font-sans font-extrabold text-gray-900 dark:text-white text-lg flex items-center justify-center gap-1.5 mt-0.5">
                <Bed className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {property.beds}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100/50 dark:border-slate-800">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans font-bold block">{language === 'en' ? 'Bathrooms' : 'መታጠቢያ ቤት'}</span>
              <span className="font-sans font-extrabold text-gray-900 dark:text-white text-lg flex items-center justify-center gap-1.5 mt-0.5">
                <Bath className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {property.baths}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100/50 dark:border-slate-800">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans font-bold block">{language === 'en' ? 'Type' : 'ዓይነት'}</span>
              <span className="font-sans font-bold text-gray-900 dark:text-white text-sm block mt-1.5 truncate capitalize">
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">{language === 'en' ? 'About this home' : 'ስለ ቤቱ መግለጫ'}</h4>
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">{property.description}</p>
          </div>

          {/* Amenities Grid */}
          <div className="space-y-3">
            <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">{language === 'en' ? 'What this place offers' : 'ምቹ መገልገያዎች'}</h4>
            <div className="grid grid-cols-2 gap-2">
              {property.amenities?.map((amenity, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-slate-300 font-sans bg-gray-50 dark:bg-slate-800/40 px-3 py-2 rounded-lg border border-gray-100/50 dark:border-slate-800/60">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Location Map */}
          <div className="space-y-3 pt-2" id="listing-details-map-container">
            <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
              {language === 'en' ? 'Property Location' : 'የቤቱ መገኛ አድራሻ'}
            </h4>
            <div className="rounded-2xl overflow-hidden border border-gray-150 dark:border-slate-800">
              <PropertyMap
                properties={[property]}
                onSelectProperty={() => {}}
                selectedProperty={property}
                height="240px"
              />
            </div>
          </div>

          {/* Guest Reviews & Ratings Section */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-6 space-y-4" id="listing-reviews-container">
            <div className="flex items-center justify-between">
              <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{language === 'en' ? 'Guest Reviews & Ratings' : 'የእንግዶች ግምገማዎች'} ({reviews.length})</span>
              </h4>
              {reviews.length > 0 && (
                <span className="text-xs font-sans font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  ★ {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5.0
                </span>
              )}
            </div>

            {/* List of reviews */}
            <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
              {loadingReviews ? (
                <div className="text-center py-6 text-xs text-gray-400 dark:text-slate-500 animate-pulse">
                  {language === 'en' ? 'Loading verified guest reviews...' : 'የእንግዶች ግምገማዎችን በመጫን ላይ...'}
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((rev) => {
                  const initials = rev.renterName
                    ? rev.renterName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'U';
                  const revDate = new Date(rev.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'am-ET', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={rev.id} className="bg-gray-50/70 dark:bg-slate-850/60 border border-gray-100/60 dark:border-slate-800 p-3.5 rounded-xl space-y-2 text-xs" id={`review-card-${rev.id}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-7 w-7 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-white">{rev.renterName}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{revDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-100/50 dark:border-amber-900/50">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-[10px]">{rev.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-slate-300 leading-relaxed pl-1 italic font-sans">
                        "{rev.comment}"
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-gray-50/50 dark:bg-slate-850/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-xs text-gray-400 dark:text-slate-500 italic">
                  {language === 'en' ? 'No guest reviews submitted yet. Be the first to leave a review!' : 'እስካሁን ምንም አስተያየት አልተሰጠም። የመጀመሪያው ይሁኑ!'}
                </div>
              )}
            </div>

            {/* Review submission form */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mt-2 space-y-3">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>{language === 'en' ? 'Rate this Property Listing' : 'ለዚህ ቤት ግምገማ ያስቀምጡ'}</span>
              </h5>

              {currentUser ? (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-xl">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 font-sans">{language === 'en' ? 'Your score rating:' : 'የእርስዎ ደረጃ አሰጣጥ፡'}</span>
                    {renderInteractiveStars()}
                  </div>

                  <div className="relative">
                    <textarea
                      id="review-comment-textarea"
                      placeholder={language === 'en' ? "Tell future guests about your experience..." : "አስተያየትዎን እዚህ ይጻፉ..."}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full text-xs font-sans p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden resize-none"
                    />
                    <span className="absolute bottom-2.5 right-3 text-[9px] text-gray-400 dark:text-slate-500 font-mono">
                      {comment.length}/500
                    </span>
                  </div>

                  {reviewError && (
                    <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {reviewSuccess && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>{language === 'en' ? 'Thank you! Your verified rating and review has been published.' : 'እናመሰግናለን! አስተያየትዎ በተሳካ ሁኔታ ተመዝግቧል።'}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    id="submit-review-btn"
                    disabled={submittingReview}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                  >
                    <Send className="h-3 w-3" />
                    <span>{submittingReview ? (language === 'en' ? 'Publishing...' : 'በማስገባት ላይ...') : (language === 'en' ? 'Submit Review' : 'አስገባ')}</span>
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800 space-y-1">
                  <User className="h-5 w-5 text-gray-400 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">{language === 'en' ? 'Please Sign In to Rate Service' : 'እባክዎ ግምገማ ለመስጠት ይግቡ'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">{language === 'en' ? 'Signed-in users can write a review & rate the properties.' : 'የገቡ ተጠቃሚዎች ብቻ ግምገማ መጻፍ ይችላሉ።'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Price Calculator & Booking Widget (Col 8-12) */}
        <div className="lg:col-span-5 bg-gray-50 dark:bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto max-h-[50vh] lg:max-h-full transition-colors">
          <div className="space-y-6">
            {/* Widget Header with Close button (desktop) */}
            <div className="flex justify-between items-center">
              <div className="flex items-baseline">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white font-sans">${property.price}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-sans ml-1">/ {language === 'en' ? 'night' : 'ሌሊት'}</span>
              </div>
              <button 
                id="close-details-modal-btn-desktop"
                onClick={onClose} 
                className="hidden lg:block p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stay Dates form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 shadow-xs space-y-3 transition-colors">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                <Calendar className="h-4 w-4" />
                <span>{language === 'en' ? 'Select Booking Schedule' : 'የቆይታ ቀኖችን ይምረጡ'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="details-start-date" className="text-[10px] font-sans font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Check-in' : 'መግቢያ ቀን'}</label>
                  <input
                    id="details-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={getTomorrowString()}
                    className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-sans text-xs text-gray-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="details-end-date" className="text-[10px] font-sans font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Check-out' : 'መውጫ ቀን'}</label>
                  <input
                    id="details-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-sans text-xs text-gray-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {errorMsg && (
                <div id="date-validation-error" className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-2.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            {nights > 0 && (
              <div className="space-y-3" id="invoice-breakdown">
                <h5 className="text-[10px] font-sans font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-200/60 dark:border-slate-800 pb-1">{language === 'en' ? 'Fare Breakdown' : 'የዋጋ ዝርዝር መግለጫ'}</h5>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-350 font-sans">
                    <span>${property.price} &times; {nights} {language === 'en' ? 'nights' : 'ሌሊት'}</span>
                    <span className="font-semibold">${baseTotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-350 font-sans">
                    <span>{language === 'en' ? 'Cleaning Fee' : 'የጽዳት ክፍያ'}</span>
                    <span className="font-semibold">${cleaningFee}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-350 font-sans">
                    <span>{language === 'en' ? 'RentHub Service Charge' : 'የአገልግሎት ክፍያ (RentHub)'}</span>
                    <span className="font-semibold">${serviceFee}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-slate-350 font-sans">
                    <span>{language === 'en' ? 'Occupancy Taxes & Fees (12%)' : 'የመንግስት ታክስ እና ክፍያዎች (12%)'}</span>
                    <span className="font-semibold">${taxFee}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200/60 dark:border-slate-800 pt-3 flex justify-between items-baseline font-sans">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{language === 'en' ? 'Total Price' : 'ጠቅላላ ዋጋ'}</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400" id="calculated-total-amount">${totalAmount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Secure Book button & badges */}
          <div className="pt-6 border-t border-gray-200/60 dark:border-slate-800 mt-6 space-y-3">
            <button
              id="initiate-booking-btn"
              onClick={handleBookClick}
              disabled={nights <= 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-sans font-bold py-3.5 px-4 rounded-xl shadow-md cursor-pointer transition-colors text-center text-sm flex items-center justify-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>{language === 'en' ? 'Book with Instant Pay' : 'አሁኑኑ ይክፈሉ እና ይያዙ'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 dark:text-slate-400 font-mono">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'en' ? 'Secure Booking Process • 256-bit Encryption' : 'ደህንነቱ የተጠበቀ ክፍያ • 256-bit ኢንክሪፕሽን'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
