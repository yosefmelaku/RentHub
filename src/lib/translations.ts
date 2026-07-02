export type Language = 'en' | 'am';

export interface TranslationSet {
  // Common UI Elements
  brandName: string;
  slogan: string;
  explore: string;
  myBookings: string;
  ownerPortal: string;
  signOut: string;
  welcome: string;
  roleRenter: string;
  roleOwner: string;
  themeLight: string;
  themeDark: string;

  // Auth Page
  dontHaveAccount: string;
  landlordSignUp: string;
  landlordLogin: string;
  notLandlordRenter: string;
  areYouLandlord: string;
  loginWithFacebook: string;
  loginWithApple: string;
  continueWithGoogle: string;
  orEmailDetails: string;
  fullName: string;
  email: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  rememberMe: string;
  forgotPassword: string;
  logInBtn: string;
  signUpBtn: string;
  processing: string;

  // Property Details / Reviews
  verifiedGuestReviews: string;
  ratingScore: string;
  noReviewsYet: string;
  rateThisProperty: string;
  yourScoreRating: string;
  reviewCommentPlaceholder: string;
  submitReview: string;
  publishingReview: string;
  signInToRate: string;
  signedInUsersOnly: string;
  pricePerNight: string;
  nightsCount: string;
  totalPrice: string;
  bookNow: string;

  // Dashboards
  leaseAgreementHub: string;
  contractStatus: string;
  renterSignature: string;
  ownerSignature: string;
  signLease: string;
  leaseActive: string;
  stats: string;
  listings: string;
  bookings: string;
  addListing: string;
  totalRevenue: string;
  activeBookings: string;
  averageRating: string;
  yourProperties: string;
  addNewProperty: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: string;
  propertyBedrooms: string;
  propertyBathrooms: string;
  propertyDescription: string;
  propertyImage: string;
  submitListing: string;
  deleteBtn: string;
}

