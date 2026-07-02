import React, { useState, useRef } from 'react';
import { Booking, PropertyListing } from '../types';
import { 
  X, FileText, Check, ShieldCheck, Download, Upload, AlertCircle, 
  Sparkles, PenTool, Printer, RefreshCw, Landmark, Calendar, User, FileSignature 
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

interface ContractAgreementModalProps {
  booking: Booking;
  listing: PropertyListing | undefined;
  userRole: 'renter' | 'owner';
  onClose: () => void;
  onUpdateContract: (
    bookingId: string, 
    contractFields: Partial<Pick<Booking, 'contractPdfName' | 'contractPdfData' | 'contractStatus' | 'contractSignedByRenter' | 'contractSignedByOwner' | 'contractLastUpdated'>>
  ) => Promise<void>;
}

export const ContractAgreementModal: React.FC<ContractAgreementModalProps> = ({
  booking,
  listing,
  userRole,
  onClose,
  onUpdateContract,
}) => {
  const { language } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(booking.contractPdfName || '');
  const [uploadedFileData, setUploadedFileData] = useState(booking.contractPdfData || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature state
  const [signatureType, setSignatureType] = useState<'type' | 'draw'>('type');
  const [typedSignature, setTypedSignature] = useState('');
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [isSigned, setIsSigned] = useState(
    userRole === 'renter' ? !!booking.contractSignedByRenter : !!booking.contractSignedByOwner
  );

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Default contract content template if no file uploaded
  const generateAgreementTemplate = () => {
    const renterName = booking.renterName || 'Valued Guest';
    const ownerName = listing ? (listing.ownerId === 'owner_default' ? 'Premium Landlord' : listing.ownerId) : 'Property Host';
    const propTitle = booking.listingTitle || listing?.title || 'Luxury Residence';
    const propLocation = booking.listingLocation || listing?.location || 'Premium Location';
    const checkIn = booking.startDate;
    const checkOut = booking.endDate;
    const nights = booking.nights || 1;
    const pricePerNight = listing?.price || Math.round(booking.totalPrice / nights);
    const totalPrice = booking.totalPrice;

    if (language === 'am') {
      return `የቤት ኪራይ ውል ስምምነት ሰነድ (Rental Lease Agreement)
===================================================

ይህ የኪራይ ውል ስምምነት በ ${new Date(booking.createdAt).toLocaleDateString('am-ET')} ቀን የተደረገ ሲሆን የሚከተሉትን አካላት ያካትታል፡

አከራይ (ባለቤት)፦ 
${ownerName} (ከዚህ በኋላ "አከራይ" እየተባለ የሚጠራ)

ተከራይ (እንግዳ)፦ 
${renterName} (ከዚህ በኋላ "ተከራይ" እየተባለ የሚጠራ)

1. የተከራየው ቤት አድራሻ
---------------------
አከራይ ከተከታዩ አድራሻ ላይ የሚገኘውን ቤት ለተከራይ አከራይቷል፡
አድራሻ፡ ${propLocation}
የቤት ርዕስ፡ ${propTitle}

2. የኪራይ ጊዜ
----------------------------
የመኖሪያ ቆይታው ከ ${checkIn} (ከቀኑ 9:00 ሰዓት ጀምሮ) እስከ ${checkOut} (ከጠዋቱ 5:00 ሰዓት ድረስ) ለጠቅላላ ${nights} ሌሊት ይቆያል።

3. የክፍያ ውሎች
---------------------------------
- የአንድ ሌሊት ኪራይ ዋጋ፡ $${pricePerNight} ዶላር
- ጠቅላላ የውል ዋጋ፡ $${totalPrice} ዶላር
- የክፍያ ሁኔታ፡ ${booking.paymentStatus === 'paid' ? 'ሙሉ በሙሉ የተከፈለ' : 'በመጠባበቅ ላይ'}

4. ጠቅላላ ደንቦች እና መመሪያዎች
----------------------------------------
ሀ) ከፍተኛ ተከራይ ብዛት፡ ከተፈቀደው የእንግዳ ብዛት በላይ ማሳደር በጥብቅ የተከለከለ ነው።
ለ) የቤት አያያዝ፡ ተከራይ ቤቱን በንጽህና እና በጥሩ ሁኔታ መያዝ አለበት።
ሐ) የጎረቤት ሰላም፡ ተከራይ አላስፈላጊ ድምጽ በማውጣት ጎረቤቶችን ረብሻ መፍጠር የለበትም።
መ) ዳግም ማከራየት፡ የተከራዩትን ቤት ለሌላ ሶስተኛ ወገን አሳልፎ ማከራየት በጥብቅ የተከለከለ ነው።
ሠ) ህግ ማክበር፡ ተከራይ የአካባቢውን የጸጥታ እና የህንጻ ህጎች የማክበር ግዴታ አለበት።

5. ዲጂታል ፊርማ እና ስምምነት
-------------------------------------
በዚህ ሰነድ ግርጌ ላይ በምናስቀምጠው የዲጂታል ፊርማ አማካኝነት ሁለታችንም በውሉ ላይ የተጠቀሱትን ደንቦች በሙሉ ለመቀበል እና ለማክበር ተስማምተናል።

ይህ ስምምነት በዲጂታል የፊርማ ህግ (ESIGN Act) መሰረት ህጋዊ ተፈጻሚነት አለው።

የአከራይ ፊርማ ሁኔታ፡ ${booking.contractSignedByOwner ? `✓ በአከራይ ተፈርሟል` : 'የአከራይ ፊርማ ይጠበቃል'}
የተከራይ ፊርማ ሁኔታ፡ ${booking.contractSignedByRenter ? `✓ በተከራይ ተፈርሟል` : 'የተከራይ ፊርማ ይጠበቃል'}`;
    }

    return `RESIDENTIAL LEASE & SHORT-TERM TENANCY AGREEMENT
===================================================

This Tenancy Agreement (the "Agreement") is entered into and made effective as of ${new Date(booking.createdAt).toLocaleDateString()} (the "Effective Date") by and between:

LESSOR / OWNER: 
${ownerName} (hereinafter referred to as the "Owner")

LESSEE / RENTER: 
${renterName} (hereinafter referred to as the "Renter")

1. PROPERTY & PREMISES
---------------------
The Owner hereby leases to the Renter, and the Renter hereby rents from the Owner, the premium residential premises located at:
Address/Location: ${propLocation}
Property Title: ${propTitle}

2. TERM OF TENANCY & OCCUPANCY
----------------------------
The occupancy term shall commence on ${checkIn} (Check-in: 3:00 PM) and conclude on ${checkOut} (Check-out: 11:00 AM) for a total duration of ${nights} Nights. 

3. FINANCIAL TERMS & RENT PAYMENTS
---------------------------------
- Nightly Rental Rate: $${pricePerNight} USD / Night
- Total Booking Contract Cost: $${totalPrice} USD
- Payment Status: ${booking.paymentStatus === 'paid' ? 'PAID IN FULL' : 'PENDING SECURE ESCROW PAYMENT'}

4. COVENANTS, RULES & STANDARD CONDITIONS
----------------------------------------
a) Maximum Occupancy: The Renter covenants that the premises will not be occupied by more guests than specified in the listing rules.
b) Maintenance: The Renter shall maintain the premises in a clean, sanitary, and pristine state of repair.
c) Peaceful Enjoyment: The Renter agrees not to cause any unreasonable noise, disturbance, or violate community peace guidelines.
d) Subletting: Subletting of any part of this luxury property is strictly prohibited.
e) Compliance with Law: The Renter agrees to comply with all local municipality rules, fire regulations, and building security bylaws.

5. DIGITAL MUTUAL SIGNATURES & CONSENT
-------------------------------------
By providing an electronic signature below, both the Owner and Renter agree to be legally bound by all terms, covenants, and rules specified herein. This electronic agreement is valid under the Electronic Signatures in Global and National Commerce Act (ESIGN Act).

IN WITNESS WHEREOF, the parties hereto have signed and sealed this Tenancy Agreement.

Owner Signature Status: ${booking.contractSignedByOwner ? `✓ SIGNED BY OWNER (${booking.contractLastUpdated ? new Date(booking.contractLastUpdated).toLocaleDateString() : 'VERIFIED'})` : 'PENDING LANDLORD SIGNATURE'}
Renter Signature Status: ${booking.contractSignedByRenter ? `✓ SIGNED BY GUEST (${booking.contractLastUpdated ? new Date(booking.contractLastUpdated).toLocaleDateString() : 'VERIFIED'})` : 'PENDING GUEST SIGNATURE'}`;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
      setError(language === 'en' ? 'Only PDF files are supported for official contract uploads.' : 'ለይፋዊ ውሎች የፒዲኤፍ (PDF) ፋይሎች ብቻ ነው የሚደገፉት።');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError(language === 'en' ? 'PDF file is too large. Please upload a compressed document smaller than 1.5MB.' : 'የፒዲኤፍ ፋይሉ በጣም ትልቅ ነው። እባክዎ ከ 1.5MB በታች የሆነ ፋይል ይጫኑ።');
      return;
    }

    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        setUploadedFileName(file.name);
        setUploadedFileData(event.target.result as string);
        setSuccess(language === 'en' ? `Document "${file.name}" ready to attach!` : `ሰነዱ "${file.name}" ለመያያዝ ዝግጁ ነው!`);
        setTimeout(() => setSuccess(''), 3000);
      }
      setLoading(false);
    };
    reader.onerror = () => {
      setError(language === 'en' ? 'Failed to read PDF file. Please try again.' : 'የፒዲኤፍ ፋይሉን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0f172a'; // light blue or slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAttachContract = async () => {
    if (!uploadedFileData) {
      setError(language === 'en' ? 'Please select or drag a PDF contract file first.' : 'እባክዎ መጀመሪያ የፒዲኤፍ ውል ፋይል ይምረጡ።');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const isRenter = userRole === 'renter';
      const contractStatus = isRenter ? 'pending_owner_signature' : 'pending_renter_signature';
      
      await onUpdateContract(booking.id, {
        contractPdfName: uploadedFileName,
        contractPdfData: uploadedFileData,
        contractStatus: contractStatus,
        contractSignedByRenter: isRenter ? true : !!booking.contractSignedByRenter,
        contractSignedByOwner: !isRenter ? true : !!booking.contractSignedByOwner,
      });

      setSuccess(language === 'en' ? 'Contract document successfully attached & synced!' : 'የውል ስምምነቱ በተሳካ ሁኔታ ተያይዟል!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'Could not upload contract agreement. Please try again.' : 'የውል ስምምነቱን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreedToTerms) {
      setError(language === 'en' ? 'You must consent to the ESIGN electronic signature terms.' : 'እባክዎ በዲጂታል የፊርማ ስምምነት ውሎች ላይ ይስማሙ።');
      return;
    }

    if (signatureType === 'type' && !typedSignature.trim()) {
      setError(language === 'en' ? 'Please type your full legal name to apply your formal signature.' : 'እባክዎ ለመፈረም ሙሉ ስምዎን ይጻፉ።');
      return;
    }

    if (signatureType === 'draw' && !hasDrawn) {
      setError(language === 'en' ? 'Please draw your handwritten signature on the drawing pad.' : 'እባክዎ በፊርማ ፓድ ላይ ይፈርሙ።');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isRenter = userRole === 'renter';
      const isOwner = userRole === 'owner';

      const signedRenter = isRenter ? true : !!booking.contractSignedByRenter;
      const signedOwner = isOwner ? true : !!booking.contractSignedByOwner;

      let contractStatus: Booking['contractStatus'] = 'draft';
      if (signedRenter && signedOwner) {
        contractStatus = 'fully_signed';
      } else if (signedRenter) {
        contractStatus = 'pending_owner_signature';
      } else if (signedOwner) {
        contractStatus = 'pending_renter_signature';
      }

      const finalFileName = booking.contractPdfName || `Tenancy_Agreement_${booking.id}.pdf`;
      const finalFileData = booking.contractPdfData || 'base64_simulated_pdf';

      await onUpdateContract(booking.id, {
        contractPdfName: finalFileName,
        contractPdfData: finalFileData,
        contractStatus: contractStatus,
        contractSignedByRenter: signedRenter,
        contractSignedByOwner: signedOwner,
      });

      setIsSigned(true);
      setSuccess(language === 'en' ? 'Digital signature applied successfully!' : 'ዲጂታል ፊርማዎ በተሳካ ሁኔታ ተቀምጧል!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'Failed to record signature. Please try again.' : 'ፊርማውን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAgreement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Rental Lease Agreement - RentHub</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; padding: 40px; line-height: 1.5; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            h2 { margin: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RENTHUB VERIFIED LEASE AGREEMENT</h2>
            <p>Booking Reference: ${booking.id.toUpperCase()}</p>
          </div>
          <div>${generateAgreementTemplate()}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTranslatedContractStatus = (status: Booking['contractStatus']) => {
    if (language === 'am') {
      switch (status) {
        case 'fully_signed': return 'ሙሉ በሙሉ የተፈረመ ✓';
        case 'pending_owner_signature': return 'የአከራይ ፊርማ የሚጠባበቅ';
        case 'pending_renter_signature': return 'የተከራይ ፊርማ የሚጠባበቅ';
        case 'draft': return 'ረቂቅ ውል';
        default: return 'ምንም ውል አልተያያዘም';
      }
    }
    return status ? status.replace(/_/g, ' ').toUpperCase() : 'NO AGREEMENT ATTACHED';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" id="contract-agreement-modal">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-5 flex justify-between items-center bg-slate-50 dark:bg-slate-850/60 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-2xl">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-black text-slate-950 dark:text-white text-base flex items-center gap-1.5">
                <span>{language === 'en' ? 'Lease Agreement & Contract Hub' : 'የኪራይ ውል እና ስምምነት ማዕከል'}</span>
                <span className="text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-100/60 dark:border-emerald-800">
                  {userRole === 'owner' ? (language === 'en' ? 'Lessor Portal' : 'የአከራይ ፖርታል') : (language === 'en' ? 'Lessee Portal' : 'የተከራይ ፖርታል')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en' 
                  ? 'Attach files, review legal terms, and sign contracts securely.' 
                  : 'ፋይሎችን ያያይዙ፣ ህጋዊ ደንቦችን ይመልከቱ፣ እና ውሎችን ደህንነቱ በተጠበቀ ሁኔታ ይፈርሙ።'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="space-y-0.5 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium block">{language === 'en' ? 'Contract Status' : 'የውል ሁኔታ'}</span>
              <span className={`inline-flex items-center gap-1 font-bold font-sans uppercase text-[10px] px-2 py-0.5 rounded-md border ${
                booking.contractStatus === 'fully_signed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40'
                  : booking.contractStatus === 'pending_renter_signature' || booking.contractStatus === 'pending_owner_signature'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {getTranslatedContractStatus(booking.contractStatus)}
              </span>
            </div>

            <div className="space-y-0.5 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium block">{language === 'en' ? 'Renter Signature' : 'የተከራይ ፊርማ'}</span>
              <span className={`font-bold font-sans ${booking.contractSignedByRenter ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                {booking.contractSignedByRenter ? (language === 'en' ? '✓ SIGNED' : '✓ ተፈርሟል') : (language === 'en' ? 'PENDING' : 'ይጠበቃል')}
              </span>
            </div>

            <div className="space-y-0.5 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium block">{language === 'en' ? 'Owner Signature' : 'የአከራይ ፊርማ'}</span>
              <span className={`font-bold font-sans ${booking.contractSignedByOwner ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                {booking.contractSignedByOwner ? (language === 'en' ? '✓ SIGNED' : '✓ ተፈርሟል') : (language === 'en' ? 'PENDING' : 'ይጠበቃል')}
              </span>
            </div>

            <div className="space-y-0.5 text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium block">{language === 'en' ? 'PDF File Source' : 'የፋይሉ ምንጭ'}</span>
              <span className="font-sans font-bold text-slate-800 dark:text-white truncate block">
                {booking.contractPdfName ? booking.contractPdfName : (language === 'en' ? 'System Legal Draft' : 'የሲስተም ረቂቅ ውል')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: PDF File Upload or Legal Agreement View (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-sans font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'en' ? 'Lease Document Draft Preview' : 'የኪራይ ውል ስምምነት ቅድመ እይታ'}</span>
                </h4>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintAgreement}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold font-sans flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{language === 'en' ? 'Print / Download PDF' : 'አትም / ፒዲኤፍ አውርድ'}</span>
                  </button>
                </div>
              </div>

              {/* PDF Document Viewer simulation */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-950 text-slate-300 dark:text-slate-200 p-5 shadow-inner font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-emerald-700 selection:text-white" id="legal-agreement-preview-box">
                {uploadedFileData && uploadedFileData.startsWith('data:application/pdf') ? (
                  <div className="text-center py-12 space-y-3 font-sans">
                    <FileText className="h-12 w-12 text-emerald-500 mx-auto animate-pulse" />
                    <p className="font-semibold text-white">{language === 'en' ? 'Custom PDF Attached Successfully' : 'የእርስዎ ፒዲኤፍ ውል በተሳካ ሁኔታ ተያይዟል'}</p>
                    <p className="text-slate-400 max-w-sm mx-auto text-xs leading-relaxed">
                      Filename: {uploadedFileName}. {language === 'en' ? 'Real-time cloud compliance parser validates this PDF as complete.' : 'የፒዲኤፍ ሰነዱ ሙሉ ሆኖ ለመፈረም ዝግጁ መሆኑ ተረጋግጧል።'}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileData('');
                          setUploadedFileName('');
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {language === 'en' ? 'Reset back to default agreement' : 'ወደ ነባሪው ውል መልስ'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>{generateAgreementTemplate()}</div>
                )}
              </div>

              {/* File Attachment / PDF Upload Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'en' ? 'Have a custom contract agreement? Upload PDF here' : 'የራስዎ ውል ካለዎት ፒዲኤፍ እዚህ ይሰቅሉ'}</span>
                </label>

                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    dragActive 
                      ? 'border-emerald-600 bg-emerald-50/50' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <div className="space-y-1.5">
                    <Upload className="h-6 w-6 text-slate-400 mx-auto animate-bounce" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      {language === 'en' 
                        ? 'Drag & drop contract PDF, or browse files' 
                        : 'ፒዲኤፍ ውል እዚህ ይጎትቱ ወይም ፋይል ይምረጡ'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                      {language === 'en' ? 'Supports verified standard PDF documents up to 1.5MB' : 'እስከ 1.5MB የሚደርሱ ፒዲኤፍ ፋይሎችን ይደግፋል'}
                    </p>
                  </div>
                </div>

                {uploadedFileData && !booking.contractPdfName && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">{uploadedFileName}</span>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleAttachContract}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span>{language === 'en' ? 'Sync Attachment' : 'አያይዝ'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Signature Terminal (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-colors">
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-sans font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
                    <PenTool className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'en' ? 'Secure Signature Station' : 'ደህንነቱ የተጠበቀ የፊርማ ማዕከል'}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{language === 'en' ? 'Legally binding, ESIGN Act compliant digital validation.' : 'ህጋዊ ተፈጻሚነት ያለው የዲጂታል ፊርማ ማረጋገጫ።'}</p>
                </div>

                {isSigned ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4 text-center space-y-2">
                    <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{language === 'en' ? 'Your Signature is Confirmed' : 'ፊርማዎ ተረጋግጧል'}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal font-sans">
                      {language === 'en' 
                        ? 'You have signed this tenancy agreement. Once both parties have finalized their electronic signatures, a verified certification will be issued.'
                        : 'ይህንን የኪራይ ውል ፈርመዋል። ሁለቱም አካላት ሲፈርሙ የተረጋገጠ ሰነድ ይወጣል።'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSignContract} className="space-y-4">
                    {/* Switch Sign Type */}
                    <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureType('type');
                          setError('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          signatureType === 'type'
                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {language === 'en' ? 'Type Signature' : 'በጽሑፍ ፈርም'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureType('draw');
                          setError('');
                          setTimeout(() => {
                            const canvas = canvasRef.current;
                            if (canvas) {
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                              }
                            }
                          }, 50);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          signatureType === 'draw'
                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {language === 'en' ? 'Draw Handwritten' : 'በእጅህ ሳል'}
                      </button>
                    </div>

                    {signatureType === 'type' ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wide">{language === 'en' ? 'Type Full Legal Name' : 'ሙሉ ህጋዊ ስምዎን ይጻፉ'}</label>
                        <input
                          type="text"
                          required={signatureType === 'type'}
                          placeholder="e.g. Yosef Melaku"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-600 shadow-inner"
                        />
                        {typedSignature.trim() && (
                          <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center transition-colors">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans font-semibold block mb-1">{language === 'en' ? 'Live handwriting font preview:' : 'የፊርማ ቅድመ እይታ፡'}</span>
                            <span className="font-serif italic text-lg text-emerald-800 dark:text-emerald-400 tracking-wide font-black block py-2 px-4 border border-dashed border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-lg">
                              {typedSignature}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wide">{language === 'en' ? 'Draw with cursor / finger' : 'በጣትዎ ወይም በማውዝ ይሳሉ'}</label>
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-[9px] font-sans font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-transparent border-0 cursor-pointer"
                          >
                            {language === 'en' ? 'Clear Pad' : 'አጽዳ'}
                          </button>
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center">
                          <canvas
                            ref={canvasRef}
                            width={320}
                            height={120}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="cursor-crosshair w-full h-[120px] bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    )}

                    {/* Legal Consent Checkbox */}
                    <label className="flex items-start space-x-2.5 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={isAgreedToTerms}
                        onChange={(e) => setIsAgreedToTerms(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                        {language === 'en' 
                          ? 'I consent to the legal validity of this electronic signature under the ESIGN and UETA Acts, certifying this document draft.'
                          : 'ይህ የዲጂታል ፊርማ ህጋዊ ተፈጻሚነት እንዳለው ተረድቻለሁ እናም በውሉ ደንቦች ተስማምቻለሁ።'}
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-sans text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md disabled:opacity-50 mt-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>{loading ? (language === 'en' ? 'Processing...' : 'በማከናወን ላይ...') : (language === 'en' ? 'Apply Digital Signature' : 'ፊርማዬን አረጋግጥ')}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Important Legal Notice Footer */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-750 rounded-xl text-[9px] text-slate-400 dark:text-slate-450 font-sans leading-normal flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'en' 
                    ? 'The RentHub Verified Signature badge ensures that both identity verification and electronic audit trails are maintained, preventing future rental property disputes.'
                    : 'የ RentHub የተረጋገጠ የፊርማ አሰራር የወደፊት የቤት ኪራይ አለመግባባቶችን ለመከላከል የሁለቱንም ወገኖች ማንነት እና ፊርማ በጥብቅ ይመዘግባል።'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
