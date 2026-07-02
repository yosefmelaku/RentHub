import React, { useState, useEffect } from 'react';
import { PropertyListing, Booking } from '../types';
import { X, CreditCard, ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

interface CheckoutPaymentModalProps {
  property: PropertyListing;
  bookingDetails: {
    startDate: string;
    endDate: string;
    nights: number;
    totalPrice: number;
  };
  onClose: () => void;
  onPaymentSuccess: (paymentData: {
    cardholderName: string;
    cardNumberMasked: string;
  }) => void;
}

export const CheckoutPaymentModal: React.FC<CheckoutPaymentModalProps> = ({
  property,
  bookingDetails,
  onClose,
  onPaymentSuccess,
}) => {
  const { language } = useAppContext();

  // Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zip, setZip] = useState('');

  // Processing UI State
  const [status, setStatus] = useState<'form' | 'processing' | 'success'>('form');
  const [processingStep, setProcessingStep] = useState(0);
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex' | 'discover' | 'generic'>('generic');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-format card number and detect type
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Digits only
    
    // Detect Card Type
    if (value.startsWith('4')) {
      setCardType('visa');
    } else if (/^5[1-5]/.test(value)) {
      setCardType('mastercard');
    } else if (/^3[47]/.test(value)) {
      setCardType('amex');
    } else if (/^6(?:011|5)/.test(value)) {
      setCardType('discover');
    } else {
      setCardType('generic');
    }

    // Limit length based on card type
    const maxLength = cardType === 'amex' ? 15 : 16;
    value = value.substring(0, maxLength);

    // Format with spaces
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  // Auto-format Expiration Date
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4);

    if (value.length > 2) {
      setExpiry(`${value.substring(0, 2)}/${value.substring(2)}`);
    } else {
      setExpiry(value);
    }
  };

  // Limit CVV to digits only and appropriate length
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, cardType === 'amex' ? 4 : 3);
    setCvv(value);
  };

  // Simulate payment processing stages
  const processingStepsTextEn = [
    "Establishing secure payment gate...",
    "Authorizing token with bank network...",
    "Deducting funds safely...",
    "Confirming booking vacancy & locking stay dates..."
  ];

  const processingStepsTextAm = [
    "ደህንነቱ የተጠበቀ ክፍያ በር በመክፈት ላይ...",
    "ከባንክ አውታረ መረብ ጋር በማገናኘት ላይ...",
    "ክፍያውን በጥንቃቄ በመቀነስ ላይ...",
    "ቀኑን በማረጋገጥ ላይ..."
  ];

  const processingStepsText = language === 'en' ? processingStepsTextEn : processingStepsTextAm;

  useEffect(() => {
    if (status !== 'processing') return;

    const interval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= processingStepsText.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setStatus('success');
          }, 300);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [status, processingStepsText.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!cardName.trim()) {
      setErrorMsg(language === 'en' ? 'Cardholder name is required' : 'የካርድ ባለቤት ስም ማስገባት ግዴታ ነው');
      return;
    }
    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 15) {
      setErrorMsg(language === 'en' ? 'Please enter a valid credit card number' : 'እባክዎ ትክክለኛ የካርድ ቁጥር ያስገቡ');
      return;
    }
    if (expiry.length < 5) {
      setErrorMsg(language === 'en' ? 'Please enter a valid expiry date (MM/YY)' : 'እባክዎ ትክክለኛ የማለፊያ ቀን ያስገቡ (ወር/ዓመት)');
      return;
    }
    const expParts = expiry.split('/');
    const expMonth = parseInt(expParts[0], 10);
    if (expMonth < 1 || expMonth > 12) {
      setErrorMsg(language === 'en' ? 'Invalid expiry month' : 'የማለፊያ ወር የተሳሳተ ነው');
      return;
    }
    if (cvv.length < 3) {
      setErrorMsg(language === 'en' ? 'CVV must be at least 3 digits' : 'ሲቪቪ (CVV) ቢያንስ 3 አሃዝ መሆን አለበት');
      return;
    }

    setErrorMsg('');
    setStatus('processing');
    setProcessingStep(0);
  };

  const handleFinishSuccess = () => {
    const maskedNum = `•••• •••• •••• ${cardNumber.slice(-4)}`;
    onPaymentSuccess({
      cardholderName: cardName,
      cardNumberMasked: maskedNum,
    });
  };

  return (
    <div id="checkout-payment-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        id="checkout-payment-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp transition-colors"
      >
        {/* Header row */}
        <div className="bg-slate-950 text-white p-5 flex justify-between items-center border-b border-gray-800 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-500/15 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base">
                {language === 'en' ? 'Secure Gateway Checkout' : 'አስተማማኝ የክፍያ በር'}
              </h3>
              <p className="text-[10px] text-gray-400 font-mono">Order ID: LUXE-{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
          </div>
          <button 
            id="close-checkout-modal-btn"
            onClick={onClose} 
            disabled={status === 'processing'}
            className="p-1.5 hover:bg-slate-800 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Booking Summary Card */}
            <div className="bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 space-y-3">
              <div className="flex gap-3">
                <img 
                  src={property.image} 
                  alt={property.title} 
                  referrerPolicy="no-referrer"
                  className="h-14 w-20 object-cover rounded-lg border border-gray-200/50 dark:border-slate-700 shrink-0" 
                />
                <div className="min-w-0">
                  <h4 className="font-sans font-bold text-gray-900 dark:text-white text-sm truncate">{property.title}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{property.location}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                    {bookingDetails.startDate} {language === 'en' ? 'to' : 'እስከ'} {bookingDetails.endDate} ({bookingDetails.nights} {language === 'en' ? 'nights' : 'ሌሊት'})
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200/50 dark:border-slate-800 pt-2.5 flex justify-between items-baseline font-sans">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Total Charge' : 'ጠቅላላ ክፍያ'}</span>
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">${bookingDetails.totalPrice}</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div id="checkout-error-panel" className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-3 rounded-xl">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Billing / Credit Card Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-widest font-sans">{language === 'en' ? 'Payment Method' : 'የክፍያ ዘዴ'}</h5>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">PCI-DSS Compliant</span>
              </div>

              {/* Cardholder Name */}
              <div>
                <label htmlFor="card-holder-name" className="text-xs font-semibold text-gray-600 dark:text-slate-350 block">{language === 'en' ? 'Cardholder Name' : 'የካርድ ባለቤት ሙሉ ስም'}</label>
                <input
                  id="card-holder-name"
                  type="text"
                  required
                  placeholder="e.g. Yosef Melaku"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Card Number */}
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="card-number-input" className="text-xs font-semibold text-gray-600 dark:text-slate-350">{language === 'en' ? 'Card Number' : 'የካርድ ቁጥር'}</label>
                  {/* Card logos */}
                  <div className="flex gap-1.5 items-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide border transition-all ${cardType === 'visa' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900' : 'text-gray-300 dark:text-slate-750 border-gray-100 dark:border-slate-800'}`}>Visa</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide border transition-all ${cardType === 'mastercard' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900' : 'text-gray-300 dark:text-slate-750 border-gray-100 dark:border-slate-800'}`}>MC</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide border transition-all ${cardType === 'amex' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900' : 'text-gray-300 dark:text-slate-750 border-gray-100 dark:border-slate-800'}`}>Amex</span>
                  </div>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="card-number-input"
                    type="text"
                    required
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-mono text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-550" />
                </div>
              </div>

              {/* Expiry, CVV & Zip */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="card-expiry" className="text-xs font-semibold text-gray-600 dark:text-slate-350 block">{language === 'en' ? 'Expiry Date' : 'ማለፊያ ቀን'}</label>
                  <input
                    id="card-expiry"
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-mono text-center text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="card-cvv" className="text-xs font-semibold text-gray-600 dark:text-slate-355 block">CVV</label>
                  <input
                    id="card-cvv"
                    type="password"
                    required
                    placeholder={cardType === 'amex' ? '1234' : '123'}
                    value={cvv}
                    onChange={handleCvvChange}
                    className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-mono text-center text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="card-zip" className="text-xs font-semibold text-gray-600 dark:text-slate-350 block">{language === 'en' ? 'Zip Code' : 'ዚፕ ኮድ'}</label>
                  <input
                    id="card-zip"
                    type="text"
                    required
                    placeholder="90210"
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, '').substring(0, 5))}
                    className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-mono text-center text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Lock Secure submit */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 text-[10px] font-mono">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                <span>Encrypted with TLS 1.3 encryption</span>
              </div>
              <button
                id="submit-payment-btn"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold py-3 px-6 rounded-xl shadow-md cursor-pointer transition-colors text-sm text-center flex items-center justify-center space-x-2"
              >
                <span>{language === 'en' ? `Authorize & Pay $${bookingDetails.totalPrice}` : `$${bookingDetails.totalPrice} ፈቅድ እና ክፈል`}</span>
              </button>
            </div>
          </form>
        )}

        {status === 'processing' && (
          <div id="checkout-processing-panel" className="p-12 text-center space-y-6 flex flex-col items-center justify-center min-h-[350px]">
            <Loader2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div className="space-y-2">
              <h4 className="font-sans font-extrabold text-gray-900 dark:text-white text-lg">{language === 'en' ? 'Authorizing Secure Transaction' : 'ደህንነቱ የተጠበቀ ክፍያ በማከናወን ላይ'}</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
                {language === 'en'
                  ? 'Please do not close this window, press back, or reload the page. Connecting with your bank network...'
                  : 'እባክዎ ይህንን ገጽ አይዝጉት ወይም እንደገና አይጫኑት። ከባንክዎ ጋር ግንኙነት በመፍጠር ላይ ነው...'}
              </p>
            </div>

            {/* Custom progress items list */}
            <div className="w-full max-w-xs space-y-2 text-left bg-gray-50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              {processingStepsText.map((stepText, idx) => {
                const isDone = processingStep > idx;
                const isCurrent = processingStep === idx;
                return (
                  <div key={idx} className="flex items-center space-x-2.5 text-xs">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${
                      isDone 
                        ? 'bg-emerald-100 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                        : isCurrent 
                          ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse' 
                          : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500'
                    }`}>
                      {isDone ? "✓" : idx + 1}
                    </span>
                    <span className={`truncate font-sans ${isCurrent ? 'text-gray-900 dark:text-white font-semibold' : isDone ? 'text-gray-500 dark:text-slate-450 line-through' : 'text-gray-400 dark:text-slate-500'}`}>
                      {stepText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div id="checkout-success-panel" className="p-8 text-center space-y-6 animate-scaleUp">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-4 rounded-full inline-block border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold tracking-widest uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                {language === 'en' ? 'Booking Completed Successfully' : 'ቦታው በተሳካ ሁኔታ ተይዟል'}
              </span>
              <h4 className="font-sans font-extrabold text-gray-900 dark:text-white text-2xl">{language === 'en' ? 'Payment Cleared' : 'ክፍያው ተጠናቋል'}</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                {language === 'en'
                  ? `Your reservation at ${property.title} is locked and approved. The host has been notified of your stay schedule!`
                  : `በ ${property.title} የያዙት ቦታ ተረጋግጧል! አስተናጋጁ ስለ እቅድዎ መረጃ ደርሶታል።`}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-emerald-950 dark:bg-slate-950 text-emerald-50 dark:text-slate-300 rounded-2xl p-5 text-left border border-emerald-900 dark:border-slate-800 shadow-inner max-w-md mx-auto space-y-3 font-sans">
              <div className="flex justify-between items-center border-b border-emerald-900/55 dark:border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="h-4 w-4" /> {language === 'en' ? 'Official Receipt' : 'ይፋዊ ደረሰኝ'}
                </span>
                <span className="text-[10px] font-mono text-emerald-500">AUTH APPROVED</span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase">{language === 'en' ? 'Transaction ID' : 'የግብይት ቁጥር'}</span>
                  <span className="font-mono font-bold text-white">TXN-{Math.random().toString(36).substring(2, 9).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase">{language === 'en' ? 'Card Charged' : 'የተከፈለበት ካርድ'}</span>
                  <span className="font-mono text-white">•••• •••• •••• {cardNumber.slice(-4)}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase">{language === 'en' ? 'Stay Period' : 'የቆይታ ጊዜ'}</span>
                  <span className="font-bold text-white">{bookingDetails.startDate} {language === 'en' ? 'to' : 'እስከ'} {bookingDetails.endDate}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase">{language === 'en' ? 'Stay Duration' : 'የሌሊት ብዛት'}</span>
                  <span className="font-bold text-white">{bookingDetails.nights} {language === 'en' ? 'nights' : 'ሌሊት'}</span>
                </div>
              </div>

              <div className="border-t border-emerald-900/55 dark:border-slate-800 pt-2.5 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase text-emerald-400">{language === 'en' ? 'Total Deducted' : 'ጠቅላላ የተቆረጠው'}</span>
                <span className="text-lg font-extrabold text-white">${bookingDetails.totalPrice} USD</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-center">
              <button
                id="view-bookings-after-payment"
                onClick={handleFinishSuccess}
                className="bg-gray-900 hover:bg-gray-800 text-white font-sans font-bold py-3 px-8 rounded-xl shadow-md cursor-pointer transition-colors text-sm text-center inline-flex items-center gap-2"
              >
                <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                <span>{language === 'en' ? 'Go to My Bookings & Receipts' : 'ወደ የእኔ ቦታዎች እና ደረሰኞች ሂድ'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