export const translations: Record<Language, TranslationSet> = {
  en: {
    brandName: "RentHub",
    slogan: "Premium House Rental & Lease Network",
    explore: "Explore",
    myBookings: "My Bookings",
    ownerPortal: "Owner Portal",
    signOut: "Sign Out",
    welcome: "Welcome back",
    roleRenter: "Renter",
    roleOwner: "Landlord",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",

    dontHaveAccount: "Don't have an account?",
    landlordSignUp: "Landlord Sign Up",
    landlordLogin: "Landlord Login",
    notLandlordRenter: "Not a landlord? Log in as a renter.",
    areYouLandlord: "Are you a landlord? Log in as a landlord.",
    loginWithFacebook: "Log in with Facebook",
    loginWithApple: "Log in with Apple",
    continueWithGoogle: "Continue with Google",
    orEmailDetails: "or email details",
    fullName: "Full Name",
    email: "Email",
    password: "Password",
    showPassword: "Show",
    hidePassword: "Hide",
    rememberMe: "Remember Me",
    forgotPassword: "Forgot Password?",
    logInBtn: "LOG IN",
    signUpBtn: "SIGN UP",
    processing: "PROCESSING...",

    verifiedGuestReviews: "Guest Reviews & Ratings",
    ratingScore: "Rating",
    noReviewsYet: "No guest reviews submitted yet. Be the first to leave a review!",
    rateThisProperty: "Rate this Property Listing",
    yourScoreRating: "Your score rating:",
    reviewCommentPlaceholder: "Tell future guests about your experience at this home, the service quality, amenities...",
    submitReview: "Submit Review",
    publishingReview: "Publishing...",
    signInToRate: "Please Sign In to Rate Service",
    signedInUsersOnly: "Signed-in users can write a review & rate the properties.",
    pricePerNight: "per night",
    nightsCount: "nights",
    totalPrice: "Total Price",
    bookNow: "Secure Instantly",

    leaseAgreementHub: "Lease Agreement & Contract Hub",
    contractStatus: "Contract Status",
    renterSignature: "Renter Signature",
    ownerSignature: "Owner Signature",
    signLease: "Sign Lease",
    leaseActive: "Lease Active ✓",
    stats: "Dashboard Stats",
    listings: "My Properties",
    bookings: "Reservation Requests",
    addListing: "Publish New Listing",
    totalRevenue: "Total Earnings",
    activeBookings: "Confirmed Bookings",
    averageRating: "Reputation Index",
    yourProperties: "Your Properties",
    addNewProperty: "Add New Property Listing",
    propertyTitle: "Property Title",
    propertyLocation: "Location / Neighborhood",
    propertyPrice: "Price per Night ($ USD)",
    propertyBedrooms: "Bedrooms Count",
    propertyBathrooms: "Bathrooms Count",
    propertyDescription: "Detailed Description & Rules",
    propertyImage: "Property Image Showcase URL",
    submitListing: "Publish Property Listing",
    deleteBtn: "Remove",
  },
  am: {
    brandName: "ሬንት-ሀብ (RentHub)",
    slogan: "ዘመናዊ የቤት ኪራይ እና ውል ስምምነት መድረክ",
    explore: "ቤቶች ፈልግ",
    myBookings: "የተከራየኋቸው ቤቶች",
    ownerPortal: "የአከራይ መግቢያ",
    signOut: "ውጣ",
    welcome: "እንኳን ደህና መጡ",
    roleRenter: "ተከራይ",
    roleOwner: "አከራይ",
    themeLight: "ብርሃን ገጽታ (Light)",
    themeDark: "ጨለማ ገጽታ (Dark)",

    dontHaveAccount: "አካውንት የሎትም?",
    landlordSignUp: "የአከራይ ምዝገባ",
    landlordLogin: "የአከራይ መግቢያ",
    notLandlordRenter: "አከራይ አይደሉም? እንደ ተከራይ ይግቡ።",
    areYouLandlord: "አከራይ ነዎት? እንደ አከራይ ይግቡ።",
    loginWithFacebook: "በፌስቡክ ይግቡ",
    loginWithApple: "በአፕል ይግቡ",
    continueWithGoogle: "በጉግል ይቀጥሉ",
    orEmailDetails: "ወይም በኢሜይል ዝርዝር",
    fullName: "ሙሉ ስም",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    showPassword: "አሳይ",
    hidePassword: "ደብቅ",
    rememberMe: "አስታውሰኝ",
    forgotPassword: "የይለፍ ቃል ረሱ?",
    logInBtn: "ይግቡ",
    signUpBtn: "ይመዝገቡ",
    processing: "በማቀናበር ላይ...",

    verifiedGuestReviews: "የተከራዮች አስተያየት እና ደረጃ",
    ratingScore: "ደረጃ",
    noReviewsYet: "ምንም አስተያየት እስካሁን አልተሰጠም። የመጀመሪያው አስተያየት ሰጪ ይሁኑ!",
    rateThisProperty: "ይህን ቤት ደረጃ ይስጡት",
    yourScoreRating: "የእርስዎ ደረጃ አሰጣጥ:",
    reviewCommentPlaceholder: "ስለ ቤቱ፣ ስለ አገልግሎቱ፣ ስላላቸው ምቹ ነገሮች ለቀጣይ ተከራዮች ያጋሩ...",
    submitReview: "አስተያየት አስገባ",
    publishingReview: "በማስገባት ላይ...",
    signInToRate: "እባክዎ ደረጃ ለመስጠት መጀመሪያ ይግቡ",
    signedInUsersOnly: "የገቡ ተጠቃሚዎች ብቻ አስተያየት መስጠት እና ደረጃ መገምገም ይችላሉ።",
    pricePerNight: "በአንድ ሌሊት",
    nightsCount: "ሌሊቶች",
    totalPrice: "ጠቅላላ ዋጋ",
    bookNow: "አሁንኑ ያዝዙ",

    leaseAgreementHub: "የቤት ኪራይ ውል ስምምነት ማዕከል",
    contractStatus: "የውሉ ሁኔታ",
    renterSignature: "የተከራይ ፊርማ",
    ownerSignature: "የአከራይ ፊርማ",
    signLease: "ውል ይፈርሙ",
    leaseActive: "ውሉ ጸድቋል ✓",
    stats: "የስራ እንቅስቃሴ መረጃ",
    listings: "የእኔ ቤቶች",
    bookings: "የኪራይ ጥያቄዎች",
    addListing: "አዲስ ቤት ያውጡ",
    totalRevenue: "ጠቅላላ ገቢ",
    activeBookings: "የተረጋገጡ ኪራዮች",
    averageRating: "አጠቃላይ የአገልግሎት ደረጃ",
    yourProperties: "የእርስዎ ቤቶች",
    addNewProperty: "አዲስ የቤት ኪራይ መግለጫ ይጨምሩ",
    propertyTitle: "የቤቱ ስም / ርዕስ",
    propertyLocation: "አካባቢ / ሰፈር",
    propertyPrice: "የአንድ ሌሊት ኪራይ ዋጋ (በዶላር $)",
    propertyBedrooms: "የመኝታ ክፍሎች ብዛት",
    propertyBathrooms: "የመታጠቢያ ክፍሎች ብዛት",
    propertyDescription: "ዝርዝር መግለጫ እና የቤቱ ደንቦች",
    propertyImage: "የቤቱ ማሳያ ምስል URL",
    submitListing: "የቤት ኪራዩን ይፋ አድርግ",
    deleteBtn: "አስወግድ",
  }
};
