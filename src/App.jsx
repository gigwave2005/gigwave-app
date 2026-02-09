import './styles/rockTheme.css';
import bgImage from './assets/bg-gig-collage.jpg';  // ADD THIS LINE
import cassetteIcon from './assets/cassette-icon.png'; 
import voteIcon from './assets/vote-icon.png';
import artistProfileIcon from './assets/artist-profile-icon.png';
import rateArtistIcon from './assets/rate-artist-icon.png';
import tipJarIcon from './assets/tip-jar-icon.png';
import supportIcon from './assets/support-icon.png';
import supportArtistIcon from './assets/support-artist-icon.png';
import React, { useState, useEffect } from 'react';
import AddressAutocomplete from './components/AddressAutocomplete';
import { Music, Plus, Trash2, Play, Users, Calendar, Heart, Star, Zap, X, Search, Upload, Settings, Edit2, Check, Mail, Lock, ArrowLeft, MapPin, Navigation, DollarSign, Eye } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import { FaInstagram, FaFacebook, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { increment, setDoc } from 'firebase/firestore';

// Import Firebase utilities
import {
  auth,
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteGigFromFirebase,
  markAsInterested,
  unmarkAsInterested,
  getInterestedCount,
  arrayUnion,
  onAuthStateChanged,
  signInWithGoogle,
  signInWithFacebook,
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getUserLocation,
  calculateDistance,
  isWithinRange,
  searchNearbyGigs,
  createLiveGig,
  updateGigToLive,
  extendGigTime,
  listenToLiveGig,
  voteForSong as firebaseVoteForSong,
  addComment as firebaseAddComment,
  processDonation as firebaseProcessDonation,
  endLiveGig as firebaseEndLiveGig,
  checkAndSwapSongs,
  checkAndCancelExpiredGigs,
  serverTimestamp,
  GeoPoint,
  hasUserVoted,
  recordUserVote,
  getActiveLiveGigForArtist,
  saveArtistProfile,
  getArtistProfile,
  isProfileComplete,
  sendEmailVerification,
  checkEmailVerified,
  uploadProfilePhoto,
  // 🎵 NEW SONG REQUEST FUNCTIONS
  submitSongRequest,
  acceptSongRequest,
  rejectSongRequest,
  updateJukeboxSettings,
  getSortedSongRequests,
  saveMasterPlaylist,
  getMasterPlaylist,
  saveGigPlaylists,
  getGigPlaylists,
  listenToPlaylists,
} from './firebase-utils';

// 🔍 EXPOSE FIREBASE FOR DEBUGGING
window.db = db;
window.auth = auth;

// Visitor Counter Function
const incrementVisitorCount = async () => {
  try {
    const counterRef = doc(db, 'siteStats', 'visitorCount');
    
    // Check if document exists
    const counterSnap = await getDoc(counterRef);
    
    if (counterSnap.exists()) {
      // Increment existing count
      await updateDoc(counterRef, {
        count: increment(1),
        lastVisit: serverTimestamp()
      });
    } else {
      // Create new counter
      await setDoc(counterRef, {
        count: 1,
        lastVisit: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating visitor count:', error);
  }
};

// Fetch current visitor count
const fetchVisitorCount = async () => {
  try {
    const counterRef = doc(db, 'siteStats', 'visitorCount');
    const counterSnap = await getDoc(counterRef);
    
    if (counterSnap.exists()) {
      return counterSnap.data().count;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    return 0;
  }
};

// Social Media Follow Buttons Component
const SocialFollowButtons = ({ socialMedia, artistName }) => {
  if (!socialMedia || !Object.values(socialMedia).some(v => v)) {
    return null; // Don't show if no social links
  }

  // Near line 123, right after all the imports and BEFORE the CFG line

  // 🔍 DEBUG: Expose Firebase to browser console for inspection
  window.db = db;
  window.auth = auth;
  console.log('✅ Firebase exposed to window for debugging');

  const CFG = { app: 'GigWave', fee: 0.15, jbFee: 5, tips: [5,10,20,50] };

  const getSocialUrl = (platform, value) => {
    if (!value) return null;
    
    // If already a full URL, return as-is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    // Convert username/handle to full URL
    switch(platform) {
      case 'instagram':
        return `https://instagram.com/${value.replace('@', '')}`;
      case 'facebook':
        return value.includes('facebook.com') ? value : `https://facebook.com/${value}`;
      case 'twitter':
        return `https://twitter.com/${value.replace('@', '')}`;
      case 'youtube':
        return value.includes('youtube.com') ? value : `https://youtube.com/${value}`;
      case 'spotify':
        return value.includes('spotify.com') ? value : `https://open.spotify.com/artist/${value}`;
      case 'tiktok':
        return `https://tiktok.com/@${value.replace('@', '')}`;
      case 'soundcloud':
        return `https://soundcloud.com/${value}`;
      default:
        return value;
    }
  };

  const platforms = [
    { key: 'instagram', icon: '📷', name: 'Instagram', color: 'from-purple-500 to-pink-500' },
    { key: 'facebook', icon: '👍', name: 'Facebook', color: 'from-blue-600 to-blue-500' },
    { key: 'spotify', icon: '🎵', name: 'Spotify', color: 'from-green-600 to-green-500' },
    { key: 'youtube', icon: '📺', name: 'YouTube', color: 'from-red-600 to-red-500' },
    { key: 'twitter', icon: '🐦', name: 'Twitter', color: 'from-sky-500 to-blue-500' },
    { key: 'tiktok', icon: '🎬', name: 'TikTok', color: 'from-black to-pink-500' },
    { key: 'soundcloud', icon: '🎧', name: 'SoundCloud', color: 'from-orange-600 to-orange-500' }
  ];

  return (
    <div className="space-y-3">
      <p className="text-electric font-bold text-sm uppercase tracking-wider">
        🔗 Follow {artistName}
      </p>
      <div className="flex flex-wrap gap-2">
        {platforms.map(platform => {
          const url = getSocialUrl(platform.key, socialMedia[platform.key]);
          if (!url) return null;
          
          return (
            <a
              key={platform.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 bg-gradient-to-r ${platform.color} hover:opacity-80 text-white rounded-lg font-bold text-sm transition-all hover:scale-105 flex items-center gap-2`}
            >
              <span>{platform.icon}</span>
              <span>{platform.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const CFG = { app: 'GigWave', fee: 0.15, jbFee: 5, tips: [5,10,20,50] };

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [masterSortBy, setMasterSortBy] = useState('default');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authUserType, setAuthUserType] = useState('audience'); // 'artist' or 'audience'
  
  // Mode state
  const [mode, setMode] = useState('discover');
  const [tab, setTab] = useState('master');
  
  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyGigs, setNearbyGigs] = useState([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGigs, setFilteredGigs] = useState([]);
  
  // Artist data
  const [masterSongs, setMasterSongs] = useState([]);
  const [gigPlaylists, setGigPlaylists] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [showGigModal, setShowGigModal] = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [itunesSearch, setItunesSearch] = useState('');
  const [itunesResults, setItunesResults] = useState([]);
  const [searchingItunes, setSearchingItunes] = useState(false);
  const [hasRatedArtist, setHasRatedArtist] = useState(false);
  const [currentGigRating, setCurrentGigRating] = useState(0);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [artistSuggestions, setArtistSuggestions] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
  const [showingArtistResults, setShowingArtistResults] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  
  // Venue location state
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [capturingGPS, setCapturingGPS] = useState(false);
  
  // Live gig state
  const [liveGig, setLiveGig] = useState(null);
  const [liveGigData, setLiveGigData] = useState({
    votes: {},
    comments: [],
    donations: [],
    queuedSongs: [],
    currentSong: null,
    playedSongs: []
  });
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [audienceTab, setAudienceTab] = useState('queue');
  const [selectedUpcomingGig, setSelectedUpcomingGig] = useState(null);
  const [showGigDetailModal, setShowGigDetailModal] = useState(false);
  const [interestedGigs, setInterestedGigs] = useState([]);
  const [isEndingGig, setIsEndingGig] = useState(false);
  const [savingGig, setSavingGig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasShownLiveAlert, setHasShownLiveAlert] = useState(false);
  const [liveTab, setLiveTab] = useState('queue'); // 'queue', 'requests', 'master'
  const [liveMasterSearch, setLiveMasterSearch] = useState(''); // ✅ ADD THIS LINE

  // Add with other state declarations
  const [showJukeboxSettings, setShowJukeboxSettings] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestSong, setSelectedRequestSong] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestsEnabled, setRequestsEnabled] = useState(true); // Toggle for requests
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [artistRating, setArtistRating] = useState(0);
  const [viewingArtistId, setViewingArtistId] = useState(null);
  const [viewingArtistProfile, setViewingArtistProfile] = useState(null);
  const [viewingArtistGigs, setViewingArtistGigs] = useState([]);
  const [showGigPlaylistModal, setShowGigPlaylistModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  const [showArtistProfileModal, setShowArtistProfileModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Profile state
const [artistProfile, setArtistProfile] = useState(null);
const [showProfileSetup, setShowProfileSetup] = useState(false);
const [profileStep, setProfileStep] = useState(1);
const [profileData, setProfileData] = useState({
  artistName: '',
  fullName: '',
  bio: '',
  profilePhoto: '',
  genre: '',
  location: '',
  socialMedia: {
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '', // ADD
    twitter: '',
    tiktok: '',
    soundcloud: ''
  }
});
const [emailVerified, setEmailVerified] = useState(false);
const [showEmailVerification, setShowEmailVerification] = useState(false);

// Contact Email Component - Shows on all pages
const ContactEmail = () => (
  <div className="mt-12 pt-8 border-t border-white/20 text-center">
    <p className="text-gray-300 text-sm mb-2">Questions or feedback?</p>
    <a 
      href="mailto:gig.wave.2005@gmail.com"
      className="text-cyan-400 hover:text-cyan-300 transition-colors text-base font-semibold"
    >
      📧 gig.wave.2005@gmail.com
    </a>
  </div>
);

// Calculate gig status based on date/time
const calculateGigStatus = (gig) => {
  if (gig.status === 'ended') return 'ended';
  if (gig.manuallyEnded) return 'ended';
  
  const now = new Date();
  
  // ✅ FIX: Use gigDate and gigTime (Firebase field names)
  const dateField = gig.gigDate || gig.date;
  const timeField = gig.gigTime || gig.time;
  
  if (!dateField || !timeField) {
    return gig.status || 'upcoming';
  }
  
  const gigDateTime = new Date(`${dateField}T${timeField}`);
  const timeDiff = now - gigDateTime;
  const hoursPassed = timeDiff / (1000 * 60 * 60);
  
  // If gig is currently live
  if (gig.status === 'live') {
    // Auto-end after 5 hours unless extended
    if (hoursPassed > 5 && !gig.timeExtended) {
      return 'ended';
    }
    return 'live';
  }
  
  // Future gig (upcoming)
  if (now < gigDateTime) {
    return 'upcoming';
  }
  
  // Within 5 hours of start time
  if (hoursPassed >= 0 && hoursPassed <= 5) {
    return 'checkVenue';
  }
  
  // More than 5 hours passed and never went live
  if (hoursPassed > 5) {
    return 'cancelled';
  }
  
  return 'upcoming';
};

  // ADD THIS useEffect for background
    useEffect(() => {
    // Set background image
    document.body.style.backgroundImage = `url(${bgImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    
    // Add gradient overlay for better readability
    const overlay = document.createElement('div');
    overlay.id = 'bg-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.01);
      z-index: -1;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
    
    return () => {
      document.body.style.backgroundImage = '';
      const overlayElement = document.getElementById('bg-overlay');
      if (overlayElement) overlayElement.remove();
    };
  }, []);

// Listen to auth changes and check profile
useEffect(() => {
  console.log('🔄 useEffect RUNNING - mode:', mode);
  
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log('👤 Auth state changed:', user ? user.email : 'No user');
    setCurrentUser(user);
    
    if (user) {
      // Check email verification
      setEmailVerified(user.emailVerified);
      console.log('📧 Email verified:', user.emailVerified);
      
      // Load artist profile
      try {
        console.log('📥 Loading profile for UID:', user.uid);
        const profile = await getArtistProfile(user.uid);
        console.log('📦 Profile loaded:', profile);
        setArtistProfile(profile);
        
        // ✅ REMOVED: Live gig detection (now handled by polling useEffect)
        // The polling useEffect will handle setting mode to 'live'
        
        // Check if profile is complete for artist mode
        if (mode === 'artist') {
          console.log('🔍 Checking if profile is complete...');
          const complete = await isProfileComplete(user.uid);
          console.log('✅ Profile complete?', complete);
          
          if (!complete) {
            console.log('🎸 ✅ SHOWING PROFILE SETUP MODAL');
            setShowProfileSetup(true);
          }
        }
      } catch (error) {
        console.error('❌ Error loading profile:', error);
      }
    } else {
      console.log('👤 No user - clearing profile');
      setArtistProfile(null);
      
      // Only force discover if in artist mode
      if (mode === 'artist') {
        setMode('discover');
      }
    }
    
    setAuthLoading(false);
    console.log('✅ Auth loading complete');
  });
  
  return () => {
    console.log('🧹 Cleaning up auth listener');
    unsubscribe();
  };
}, [mode]); // Keep mode dependency

// Track visitor count on page load
useEffect(() => {
  const trackVisit = async () => {
    // Check if this is a new session (using sessionStorage)
    const hasVisited = sessionStorage.getItem('GigWave_visited');
    
    if (!hasVisited) {
      // New session - increment counter
      await incrementVisitorCount();
      sessionStorage.setItem('GigWave_visited', 'true');
    }
    
    // Fetch and display current count
    const count = await fetchVisitorCount();
    setVisitorCount(count);
  };
  
  trackVisit();
}, []);

// ============================================
//    ADMIN DASHBOARD KEYBOARD SHORTCUT
// ============================================
useEffect(() => {
  const handleKeyPress = (e) => {
    // Press Ctrl+Shift+A to open admin dashboard
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      if (currentUser?.email === 'gig.wave.2005@gmail.com') {
        setShowAdminDashboard(true);
      }
    }
    
    // Press Escape to close admin dashboard
    if (e.key === 'Escape' && showAdminDashboard) {
      setShowAdminDashboard(false);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [currentUser, showAdminDashboard]);

// Auto-check email verification status when profile setup is open
useEffect(() => {
  if (showProfileSetup && currentUser && !emailVerified) {
    // Check every 5 seconds if email is verified
    const interval = setInterval(async () => {
      console.log('🔄 Checking email verification status...');
      const verified = await checkEmailVerified();
      
      if (verified) {
        setEmailVerified(true);
        console.log('✅ Email verified!');
        alert('✅ Email verified! You can now complete your profile.');
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }
}, [showProfileSetup, currentUser, emailVerified]);

// Save mode to localStorage whenever it changes
useEffect(() => {
  if (mode) {
    localStorage.setItem('GigWave_mode', mode);
    console.log('💾 Saved mode to localStorage:', mode);
  }
}, [mode]);

// Listen to live gig updates
useEffect(() => {
  if (!liveGig?.id) return;
  
  const unsubscribe = listenToLiveGig(liveGig.id, async (gigData) => {
    console.log('🎵 Live gig update received');
    
    setLiveGigData({
      votes: gigData.votes || {},
      comments: gigData.comments || [],
      donations: gigData.donations || [],
      queuedSongs: gigData.queuedSongs || [],
      masterPlaylist: gigData.masterPlaylist || [],
      currentSong: gigData.currentSong || null,
      playedSongs: gigData.playedSongs || [],
      scheduledEndTime: gigData.scheduledEndTime || null,
      scheduledEndTimeMs: gigData.scheduledEndTimeMs || null,  // ✅ ADD THIS LINE
      songRequests: gigData.songRequests || [],
      requestsEnabled: gigData.requestsEnabled !== false,
      jukeboxMode: gigData.jukeboxMode || false,
      jukeboxPrice: gigData.jukeboxPrice || 0,
      maxQueueSize: gigData.maxQueueSize || 20,
      lastVoteTime: gigData.lastVoteTime || {},
      audienceTracking: gigData.audienceTracking || {
        totalJoins: 0,
        currentlyActive: 0,
        joinedUsers: {}
      }
    });
    
    // Auto-swap songs if artist is viewing
    if (currentUser?.uid === gigData.artistId) {
      console.log('✅ Artist viewing - triggering swap check');
      await checkAndSwapSongs(liveGig.id, gigData);
    } else {
      console.log('❌ Not artist - skipping swap');
    }
  });
  
  return () => unsubscribe();
}, [liveGig?.id, currentUser]);

  // Auto-end timer check
  useEffect(() => {
    if (!liveGig?.id || mode !== 'live' || isEndingGig) return;
    
    const checkTimer = async () => {
      // ✅ PRIORITY 1: Use milliseconds timestamp (most reliable)
      if (liveGigData.scheduledEndTimeMs) {
        const nowMs = Date.now();
        const endTimeMs = liveGigData.scheduledEndTimeMs;
        const remainingMs = endTimeMs - nowMs;
        const remainingMinutes = Math.floor(remainingMs / 60000);
        
        console.log('⏰ Timer check (using MS):', {
          nowMs,
          endTimeMs,
          remainingMs,
          remainingMinutes,
          nowTime: new Date(nowMs).toISOString(),
          endTime: new Date(endTimeMs).toISOString()
        });
        
        setTimeRemaining(remainingMinutes);
        
        // Show warning at 10 minutes
        if (remainingMinutes <= 10 && remainingMinutes > 0 && !showTimeWarning) {
          setShowTimeWarning(true);
          alert(`⚠️ Your gig will auto-end in ${remainingMinutes} minutes!\n\nClick "Add 1 Hour" to extend.`);
        }
        
        // Auto-end at 0
        if (remainingMinutes <= 0 && mode === 'live' && !isEndingGig) {
          console.log('⏰ AUTO-ENDING GIG - Time expired');
          try {
            await handleEndGig('⏰ Time limit reached! Your gig has been automatically ended.', true);
          } catch (error) {
            console.error('Error auto-ending gig:', error);
          }
        }
        
        return; // Exit early if we used milliseconds
      }
      
      // ✅ FALLBACK: Try to parse scheduledEndTime (backwards compatibility)
      if (!liveGigData.scheduledEndTime) {
        console.log('⚠️ No scheduledEndTime found');
        return;
      }
      
      const endTime = (() => {
        const st = liveGigData.scheduledEndTime;
        
        if (st instanceof Date) return st;
        if (st?.toDate && typeof st.toDate === 'function') return st.toDate();
        if (st?.seconds) return new Date(st.seconds * 1000);
        if (typeof st === 'number') return new Date(st);
        if (typeof st === 'string') return new Date(st);
        
        console.error('❌ Invalid scheduledEndTime:', st);
        return null;
      })();
      
      if (!endTime) {
        console.error('❌ Could not parse scheduledEndTime');
        return;
      }
      
      const now = new Date();
      const remaining = endTime - now;
      const remainingMinutes = Math.floor(remaining / 60000);
      
      console.log('⏰ Timer check (using Date fallback):', {
        now: now.toISOString(),
        endTime: endTime.toISOString(),
        remainingMinutes
      });
      
      setTimeRemaining(remainingMinutes);
      
      if (remainingMinutes <= 10 && remainingMinutes > 0 && !showTimeWarning) {
        setShowTimeWarning(true);
        alert(`⚠️ Your gig will auto-end in ${remainingMinutes} minutes!\n\nClick "Add 1 Hour" to extend.`);
      }
      
      if (remainingMinutes <= 0 && mode === 'live' && !isEndingGig) {
        console.log('⏰ AUTO-ENDING GIG - Time expired');
        try {
          await handleEndGig('⏰ Time limit reached! Your gig has been automatically ended.', true);
        } catch (error) {
          console.error('Error auto-ending gig:', error);
        }
      }
    };
    
    checkTimer();
    const interval = setInterval(checkTimer, 60000);
    
    return () => clearInterval(interval);
  }, [liveGig?.id, liveGigData.scheduledEndTimeMs, liveGigData.scheduledEndTime, mode, showTimeWarning, isEndingGig]); // ← ADD isEndingGig to dependencies

  // Get user location on mount
  useEffect(() => {
    getUserLocation()
      .then(loc => setUserLocation(loc))
      .catch(err => console.log('Location not available:', err));
  }, []);

  // Auto-refresh discovery page every 30 seconds
  useEffect(() => {
    if (mode !== 'discover' || nearbyGigs.length === 0 || !userLocation) {
      return;
    }
    
    console.log('🔄 Starting auto-refresh for discovery page');
    
    const refreshGigs = async () => {
      if (document.hidden) return; // Don't refresh if tab is hidden
      
      try {
        console.log('🔄 Auto-refreshing gigs...');
        const gigs = await searchNearbyGigs(userLocation, 50);
        
        const activeGigs = gigs.filter(gig => {
          const status = calculateGigStatus(gig);
          return ['live', 'checkVenue', 'upcoming'].includes(status);
        });
        
        setNearbyGigs(gigs);
        setFilteredGigs(gigs);
        
        console.log('✅ Refresh complete:', activeGigs.length, 'active gigs');
      } catch (error) {
        console.error('❌ Auto-refresh error:', error);
      }
    };
    
    const interval = setInterval(refreshGigs, 30000); // Every 30 seconds
    
    return () => {
      console.log('🛑 Stopping auto-refresh');
      clearInterval(interval);
    };
  }, [mode, nearbyGigs.length, userLocation]);

  // ✅ ENHANCED: Load playlists from Firebase + Migrate from localStorage if needed
  useEffect(() => {
    if (!currentUser) return;
    
    const loadAndMigratePlaylists = async () => {
      try {
        console.log('📥 Loading playlists from Firebase...');
        
        // Try loading from Firebase first
        const firebaseMasterSongs = await getMasterPlaylist(currentUser.uid);
        const firebaseGigPlaylists = await getGigPlaylists(currentUser.uid);
        
        console.log('📦 From Firebase:', firebaseMasterSongs.length, 'songs,', firebaseGigPlaylists.length, 'playlists');
        
        // Check localStorage for data that might not be in Firebase
        const localMasterSongs = localStorage.getItem(`GigWave_songs_${currentUser.uid}`);
        const localGigPlaylists = localStorage.getItem(`GigWave_playlists_${currentUser.uid}`);
        
        console.log('📦 From localStorage:', 
          localMasterSongs ? JSON.parse(localMasterSongs).length : 0, 'songs,',
          localGigPlaylists ? JSON.parse(localGigPlaylists).length : 0, 'playlists'
        );
        
        let finalMasterSongs = firebaseMasterSongs;
        let finalGigPlaylists = firebaseGigPlaylists;
        let needsMigration = false;
        
        // MIGRATION: If Firebase is empty but localStorage has data, migrate it
        if (firebaseMasterSongs.length === 0 && localMasterSongs) {
          const parsedSongs = JSON.parse(localMasterSongs);
          if (parsedSongs.length > 0) {
            console.log('🔄 Migrating master songs from localStorage to Firebase...');
            finalMasterSongs = parsedSongs;
            needsMigration = true;
          }
        }
        
        if (firebaseGigPlaylists.length === 0 && localGigPlaylists) {
          const parsedPlaylists = JSON.parse(localGigPlaylists);
          if (parsedPlaylists.length > 0) {
            console.log('🔄 Migrating gig playlists from localStorage to Firebase...');
            finalGigPlaylists = parsedPlaylists;
            needsMigration = true;
          }
        }
        
        // Set state
        setMasterSongs(finalMasterSongs);
        setGigPlaylists(finalGigPlaylists);
        
        // If migration needed, save to Firebase
        if (needsMigration) {
          console.log('💾 Saving migrated data to Firebase...');
          
          if (finalMasterSongs.length > 0) {
            await saveMasterPlaylist(currentUser.uid, finalMasterSongs);
            console.log('✅ Master songs migrated:', finalMasterSongs.length);
          }
          
          if (finalGigPlaylists.length > 0) {
            await saveGigPlaylists(currentUser.uid, finalGigPlaylists);
            console.log('✅ Gig playlists migrated:', finalGigPlaylists.length);
          }
          
          alert(`✅ Playlists migrated to cloud!\n\n${finalMasterSongs.length} songs\n${finalGigPlaylists.length} playlists\n\nYour data will now sync across all devices.`);
        }
        
        console.log('✅ Playlists loaded successfully');
        
        // ✅ STEP 2: SET LOADED FLAG (ADD THIS LINE)
        setPlaylistsLoaded(true);
        
      } catch (error) {
        console.error('❌ Error loading playlists:', error);
        alert('Error loading playlists: ' + error.message);
        setPlaylistsLoaded(true); // ✅ Also set true on error so saves can happen
      }
    };
    
    loadAndMigratePlaylists();
  }, [currentUser]);

  // ✅ REAL-TIME sync for playlists across devices
  useEffect(() => {
    if (!currentUser) return;
    
    console.log('📡 Starting real-time playlist sync');
    
    const unsubscribe = listenToPlaylists(currentUser.uid, (data) => {
      console.log('🔄 Playlists updated from another device');
      
      // ✅ FIX: Set syncing flag BEFORE updating state
      setIsSyncing(true);
      setMasterSongs(data.masterSongs);
      setGigPlaylists(data.gigPlaylists);
      
      // ✅ Clear syncing flag after a delay
      setTimeout(() => setIsSyncing(false), 3000);
    });
    
    return () => {
      console.log('🛑 Stopping playlist sync');
      unsubscribe();
    };
  }, [currentUser]);

// Load live gig from localStorage
useEffect(() => {
  if (currentUser) {
    const savedLiveGig = localStorage.getItem(`GigWave_live_${currentUser.uid}`);
    if (savedLiveGig) {
      const liveGigData = JSON.parse(savedLiveGig);
      
      // Convert any timestamp strings back to Date objects or remove them
      const cleanGigData = {
        ...liveGigData,
        startTime: liveGigData.startTime ? new Date(liveGigData.startTime) : null,
        endTime: liveGigData.endTime ? new Date(liveGigData.endTime) : null,
        voteTimestamps: undefined,
        comments: (liveGigData.comments || []).map(c => ({
          ...c,
          timestamp: c.timestamp ? new Date(c.timestamp) : null
        })),
        donations: (liveGigData.donations || []).map(d => ({
          ...d,
          timestamp: d.timestamp ? new Date(d.timestamp) : null
        }))
      };
      
      setLiveGig(cleanGigData);
      setMode('live');
      
      // ✅ CRITICAL: Initialize liveGigData immediately
      setLiveGigData({
        votes: cleanGigData.votes || {},
        comments: cleanGigData.comments || [],
        donations: cleanGigData.donations || [],
        queuedSongs: cleanGigData.queuedSongs || [],
        masterPlaylist: cleanGigData.masterPlaylist || [],
        currentSong: cleanGigData.currentSong || null,
        playedSongs: cleanGigData.playedSongs || [],
        scheduledEndTime: cleanGigData.scheduledEndTime || null,
        scheduledEndTimeMs: cleanGigData.scheduledEndTimeMs || null,
        songRequests: cleanGigData.songRequests || [],
        requestsEnabled: cleanGigData.requestsEnabled !== false,
        jukeboxMode: cleanGigData.jukeboxMode || false,
        jukeboxPrice: cleanGigData.jukeboxPrice || 0,
        maxQueueSize: cleanGigData.maxQueueSize || 20,
        lastVoteTime: cleanGigData.lastVoteTime || {},
        audienceTracking: cleanGigData.audienceTracking || {
          totalJoins: 0,
          currentlyActive: 0,
          joinedUsers: {}
        }
      });
      
      console.log('🔴 Resumed live gig from localStorage (cleaned)');
      console.log('✅ liveGigData initialized with', Object.keys(cleanGigData.queuedSongs || {}).length, 'queued songs');
    }
  }
}, [currentUser]);

// ✅ NEW: Load artist profile when in audience mode
useEffect(() => {
  console.log('🔍 CHECKING AUDIENCE MODE CONDITIONS:');
  console.log('   - mode:', mode);
  console.log('   - liveGig exists:', !!liveGig);
  console.log('   - liveGig.artistId:', liveGig?.artistId);
  console.log('   - Condition met?', mode === 'audience' && liveGig?.artistId);
  
  if (mode === 'audience' && liveGig?.artistId) {
    console.log('🎸 Loading artist profile for audience mode:', liveGig.artistId);
    
    getArtistProfile(liveGig.artistId)
      .then(profile => {
        if (profile) {
          console.log('✅ Artist profile loaded for audience:', profile);
          setArtistProfile(profile);
        } else {
          console.log('⚠️ No profile found for artist');
        }
      })
      .catch(err => {
        console.error('❌ Error loading artist profile:', err);
      });
  } else {
    console.log('❌ NOT loading artist profile - conditions not met');
  }
}, [mode, liveGig?.artistId]);

// Save interested gigs to localStorage
useEffect(() => {
  if (currentUser) {
    localStorage.setItem(`GigWave_interested_${currentUser.uid}`, JSON.stringify(interestedGigs));
  }
}, [interestedGigs, currentUser]);

// AUTO-REFRESH for audience mode - every 5 seconds
useEffect(() => {
  if (mode !== 'audience' || !liveGig?.id) return;
  
  console.log('🔄 Starting audience auto-refresh (every 5 seconds)');
  
  const refreshInterval = setInterval(async () => {
    console.log('🔄 Auto-refreshing audience data...');
    
    try {
      // Force re-fetch live gig data
      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
      const gigSnap = await getDoc(gigRef);
      
      if (gigSnap.exists()) {
        const freshData = gigSnap.data();
        console.log('✅ Audience data refreshed');
        
        setLiveGigData({
          votes: freshData.votes || {},
          comments: freshData.comments || [],
          donations: freshData.donations || [],
          queuedSongs: freshData.queuedSongs || [],
          masterPlaylist: freshData.masterPlaylist || [],
          currentSong: freshData.currentSong || null,
          playedSongs: freshData.playedSongs || [],
          scheduledEndTime: freshData.scheduledEndTime || null,
          songRequests: freshData.songRequests || [],
          requestsEnabled: freshData.requestsEnabled !== false,
          jukeboxMode: freshData.jukeboxMode || false,
          jukeboxPrice: freshData.jukeboxPrice || 0,
          maxQueueSize: freshData.maxQueueSize || 20
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing audience data:', error);
    }
  }, 5000); // 5 seconds
  
  return () => {
    console.log('⏹️ Stopping audience auto-refresh');
    clearInterval(refreshInterval);
  };
}, [mode, liveGig?.id]);

// ✅ NEW: Audience heartbeat - update "last active" every 30 seconds
useEffect(() => {
  if (mode !== 'audience' || !liveGig?.id || !currentUser) return;
  
  console.log('💓 Starting audience heartbeat...');
  
  const sendHeartbeat = async () => {
    try {
      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
      const gigSnap = await getDoc(gigRef);
      
      if (!gigSnap.exists()) return;
      
      const currentTracking = gigSnap.data().audienceTracking || {
        totalJoins: 0,
        currentlyActive: 0,
        joinedUsers: {}
      };
      
      const userId = currentUser.uid;
      
      // Update last active time
      if (currentTracking.joinedUsers[userId]) {
        currentTracking.joinedUsers[userId].lastActive = new Date().toISOString();
        currentTracking.joinedUsers[userId].isActive = true;
        
        // Count currently active (last active within 60 seconds)
        const now = new Date();
        let activeCount = 0;
        
        Object.entries(currentTracking.joinedUsers).forEach(([uid, data]) => {
          const lastActive = new Date(data.lastActive);
          const secondsSinceActive = (now - lastActive) / 1000;
          
          if (secondsSinceActive <= 60) {
            activeCount++;
            currentTracking.joinedUsers[uid].isActive = true;
          } else {
            currentTracking.joinedUsers[uid].isActive = false;
          }
        });
        
        currentTracking.currentlyActive = activeCount;
        
        await updateDoc(gigRef, {
          audienceTracking: currentTracking
        });
        
        console.log('💓 Heartbeat sent - Active:', activeCount);
      }
    } catch (error) {
      console.error('❌ Heartbeat error:', error);
    }
  };
  
  // Send immediately on mount
  sendHeartbeat();
  
  // Then every 30 seconds
  const interval = setInterval(sendHeartbeat, 30000);
  
  return () => {
    console.log('💔 Stopping heartbeat');
    clearInterval(interval);
    
    // Mark as inactive when leaving
    const markInactive = async () => {
      try {
        const gigRef = doc(db, 'liveGigs', String(liveGig.id));
        const gigSnap = await getDoc(gigRef);
        
        if (!gigSnap.exists()) return;
        
        const currentTracking = gigSnap.data().audienceTracking || { joinedUsers: {} };
        
        if (currentTracking.joinedUsers[currentUser.uid]) {
          currentTracking.joinedUsers[currentUser.uid].isActive = false;
          
          // Recount active users
          currentTracking.currentlyActive = Object.values(currentTracking.joinedUsers)
            .filter(u => u.isActive).length;
          
          await updateDoc(gigRef, {
            audienceTracking: currentTracking
          });
          
          console.log('👋 Marked as inactive');
        }
      } catch (error) {
        console.error('❌ Error marking inactive:', error);
      }
    };
    
    markInactive();
  };
}, [mode, liveGig?.id, currentUser]);

// ✅ SAVE master songs to Firebase (only after loading complete)
useEffect(() => {
  if (!currentUser || !playlistsLoaded) return;
  if (document.hidden) return; // Don't save if tab is hidden
  if (isSyncing) return; // ⚡ FIX: Skip save if syncing from listener
  
  const timeoutId = setTimeout(() => {
    if (masterSongs.length >= 0) {
      console.log('💾 Master songs saved to Firebase:', masterSongs.length, 'songs');
      saveMasterPlaylist(currentUser.uid, masterSongs)
        .then(() => console.log('✅ Master playlist saved to Firebase:', masterSongs.length, 'songs'))
        .catch(err => console.error('❌ Error saving songs:', err));
    }
  }, 2000);
  
  return () => clearTimeout(timeoutId);
}, [masterSongs, currentUser, playlistsLoaded, isSyncing]); // ⚡ ADD isSyncing dependency

// ✅ SAVE gig playlists to Firebase (only after loading complete)
useEffect(() => {
  if (!currentUser || !playlistsLoaded) return;
  if (document.hidden) return; // Don't save if tab is hidden
  if (isSyncing) return; // ⚡ FIX: Skip save if syncing from listener
  
  const timeoutId = setTimeout(() => {
    if (gigPlaylists.length >= 0) {
      console.log('💾 Playlists saved to Firebase:', gigPlaylists.length, 'playlists');
      saveGigPlaylists(currentUser.uid, gigPlaylists)
        .then(() => console.log('✅ Gig playlists saved to Firebase:', gigPlaylists.length, 'playlists'))
        .catch(err => console.error('❌ Error saving playlists:', err));
    }
  }, 2000);
  
  return () => clearTimeout(timeoutId);
}, [gigPlaylists, currentUser, playlistsLoaded, isSyncing]); // ⚡ ADD isSyncing dependency

// Save gigs to localStorage
useEffect(() => {
  if (currentUser && gigs.length >= 0) {
    localStorage.setItem(`GigWave_gigs_${currentUser.uid}`, JSON.stringify(gigs));
    console.log('💾 Gigs saved:', gigs.length);
  }
}, [gigs, currentUser]);

// Check and cancel expired gigs when viewing "My Gigs" tab
useEffect(() => {
  if (tab === 'gigs' && currentUser) {
    checkAndCancelExpiredGigs(currentUser.uid)
      .then(cancelled => {
        if (cancelled.length > 0) {
          console.log('✅ Expired gigs cancelled:', cancelled);
        }
      })
      .catch(err => console.error('Error checking expired gigs:', err));
  }
}, [tab, currentUser]);

// ✅ BULLETPROOF: Poll Firebase every 5 seconds for live gigs (works 100% of the time)
useEffect(() => {
  if (!currentUser) return;
  
  console.log('🔄 Starting live gig polling for:', currentUser.email);
  
  const checkForLiveGig = async () => {

     if (mode === 'live') {
    console.log('⏸️ Already in live mode - skipping poll');
    return;
  }
  
    try {
      console.log('🔍 Polling Firebase for live gigs...');
      
      // Direct Firebase query
      const liveGigQuery = query(
        collection(db, 'liveGigs'),
        where('artistId', '==', currentUser.uid),
        where('status', '==', 'live')
      );
      
      const snapshot = await getDocs(liveGigQuery);
      
      console.log('📊 Poll result:', snapshot.size, 'live gigs found');
      
      if (!snapshot.empty) {
        const liveGigDoc = snapshot.docs[0];
        const activeLiveGig = { id: liveGigDoc.id, ...liveGigDoc.data() };
        
        console.log('🔴 ACTIVE LIVE GIG DETECTED:', activeLiveGig.venueName);
        
        // ✅ NEW FIX: Only alert ONCE per gig using hasShownLiveAlert flag
        const gigKey = `${activeLiveGig.id}_${activeLiveGig.venueName}`;
        const lastAlertedGig = localStorage.getItem('GigWave_lastLiveAlert');
        
        if (lastAlertedGig !== gigKey) {
          console.log('🔒 LOCKING INTO LIVE MODE (first time for this gig)');
          
          setLiveGig(activeLiveGig);
          setMode('live');
          
          localStorage.setItem(`GigWave_live_${currentUser.uid}`, JSON.stringify(activeLiveGig));
          localStorage.setItem('GigWave_mode', 'live');
          localStorage.setItem('GigWave_lastLiveAlert', gigKey); // ⚡ Track which gig we alerted for
          
          alert(`🔴 LIVE GIG DETECTED\n\n${activeLiveGig.venueName}\n\nYou are now locked in live mode.`);
        } else if (liveGig?.id !== activeLiveGig.id) {
          // Different gig - update silently
          console.log('🔄 Updating to different live gig');
          setLiveGig(activeLiveGig);
          localStorage.setItem(`GigWave_live_${currentUser.uid}`, JSON.stringify(activeLiveGig));
        } else {
          // Already in live mode with correct gig - do nothing
          console.log('✅ Already locked in live mode');
        }
      } else {
          console.log('✅ No live gigs found');
          
          // ✅ Clear the alert tracking when gig ends
          const lastAlertedGig = localStorage.getItem('GigWave_lastLiveAlert');
          if (lastAlertedGig) {
            console.log('🔓 UNLOCKING - no live gig in Firebase');
            
            setLiveGig(null);
            setMode('artist');
            
            localStorage.removeItem(`GigWave_live_${currentUser.uid}`);
            localStorage.removeItem('GigWave_lastLiveAlert'); // ⚡ Clear alert tracking
            localStorage.setItem('GigWave_mode', 'artist');
            
            alert('✅ Live gig ended. Returning to artist dashboard.');
          } else {
            // Already unlocked - do nothing
            console.log('✅ Already in artist mode');
          }
        }
    } catch (error) {
      console.error('❌ Error polling for live gigs:', error);
    }
  };
  
  // Check immediately on mount
  checkForLiveGig();
  
  // Then check every 5 seconds
  const interval = setInterval(checkForLiveGig, 5000);
  
  return () => {
    console.log('🛑 Stopping live gig polling');
    clearInterval(interval);
  };
}, [currentUser]); // Only depend on currentUser

  const handleSignIn = async (provider) => {
  try {
    if (provider === 'google') {
      await signInWithGoogle();
    } else if (provider === 'facebook') {
      await signInWithFacebook();
    } else if (provider === 'apple') {  // 🍎 ADD THIS
      await signInWithApple();
    }
    setShowAuthModal(false);      
      
    } catch (error) {
      console.error('Sign-in error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        alert('❌ Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        alert('❌ Popup was blocked by your browser.\n\nPlease allow popups for this site and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Silent - user cancelled, don't show error
        console.log('User cancelled sign-in');
      } else if (error.code === 'auth/network-request-failed') {
        alert('❌ Network error. Please check your internet connection.');
      } else {
        alert('❌ Sign-in failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

// ✅ FIX 2: Real-time gig sync across devices - ENHANCED
useEffect(() => {
  // Run whenever user is logged in (regardless of mode)
  if (!currentUser) {
    console.log('❌ No user - skipping gigs sync');
    return;
  }
  
  console.log('🔄 Setting up real-time gigs listener for:', currentUser.email);
  console.log('📱 Current mode:', mode);
  console.log('👤 User ID:', currentUser.uid);
  
  // ✅ SIMPLIFIED: Query without orderBy (sort in JavaScript instead)
  const gigsQuery = query(
    collection(db, 'liveGigs'),
    where('artistId', '==', currentUser.uid)
  );
  
  // ✅ USE onSnapshot FOR REAL-TIME UPDATES
  const unsubscribe = onSnapshot(
    gigsQuery,
    { 
      includeMetadataChanges: false  // Only real data changes, not local cache
    },
    (snapshot) => {
      console.log('📊 Real-time update received from Firebase');
      console.log('📱 Device:', navigator.userAgent.substring(0, 50));
      
      const gigsData = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

      // ✅ SORT IN JAVASCRIPT instead of Firebase
      gigsData.sort((a, b) => {
        // Sort by date descending, then time descending
        if (a.gigDate !== b.gigDate) {
          return (b.gigDate || '').localeCompare(a.gigDate || '');
        }
        return (b.gigTime || '').localeCompare(a.gigTime || '');
      });

      console.log('📦 Total gigs loaded:', gigsData.length);
      
      // Log each gig for debugging
      gigsData.forEach((gig, index) => {
        console.log(`  ${index + 1}. ${gig.venueName} - ${gig.gigDate} at ${gig.gigTime} (Status: ${gig.status})`);
      });
      
      // Update state immediately
      setGigs(gigsData);
      
      // Save to localStorage as backup
      if (currentUser) {
        const cacheData = {
          lastSync: new Date().toISOString(),
          count: gigsData.length,
          gigs: gigsData
        };
        
        localStorage.setItem(
          `GigWave_gigs_${currentUser.uid}`, 
          JSON.stringify(cacheData)
        );
        
        console.log('💾 Cached to localStorage');
      }
      
      console.log('✅ Gigs state updated successfully');
    },
    (error) => {
      console.error('❌ Firebase listener error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific errors
      if (error.code === 'permission-denied') {
        alert('Session expired. Please sign in again.');
      } else if (error.code === 'failed-precondition') {
        console.error('Index not created. Check Firebase console.');
      }
    }
  );
  
  // Cleanup function - unsubscribe when component unmounts or dependencies change
  return () => {
    console.log('🛑 Cleaning up gigs listener');
    unsubscribe();
  };
}, [currentUser]); // ✅ REMOVED 'mode' dependency - now syncs in ALL modes

// Check if user has already rated this artist for this gig
useEffect(() => {
  if (mode !== 'audience' || !currentUser || !liveGig) return;
  
  const checkExistingRating = async () => {
    try {
      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
      const gigSnap = await getDoc(gigRef);
      
      if (gigSnap.exists()) {
        const ratings = gigSnap.data().ratings || [];
        const userRating = ratings.find(r => r.userId === currentUser.uid);
        
        if (userRating) {
          setHasRatedArtist(true);
          setCurrentGigRating(userRating.artistRating);
          console.log('✅ User has already rated:', userRating.artistRating);
        } else {
          setHasRatedArtist(false);
          setCurrentGigRating(0);
        }
      }
    } catch (error) {
      console.error('Error checking rating:', error);
    }
  };
  
  checkExistingRating();
}, [mode, currentUser, liveGig]);

// ✅ ENHANCED: Navigation persistence with Firebase live gig check
useEffect(() => {
  if (authLoading) return;
  
  if (currentUser) {
    // ✅ PRIORITY 1: Check Firebase for active live gig
    getActiveLiveGigForArtist(currentUser.uid).then(activeLiveGig => {
      if (activeLiveGig) {
        console.log('🔒 ACTIVE LIVE GIG - Locking into live mode:', activeLiveGig.venueName);
        setLiveGig(activeLiveGig);
        setMode('live');
        
        // Update localStorage for consistency
        localStorage.setItem(`GigWave_live_${currentUser.uid}`, JSON.stringify(activeLiveGig));
        localStorage.setItem('GigWave_mode', 'live');
        return; // Exit early - don't check other conditions
      }
      
      // ✅ PRIORITY 2: No active live gig - check localStorage
      const savedLiveGig = localStorage.getItem(`GigWave_live_${currentUser.uid}`);
      if (savedLiveGig) {
        try {
          const liveGigData = JSON.parse(savedLiveGig);
          setLiveGig(liveGigData);
          
          if (liveGigData.artistId === currentUser.uid) {
            setMode('live'); // Artist's live gig
          } else {
            setMode('audience'); // Audience member
          }
        } catch (error) {
          console.error('Error parsing saved live gig:', error);
          localStorage.removeItem(`GigWave_live_${currentUser.uid}`);
        }
      } else {
        // ✅ PRIORITY 3: Check saved mode
        const savedMode = localStorage.getItem('GigWave_mode');
        if (savedMode === 'artist') {
          setMode('artist');
        } else {
          setMode('discover');
        }
      }
    }).catch(error => {
      console.error('❌ Error checking active live gig:', error);
      
      // Fallback to localStorage if Firebase check fails
      const savedLiveGig = localStorage.getItem(`GigWave_live_${currentUser.uid}`);
      if (savedLiveGig) {
        try {
          const liveGigData = JSON.parse(savedLiveGig);
          setLiveGig(liveGigData);
          setMode(liveGigData.artistId === currentUser.uid ? 'live' : 'audience');
        } catch (err) {
          localStorage.removeItem(`GigWave_live_${currentUser.uid}`);
        }
      }
    });
  } else {
    // No user - default to discovery
    setMode('discover');
  }
}, [authLoading, currentUser]);

  const handleSearchGigs = async () => {
    try {
      setLoadingGigs(true);
      let location = userLocation;
      
      if (!location) {
        try {
          location = await getUserLocation();
          setUserLocation(location);
        } catch (locError) {
          // Handle geolocation errors gracefully
          setLoadingGigs(false);
          
          if (locError.code === 1) { // PERMISSION_DENIED
            alert(
              '📍 Location Access Required\n\n' +
              'Please enable location access to find nearby gigs:\n\n' +
              '1. Click the location icon 🔒 in your browser address bar\n' +
              '2. Change "Location" to "Allow"\n' +
              '3. Refresh the page and try again'
            );
          } else if (locError.code === 2) { // POSITION_UNAVAILABLE
            alert(
              '📍 Location Unavailable\n\n' +
              'Could not determine your location.\n\n' +
              'Please check that location services are enabled on your device.'
            );
          } else if (locError.code === 3) { // TIMEOUT
            alert('📍 Location request timed out. Please try again.');
          } else {
            alert('📍 Could not get your location. Please enable location services and try again.');
          }
          return; // Exit early
        }
      }
      
      const gigs = await searchNearbyGigs(location, 50);
      
      // Filter out ended/cancelled gigs BEFORE showing alert
      const activeGigs = gigs.filter(gig => {
        const status = calculateGigStatus(gig);
        return ['live', 'checkVenue', 'upcoming'].includes(status);
      });
      
      setNearbyGigs(gigs);
      setFilteredGigs(gigs);
      
      // Show alert with ACTIVE gig count only
      if (activeGigs.length === 0) {
        alert('No active gigs found within 50km. Try again later!');
      } else {
        alert(`✅ Found ${activeGigs.length} active gig${activeGigs.length > 1 ? 's' : ''} nearby!`);
      }
    } catch (error) {
      console.error('Error searching gigs:', error);
      alert('Error finding gigs: ' + error.message);
    } finally {
      setLoadingGigs(false);
    }
  };

  // Check if user has already rated this artist
  const checkIfUserRatedArtist = async (artistId, userId) => {
    try {
      // Check all live gigs by this artist for this user's rating
      const gigsRef = collection(db, 'liveGigs');
      const q = query(gigsRef, where('artistId', '==', artistId));
      const snapshot = await getDocs(q);
      
      for (const gigDoc of snapshot.docs) {
        const gigData = gigDoc.data();
        if (gigData.ratings && Array.isArray(gigData.ratings)) {
          const hasRating = gigData.ratings.some(rating => rating.userId === userId);
          if (hasRating) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if user rated artist:', error);
      return false; // Default to false if error
    }
  };

  // Load all songs user has voted for in this gig
  const getUserVotesForGig = async (gigId, userId) => {
    try {
      const votesRef = collection(db, 'liveGigs', String(gigId), 'userVotes');
      const q = query(votesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const votes = {};
      snapshot.forEach(doc => {
        const songId = doc.data().songId;
        votes[songId] = true;
      });
      
      console.log('📊 Loaded votes for user:', votes);
      return votes;
    } catch (error) {
      console.error('Error loading user votes:', error);
      return {};
    }
  };

  const handleJoinGig = async (gig) => {
    console.log('🎵 JOIN LIVE CLICKED');
    console.log('👤 Current User:', currentUser?.email || 'NOT LOGGED IN');
    console.log('🎸 Gig:', gig.venueName);
    
    try {
      // Double-check user authentication (should be caught by button, but just in case)
      if (!currentUser) {
        console.log('❌ No user - showing auth modal');
        alert('🔐 Please sign in to join this live gig!');
        setShowAuthModal(true);
        return;
      }
      
      console.log('✅ User authenticated, getting location...');
      
      // Get current location
      let location = userLocation;
      
      if (!location) {
        console.log('📍 Requesting location permission...');
        alert('📍 Getting your location...\n\nPlease allow location access when prompted.');
        
        try {
          location = await getUserLocation();
          setUserLocation(location);
          console.log('✅ Location obtained:', location);
        } catch (locError) {
          console.error('❌ Location error:', locError);
          alert('❌ Could not get your location.\n\nPlease enable location services in your browser settings.\n\nError: ' + locError.message);
          return;
        }
      }
      
      console.log('📍 User location:', location);
      
      // Check if gig has location
      if (!gig.location || !gig.location.latitude || !gig.location.longitude) {
        console.error('❌ Gig missing location data');
        alert('⚠️ This gig does not have a valid location.\n\nPlease contact the artist.');
        return;
      }
      
      // Get venue location
      const venueLocation = {
        lat: gig.location.latitude,
        lng: gig.location.longitude
      };
      
      console.log('📍 Venue location:', venueLocation);
      
      // Check if within range (10km for testing)
      const distance = calculateDistance(location, venueLocation);
      const maxDistance = 1000; // 10km in meters (change to 1000 for 1km in production)
      
      console.log('📏 Distance calculated:', distance, 'meters');
      console.log('📏 Max allowed distance:', maxDistance, 'meters');
      
      if (distance > maxDistance) {
        const distanceKm = (distance / 1000).toFixed(1);
        console.log('❌ Too far away:', distanceKm, 'km');
        alert(`⚠️ You're too far away!\n\nYou must be within 1km of the venue to join.\n\nYou are currently ${distanceKm}km away from ${gig.venueName}.\n\n📍 Venue: ${gig.venueAddress || gig.venueName}`);
        return;
      }
      
      console.log('✅ Within range! Distance:', (distance / 1000).toFixed(2), 'km');
      
      // Within range - allow join
      console.log('🎉 Joining gig...');
      setLiveGig(gig);
      setMode('audience');

      // Save audience live gig to localStorage AND load votes
      if (currentUser) {
        localStorage.setItem(`GigWave_live_${currentUser.uid}`, JSON.stringify(gig));
        console.log('💾 Saved to localStorage');
        
        // ✅ Load user's existing votes for this gig
        try {
          const existingVotes = await getUserVotesForGig(gig.id, currentUser.uid);
          setUserVotes(existingVotes);
          console.log('✅ Loaded user votes:', existingVotes);
        } catch (error) {
          console.error('❌ Error loading user votes:', error);
          // Don't block joining if vote loading fails
        }
      } // ← This closing brace was moved too early in your code

      // ✅ ADD THIS: Check if user has already rated this artist
      try {
        const hasRated = await checkIfUserRatedArtist(gig.artistId, currentUser.uid);
        setHasRatedArtist(hasRated);
        console.log('✅ User has rated artist:', hasRated);
      } catch (error) {
        console.error('❌ Error checking artist rating:', error);
      }
      
      // ✅ NEW: Track audience join in Firebase
      try {
        const gigRef = doc(db, 'liveGigs', String(gig.id));
        const gigSnap = await getDoc(gigRef);
        
        if (gigSnap.exists()) {
          const currentTracking = gigSnap.data().audienceTracking || {
            totalJoins: 0,
            currentlyActive: 0,
            joinedUsers: {}
          };
          
          const userId = currentUser.uid;
          const isFirstJoin = !currentTracking.joinedUsers[userId];
          
          // Update tracking
          currentTracking.joinedUsers[userId] = {
            firstJoin: currentTracking.joinedUsers[userId]?.firstJoin || new Date().toISOString(),
            lastActive: new Date().toISOString(),
            isActive: true,
            userName: currentUser.displayName || 'Anonymous'
          };
          
          // Increment total joins only if first time
          if (isFirstJoin) {
            currentTracking.totalJoins = (currentTracking.totalJoins || 0) + 1;
          }
          
          // Count currently active users
          currentTracking.currentlyActive = Object.values(currentTracking.joinedUsers)
            .filter(u => u.isActive).length;
          
          await updateDoc(gigRef, {
            audienceTracking: currentTracking
          });
          
          console.log('✅ Audience tracking updated:', {
            total: currentTracking.totalJoins,
            active: currentTracking.currentlyActive,
            isFirstJoin
          });
        }
      } catch (trackError) {
        console.error('❌ Error tracking audience join:', trackError);
        // Don't block join if tracking fails
      }
      
      console.log('✅ Successfully joined gig!');
      alert(`✅ Joined ${gig.artistName}'s live gig at ${gig.venueName}!`);
      
    } catch (error) {
      console.error('❌ ERROR in handleJoinGig:', error);
      alert('❌ Error joining gig: ' + error.message);
    }
  };

  const filterGigsByDate = (filter) => {
    setDateFilter(filter);
    
    if (filter === 'all') {
      setFilteredGigs(nearbyGigs);
      return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filtered = nearbyGigs.filter(gig => {
      if (!gig.gigDate) return true; // Include if no date
      
      const gigDate = new Date(gig.gigDate);
      const gigDay = new Date(gigDate.getFullYear(), gigDate.getMonth(), gigDate.getDate());
      
      if (filter === 'today') {
        return gigDay.getTime() === today.getTime();
      } else if (filter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return gigDay.getTime() === tomorrow.getTime();
      } else if (filter === 'week') {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return gigDay >= today && gigDay <= weekEnd;
      }
      
      return true;
    });
    
    setFilteredGigs(filtered);
  };
  
  const addToMaster = () => {
    const title = prompt('Song title:');
    if (!title) return;
    const artist = prompt('Artist name:');
    
    const newSong = {
      id: Date.now(),
      title: title || 'Untitled',
      artist: artist || 'Unknown',
      duration: '',
      key: ''
    };
    
    setMasterSongs([...masterSongs, newSong]);
  };

  const searchItunesAPI = async () => {
    if (!itunesSearch.trim()) {
      alert('Please enter a song or artist name!');
      return;
    }
    
    try {
      setSearchingItunes(true);
      console.log('🔍 Searching iTunes for:', itunesSearch);
      
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(itunesSearch)}&entity=song&limit=20`
      );
      
      if (!response.ok) {
        throw new Error('iTunes search failed');
      }
      
      const data = await response.json();
      console.log('📦 iTunes results:', data.resultCount);
      
      if (data.resultCount === 0) {
        alert('No songs found. Try a different search term!');
        setItunesResults([]);
        return;
      }
      
      // Convert iTunes format to our format
      const songs = data.results.map((track, index) => ({
        id: Date.now() + index, // Integer increment instead of random
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        duration: track.trackTimeMillis 
          ? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
          : '',
        artwork: track.artworkUrl100,
        previewUrl: track.previewUrl,
        itunesId: track.trackId
      }));
      
      setItunesResults(songs);
      console.log('✅ Processed songs:', songs.length);
      
    } catch (error) {
      console.error('❌ iTunes search error:', error);
      alert('Error searching iTunes: ' + error.message);
    } finally {
      setSearchingItunes(false);
    }
  };

  const addItunesSongToMaster = (song) => {
  if (masterSongs.find(s => s.title === song.title && s.artist === song.artist)) {
    alert('⚠️ This song is already in your master playlist!');
    return;
  }
  
  const cleanSong = {
    id: Math.floor(song.id),
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    album: song.album || '',
    key: ''
  };
  
  setMasterSongs([...masterSongs, cleanSong]);
  // ✅ Song added silently - no alert popup
  
  setItunesResults(itunesResults.filter(s => s.id !== song.id));
};
  
  const removeFromMaster = (id) => {
    if (window.confirm('Remove this song?')) {
      setMasterSongs(masterSongs.filter(s => s.id !== id));
    }
  };

  // Gig Playlist Functions
  const createGigPlaylist = () => {
    const newPlaylist = {
      id: Date.now(),
      name: 'New Playlist',
      description: '',
      songs: [],
      createdAt: new Date()
    };
    setEditingPlaylist(newPlaylist);
    setShowPlaylistModal(true);
  };

  const saveGigPlaylist = () => {
    if (!editingPlaylist.name.trim()) {
      alert('Please enter a playlist name!');
      return;
    }
    
    const existing = gigPlaylists.find(p => p.id === editingPlaylist.id);
    if (existing) {
      setGigPlaylists(gigPlaylists.map(p => 
        p.id === editingPlaylist.id ? editingPlaylist : p
      ));
    } else {
      setGigPlaylists([...gigPlaylists, editingPlaylist]);
    }
    
    setShowPlaylistModal(false);
    setEditingPlaylist(null);
  };

  const deleteGigPlaylist = (id) => {
    if (window.confirm('Delete this playlist?')) {
      setGigPlaylists(gigPlaylists.filter(p => p.id !== id));
    }
  };

  const addSongToGigPlaylist = (songId) => {
    if (!editingPlaylist.songs.includes(songId)) {
      setEditingPlaylist({
        ...editingPlaylist,
        songs: [...editingPlaylist.songs, songId]
      });
    }
  };

  const removeSongFromGigPlaylist = (songId) => {
    setEditingPlaylist({
      ...editingPlaylist,
      songs: editingPlaylist.songs.filter(id => id !== songId)
    });
  };

  // Venue Location Functions
  const captureGPSLocation = async () => {
    try {
      setCapturingGPS(true);
      const location = await getUserLocation();
      
      // Try to get address from coordinates (reverse geocoding)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json`
        );
        const data = await response.json();
        const address = data.display_name || '';
        
        setEditingGig({
          ...editingGig,
          location: location,
          address: address
        });
        
        alert(`✅ Location captured!\n${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`);
      } catch (err) {
        // If reverse geocoding fails, just save coordinates
        setEditingGig({
          ...editingGig,
          location: location
        });
        alert(`✅ Location captured!\n${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`);
      }
    } catch (error) {
      alert('Error capturing location: ' + error.message);
    } finally {
      setCapturingGPS(false);
    }
  };

  const searchVenueAddress = async () => {
    if (!editingGig.address || !editingGig.address.trim()) {
      alert('Please enter an address first!');
      return;
    }
    
    try {
      setSearchingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editingGig.address)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        
        setEditingGig({
          ...editingGig,
          location: location,
          address: result.display_name
        });
        
        alert(`✅ Address found!\n${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`);
      } else {
        alert('Address not found. Try a different search term or use GPS instead.');
      }
    } catch (error) {
      alert('Error searching address: ' + error.message);
    } finally {
      setSearchingAddress(false);
    }
  };

  const createGig = () => {
  setEditingGig({
    id: Date.now(),
    venueName: '',
    address: '',
    location: null,
    date: '',
    time: '',
    playlistId: null,
    queueSize: 20,        // ← ADD THIS LINE
    status: 'upcoming'
  });
  setShowGigModal(true);
};

  const saveGig = async () => {
    if (savingGig) return; // Prevent double-click

    console.log('🔥 SAVE GIG CLICKED!');
    console.log('📝 editingGig state:', editingGig);
    console.log('🏠 venueName:', editingGig.venueName);
    console.log('📅 date:', editingGig.date);
    console.log('⏰ time:', editingGig.time);
    console.log('📍 location:', editingGig.location);
    console.log('🏢 address:', editingGig.address);

    // Validation checks
    if (!editingGig.venueName || !editingGig.date || !editingGig.time) {
      alert('Please fill in venue name, date, and time!');
      return;
    }

    // ✅ NEW: Validate queue size
    const queueSize = editingGig.queueSize || 20;
    if (queueSize < 20 || queueSize > 50) {
      alert('⚠️ Queue size must be between 20 and 50 songs!');
      return;
    }

    setSavingGig(true); // ✅ Disable button
    
    try {
      let location = editingGig.location;
      
      // If no location, ask for it
      if (!location) {
        const useCurrentLocation = window.confirm('No venue location set. Use your current location?');
        if (useCurrentLocation) {
          location = await getUserLocation();
        } else {
          alert('Please set a venue location to save the gig!');
          return;
        }
      }
    
    // ✅ FIX 1: Check for duplicate gigs within 6 hours on same date
    const gigDateTime = new Date(`${editingGig.date}T${editingGig.time}`);
    const sixHoursMs = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    
    const hasConflict = gigs.some(existingGig => {
      // Skip if we're editing this same gig
      if (existingGig.id === editingGig.id) return false;
      
      const existingDateTime = new Date(`${existingGig.date}T${existingGig.time}`);
      const timeDiff = Math.abs(gigDateTime - existingDateTime);
      
      // Check if within 6 hours
      return timeDiff < sixHoursMs;
    });
    
    if (hasConflict) {
      alert('⚠️ You already have a gig scheduled within 6 hours of this time!\n\nPlease choose a different date or time.');
      return;
    }
    
    // ✅ ISSUE 5 FIX: Prepare queue with proper ordering
    let queuedSongs = [];
    let masterPlaylistData = masterSongs;
    
    if (editingGig.playlistId) {
      const playlist = gigPlaylists.find(p => p.id === editingGig.playlistId);
      if (playlist && playlist.songs.length > 0) {
        queuedSongs = playlist.songs.map(id => masterSongs.find(s => s.id === id)).filter(Boolean);
      } else {
        queuedSongs = masterSongs; // Fallback to master
      }
    } else {
      queuedSongs = masterSongs; // No playlist selected
    }
    
    const gigData = {
      artistId: currentUser.uid,
      artistName: currentUser.displayName || 'Artist',
      artistProfile: artistProfile,
      venueName: editingGig.venueName,
      venueAddress: editingGig.address || '',
      location: location,
      status: 'upcoming',
      gigDate: editingGig.date,
      gigTime: editingGig.time,
      playlistId: editingGig.playlistId || null,
      queueSize: editingGig.queueSize || 20,
      queuedSongs: queuedSongs.slice(0, editingGig.queueSize || 20), // ✅ Limit to queue size
      masterPlaylist: masterPlaylistData, // ✅ Always save full master playlist
      notes: editingGig.notes || ''
    };

    let gigId;
    let isEditingExisting = false;
    
    // ✅ FIX 2: Properly detect if we're editing or creating new
    // Check if gig exists in local state AND has a Firebase ID
    const existingGig = gigs.find(g => g.id === editingGig.id);
    
    if (existingGig && typeof editingGig.id === 'string' && editingGig.id.length > 10) {
      // EDITING existing Firebase gig
      console.log('📝 Updating existing gig:', editingGig.id);
      isEditingExisting = true;
      gigId = editingGig.id;
      
      // Update in Firebase
      const gigRef = doc(db, 'liveGigs', gigId);
      await updateDoc(gigRef, gigData);
      
    } else {
      // CREATING new gig
      console.log('🆕 Creating new gig');
      gigId = await createLiveGig(gigData, currentUser.uid);
    }
    
    // Update local state
    const savedGig = { 
      ...editingGig, 
      id: gigId, 
      location, 
      status: 'upcoming',
      gigDate: editingGig.date,  // ✅ Use gigDate (Firebase field name)
      gigTime: editingGig.time,  // ✅ Use gigTime (Firebase field name)
      date: editingGig.date,
      time: editingGig.time
    };
    
    if (isEditingExisting) {
      // Update existing gig in local state
      const updatedGigs = gigs.map(g => g.id === editingGig.id ? savedGig : g);
      
      // ✅ Sort after update
      updatedGigs.sort((a, b) => {
        const dateA = a.gigDate || a.date || '';
        const dateB = b.gigDate || b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // Descending
        }
        const timeA = a.gigTime || a.time || '';
        const timeB = b.gigTime || b.time || '';
        return timeB.localeCompare(timeA); // Descending
      });
      
      setGigs(updatedGigs);
      console.log('✅ Gig updated in local state');
    } else {
      // Add new gig to local state
      const newGigs = [...gigs, savedGig];
      
      // ✅ Sort after adding (newest first)
      newGigs.sort((a, b) => {
        const dateA = a.gigDate || a.date || '';
        const dateB = b.gigDate || b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // Descending
        }
        const timeA = a.gigTime || a.time || '';
        const timeB = b.gigTime || b.time || '';
        return timeB.localeCompare(timeA); // Descending
      });
      
      setGigs(newGigs);
      console.log('✅ New gig added to local state');
    }
    
    // At the very END of the try block, after creating/updating gig:
    setShowGigModal(false);
    setEditingGig(null);
    alert('✅ Gig saved successfully!');
    
  } catch (error) {
    console.error('Error saving gig:', error);
    alert('Error saving gig: ' + error.message);
  } finally {
    setSavingGig(false); // ✅ Re-enable button
  }
};

  const deleteGig = async (gigId) => {
    if (window.confirm('Delete this gig permanently?')) {
      try {
        // Convert gigId to string (Firebase requires string IDs)
        const gigIdString = String(gigId);
        
        // Delete from Firebase
        const gigRef = doc(db, 'liveGigs', gigIdString);
        await deleteDoc(gigRef);
        
        // Remove from local state
        setGigs(prevGigs => prevGigs.filter(g => g.id !== gigId));
        
        // Close modal if it's open
        if (editingGig && editingGig.id === gigId) {
          setEditingGig(null);
          setShowGigModal(false);
        }
        
        alert('✅ Gig deleted successfully!');
      } catch (error) {
        console.error('Error deleting gig:', error);
        alert('❌ Error deleting gig: ' + error.message);
      }
    }
  };
  
  const handleGoLive = async (gig) => {
    // ✅ ENHANCED: Check if already live (FIRST CHECK!)
    if (liveGig) {
      alert('⚠️ You are already live! End your current gig first.');
      setMode('live'); // Force back to live mode
      return;
    }
    
    // Prevent going live with ended gigs
    if (gig.status === 'ended') {
      alert('❌ This gig has ended! You cannot go live with an ended gig.');
      return;
    }

    // ⭐ TASK 21: Check if artist has another live gig in Firebase
    const existingLiveGig = await getActiveLiveGigForArtist(currentUser.uid); // ✅ CORRECT - using uid
    
    if (existingLiveGig && existingLiveGig.id !== gig.id) {
      const confirm = window.confirm(
        `⚠️ You already have a live gig at "${existingLiveGig.venueName}".\n\n` +
        `You can only have one live gig at a time.\n\n` +
        `Would you like to end that gig and start this one?`
      );
      
      if (!confirm) return;  // User said NO
      
      // User said YES - end the existing gig
      try {
        await firebaseEndLiveGig(existingLiveGig.id);
        setLiveGig(null); // Clear local state
      } catch (error) {
        alert('Error ending previous gig: ' + error.message);
        return;
      }
    }
    
    try {
      // Check if already live with this gig
      if (liveGig && liveGig.gigId === gig.id) {
        alert('⚠️ You are already live with this gig!');
        setMode('live');
        return;
      }
      
      let location = gig.location;
      
      if (!location) {
        const confirm = window.confirm('No venue location set. Use your current location?');
        if (confirm) {
          location = await getUserLocation();
        } else {
          alert('Please set a venue location first!');
          return;
        }
      }
      
      // ✅ FIX 1: Properly populate queue to song limit
      const maxQueueSize = gig.queueSize || 20;
      let queuedSongs = [];

      // STEP 1: Get songs from gig playlist if selected
      if (gig.playlistId) {
        const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
        if (playlist && playlist.songs.length > 0) {
          queuedSongs = playlist.songs
            .map(id => masterSongs.find(s => s.id === id))
            .filter(Boolean);
          
          console.log('📋 Loaded gig playlist:', queuedSongs.length, 'songs');
        }
      }

      // STEP 2: If no playlist or empty, start with master playlist
      if (queuedSongs.length === 0) {
        queuedSongs = [...masterSongs];
        console.log('📋 Using master playlist:', queuedSongs.length, 'songs');
      }

      // STEP 3: ✅ CRITICAL - Fill queue from master playlist if under limit
      if (queuedSongs.length < maxQueueSize) {
        const currentSongIds = queuedSongs.map(s => s.id);
        const remainingSlots = maxQueueSize - queuedSongs.length;
        
        // Get additional songs (these are OBJECTS, not IDs)
        const additionalSongs = masterSongs
          .filter(s => !currentSongIds.includes(s.id))
          .slice(0, remainingSlots);
        
        // Combine existing queue with additional songs
        queuedSongs = [...queuedSongs, ...additionalSongs];
        
        console.log('✅ Added', additionalSongs.length, 'songs from master playlist');
        console.log('✅ Total queue size:', queuedSongs.length);
      }

      // STEP 4: Ensure we don't exceed the limit
      queuedSongs = queuedSongs.slice(0, maxQueueSize);

      console.log('🎵 Final queue:', queuedSongs.length, 'songs (limit:', maxQueueSize, ')');

      // Create unique gig ID using venue + date + time
      const uniqueGigKey = `${gig.venueName}_${gig.date}_${gig.time}`.replace(/\s/g, '_');

      const gigData = {
        artistId: currentUser.uid,
        artistName: currentUser.displayName || 'Artist',
        artistProfile: artistProfile,
        venueName: gig.venueName,
        venueAddress: gig.address || '',
        location: location,
        queuedSongs: queuedSongs,           // ✅ CHANGED
        maxQueueSize: maxQueueSize,         // ✅ CHANGED
        masterPlaylist: masterSongs,
        status: 'live',
        gigDate: gig.date,
        gigTime: gig.time,
        gigId: gig.id,
        uniqueKey: uniqueGigKey
      };
      
      // Check if gig already exists in Firebase (has an ID from saving)
      let gigId;

      if (gig.id && typeof gig.id === 'string' && gig.id.length > 10) {
        // Gig exists - update to live
        console.log('📝 Updating existing gig to live:', gig.id);
        gigId = await updateGigToLive(gig.id, queuedSongs, masterSongs);  // ✅ FIXED
      } else {
        // New gig - create in Firebase
        console.log('🆕 Creating new live gig');
        gigId = await createLiveGig(gigData, currentUser.uid);
      }
      
      setLiveGig({...gigData, id: gigId});
      setMode('live');

      // ✅ ISSUE 6 FIX: Save live gig to localStorage
      if (currentUser) {
        localStorage.setItem(`GigWave_live_${currentUser.uid}`, JSON.stringify({
          ...gigData,
          id: gigId
        }));
      }
      
      alert(`✅ You're live at ${gig.venueName}!\n\nAudience can find you by searching nearby!`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleExtendTime = async () => {
  try {
    await extendGigTime(liveGig.id, 60);  // ✅ FIX: Pass 60 minutes (1 hour)
    setShowTimeWarning(false);
    alert('✅ Added 1 hour to your gig!');
  } catch (error) {
    alert('Error extending time: ' + error.message);
  }
};

 const handleEndGig = async (customMessage = null, skipConfirm = false) => {
  // Prevent multiple simultaneous calls
  if (isEndingGig) {
    console.log('⚠️ Already ending gig, ignoring duplicate call');
    return;
  }
  
  // Skip confirmation for auto-end
  if (!skipConfirm && !window.confirm('End this gig?')) return;
  
  setIsEndingGig(true); // Set flag immediately
  
  try {
    await firebaseEndLiveGig(liveGig.id);
    
    // Update gigs with ended status
    const updatedGigs = gigs.map(g => 
      g.id === liveGig.gigId || (g.venueName === liveGig.venueName && g.date === liveGig.date)
        ? {...g, status: 'ended'} 
        : g
    );
    
    // Update state
    setGigs(updatedGigs);
    
    // Force save to localStorage immediately
    if (currentUser) {
      localStorage.setItem(`GigWave_gigs_${currentUser.uid}`, JSON.stringify(updatedGigs));
      console.log('💾 Gig status updated to ended in localStorage');
    }
    
    // Clear live gig
    setLiveGig(null);
    setMode('artist');

    // ✅ ISSUE 6 FIX: Clear live gig from localStorage
    if (currentUser) {
      localStorage.removeItem(`GigWave_live_${currentUser.uid}`);
    }
    
    // Show custom message or default
    alert(customMessage || '✅ Gig ended! Status updated to ended.');
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    setIsEndingGig(false); // Reset flag
  }
};

  // Profile handlers
  const handleSaveProfile = async () => {
    try {
      // 🔒 CHECK EMAIL VERIFICATION FIRST
      if (!emailVerified) {
        alert('⚠️ Please verify your email before completing your profile!\n\nCheck your inbox for the verification link.');
        setShowEmailVerification(true);
        return;
      }
      
      // Validate required fields
      if (!profileData.artistName || !profileData.fullName || !profileData.bio || 
          !profileData.genre || !profileData.location) {
        alert('⚠️ Please fill in all required fields!');
        return;
      }
      
      if (profileData.bio.length < 50) {
        alert('⚠️ Bio must be at least 50 characters long!');
        return;
      }
      
      // Save profile
      await saveArtistProfile(currentUser.uid, {
        ...profileData,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified
      });
      
      // Reload profile
      const updatedProfile = await getArtistProfile(currentUser.uid);
      setArtistProfile(updatedProfile);
      
      setShowProfileSetup(false);
      alert('✅ Profile saved successfully!');
    } catch (error) {
      alert('Error saving profile: ' + error.message);
    }
  };

// Handle sending email verification
const handleSendVerification = async () => {
  try {
    console.log('📧 Attempting to send verification email...');
    
    if (!currentUser) {
      alert('❌ No user logged in!');
      return;
    }
    
    console.log('👤 Current user:', currentUser.email);
    console.log('✅ Email verified?', currentUser.emailVerified);
    
    if (currentUser.emailVerified) {
      alert('✅ Your email is already verified!');
      setEmailVerified(true);
      setShowEmailVerification(false);
      return;
    }
    
    const result = await sendEmailVerification();
    console.log('📧 Send result:', result);
    
    // ✅ FIX: Safely extract string message
    const message = typeof result === 'string' 
      ? result 
      : (result?.message && typeof result.message === 'string' 
          ? result.message 
          : 'Verification email sent! Check your inbox.');
    
    alert(message);
  } catch (error) {
    console.error('❌ Error sending verification:', error);
    alert('Error: ' + error.message);
  }
};

const handleCheckVerification = async () => {
  try {
    const verified = await checkEmailVerified();
    setEmailVerified(verified);
    
    if (verified) {
      alert('✅ Email verified successfully!');
      setShowEmailVerification(false);
    } else {
      alert('⚠️ Email not verified yet. Please check your inbox and click the verification link.');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};
  
  // Task 20: Handle voting with duplicate prevention
  const handleVote = async (songId) => {
  // Check if user is logged in
  if (!currentUser) {
    alert('Please sign in to vote!');
    setShowAuthModal(true);
    return;
  }
  
  // ✅ FIX 4: Check if song is already played
  if (liveGigData.playedSongs?.includes(songId)) {
    alert('⚠️ This song has already been played!\n\nYou can only vote for upcoming songs.');
    return;
  }
  
  // Make sure we're in a live gig
  if (!liveGig) {
    alert('⚠️ No active live gig!');
    return;
  }
  
  try {
    // Check if already voted
    const alreadyVoted = await hasUserVoted(liveGig.id, songId, currentUser.uid);
    
    if (alreadyVoted) {
      alert('⚠️ You already voted for this song!');
      return;
    }
    
    // Record the vote
    await recordUserVote(liveGig.id, songId, currentUser.uid);
    
    // ✅ UPDATE LOCAL STATE: Track this vote
    setUserVotes(prev => ({
      ...prev,
      [songId]: true
    }));
    
    // ✅ REMOVED: alert('✅ Vote recorded!');
    // Vote recorded silently - no alert

    // ✅ Only show rating modal ONCE if user hasn't rated yet
    if (!hasRatedArtist && liveGig) {
      // Check if user has already rated this artist
      const hasRated = await checkIfUserRatedArtist(liveGig.artistId, currentUser.uid);
      if (!hasRated) {
        setShowRatingModal(true);
      }
    }
    
    // Refresh vote counts
    const gigRef = doc(db, 'liveGigs', String(liveGig.id));
    const gigSnap = await getDoc(gigRef);
    if (gigSnap.exists()) {
      setLiveGigData(prev => ({
        ...prev,
        votes: gigSnap.data().votes || {}
      }));
    }
  } catch (error) {
    console.error('Error voting:', error);
    alert('❌ Error recording vote: ' + error.message);
  }
};

  // Handle FREE Song Request Submission (No Payment)
  const handleSongRequest = async () => {
  if (!selectedRequestSong) {
    alert('Please select a song first!');
    return;
  }

  if (!currentUser) {
    alert('Please log in to request a song');
    setShowAuthModal(true);
    return;
  }

  // ✅ NEW: Check if user already has a pending request
  const hasPendingRequest = (liveGigData.songRequests || []).some(
    request => request.requesterId === currentUser.uid && request.status === 'pending'
  );

  if (hasPendingRequest) {
    alert(
      '⚠️ You already have a pending request!\n\n' +
      'Please wait for the artist to accept or reject your current request before submitting another one.\n\n' +
      '💡 Tip: You can vote for songs while you wait!'
    );
    return;
  }

  // ✅ NEW: Check if this song was already rejected for this user
  const wasRejected = (liveGigData.songRequests || []).some(
    request => 
      request.requesterId === currentUser.uid && 
      request.songId === selectedRequestSong.id && 
      request.status === 'rejected'
  );

  if (wasRejected) {
    alert(
      '⚠️ This song was already rejected by the artist!\n\n' +
      `"${selectedRequestSong.title}" cannot be requested again for this gig.\n\n` +
      '💡 Tip: Try requesting a different song or vote for songs in the queue!'
    );
    return;
  }

  // ✅ FIX 4: Check if song is already played
  if (liveGigData.playedSongs?.includes(selectedRequestSong.id)) {
    alert('⚠️ This song has already been played!\n\nYou can only request upcoming songs.');
    return;
  }

  if (requestMessage.length > 200) {
    alert('Message must be 200 characters or less');
    return;
  }
    
  // ✅ NEW: Always allow requests - artist handles queue overflow
  try {
    // Submit request directly
    await submitSongRequest(
      liveGig.id,
      selectedRequestSong,
      currentUser.uid,
      currentUser.displayName || 'Anonymous',
      requestMessage,
      0,
      false
    );

    alert(
      `✅ Song requested!\n\n` +
      `"${selectedRequestSong.title}" by ${selectedRequestSong.artist}\n\n` +
      `The artist will review your request.\n\n` +
      `💡 Tip: If the queue is full, the artist can still accept your request by removing a lower-priority song.`
    );

    setShowRequestModal(false);
    setSelectedRequestSong(null);
    setRequestMessage('');

    // ⭐ TASK 13: Show rating modal after request (only if not rated yet)
    if (!hasRatedArtist) {
      setShowRatingModal(true);
    }
    
  } catch (error) {
    console.error('Error submitting song request:', error);
    alert('❌ Error: ' + error.message);
  }
};

  // Task 13: Submit artist rating
  const handleSubmitRating = async () => {
    if (!currentUser || !liveGig || artistRating === 0) return;
    
    try {
      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
      const gigSnap = await getDoc(gigRef);
      
      if (gigSnap.exists()) {
        const currentRatings = gigSnap.data().ratings || [];
        
        // Check if user already rated
        const existingRatingIndex = currentRatings.findIndex(
          r => r.userId === currentUser.uid
        );
        
        const ratingEntry = {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          gigId: liveGig.id,
          artistRating: artistRating,
          timestamp: new Date().toISOString()
        };
        
        let updatedRatings;
        if (existingRatingIndex >= 0) {
          // Update existing rating
          updatedRatings = [...currentRatings];
          updatedRatings[existingRatingIndex] = ratingEntry;
          console.log('✅ Updated existing rating');
        } else {
          // Add new rating
          updatedRatings = [...currentRatings, ratingEntry];
          console.log('✅ Added new rating');
        }
        
        await updateDoc(gigRef, {
          ratings: updatedRatings
        });
        
        setHasRatedArtist(true);          // ← Prevents modal from showing again
        setCurrentGigRating(artistRating); // ← Stores current rating
        
        alert(existingRatingIndex >= 0 
          ? '✅ Rating updated!' 
          : '✅ Thanks for rating the artist!');
        
        // ✅ CLOSE MODAL AND RESET
        setShowRatingModal(false);
        setArtistRating(0);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('❌ Failed to submit rating');
    }
  };
    
    // Skip rating or close modal
    const handleCloseRating = () => {
      setShowRatingModal(false);
      setArtistRating(0);
      
      // ✅ ADD THIS: Don't show again this session even if they didn't rate
      setHasRatedArtist(true);
    };

      // ✨ FEATURE: Search/filter gigs by venue, artist, or location
      const filterGigsBySearch = (gigsToFilter) => {
        if (!searchTerm.trim()) {
          return gigsToFilter;
        }
        
        const search = searchTerm.toLowerCase().trim();
        
        return gigsToFilter.filter(gig => {
          const venueName = (gig.venueName || '').toLowerCase();
          const artistName = (gig.artistName || '').toLowerCase();
          const venueAddress = (gig.venueAddress || '').toLowerCase();
          
          return venueName.includes(search) || 
                artistName.includes(search) ||
                venueAddress.includes(search);
        });
      };
       
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">          
          <h1 className="text-4xl font-bold">Loading GigWave...</h1>
        </div>
      </div>
    );
  }

  // ============================================
  // UPDATE handleViewArtistProfile - Require Sign-In
  // ============================================

  // Find your existing handleViewArtistProfile function (around line 1950)
  // and UPDATE it with this version that checks for authentication:

  const handleViewArtistProfile = async (artistId, artistEmail) => {
    // ✅ CHECK: Require sign-in to view artist details
    if (!currentUser) {
      alert('🔐 Please sign in to view artist details and gigs');
      setShowAuthModal(true);
      return;
    }
    
    try {
      // Get artist profile
      const profile = await getArtistProfile(artistId);
      
      if (!profile) {
        alert('❌ Artist profile not found');
        return;
      }
      
      setViewingArtistProfile(profile);
      setViewingArtistId(artistId);
      
      // Get artist's upcoming gigs
      const gigsQuery = query(
        collection(db, 'liveGigs'),
        where('artistId', '==', artistId),
        where('status', 'in', ['upcoming', 'live']),
        orderBy('gigDate', 'asc'),
        limit(10)
      );
      
      const gigsSnapshot = await getDocs(gigsQuery);
      const gigs = gigsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setViewingArtistGigs(gigs);
      setShowingArtistResults(false);
      setMode('artistProfile');
      
    } catch (error) {
      console.error('Error loading artist profile:', error);
      alert('❌ Error loading profile');
    }
  };

// Close artist profile view
const handleCloseArtistProfile = () => {
  setViewingArtistId(null);
  setViewingArtistProfile(null);
  setViewingArtistGigs([]);
  setShowingArtistResults(false);
  setMode('discover');
};

// ============================================
// ARTIST SEARCH - NO SIGN-IN REQUIRED
// ============================================

// Replace your handleArtistSearch function with this:

const handleArtistSearch = async (searchTerm) => {
  setArtistSearchQuery(searchTerm);
  
  if (!searchTerm || searchTerm.trim().length < 2) {
    setArtistSuggestions([]);
    setShowArtistSuggestions(false);
    setShowingArtistResults(false); // ✅ Clear when no search
    return;
  }
  
  try {
    setLoadingArtists(true);
    setShowingArtistResults(true); // ✅ Set to true when showing results
    
    const searchLower = searchTerm.toLowerCase().trim();
    const artists = [];
    
    const usersRef = collection(db, 'users');
    console.log('📡 Querying users collection...');
    
    const usersSnapshot = await getDocs(usersRef);
    console.log('✅ Found', usersSnapshot.size, 'users');
    
    // 👇 ADD THIS DEBUG SECTION
    console.log('📋 Checking each user:');
    for (const userDoc of usersSnapshot.docs) {
      console.log('  User ID:', userDoc.id);
      console.log('  User email:', userDoc.data().email);
    }
    // 👆 END DEBUG SECTION
    
    // Check each user for artist profile
    for (const userDoc of usersSnapshot.docs) {
      try {
        const profileRef = doc(db, 'users', userDoc.id, 'profile', 'data');
        
        // 👇 ADD THIS LOG
        console.log('  📂 Checking profile for:', userDoc.id);
        // 👆
        
        const profileSnap = await getDoc(profileRef);
        
        // 👇 ADD THIS LOG
        console.log('  Profile exists?', profileSnap.exists());
        if (profileSnap.exists()) {
          console.log('  Profile data:', profileSnap.data());
        }
        // 👆
        
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          
          // Only include users with artistName (completed artist profile)
          if (profile.artistName) {
            const artistName = profile.artistName.toLowerCase();
            const fullName = (profile.fullName || '').toLowerCase();
            
            console.log('👤 Found artist:', profile.artistName);
            
            // Check if matches search
            if (artistName.includes(searchLower) || fullName.includes(searchLower)) {
              console.log('✅ MATCH:', profile.artistName);
              
              artists.push({
                id: userDoc.id,
                artistName: profile.artistName,
                fullName: profile.fullName || '',
                genre: profile.genre || '',
                location: profile.location || '',
                profilePhoto: profile.profilePhoto || '',
                bio: profile.bio || '',
                socialMedia: profile.socialMedia || {}
              });
            }
          }
        }
      } catch (profileError) {
        // Skip users without profiles
        console.log('⚠️ No profile for user:', userDoc.id);
        console.log('⚠️ Error:', profileError.message); // 👈 ADD THIS
      }
    }
    
    console.log('🎯 Total matches:', artists.length);
    
    // Sort by relevance
    artists.sort((a, b) => {
      const aNameLower = a.artistName.toLowerCase();
      const bNameLower = b.artistName.toLowerCase();
      
      // Exact match first
      if (aNameLower === searchLower) return -1;
      if (bNameLower === searchLower) return 1;
      
      // Starts with search term
      if (aNameLower.startsWith(searchLower) && !bNameLower.startsWith(searchLower)) return -1;
      if (bNameLower.startsWith(searchLower) && !aNameLower.startsWith(searchLower)) return 1;
      
      // Alphabetical
      return aNameLower.localeCompare(bNameLower);
    });
    
    setArtistSuggestions(artists);
    setShowArtistSuggestions(true);
    
  } catch (error) {
    console.error('❌ Search error:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    
    if (error.code === 'permission-denied') {
      alert(
        '⚠️ Error: Firebase rules need updating\n\n' +
        'Make sure Firebase rules allow public read access to users collection.\n\n' +
        'Check the console for details.'
      );
    } else {
      alert('Error searching artists: ' + error.message);
    }
  } finally {
    setLoadingArtists(false);
  }
};

  // Auth Modal - Backstage Access
  if (showAuthModal) {
    const handleEmailAuth = async () => {
      setAuthError('');
      
      // Basic validation
      if (!authEmail || !authPassword) {
        setAuthError('Please enter both email and password');
        return;
      }
      
      if (authPassword.length < 6) {
        setAuthError('Password must be at least 6 characters');
        return;
      }
      
      try {
        if (authTab === 'signup') {
          console.log('📝 Attempting sign-up...');
          await signUpWithEmail(authEmail, authPassword);
          alert('✅ Account created successfully!\n\nPlease check your email to verify your account.');
        } else {
          console.log('🔐 Attempting sign-in...');
          await signInWithEmail(authEmail, authPassword);
          alert('✅ Signed in successfully!');
        }
        
        setShowAuthModal(false);        
        
      } catch (error) {
        console.error('❌ Auth error:', error);
        
        // ✅ Better error messages
        let errorMessage = '';
        
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = '❌ This email is already registered!\n\nPlease sign in instead, or use a different email.';
            setAuthTab('signin'); // Switch to sign-in tab
            break;
            
          case 'auth/invalid-email':
            errorMessage = '❌ Invalid email address format';
            break;
            
          case 'auth/weak-password':
            errorMessage = '❌ Password is too weak. Use at least 6 characters.';
            break;
            
          case 'auth/user-not-found':
            errorMessage = '❌ No account found with this email.\n\nPlease sign up first!';
            setAuthTab('signup'); // Switch to sign-up tab
            break;
            
          case 'auth/wrong-password':
            errorMessage = '❌ Incorrect password. Please try again.';
            break;
            
          case 'auth/too-many-requests':
            errorMessage = '❌ Too many failed attempts.\n\nPlease try again later or reset your password.';
            break;
            
          case 'auth/network-request-failed':
            errorMessage = '❌ Network error. Please check your internet connection.';
            break;
            
          default:
            errorMessage = error.message || 'Authentication failed';
        }
        
        setAuthError(errorMessage);
        alert(errorMessage);
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rock-background gig-card border-2 border-electric max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="concert-heading text-3xl text-electric">
              {authTab === 'signup' ? '🎸 JOIN US' : '🎤 SIGN IN'}
            </h2>
            <button 
              onClick={() => setShowAuthModal(false)} 
              className="text-white hover:text-red-400 p-2 touch-target"
            >
              <X size={32} />
            </button>
          </div>
  
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setAuthTab('signin')}
              className={`btn ${
                authTab === 'signin' 
                  ? 'btn-electric' 
                  : 'btn-ghost'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthTab('signup')}
              className={`btn ${
                authTab === 'signup' 
                  ? 'btn-electric' 
                  : 'btn-ghost'
              }`}
            >
              Sign Up
            </button>
          </div>
  
          <div className="space-y-4">
            {/* APPLE SIGN-IN REMOVED - Requires $99/year Apple Developer Account
            <button
              onClick={() => handleSignIn('apple')}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 border-2 border-magenta transition-all hover:scale-[1.02]"
            >
              <span>🍎</span>
              <span>Continue with Apple</span>
            </button>
            */}
            
            {/* 🔐 Google Sign In - FORCE BLACK TEXT */}
            <button
              onClick={() => handleSignIn('google')}
              className="w-full px-6 py-4 bg-white hover:bg-gray-100 rounded-lg font-bold flex items-center justify-center gap-2 border-2 border-gray-400 transition-all hover:scale-[1.02]"
              style={{ 
                color: '#000000 !important'
              }}
            >
              <span style={{ color: '#000000' }}>🔐</span>
              <span style={{ color: '#000000', fontWeight: 'bold' }}>Continue with Google</span>
            </button>
            <button
              onClick={() => handleSignIn('facebook')}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <span>📘</span>
              <span>Continue with Facebook</span>
            </button>
  
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-electric/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-dark text-electric font-bold uppercase tracking-wider">
                  Or use email
                </span>
              </div>
            </div>
  
            {/* Email/Password Form */}
            {authError && (
              <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 text-red-200 text-sm">
                <p className="font-bold mb-1">⚠️ Error</p>
                <p>{authError}</p>
              </div>
            )}
  
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEmailAuth()}
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
            />
            <button
              onClick={handleEmailAuth}
              className="btn btn-neon w-full text-lg"
            >
              {authTab === 'signup' ? (
                <>
                  <span>⚡</span>
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile Setup Modal - REQUIRED BEFORE USING APP
  if (showProfileSetup) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="rock-background gig-card border-2 border-electric max-w-3xl w-full my-8">
          <div className="mb-6">
            <h2 className="concert-heading text-4xl text-electric mb-2">
              🎸 COMPLETE YOUR ARTIST PROFILE
            </h2>
            <p className="text-gray-light">
              Fill out your profile to start creating gigs and going live!
            </p>
            
            {/* Progress Indicator */}
            <div className="mt-4 flex items-center gap-2">
              <div className={`flex-1 h-2 rounded-full ${profileStep >= 1 ? 'bg-electric' : 'bg-white/20'}`}></div>
              <div className={`flex-1 h-2 rounded-full ${profileStep >= 2 ? 'bg-electric' : 'bg-white/20'}`}></div>
              <div className={`flex-1 h-2 rounded-full ${profileStep >= 3 ? 'bg-electric' : 'bg-white/20'}`}></div>
            </div>
            <p className="text-electric text-sm mt-2 font-bold">Step {profileStep} of 3</p>
          </div>
  
          {/* Email Verification Warning */}
          {!emailVerified && (
            <div className="bg-red-500/20 border-2 border-red-400 rounded-lg p-6 mb-6">
              <p className="text-red-300 font-bold text-lg mb-2">⚠️ EMAIL NOT VERIFIED</p>
              <p className="text-white mb-4">
                You must verify your email before completing your profile.
              </p>
              <p className="text-red-200 text-sm mb-4">
                Check your inbox: <span className="font-bold">{currentUser?.email}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSendVerification}  // ✅ CORRECT - actually sends email
                  className="flex-1 btn btn-neon text-sm"
                >
                  📧 Send Verification Email
                </button>
                <button
                  onClick={handleCheckVerification}  // ✅ CORRECT - checks status
                  className="flex-1 btn btn-electric text-sm"
                >
                  🔄 Check Status
                </button>
              </div>
            </div>
          )}
  
          {/* Privacy Message */}
          <div className="bg-green-500/20 border border-neon rounded-lg p-4 mb-6">
            <p className="text-neon font-bold text-sm">
              🔒 Your email ({currentUser?.email}) will NOT be displayed publicly and remains confidential.
            </p>
          </div>
  
          <div className="space-y-6">
            {/* Step 1: Basic Info */}
            {profileStep === 1 && (
              <div className="space-y-4">
                <h3 className="concert-heading text-2xl text-magenta mb-4">📝 BASIC INFORMATION</h3>
                
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm">
                    Artist/Band Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.artistName}
                    onChange={(e) => setProfileData({...profileData, artistName: e.target.value})}
                    placeholder="e.g. The Electric Waves"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    placeholder="e.g. John Smith"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm">
                    Bio * (minimum 50 characters)
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    placeholder="Tell your audience about your music, style, and story..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                  <p className={`text-sm mt-1 ${profileData.bio.length >= 50 ? 'text-neon' : 'text-gray'}`}>
                    {profileData.bio.length}/50 characters
                  </p>
                </div>
  
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-electric font-bold mb-2 block text-sm">
                      Genre/Style *
                    </label>
                    <input
                      type="text"
                      value={profileData.genre}
                      onChange={(e) => setProfileData({...profileData, genre: e.target.value})}
                      placeholder="e.g. Rock, Jazz, Electronic"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                    />
                  </div>
  
                  <div>
                    <label className="text-electric font-bold mb-2 block text-sm">
                      Location/City *
                    </label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      placeholder="e.g. New York, NY"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                    />
                  </div>
                </div>
  
                <button
                  onClick={() => {
                    if (!profileData.artistName || !profileData.fullName || !profileData.bio || 
                        profileData.bio.length < 50 || !profileData.genre || !profileData.location) {
                      alert('⚠️ Please fill in all required fields!');
                      return;
                    }
                    setProfileStep(2);
                  }}
                  className="btn btn-neon w-full text-lg"
                >
                  Next: Social Media →
                </button>
              </div>
            )}
  
            {/* Step 2: Social Media */}
            {profileStep === 2 && (
              <div className="space-y-4">
                <h3 className="concert-heading text-2xl text-magenta mb-4">🔗 SOCIAL MEDIA (Optional)</h3>
                <p className="text-gray-light text-sm mb-4">
                  Add your social media links so fans can follow you!
                </p>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm flex items-center gap-2">
                    <span>📷</span> Instagram
                  </label>
                  <input
                    type="text"
                    value={profileData.socialMedia.instagram}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: {...profileData.socialMedia, instagram: e.target.value}
                    })}
                    placeholder="@username or full URL"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm flex items-center gap-2">
                    <span>👍</span> Facebook
                  </label>
                  <input
                    type="text"
                    value={profileData.socialMedia.facebook}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: {...profileData.socialMedia, facebook: e.target.value}
                    })}
                    placeholder="Page URL"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm flex items-center gap-2">
                    <span>💼</span> LinkedIn
                  </label>
                  <input
                    type="text"
                    value={profileData.socialMedia.linkedin || ''}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: {...profileData.socialMedia, linkedin: e.target.value}
                    })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm flex items-center gap-2">
                    <span>📺</span> YouTube
                  </label>
                  <input
                    type="text"
                    value={profileData.socialMedia.youtube}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: {...profileData.socialMedia, youtube: e.target.value}
                    })}
                    placeholder="Channel URL"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  />
                </div>
  
                <div className="flex gap-3">
                  <button
                    onClick={() => setProfileStep(1)}
                    className="btn btn-ghost"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setProfileStep(3)}
                    className="flex-1 btn btn-neon text-lg"
                  >
                    Next: Review →
                  </button>
                </div>
              </div>
            )}
  
            {/* Step 3: Review & Save */}
            {profileStep === 3 && (
              <div className="space-y-4">
                <h3 className="concert-heading text-2xl text-magenta mb-4">✅ REVIEW & SAVE</h3>
  
                <div className="bg-white/5 rounded-lg p-6 space-y-3">
                  <div>
                    <p className="text-gray text-sm">Artist Name</p>
                    <p className="text-white font-bold text-lg">{profileData.artistName}</p>
                  </div>
                  <div>
                    <p className="text-gray text-sm">Full Name</p>
                    <p className="text-white font-bold">{profileData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray text-sm">Bio</p>
                    <p className="text-white">{profileData.bio}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray text-sm">Genre</p>
                      <p className="text-electric font-bold">{profileData.genre}</p>
                    </div>
                    <div>
                      <p className="text-gray text-sm">Location</p>
                      <p className="text-electric font-bold">{profileData.location}</p>
                    </div>
                  </div>
                  
                  {Object.values(profileData.socialMedia).some(v => v) && (
                    <div>
                      <p className="text-gray text-sm mb-2">Social Media</p>
                      <div className="flex flex-wrap gap-2">
                        {profileData.socialMedia.instagram && (
                          <span className="px-3 py-1 bg-magenta/20 text-magenta rounded-full text-sm">📷 Instagram</span>
                        )}
                        {profileData.socialMedia.facebook && (
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">👍 Facebook</span>
                        )}
                        {profileData.socialMedia.spotify && (
                          <span className="px-3 py-1 bg-green-500/20 text-neon rounded-full text-sm">🎵 Spotify</span>
                        )}
                        {profileData.socialMedia.youtube && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">📺 YouTube</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
  
                <div className="flex gap-3">
                  <button
                    onClick={() => setProfileStep(2)}
                    className="btn btn-ghost"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 btn btn-neon text-lg"
                  >
                    <Check size={20}/>
                    <span>Save Profile & Continue</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Email Verification Modal
  if (showEmailVerification) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rock-background gig-card border-2 border-orange max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="concert-heading text-3xl text-orange">
              📧 VERIFY EMAIL
            </h2>
            <button 
              onClick={() => setShowEmailVerification(false)} 
              className="text-white hover:text-red-400 p-2"
            >
              <X size={32} />
            </button>
          </div>
  
          <div className="space-y-4">
            <p className="text-white">
              Verify your email address to unlock all features.
            </p>
            <p className="text-gray-light text-sm">
              We'll send a verification link to: <span className="text-electric font-bold">{currentUser?.email}</span>
            </p>
  
            <button
              onClick={handleSendVerification}
              className="btn btn-neon w-full"
            >
              📧 Send Verification Email
            </button>
  
            <div className="border-t border-white/20 pt-4">
              <p className="text-gray-light text-sm mb-3">
                Already verified? Click below to refresh.
              </p>
              <button
                onClick={handleCheckVerification}
                className="btn btn-electric w-full"
              >
                🔄 Check Verification Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playlist Editor Modal - REDESIGNED Setlist Builder (Single Column)
  if (showPlaylistModal && editingPlaylist) {
    
    const filteredMasterSongs = masterSongs.filter(song => 
      !editingPlaylist.songs.includes(song.id) &&
      (song.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase()))
    );
    
    const moveSongUp = (index) => {
      if (index === 0) return;
      const newSongs = [...editingPlaylist.songs];
      [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
      setEditingPlaylist({...editingPlaylist, songs: newSongs});
    };
    
    const moveSongDown = (index) => {
      if (index === editingPlaylist.songs.length - 1) return;
      const newSongs = [...editingPlaylist.songs];
      [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
      setEditingPlaylist({...editingPlaylist, songs: newSongs});
    };

    const addAllSongs = () => {
      const allSongIds = masterSongs.map(s => s.id);
      setEditingPlaylist({...editingPlaylist, songs: allSongIds});
    };

    const clearAllSongs = () => {
      if (window.confirm('Remove all songs from this setlist?')) {
        setEditingPlaylist({...editingPlaylist, songs: []});
      }
    };

    const addRandomSongs = (count = 20) => {
      const availableSongs = masterSongs.filter(s => !editingPlaylist.songs.includes(s.id));
      const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
      const randomSongs = shuffled.slice(0, Math.min(count, availableSongs.length));
      const newSongs = [...editingPlaylist.songs, ...randomSongs.map(s => s.id)];
      setEditingPlaylist({...editingPlaylist, songs: newSongs});
    };
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 z-50">
        <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-electric rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
          
          {/* Close Button */}
          <button
            onClick={() => {
              setShowPlaylistModal(false);
              setEditingPlaylist(null);
              setPlaylistSearchQuery('');
            }}
            className="absolute top-2 right-2 text-white hover:text-electric text-2xl font-bold z-10 w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>

          {/* HEADER - Fixed */}
          <div className="pt-3 pb-2 px-3 border-b border-white/20 flex-shrink-0">
            <h2 className="text-center text-electric font-black text-lg tracking-wider mb-2">
              🎸 SETLIST BUILDER
            </h2>
            
            {/* Playlist Name & Description */}
            <div className="space-y-2 mb-2">
              <input
                type="text"
                value={editingPlaylist.name}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, name: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                placeholder="Playlist name..."
              />
              <textarea
                value={editingPlaylist.description}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, description: e.target.value})}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none resize-none"
                rows={1}
                placeholder="Description (optional)..."
              />
            </div>

            {/* Search Bar */}
            <input
              type="text"
              value={playlistSearchQuery}
              onChange={(e) => setPlaylistSearchQuery(e.target.value)}
              placeholder="🔍 Search songs in master playlist..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
            />
          </div>

          {/* BODY - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2">
            
            {/* SECTION 1: Current Setlist */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-purple-300 font-bold text-sm uppercase tracking-wider">
                    🎵 Current Setlist
                  </h3>
                  <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {editingPlaylist.songs.length}
                  </span>
                </div>
                
                {/* Quick Actions */}
                {editingPlaylist.songs.length > 0 && (
                  <button
                    onClick={clearAllSongs}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold py-1 px-2 rounded transition-all"
                  >
                    🗑️ Clear All
                  </button>
                )}
              </div>

              {editingPlaylist.songs.length === 0 ? (
                <div className="bg-purple-500/5 border border-purple-400/30 rounded-lg p-6 text-center">
                  <p className="text-white/40 text-sm mb-1">📭</p>
                  <p className="text-white/60 text-xs">No songs in setlist yet</p>
                  <p className="text-white/40 text-xs mt-1">Add songs from master playlist below ↓</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {editingPlaylist.songs.map((songId, index) => {
                    const song = masterSongs.find(s => s.id === songId);
                    return song ? (
                      <div 
                        key={songId} 
                        className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-2"
                      >
                        {/* Top Row */}
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-purple-300 font-bold text-xs flex-shrink-0 w-6">
                            {index + 1}
                          </span>
                          <div className="text-white font-semibold text-xs leading-tight flex-1 min-w-0 truncate">
                            {song.title}
                          </div>
                          <button
                            onClick={() => removeSongFromGigPlaylist(songId)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                            title="Remove"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-purple-200 text-xs truncate flex-1 pl-8">
                            {song.artist}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveSongUp(index)}
                              disabled={index === 0}
                              className="text-purple-300 hover:text-purple-100 disabled:opacity-20 text-base leading-none w-6 h-6 flex items-center justify-center"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveSongDown(index)}
                              disabled={index === editingPlaylist.songs.length - 1}
                              className="text-purple-300 hover:text-purple-100 disabled:opacity-20 text-base leading-none w-6 h-6 flex items-center justify-center"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: Master Playlist */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-green-300 font-bold text-sm uppercase tracking-wider">
                    📚 Add From Master
                  </h3>
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {filteredMasterSongs.length}
                  </span>
                </div>

                {/* Quick Actions */}
                {filteredMasterSongs.length > 0 && (
                  <div className="flex gap-1">
                    <button
                      onClick={addAllSongs}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-bold py-1 px-2 rounded transition-all"
                    >
                      ➕ Add All
                    </button>
                    {filteredMasterSongs.length >= 20 && (
                      <button
                        onClick={() => addRandomSongs(20)}
                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold py-1 px-2 rounded transition-all"
                      >
                        🎲 20
                      </button>
                    )}
                  </div>
                )}
              </div>

              {masterSongs.length === 0 ? (
                <div className="bg-green-500/5 border border-green-400/30 rounded-lg p-6 text-center">
                  <p className="text-white/40 text-sm mb-1">📭</p>
                  <p className="text-white/60 text-xs">No songs in master playlist</p>
                  <p className="text-white/40 text-xs mt-1">Add songs in Master Playlist tab first</p>
                </div>
              ) : filteredMasterSongs.length === 0 ? (
                <div className="bg-green-500/5 border border-green-400/30 rounded-lg p-6 text-center">
                  <p className="text-green-300 text-sm mb-1">✅</p>
                  <p className="text-green-300 text-xs font-bold">
                    {playlistSearchQuery 
                      ? `No songs found for "${playlistSearchQuery}"` 
                      : 'All master songs added to setlist!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMasterSongs.map(song => (
                    <div 
                      key={song.id} 
                      className="bg-green-500/10 border border-green-400/30 rounded-lg p-2 hover:bg-green-500/20 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-xs truncate mb-0.5">
                            {song.title}
                          </div>
                          <div className="text-green-200 text-xs truncate">
                            {song.artist}
                          </div>
                        </div>
                        <button
                          onClick={() => addSongToGigPlaylist(song.id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded flex-shrink-0 transition-all shadow-lg"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER - Fixed */}
          <div className="p-2 border-t border-white/20 flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={saveGigPlaylist}
                disabled={!editingPlaylist.name.trim() || editingPlaylist.songs.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Check size={16}/>
                <span>Save Setlist</span>
              </button>
              <button
                onClick={() => {
                  setShowPlaylistModal(false);
                  setEditingPlaylist(null);
                  setPlaylistSearchQuery('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold text-sm py-2.5 px-4 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gig Modal - Show Creator
  if (showGigModal && editingGig) {
  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
      style={{ pointerEvents: 'none' }}
    >
      <div 
        className="rock-background gig-card border-2 border-orange max-w-2xl w-full h-[90vh] flex flex-col"
        style={{ pointerEvents: 'auto' }}  // ✅ But capture clicks on the modal itself
      >
          
          {/* HEADER - Fixed */}
          <div className="flex justify-between items-center p-6 pb-4 border-b border-white/10 flex-shrink-0">
            <h2 className="concert-heading text-3xl md:text-4xl text-orange">
              {gigs.find(g => g.id === editingGig.id) ? '🎸 EDIT SHOW' : '⚡ CREATE SHOW'}
            </h2>
            <button 
              onClick={() => {
                setShowGigModal(false); 
                setEditingGig(null);
              }} 
              className="text-white hover:text-red-400 p-2 touch-target"
            >
              <X size={32} />
            </button>
          </div>
  
          {/* BODY - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Venue Name */}
              <div>
                <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                  Venue Name *
                </label>
                <input
                  type="text"
                  value={editingGig.venueName}
                  onChange={(e) => setEditingGig({...editingGig, venueName: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                  placeholder="e.g. The Blue Note Jazz Club"
                />
              </div>
    
              {/* Venue Location Section */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="concert-heading text-xl text-neon flex items-center mb-4">
                  <MapPin className="mr-2" size={24}/>
                  VENUE LOCATION
                </h3>
                
                <div className="space-y-4">
                  {/* GPS Capture Button */}
                  <button
                    onClick={captureGPSLocation}
                    disabled={capturingGPS}
                    className="btn btn-electric w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {capturingGPS ? (
                      <>
                        <span className="loading-pulse">📍</span>
                        <span>Capturing...</span>
                      </>
                    ) : (
                      <>
                        <span>📍</span>
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
    
                  {/* Address Autocomplete */}
                  <div>
                    <label className="block text-sm font-bold text-neon mb-2">
                      OR SEARCH ADDRESS:
                    </label>
                    {showGigModal && editingGig && (
                      <AddressAutocomplete
                        key={editingGig.id} // ⚡ ADD KEY - prevents recreation
                        onSelect={(data) => {
                          console.log('✅ Address captured in App.jsx:', data);
                          setEditingGig({
                            ...editingGig,
                            address: data.address,
                            location: data.location,
                            venueName: editingGig.venueName || data.name
                          });
                        }}
                        placeholder="Type venue address..."
                      />
                    )}
                  </div>                
    
                  {/* Display Coordinates if captured */}
                  {editingGig.location && (
                    <p className="text-neon font-bold mt-4">
                      ✅ Location Captured
                    </p>
                  )}
                </div>
              </div>
    
              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editingGig.date}  // ✅ FIXED
                    onChange={(e) => {
                      console.log('📅 Date selected:', e.target.value);
                      setEditingGig({ ...editingGig, date: e.target.value });  // ✅ FIXED
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/30 focus:border-electric focus:outline-none [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={editingGig.time}
                    onChange={(e) => {
                      console.log('⏰ Time selected:', e.target.value);
                      setEditingGig({...editingGig, time: e.target.value});
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/30 focus:border-electric focus:outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
    
              {/* Playlist Selector */}
              <div>
                <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                  Assign Setlist (Optional)
                </label>
                <select
                  value={editingGig.playlistId || ''}
                  onChange={(e) => setEditingGig({
                    ...editingGig,
                    playlistId: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-electric/30 focus:border-electric focus:outline-none"
                >
                  <option value="" className="bg-gray-900 text-white">
                    No setlist (use master playlist)
                  </option>
                  {gigPlaylists.map(p => (
                    <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                      {p.name} ({p.songs.length} songs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Queue Size Setting */}
              <div>
                <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                  Maximum Queue Size
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editingGig.queueSize ?? 20}
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // Allow empty input while typing
                    if (value === '') {
                      setEditingGig({
                        ...editingGig,
                        queueSize: ''
                      });
                      return;
                    }
                    
                    // Only allow digits
                    if (!/^\d+$/.test(value)) {
                      return;
                    }
                    
                    // Parse and set
                    const num = parseInt(value);
                    setEditingGig({
                      ...editingGig,
                      queueSize: num
                    });
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    
                    // If empty or invalid, set to minimum
                    if (value === '' || isNaN(parseInt(value))) {
                      setEditingGig({
                        ...editingGig,
                        queueSize: 20
                      });
                      return;
                    }
                    
                    const num = parseInt(value);
                    
                    // Clamp to valid range
                    if (num < 20) {
                      setEditingGig({
                        ...editingGig,
                        queueSize: 20
                      });
                      alert('⚠️ Minimum queue size is 20 songs');
                    } else if (num > 50) {
                      setEditingGig({
                        ...editingGig,
                        queueSize: 50
                      });
                      alert('⚠️ Maximum queue size is 50 songs');
                    }
                  }}
                  placeholder="20-50"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-electric/30 focus:border-electric focus:outline-none"
                />
                
                {/* Show validation messages */}
                {editingGig.queueSize !== '' && editingGig.queueSize < 20 && (
                  <p className="text-red-400 text-sm mt-2 font-bold">
                    ⚠️ Minimum queue size is 20 songs
                  </p>
                )}
                
                {editingGig.queueSize > 50 && (
                  <p className="text-red-400 text-sm mt-2 font-bold">
                    ⚠️ Maximum queue size is 50 songs
                  </p>
                )}
                
                {(!editingGig.queueSize || (editingGig.queueSize >= 20 && editingGig.queueSize <= 50)) && (
                  <p className="text-gray-light text-sm mt-2">
                    💡 Type any number between 20-50 songs
                  </p>
                )}
              </div>
            </div>
          </div>
  
          {/* FOOTER - Fixed */}
          <div className="p-6 pt-4 border-t border-white/10 flex-shrink-0">
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={saveGig}
                disabled={savingGig}
                className={`flex-1 btn text-lg ${savingGig ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-neon'}`}
              >
                <Check size={20}/>
                <span>{savingGig ? 'Saving...' : 'Save Show'}</span>
              </button>
              <button
                onClick={() => {
                  setShowGigModal(false); 
                  setEditingGig(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gig Detail Modal - Backstage Pass Style
  if (showGigDetailModal && selectedUpcomingGig) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rock-background gig-card border-2 border-electric max-w-3xl w-full h-[90vh] flex flex-col">
          
          {/* HEADER - Fixed */}
          <div className="flex justify-end items-center p-4 flex-shrink-0">
            <button 
              onClick={() => {
                setShowGigDetailModal(false);
                setSelectedUpcomingGig(null);
              }} 
              className="text-white hover:text-red-400 p-2 touch-target"
            >
              <X size={32}/>
            </button>
          </div>

          {/* BODY - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
                
            {/* Setlist Preview */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-base md:text-lg text-magenta mb-4 font-bold whitespace-nowrap text-center">
                🎵 EXPECTED SETLIST
              </h3>
              {(() => {
                let displaySongs = [];
                const queueSize = selectedUpcomingGig.maxQueueSize || selectedUpcomingGig.queueSize || 20;
                const gigPlaylist = selectedUpcomingGig.queuedSongs || [];
                const masterPlaylist = selectedUpcomingGig.masterPlaylist || [];
                
                // Rule 1: Gig playlist has MORE songs than limit
                if (gigPlaylist.length > queueSize) {
                  const shuffled = [...gigPlaylist].sort(() => Math.random() - 0.5);
                  displaySongs = shuffled.slice(0, queueSize);
                }
                // Rule 2: Gig playlist has LESS songs than limit
                else if (gigPlaylist.length > 0 && gigPlaylist.length < queueSize) {
                  displaySongs = [...gigPlaylist];
                  const needed = queueSize - gigPlaylist.length;
                  const available = masterPlaylist.filter(m => !gigPlaylist.find(g => g.id === m.id));
                  const shuffled = [...available].sort(() => Math.random() - 0.5);
                  displaySongs = [...displaySongs, ...shuffled.slice(0, needed)];
                }
                // Rule 3 & 4: No gig playlist OR not selected
                else if (gigPlaylist.length === 0) {
                  const shuffled = [...masterPlaylist].sort(() => Math.random() - 0.5);
                  displaySongs = shuffled.slice(0, queueSize);
                }
                // Exactly at limit
                else {
                  displaySongs = gigPlaylist;
                }
                
                const playlistType = gigPlaylist.length > 0 ? 'Curated Queue' : 'Master Playlist';
                
                return displaySongs.length > 0 ? (
                  <>
                    <p className="text-electric text-sm mb-4 font-semibold">
                      Showing: {playlistType} ({displaySongs.length}/{queueSize} songs)
                    </p>
                    <div className="space-y-2">
                      {displaySongs.map((song, index) => {
                        // ✅ FIXED: Added safety check for song object
                        if (!song || !song.title) {
                          return null;
                        }
                        
                        return (
                          <div 
                            key={song.id || index} 
                            className="bg-white/5 p-3 rounded-lg flex items-center gap-3 hover:bg-white/10 transition border border-white/10"
                          >
                            <span className="concert-heading text-electric text-xl min-w-[40px]">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold truncate">{song.title}</div>
                              <div className="text-gray-light text-sm truncate">{song.artist || 'Unknown Artist'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-gray text-sm mt-4 italic text-center">
                      {displaySongs.length} song{displaySongs.length !== 1 ? 's' : ''} • Final setlist may vary
                    </p>
                  </>
                ) : (
                  <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                    <p className="text-gray-light">
                      Setlist not available yet. Check back closer to showtime! 🎸
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* FOOTER - Fixed */}
          <div className="p-6 pt-4 border-t border-white/10 flex-shrink-0">
            <div className="flex flex-row gap-3 justify-center">
              <button
                onClick={async () => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  
                  const isCurrentlyInterested = interestedGigs.includes(selectedUpcomingGig.id);
                  
                  try {
                    if (isCurrentlyInterested) {
                      await unmarkAsInterested(selectedUpcomingGig.id, currentUser.uid);
                      setInterestedGigs(interestedGigs.filter(id => id !== selectedUpcomingGig.id));
                    } else {
                      await markAsInterested(selectedUpcomingGig.id, currentUser.uid);
                      setInterestedGigs([...interestedGigs, selectedUpcomingGig.id]);
                    }
                  } catch (error) {
                    alert('Error updating interest: ' + error.message);
                  }
                }}
                className={`btn text-sm md:text-base px-4 ${
                  interestedGigs.includes(selectedUpcomingGig.id)
                    ? 'btn-neon'
                    : 'btn-electric'
                }`}
              >
                {interestedGigs.includes(selectedUpcomingGig.id) ? (
                  <>
                    <span>⭐</span>
                    <span>Mark As Interested</span>
                  </>
                ) : (
                  <>
                    <span>⭐</span>
                    <span>Mark as Interested</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowGigDetailModal(false);
                  setSelectedUpcomingGig(null);
                }}
                className="btn btn-ghost text-sm md:text-base px-6"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

// ============================================
//    ADMIN DASHBOARD CHECK - MUST BE FIRST
// ============================================
if (showAdminDashboard) {
  return (
    <AdminDashboard 
      currentUser={currentUser}
      onClose={() => setShowAdminDashboard(false)}
    />
  );
}

// Discovery Page
if (mode === 'discover') {
  return (
    <div className="rock-background min-h-screen p-4 pb-24 md:pb-4">
      <div className="max-w-4xl mx-auto pt-8 md:pt-20">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          {/* Logo and Title - Always visible */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Soundwave Logo */}
            <div className="relative logo-icon">
              <svg width="80" height="80" viewBox="0 0 100 100">
                {/* Soundwave bars - 3 distinct colors */}
                <rect x="10" y="30" width="8" height="40" fill="#00FFD4" rx="4">
                  <animate attributeName="height" values="40;60;40" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="y" values="30;20;30" dur="1s" repeatCount="indefinite" />
                </rect>
                <rect x="25" y="20" width="8" height="60" fill="#00D4FF" rx="4">
                  <animate attributeName="height" values="60;80;60" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y" values="20;10;20" dur="1.2s" repeatCount="indefinite" />
                </rect>
                <rect x="40" y="15" width="8" height="70" fill="#FF1B6D" rx="4">
                  <animate attributeName="height" values="70;90;70" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="y" values="15;5;15" dur="0.8s" repeatCount="indefinite" />
                </rect>
                <rect x="55" y="20" width="8" height="60" fill="#9D00FF" rx="4">
                  <animate attributeName="height" values="60;80;60" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="y" values="20;10;20" dur="1.2s" repeatCount="indefinite" />
                </rect>
                <rect x="70" y="30" width="8" height="40" fill="#00FFD4" rx="4">
                  <animate attributeName="height" values="40;60;40" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="y" values="30;20;30" dur="1s" repeatCount="indefinite" />
                </rect>
              </svg>
            </div>
            
            {/* App Name */}
            <h1 className="gigwave-logo" data-text="GigWave">
              GigWave
            </h1>
          </div>
          
          {/* Taglines - Only show when no results */}
          {nearbyGigs.length === 0 && (
            <>
              {/* Tagline with Wave Animation */}
              <p className="hero-tagline">
                {['Ride', 'The', 'Wave', 'Of', 'Live', 'Music'].map((word, i) => (
                  <span key={i} style={{ marginRight: '0.3em' }}>{word}</span>
                ))}
              </p>
              
              {/* Discover Text with Lightning Effects */}
              <div className="lightning-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Left Lightning Bolt */}
                <svg className="lightning-bolt left" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
                
                <h2 className="discover-text">
                  Discover Live Music Near You
                </h2>
                
                {/* Right Lightning Bolt */}
                <svg className="lightning-bolt right" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
              </div>
            </>
          )}
        </div>

        {/* Search Button - Only show when no results */}
        {nearbyGigs.length === 0 && (
          <div className="mb-8">
            <button
              onClick={handleSearchGigs}
              disabled={loadingGigs}
              className="btn btn-electric w-full text-xl md:text-2xl py-6 md:py-8 hover:scale-105 transition-transform"
            >              
              {loadingGigs ? (
                <>
                  <span className="loading-pulse">🔍</span>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Find Live Gigs</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Artist Search Section - Only show when no results */}
        {nearbyGigs.length === 0 && (
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={artistSearchQuery}
                onChange={(e) => handleArtistSearch(e.target.value)}
                onFocus={() => artistSuggestions.length > 0 && setShowArtistSuggestions(true)}
                placeholder="Search by artist name..."
                className="w-full px-4 py-4 pr-12 rounded-lg bg-white/10 text-white border-2 border-magenta/30 focus:border-magenta focus:outline-none text-lg"
                style={{
                  '::placeholder': {
                    color: 'white',
                    opacity: 1
                  }
                }}
              />
              
              {/* Search Icon */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-magenta">
                {loadingArtists ? (
                  <div className="animate-spin">⏳</div>
                ) : (
                  <span>🔍</span>
                )}
              </div>
              
              {/* Autocomplete Suggestions */}
              {showArtistSuggestions && artistSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-gray-900 border-2 border-magenta rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                  {artistSuggestions.map(artist => (
                    <button
                      key={artist.id}
                      onClick={() => {
                        handleViewArtistProfile(artist.id);
                        setShowArtistSuggestions(false);
                        setArtistSearchQuery('');
                      }}
                      className="w-full p-4 hover:bg-magenta/20 border-b border-white/10 last:border-b-0 text-left transition"
                    >
                      <div className="flex items-center gap-4">
                        {/* Artist Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-magenta to-electric flex items-center justify-center flex-shrink-0">
                          <Music size={24} className="text-white" />
                        </div>
                        
                        {/* Artist Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-lg truncate">
                            {artist.artistName}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {artist.genre && (
                              <span className="text-electric">🎵 {artist.genre}</span>
                            )}
                            {artist.location && (
                              <span className="text-gray-light">📍 {artist.location}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <div className="text-magenta">
                          →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* No Results Message */}
              {showArtistSuggestions && artistSuggestions.length === 0 && artistSearchQuery.length >= 2 && !loadingArtists && (
                <div className="absolute z-50 w-full mt-2 bg-gray-900 border-2 border-magenta rounded-lg p-6 text-center">
                  <p className="text-gray-light">
                    No artists found for "{artistSearchQuery}"
                  </p>
                  <p className="text-gray text-sm mt-2">
                    Try a different search term
                  </p>
                </div>
              )}
              
              {/* Close suggestions when clicking outside */}
              {showArtistSuggestions && (
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowArtistSuggestions(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Results Section */}
        {nearbyGigs.length > 0 && (
          <div className="space-y-6">

            {/* ✨ NEW: Search Box */}
            <div className="mb-6">
                          
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by venue, artist, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 50px 14px 16px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '2px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.6)';
                    e.target.style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                {/* Search Icon */}
                <span style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#00d4ff',
                  fontSize: '20px',
                  pointerEvents: 'none'
                }}>
                  🔍
                </span>
                
                {/* Clear Button */}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '50px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255, 107, 53, 0.2)',
                      border: '2px solid rgba(255, 107, 53, 0.5)',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff6b35',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: '0'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 107, 53, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 107, 53, 0.2)';
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* Results Count */}
              {searchTerm && (
                <div style={{
                  marginTop: '12px',
                  color: '#00d4ff',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  📊 Found {filterGigsBySearch(filteredGigs).length} gigs matching "{searchTerm}"
                </div>
              )}
            </div>

            {/* Date Filter - Simple Dropdown with smaller text */}
            <div className="flex items-center gap-4 mb-4">
              <label htmlFor="dateFilter" className="text-electric font-bold text-base whitespace-nowrap">
                🗓️ Filter:
              </label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => filterGigsByDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white border-2 border-electric/30 focus:border-electric focus:outline-none text-base font-bold cursor-pointer"
              >
                <option value="today" className="bg-gray-900 text-white font-bold">Today</option>
                <option value="tomorrow" className="bg-gray-900 text-white font-bold">Tomorrow</option>
                <option value="week" className="bg-gray-900 text-white font-bold">This Week</option>
                <option value="all" className="bg-gray-900 text-white font-bold">All Dates</option>
              </select>
            </div>

            {/* Results Counter */}
            <p className="text-gray-light text-sm mb-6 text-center">
              🎵 Showing <span className="text-electric font-bold">
                {(() => {
                  const activeCount = filteredGigs.filter(gig => {
                    const status = calculateGigStatus(gig);
                    return ['live', 'checkVenue', 'upcoming'].includes(status);
                  }).length;
                  return activeCount;
                })()}
              </span> of <span className="text-electric font-bold">
                {(() => {
                  return nearbyGigs.filter(gig => {
                    const status = calculateGigStatus(gig);
                    return ['live', 'checkVenue', 'upcoming'].includes(status);
                  }).length;
                })()}
              </span> active gigs
            </p>

            {/* Gig Results */}
            <div className="space-y-4">
              {(() => {
                // ✨ Apply search filter first
                let searchedGigs = filterGigsBySearch(filteredGigs);

                // Filter and sort gigs
                const displayGigs = searchedGigs
                  .map(gig => ({
                    ...gig,
                    calculatedStatus: calculateGigStatus(gig)
                  }))
                  .filter(gig => {
                    return ['live', 'checkVenue', 'upcoming'].includes(gig.calculatedStatus);
                  })
                  .sort((a, b) => {
                    const statusOrder = { live: 0, checkVenue: 1, upcoming: 2 };
                    
                    if (a.calculatedStatus !== b.calculatedStatus) {
                      return statusOrder[a.calculatedStatus] - statusOrder[b.calculatedStatus];
                    }
                    
                    const dateA = new Date(`${a.gigDate}T${a.gigTime}`);
                    const dateB = new Date(`${b.gigDate}T${b.gigTime}`);
                    return dateA - dateB;
                  });

                if (displayGigs.length === 0) {
                  return (
                    <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-6 text-center">
                      <p className="text-yellow-200 text-lg">
                        {searchTerm 
                          ? `No gigs found matching "${searchTerm}"`
                          : 'No active gigs found for selected date filter.'
                        }
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="btn btn-electric mt-4"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  );
                }

                const liveGigs = displayGigs.filter(g => g.calculatedStatus === 'live');
                const upcomingGigs = displayGigs.filter(g => g.calculatedStatus === 'upcoming' || g.calculatedStatus === 'checkVenue');

                return (
                  <>
                        {liveGigs.map(gig => (
                          <div 
                            key={gig.id} 
                            className="gig-card gig-card-live hover:scale-[1.02] transition-all"
                          >
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                              <div className="flex-1">
                                {/* Live Indicator */}
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="concert-heading text-xs tracking-wider" style={{color: '#39FF14'}}>
                                    <span className="inline-block animate-pulse" style={{
                                      filter: 'drop-shadow(0 0 8px #39FF14) drop-shadow(0 0 16px #39FF14) drop-shadow(0 0 24px #39FF14)',
                                      textShadow: '0 0 10px #39FF14, 0 0 20px #39FF14, 0 0 30px #39FF14'
                                    }}>🟢</span> LIVE NOW
                                  </span>
                                </div>

                                {/* Artist Name */}
                                <h3 className="concert-heading text-base text-white mb-0.5">
                                  {gig.artistName}
                                </h3>
                          
                                {/* Venue Info */}
                                <div className="space-y-2 text-gray-light">
                                  <p className="flex items-center gap-2 text-sm">
                                    <span className="text-electric">📍</span>
                                    <span className="font-semibold">{gig.venueName}</span>
                                    {gig.distance != null && !isNaN(gig.distance) && (
                                      <span className="text-electric font-bold">
                                        • {gig.distance < 1000 
                                          ? `${Math.round(gig.distance)}m away` 
                                          : `${(gig.distance/1000).toFixed(1)}km away`
                                        }
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Social Follow Buttons */}
                              {gig.artistProfile?.socialMedia && (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                  <SocialFollowButtons 
                                    socialMedia={gig.artistProfile.socialMedia}
                                    artistName={gig.artistName}
                                  />
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-3">
                                {/* View Playlist Button - NO AUTH REQUIRED */}
                                <button 
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    try {
                                      const gigRef = doc(db, 'liveGigs', gig.id);
                                      const gigSnap = await getDoc(gigRef);
                                      
                                      if (gigSnap.exists()) {
                                        const fullGigData = { 
                                          id: gigSnap.id, 
                                          ...gigSnap.data(), 
                                          distance: gig.distance
                                        };
                                        setSelectedUpcomingGig(fullGigData);
                                      } else {
                                        setSelectedUpcomingGig(gig);
                                      }
                                      
                                      setShowGigDetailModal(true);
                                    } catch (error) {
                                      console.error('Error fetching gig details:', error);
                                      setSelectedUpcomingGig(gig);
                                      setShowGigDetailModal(true);
                                    }
                                  }}
                                  className="btn btn-electric text-lg md:text-xl whitespace-nowrap touch-target"
                                >
                                  <Eye size={20}/>
                                  <span>VIEW PLAYLIST</span>
                                </button>
                                
                                {/* Join Live Button - AUTH REQUIRED */}
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (!currentUser) {
                                      alert('🔐 Sign in to join and interact with this live gig!');
                                      setShowAuthModal(true);
                                      return;
                                    }
                                    
                                    console.log('🎵 JOIN LIVE clicked for:', gig.artistName);
                                    handleJoinGig(gig);
                                  }}
                                  className="btn btn-neon text-lg md:text-xl whitespace-nowrap touch-target"
                                >
                                  <span>🎵</span>
                                  <span>JOIN LIVE</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                  
                    {/* Upcoming Gigs Section */}
                    {upcomingGigs.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="concert-heading text-4xl text-electric mb-6">
                          📅 UPCOMING GIGS
                        </h2>
                        
                        {upcomingGigs.map(gig => {
                          const gigDateTime = gig.gigDate && gig.gigTime 
                            ? `${new Date(gig.gigDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at ${gig.gigTime}`
                            : 'Time TBD';
                          
                          return (
                            <div 
                              key={gig.id} 
                              className="gig-card hover:scale-[1.02] transition-all"
                            >
                              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                <div className="flex-1">
                                  {/* Status Indicator */}
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      gig.calculatedStatus === 'checkVenue' ? 'bg-orange-500' : 'bg-electric'
                                    }`}></div>
                                    <span className={`font-bold text-xs uppercase tracking-wider ${
                                      gig.calculatedStatus === 'checkVenue' ? 'text-orange-400' : 'text-electric'
                                    }`}>
                                      {gig.calculatedStatus === 'checkVenue' ? 'Check With Venue' : 'Upcoming'}
                                    </span>
                                  </div>

                                  {/* Artist Name */}
                                  <h3 className="concert-heading text-xl md:text-2xl text-white mb-2">
                                    {gig.artistName}
                                  </h3>

                                  {/* Date/Time */}
                                  <p className="text-magenta font-bold text-base mb-3">
                                    🎸 {gigDateTime}
                                  </p>

                                  {/* Venue Info with Distance Inline */}
                                  <div className="space-y-1 text-gray-light">
                                    <p className="flex items-center gap-2 text-sm">
                                      <span className="text-electric">📍</span>
                                      <span className="font-semibold">{gig.venueName}</span>
                                      {gig.distance != null && !isNaN(gig.distance) && (
                                        <span className="text-electric font-bold">
                                          • {gig.distance < 1000 
                                            ? `${Math.round(gig.distance)}m away` 
                                            : `${(gig.distance/1000).toFixed(1)}km away`
                                          }
                                        </span>
                                      )}
                                    </p>
                                                      
                                    {/* Interested Status */}
                                    {interestedGigs.includes(gig.id) && (
                                      <p className="flex items-center gap-2 text-neon font-semibold mt-2 text-sm">
                                        <span>⭐</span>
                                        <span>You're interested!</span>
                                      </p>
                                    )}

                                    {/* Interested Count */}
                                    {gig.interestedCount > 0 && (
                                      <p className="flex items-center gap-2 text-magenta font-semibold text-sm">
                                        <span>👥</span>
                                        <span>
                                          {gig.interestedCount} {gig.interestedCount === 1 ? 'person' : 'people'} interested
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* View Playlist Button */}
                                <button 
                                  onClick={async () => {
                                    try {
                                      const gigRef = doc(db, 'liveGigs', gig.id);
                                      const gigSnap = await getDoc(gigRef);
                                      
                                      if (gigSnap.exists()) {
                                        const fullGigData = { 
                                          id: gigSnap.id, 
                                          ...gigSnap.data(), 
                                          distance: gig.distance
                                        };
                                        setSelectedUpcomingGig(fullGigData);
                                      } else {
                                        setSelectedUpcomingGig(gig);
                                      }
                                      
                                      setShowGigDetailModal(true);
                                    } catch (error) {
                                      console.error('Error fetching gig details:', error);
                                      setSelectedUpcomingGig(gig);
                                      setShowGigDetailModal(true);
                                    }
                                  }}
                                  className="btn btn-electric text-sm md:text-base px-4 py-2 whitespace-nowrap self-center touch-target"
                                >
                                  <span>🎵</span>
                                  <span>VIEW PLAYLIST</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Only show bottom buttons when NOT showing any results */}
        {nearbyGigs.length === 0 && !showingArtistResults && (
          <div className="mt-8 text-center space-y-4">
            {currentUser ? (
              <>
                <p className="text-white mb-4">Signed in as: {currentUser.email}</p>
                <button
                  onClick={() => setMode('artist')}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold text-xl"
                >
                  🎤 Go to Artist Mode
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setAuthUserType('artist');
                    setShowAuthModal(true);
                  }}
                  className="w-full px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold text-xl"
                >
                  🎤 Artist Sign In
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/20 text-center">
          <p className="text-gray-300 text-sm mb-1">Questions or feedback?</p>
          <a 
            href="mailto:gig.wave.2005@gmail.com"
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-base font-semibold"
          >
            📧 gig.wave.2005@gmail.com
          </a>
                    
        </div>

      </div>
    </div>
  );
}
  
// Artist Mode  
if (mode === 'artist') {
  return (
    <div className="artist-dashboard rock-background min-h-screen p-4 pb-24 md:pb-4">
      <div className="max-w-6xl mx-auto pt-6">
        {/* Header - Stage Spotlight */}
        <div className="artist-header-card gig-card mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="artist-dashboard-title mb-3">
                🎸 ARTIST DASHBOARD
              </h1>
              <p className="artist-welcome">
                Welcome, {currentUser?.displayName || currentUser?.email}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (artistProfile) {
                      setProfileData({
                        artistName: artistProfile.artistName || '',
                        fullName: artistProfile.fullName || '',
                        bio: artistProfile.bio || '',
                        profilePhoto: artistProfile.profilePhoto || '',
                        genre: artistProfile.genre || '',
                        location: artistProfile.location || '',
                        socialMedia: artistProfile.socialMedia || {
                          instagram: '',
                          facebook: '',
                          youtube: '',
                          spotify: '',
                          twitter: '',
                          tiktok: '',
                          soundcloud: ''
                        }
                      });
                    }
                    setProfileStep(1);
                    setShowProfileSetup(true);
                  }}
                  className="btn btn-electric w-full sm:w-auto"
                >
                  <Edit2 size={20}/>
                  <span>Edit Profile</span>
                </button>
                
                <button
                  onClick={() => setMode('discover')}
                  className="btn btn-ghost w-full sm:w-auto"
                >
                  ← Back
                </button>

                {/* ADMIN DASHBOARD BUTTON - ONLY VISIBLE TO ADMIN */}
                {currentUser?.email === 'gig.wave.2005@gmail.com' && (
                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-bold transition-all w-full sm:w-auto"
                  >
                    🔐 Admin Dashboard
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    await signOutUser();
                    setMode('discover');
                  }}
                  className="btn btn-fire w-full sm:w-auto"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - WITH FULL TEXT */}
        <div className="artist-nav-tabs">
          <button 
            onClick={() => setTab('master')} 
            className={`artist-nav-tab ${tab === 'master' ? 'active' : ''}`}
          >
            <Music className="inline mr-2" size={24}/>
            <span>Master Playlist</span>
          </button>
          <button 
            onClick={() => setTab('playlists')} 
            className={`artist-nav-tab ${tab === 'playlists' ? 'active' : ''}`}
          >
            <Music className="inline mr-2" size={24}/>
            <span>Gig Playlists</span>
          </button>
          <button 
            onClick={() => setTab('gigs')} 
            className={`artist-nav-tab ${tab === 'gigs' ? 'active' : ''}`}
          >
            <Calendar className="inline mr-2" size={24}/>
            <span>My Gigs</span>
          </button>
        </div>

        {tab === 'master' && (
          <div className="space-y-6">
            {/* iTunes Search Card - HOT PINK ACCENT */}
            <div className="artist-search-section">
              <h3 className="artist-section-header">
                <span className="emoji-icon">🎵</span>
                <span>SEARCH ITUNES MUSIC</span>
              </h3>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input 
                  type="text" 
                  value={itunesSearch} 
                  onChange={e => setItunesSearch(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && searchItunesAPI()}
                  placeholder="Search for songs, artists, albums..."
                  className="artist-search-input flex-1"
                  disabled={searchingItunes}
                />
                <button 
                  onClick={searchItunesAPI} 
                  disabled={searchingItunes}
                  className="btn btn-neon"
                >
                  <span>{searchingItunes ? '⏳' : '🔍'}</span>
                  <span>Search</span>
                </button>
              </div>
              
              {itunesResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-white font-bold text-lg mb-3">
                    🎼 Found <span className="text-neon">{itunesResults.length}</span> songs
                  </p>
                  {itunesResults.map(song => (
                    <div 
                      key={song.id} 
                      className="artist-itunes-result flex flex-col md:flex-row md:items-center gap-4"
                    >
                      {song.artwork && (
                        <img 
                          src={song.artwork} 
                          alt={song.title}
                          className="w-16 h-16 rounded object-cover border-2 border-electric"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-lg truncate">{song.title}</div>
                        <div className="text-electric text-sm font-semibold">{song.artist}</div>
                        {song.album && (
                          <div className="text-gray-light text-xs truncate">{song.album}</div>
                        )}
                        {song.duration && (
                          <div className="text-neon text-xs font-semibold">⏱️ {song.duration}</div>
                        )}
                      </div>
                      <button 
                        onClick={() => addItunesSongToMaster(song)}
                        className="btn btn-neon text-sm md:text-base whitespace-nowrap"
                      >
                        <Plus size={18}/>
                        <span>Add to Master</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {searchingItunes && (
                <div className="text-center py-8">
                  <div className="text-electric text-lg loading-pulse font-bold">🔍 Searching iTunes...</div>
                </div>
              )}
            </div>

            {/* Master Playlist Card - NEON GREEN ACCENT */}
            <div className="artist-playlist-section">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="artist-section-header mb-0">
                  <span className="emoji-icon">🎵</span>
                  <span>MASTER PLAYLIST</span>
                </h2>
                <div className="flex gap-3">
                  <select
                    value={masterSortBy}
                    onChange={(e) => setMasterSortBy(e.target.value)}
                    className="artist-dropdown"
                  >
                    <option value="default">Default Order</option>
                    <option value="song">Sort by Song (A-Z)</option>
                    <option value="artist">Sort by Artist (A-Z)</option>
                  </select>
                  <button 
                    onClick={addToMaster} 
                    className="btn btn-electric"
                  >
                    <Plus size={20}/>
                    <span>Add Song</span>
                  </button>
                </div>
              </div>
              
              {masterSongs.length === 0 ? (
                <div className="artist-empty-state">
                  <p className="artist-empty-text">
                    No songs yet. Click "Add Song" to start building your library! 🎸
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {masterSongs
                    .slice()
                    .sort((a, b) => {
                      if (masterSortBy === 'song') return a.title.localeCompare(b.title);
                      if (masterSortBy === 'artist') return a.artist.localeCompare(b.artist);
                      return 0;
                    })
                    .map(song => (                    
                      <div 
                        key={song.id} 
                        className="artist-song-card flex justify-between items-center"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="artist-song-title truncate">{song.title}</div>
                          <div className="artist-song-artist truncate">{song.artist}</div>
                        </div>
                        <button 
                          onClick={() => removeFromMaster(song.id)} 
                          className="text-red-400 hover:text-red-300 p-2 touch-target ml-3"
                        >
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}   
        
        {tab === 'playlists' && (
          <div className="space-y-6">
            <div className="artist-section-card">
              <h2 className="artist-section-header">
                <span className="emoji-icon">🎸</span>
                <span>GIG PLAYLISTS</span>
              </h2>
              <button 
                onClick={createGigPlaylist} 
                className="btn btn-electric mb-6"
              >
                <Plus size={20}/>
                <span>Create Playlist</span>
              </button>
              
              {gigPlaylists.length === 0 ? (
                <div className="artist-empty-state">
                  <p className="artist-empty-text">
                    No playlists yet. Create custom setlists for different gigs! 🎵
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gigPlaylists.map(playlist => (
                    <div key={playlist.id} className="artist-song-card p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-2">{playlist.name}</h3>
                          {playlist.description && (
                            <p className="text-gray-light text-sm mb-2">{playlist.description}</p>
                          )}
                          <p className="text-electric font-bold text-lg">🎵 {playlist.songs.length} songs</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPlaylist(playlist);
                              setShowPlaylistModal(true);
                            }}
                            className="btn btn-electric text-sm"
                          >
                            <Edit2 size={16}/>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteGigPlaylist(playlist.id)}
                            className="btn btn-fire text-sm"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                      
                      {playlist.songs.length > 0 && (
                        <div className="space-y-1 mt-4 pt-4 border-t border-white/20">
                          <p className="text-white font-bold mb-2">Songs:</p>
                          {playlist.songs.slice(0, 5).map((songId, index) => {
                            const song = masterSongs.find(s => s.id === songId);
                            return song ? (
                              <div key={songId} className="text-gray-light text-sm flex items-center gap-2">
                                <span className="text-electric font-bold">{index + 1}.</span>
                                <span className="text-white font-semibold">{song.title}</span>
                                <span className="text-gray">-</span>
                                <span className="text-electric">{song.artist}</span>
                              </div>
                            ) : null;
                          })}
                          {playlist.songs.length > 5 && (
                            <div className="text-magenta text-sm font-bold mt-2">
                              +{playlist.songs.length - 5} more...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'gigs' && (
          <div className="space-y-6">
            <div className="artist-section-card">
              <h2 className="artist-section-header">
                <span className="emoji-icon">⚡</span>
                <span>MY GIGS</span>
              </h2>
              <button 
                onClick={createGig} 
                className="btn btn-electric mb-6"
              >
                <Plus size={20}/>
                <span>Create Gig</span>
              </button>
        
              {gigs.length === 0 ? (
                <div className="artist-empty-state">
                  <p className="artist-empty-text">
                    No gigs yet. Click "Create Gig" to add one! ⚡
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const statusColors = {
                      upcoming: 'badge-upcoming',
                      checkVenue: 'badge-upcoming',
                      live: 'badge-live',
                      ended: 'badge-ended',
                      cancelled: 'badge-ended'
                    };
                    const statusLabel = {
                      upcoming: '🔵 Upcoming',
                      checkVenue: '🟠 Check With Venue',
                      live: '🟢 Live',
                      ended: '⚫ Ended',
                      cancelled: '🔴 Cancelled'
                    };
                    
                    return gigs.map(gig => {
                      const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
                      const currentStatus = calculateGigStatus(gig);
                      const isEnded = currentStatus === 'ended' || currentStatus === 'cancelled';
                      const isCancelled = currentStatus === 'cancelled';
                      
                      return (
                        <div key={gig.id} className="artist-song-card p-6">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <h3 className="text-2xl font-bold text-white">{gig.venueName}</h3>
                                <span className={`status-badge ${statusColors[currentStatus]}`}>
                                  {statusLabel[currentStatus]}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <p className="text-electric font-bold text-lg">📅 {gig.date} at {gig.time}</p>
                                {gig.address && (
                                  <p className="text-gray-light">📍 {gig.address}</p>
                                )}
                                {gig.location && gig.location.lat != null && gig.location.lng != null && (
                                  <p className="text-neon text-xs font-semibold">
                                    ✅ Location: {gig.location.lat.toFixed(4)}°, {gig.location.lng.toFixed(4)}°
                                  </p>
                                )}
                                {playlist && (
                                  <p className="text-magenta font-bold">
                                    🎵 Playlist: {playlist.name} ({playlist.songs.length} songs)
                                  </p>
                                )}
                                {gig.interestedCount > 0 && (
                                  <p className="text-magenta font-bold">
                                    👥 {gig.interestedCount} {gig.interestedCount === 1 ? 'person' : 'people'} interested
                                  </p>
                                )}
                                {isEnded && (
                                  <p className="text-red-400 font-bold mt-2">
                                    {isCancelled ? '⚠️ This gig was cancelled' : '⚠️ This gig has ended'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {gig.artistProfile?.socialMedia && (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <SocialFollowButtons 
                                  socialMedia={gig.artistProfile.socialMedia}
                                  artistName={gig.artistName}
                                />
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2">
                              {!isEnded && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingGig(gig);
                                      setShowGigModal(true);
                                    }}
                                    className="btn btn-electric text-sm"
                                    title="Edit gig details"
                                  >
                                    <Edit2 size={16}/>
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => deleteGig(gig.id)}
                                    className="btn btn-fire text-sm"
                                    title="Delete this gig"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                                </>
                              )}
                              {isEnded && (
                                <button
                                  onClick={() => deleteGig(gig.id)}
                                  className="btn btn-fire text-sm"
                                  title="Delete this gig"
                                >
                                  <Trash2 size={16}/>
                                  <span>Delete</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleGoLive(gig)}
                                disabled={isEnded || isCancelled}
                                className={`btn ${isEnded ? 'bg-gray-500 cursor-not-allowed' : 'btn-neon'} text-sm md:text-base`}
                                title={isEnded ? 'Cannot go live - gig has ended' : 'Go live with this gig'}
                              >
                                <Play size={18}/>
                                <span>{isEnded ? 'Ended' : 'Go Live'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/20 text-center">
          <p className="text-gray-300 text-sm mb-1">Questions or feedback?</p>
          <a 
            href="mailto:gig.wave.2005@gmail.com"
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-base font-semibold"
          >
            📧 gig.wave.2005@gmail.com
          </a>
        </div>

      </div>
    </div>
  );
}

// ✅ NEW: Smart sorting function for artist queue
const sortArtistQueue = (songs) => {
  const acceptedRequests = [];
  const votedSongs = [];
  const unvotedSongs = [];
  
  // Separate songs into 3 categories
  songs.forEach(song => {
    const isAcceptedRequest = liveGigData.songRequests?.some(
      r => r.songId === song.id && r.status === 'accepted'
    );
    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
    
    if (isAcceptedRequest) {
      acceptedRequests.push(song);
    } else if (voteCount > 0) {
      votedSongs.push(song);
    } else {
      unvotedSongs.push(song);
    }
  });
  
  // Sort function for voted songs (descending votes, then ascending time)
  const sortByVotes = (a, b) => {
    const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
    const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
    
    // First compare by vote count (descending)
    if (votesB !== votesA) {
      return votesB - votesA;
    }
    
    // If votes equal, compare by last vote time (ascending - earlier first)
    const timeA = liveGigData.lastVoteTime?.[Math.floor(a.id)];
    const timeB = liveGigData.lastVoteTime?.[Math.floor(b.id)];
    
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;  // No timestamp = push to end
    if (!timeB) return -1;
    
    return new Date(timeA) - new Date(timeB); // Earlier time first
  };
  
  // Apply sorting
  acceptedRequests.sort(sortByVotes);
  votedSongs.sort(sortByVotes);
  // unvotedSongs keep original order (no sorting needed)
  
  // Combine in priority order
  return [...acceptedRequests, ...votedSongs, ...unvotedSongs];
};
  
// ============================================
//    ARTIST LIVE MODE - TABBED REDESIGN
// ============================================
if (mode === 'live' && liveGig && liveGigData) {
  return (
    <div className="rock-background min-h-screen pb-24 md:pb-4">
      <div className="max-w-4xl mx-auto px-4 pt-4">
        
        {/* LIVE STATUS HEADER - COMPACT */}
        <div className="artist-section-card mb-3 p-3">
          {/* Top Row: Live Now + Time Remaining */}
          <div className="flex items-center justify-between mb-2">
            {/* Live Now Badge - Left */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider" style={{color: '#39FF14'}}>
                <span className="inline-block animate-pulse" style={{
                  filter: 'drop-shadow(0 0 8px #39FF14)',
                  textShadow: '0 0 10px #39FF14'
                }}>🟢</span> LIVE NOW
              </span>
            </div>

            {/* Time Remaining - Right */}
            <div className="text-right">
              <p className="text-gray-light text-[9px] mb-0.5">⏰ Time Left</p>
              <p className="text-white font-bold text-sm leading-none">
                {Math.floor(timeRemaining / 3600000)}h {Math.floor((timeRemaining % 3600000) / 60000)}m
              </p>
            </div>
          </div>

          {/* Artist Name - Centered Below */}
          <h2 className="concert-heading text-xl text-electric text-center mb-3">
            {liveGig.artistName}
          </h2>

          {/* Time Warning */}
          {showTimeWarning && (
            <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-2 mb-2">
              <p className="text-orange-300 font-bold text-center text-xs">
                ⚠️ Only {Math.floor(timeRemaining / 60000)} minutes left!
              </p>
            </div>
          )}

          {/* Action Buttons - WITH NEON GLOW */}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  await extendGigTime(liveGig.id, 60);
                  setShowTimeWarning(false);
                  alert('✅ Added 1 hour to your gig!');
                } catch (error) {
                  alert('Error extending time: ' + error.message);
                }
              }}
              className="flex-1 font-bold py-2 px-2 rounded-lg transition-all text-xs"
              style={{ 
                background: 'linear-gradient(135deg, #00d9ff 0%, #00ffc8 100%)',
                color: '#000',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                border: '2px solid rgba(0,217,255,0.8)',
                boxShadow: '0 0 15px rgba(0,217,255,0.6), 0 0 30px rgba(0,255,200,0.4), inset 0 0 10px rgba(255,255,255,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 25px rgba(0,217,255,0.8), 0 0 50px rgba(0,255,200,0.6), inset 0 0 15px rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 0 15px rgba(0,217,255,0.6), 0 0 30px rgba(0,255,200,0.4), inset 0 0 10px rgba(255,255,255,0.3)';
              }}
            >
              ⏱️ Add 1 Hour
            </button>
            <button
              onClick={handleEndGig}
              className="flex-1 font-bold py-2 px-2 rounded-lg transition-all text-xs"
              style={{ 
                background: 'linear-gradient(135deg, #ff006b 0%, #ff4444 100%)',
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                border: '2px solid rgba(255,0,107,0.8)',
                boxShadow: '0 0 15px rgba(255,0,107,0.6), 0 0 30px rgba(255,68,68,0.4), inset 0 0 10px rgba(255,255,255,0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 25px rgba(255,0,107,0.8), 0 0 50px rgba(255,68,68,0.6), inset 0 0 15px rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 0 15px rgba(255,0,107,0.6), 0 0 30px rgba(255,68,68,0.4), inset 0 0 10px rgba(255,255,255,0.2)';
              }}
            >
              🛑 End Gig
            </button>
          </div>
        </div>

        {/* STATS - RESPONSIVE HORIZONTAL ROW (4 on desktop, 2x2 on mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          {/* Live Now */}
          <div className="bg-black/40 backdrop-blur-sm border border-neon/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-neon text-lg">🟢</span>
            <div className="flex-1 min-w-0">
              <div className="text-neon font-bold text-base leading-none">
                {liveGigData.audienceTracking?.currentlyActive || 0}
              </div>
              <div className="text-gray-light text-[9px] leading-tight">Live Now</div>
            </div>
          </div>

          {/* Total Joins */}
          <div className="bg-black/40 backdrop-blur-sm border border-electric/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-electric text-lg">👥</span>
            <div className="flex-1 min-w-0">
              <div className="text-electric font-bold text-base leading-none">
                {liveGigData.audienceTracking?.totalJoins || 0}
              </div>
              <div className="text-gray-light text-[9px] leading-tight">Total Joins</div>
            </div>
          </div>

          {/* Total Votes */}
          <div className="bg-black/40 backdrop-blur-sm border border-magenta/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-magenta text-lg">⚡</span>
            <div className="flex-1 min-w-0">
              <div className="text-magenta font-bold text-base leading-none">
                {Object.values(liveGigData.votes || {}).reduce((sum, v) => sum + v, 0)}
              </div>
              <div className="text-gray-light text-[9px] leading-tight">Total Votes</div>
            </div>
          </div>

          {/* Requests Pending */}
          <div className="bg-black/40 backdrop-blur-sm border border-fire/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-fire text-lg">📋</span>
            <div className="flex-1 min-w-0">
              <div className="text-fire font-bold text-base leading-none">
                {(liveGigData.songRequests || []).filter(r => r.status === 'pending').length}
              </div>
              <div className="text-gray-light text-[9px] leading-tight">Requests</div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION - WITH NEON BORDERS */}
        <div className="artist-section-card mb-3 p-2">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setLiveTab('queue')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-[10px] transition-all ${
                liveTab === 'queue'
                  ? 'bg-gradient-to-r from-electric/20 to-electric/10 text-electric'
                  : 'bg-white/5 text-gray-light hover:bg-white/10'
              }`}
              style={liveTab === 'queue' ? {
                border: '2px solid #00d9ff',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.5), inset 0 0 10px rgba(0, 217, 255, 0.2)',
                textShadow: '0 0 10px rgba(0, 217, 255, 0.8)'
              } : {
                border: '2px solid transparent'
              }}
            >
              Song Queue
            </button>
            <button
              onClick={() => setLiveTab('requests')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-[10px] transition-all relative ${
                liveTab === 'requests'
                  ? 'bg-gradient-to-r from-magenta/20 to-magenta/10 text-magenta'
                  : 'bg-white/5 text-gray-light hover:bg-white/10'
              }`}
              style={liveTab === 'requests' ? {
                border: '2px solid #ff006b',
                boxShadow: '0 0 20px rgba(255, 0, 107, 0.5), inset 0 0 10px rgba(255, 0, 107, 0.2)',
                textShadow: '0 0 10px rgba(255, 0, 107, 0.8)'
              } : {
                border: '2px solid transparent'
              }}
            >
              Song Requests
              {(liveGigData.songRequests || []).filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-fire text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 10px rgba(255,0,107,0.8)'
                  }}
                >
                  {(liveGigData.songRequests || []).filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setLiveTab('master')}
              className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg font-bold text-[10px] transition-all ${
                liveTab === 'master'
                  ? 'bg-gradient-to-r from-neon/20 to-neon/10 text-neon'
                  : 'bg-white/5 text-gray-light hover:bg-white/10'
              }`}
              style={liveTab === 'master' ? {
                border: '2px solid #39FF14',
                boxShadow: '0 0 20px rgba(57, 255, 20, 0.5), inset 0 0 10px rgba(57, 255, 20, 0.2)',
                textShadow: '0 0 10px rgba(57, 255, 20, 0.8)'
              } : {
                border: '2px solid transparent'
              }}
            >
              Master Playlist
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="artist-section-card p-3">
          
          {/* ==================== TAB 1: SONG QUEUE ==================== */}
          {liveTab === 'queue' && (
            <div>
              <h3 className="artist-section-header mb-3 text-base">
                <span className="emoji-icon text-base">🎵</span>
                <span>SONG QUEUE</span>
              </h3>

              {/* Ready to Play */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-neon text-xs font-bold">▶️ Ready to Play</span>
                  <span className="bg-neon text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {sortArtistQueue(liveGigData.queuedSongs || []).filter(song => !liveGigData.playedSongs?.includes(song.id)).length}
                  </span>
                </div>

                {sortArtistQueue(liveGigData.queuedSongs || []).filter(song => !liveGigData.playedSongs?.includes(song.id)).length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                    <p className="text-gray-light text-sm">No songs in queue. Add from Master Playlist tab! 🎸</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortArtistQueue(liveGigData.queuedSongs || [])
                      .filter(song => !liveGigData.playedSongs?.includes(song.id))
                      .map((song, index) => {
                        const truncatedTitle = song.title.split(' ').slice(0, 5).join(' ') + 
                          (song.title.split(' ').length > 5 ? '...' : '');
                        const voteCount = liveGigData.votes?.[Math.floor(song.id)] || 0;

                        return (
                          <div key={song.id} className="bg-green-500/10 border border-green-400/50 rounded-lg p-2">
                            {/* Top Row */}
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="text-green-300 font-bold text-sm flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="text-white font-semibold text-sm leading-tight truncate">
                                  {truncatedTitle}
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Mark "${song.title}" as played?`)) {
                                    try {
                                      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
                                      await updateDoc(gigRef, {
                                        playedSongs: arrayUnion(song.id)
                                      });
                                      alert('✅ Song marked as played!');
                                    } catch (error) {
                                      alert('Error: ' + error.message);
                                    }
                                  }
                                }}
                                className="bg-cyan-400 hover:bg-cyan-500 text-black font-black text-xs px-3 py-1.5 rounded shadow-lg flex-shrink-0 transition-all duration-150"
                              >
                                Mark Played
                              </button>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex justify-between items-center gap-2">
                              <div className="text-green-200 text-xs truncate flex-1 pl-6">
                                {song.artist}
                              </div>
                              <div className="text-pink-300 font-bold text-xs flex-shrink-0">
                                ⚡ {voteCount}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Already Played */}
              {liveGigData.playedSongs && liveGigData.playedSongs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-gray-400 text-xs font-bold">✅ Already Played</span>
                    <span className="bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {liveGigData.playedSongs.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sortArtistQueue(liveGigData.queuedSongs || [])
                      .filter(song => liveGigData.playedSongs.includes(song.id))
                      .map((song) => {
                        const truncatedTitle = song.title.split(' ').slice(0, 5).join(' ') + 
                          (song.title.split(' ').length > 5 ? '...' : '');
                        const voteCount = liveGigData.votes?.[Math.floor(song.id)] || 0;

                        return (
                          <div key={song.id} className="bg-gray-500/10 border border-gray-600/50 rounded-lg p-2 opacity-60">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="text-gray-400 font-bold text-sm flex-shrink-0">
                                  ✓
                                </span>
                                <div className="text-white font-semibold text-sm leading-tight truncate line-through">
                                  {truncatedTitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-2">
                              <div className="text-gray-400 text-xs truncate flex-1 pl-6">
                                {song.artist}
                              </div>
                              <div className="text-gray-500 font-bold text-xs flex-shrink-0">
                                ⚡ {voteCount}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: SONG REQUESTS ==================== */}
          {liveTab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="artist-section-header text-base mb-0">
                  <span className="emoji-icon text-base">🎤</span>
                  <span>SONG REQUESTS</span>
                </h3>
                
                {/* Requests Toggle */}
                <button
                  onClick={async () => {
                    const currentStatus = liveGigData?.requestsEnabled !== false;
                    const newStatus = !currentStatus;
                    
                    try {
                      await updateJukeboxSettings(liveGig.id, {
                        requestsEnabled: newStatus,
                        jukeboxMode: false,
                        jukeboxPrice: 0
                      });
                      
                      setLiveGigData(prev => ({
                        ...prev,
                        requestsEnabled: newStatus
                      }));
                      
                      const gigRef = doc(db, 'liveGigs', String(liveGig.id));
                      const gigSnap = await getDoc(gigRef);
                      
                      if (gigSnap.exists()) {
                        const freshData = gigSnap.data();
                        setLiveGigData(prev => ({
                          ...prev,
                          requestsEnabled: freshData.requestsEnabled
                        }));
                      }
                      
                      alert(newStatus 
                        ? '✅ Song requests are now ENABLED' 
                        : '❌ Song requests are now DISABLED'
                      );
                    } catch (error) {
                      console.error('❌ Toggle error:', error);
                      alert('Error: ' + error.message);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    liveGigData.requestsEnabled !== false
                      ? 'bg-neon text-black'
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  <span className="text-base">{liveGigData.requestsEnabled !== false ? '🟢' : '⚫'}</span>
                  <span>{liveGigData.requestsEnabled !== false ? 'On' : 'Off'}</span>
                </button>
              </div>

              <p className="text-center text-white/60 text-xs mb-3">
                {(liveGigData.songRequests || []).length} total request{(liveGigData.songRequests || []).length !== 1 ? 's' : ''}
              </p>

              {(!liveGigData?.songRequests || liveGigData.songRequests.length === 0) ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-gray-light text-sm">No song requests yet</p>
                  <p className="text-gray-light text-xs mt-2">
                    {liveGigData?.requestsEnabled !== false
                      ? 'Song requests are enabled'
                      : 'Song requests are currently disabled'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getSortedSongRequests(liveGigData.songRequests).map((request, index) => {
                    const truncatedTitle = request.songTitle.split(' ').slice(0, 5).join(' ') + 
                      (request.songTitle.split(' ').length > 5 ? '...' : '');

                    return (
                      <div
                        key={request.id}
                        className={`rounded-lg p-2 border ${
                          request.status === 'pending' 
                            ? 'bg-purple-500/10 border-purple-400/50' 
                            : request.status === 'accepted' 
                              ? 'bg-green-500/10 border-green-400/50' 
                              : 'bg-gray-500/10 border-gray-600/50'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className={`font-bold text-sm flex-shrink-0 ${
                            request.status === 'pending' ? 'text-purple-300' :
                            request.status === 'accepted' ? 'text-green-300' :
                            'text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="text-white font-semibold text-sm leading-tight flex-1 min-w-0 truncate">
                            {truncatedTitle}
                          </div>
                        </div>

                        <div className={`text-xs mb-1 pl-6 ${
                          request.status === 'pending' ? 'text-purple-200' :
                          request.status === 'accepted' ? 'text-green-200' :
                          'text-gray-400'
                        }`}>
                          {request.songArtist}
                        </div>

                        <div className={`text-xs mb-2 pl-6 flex items-center gap-1 ${
                          request.status === 'pending' ? 'text-purple-300/80' :
                          request.status === 'accepted' ? 'text-green-300/80' :
                          'text-gray-400/80'
                        }`}>
                          <span>👤 {request.requesterName}</span>
                        </div>

                        {request.message && request.message.trim() && (
                          <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5 mb-2 ml-6">
                            <div className="text-cyan-300 text-xs">
                              💬 <span className="italic">"{request.message}"</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pl-6">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await acceptSongRequest(liveGig.id, request.id);
                                    alert('✅ Request accepted!');
                                  } catch (error) {
                                    alert('Error: ' + error.message);
                                  }
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-lg transition-all duration-150 flex items-center gap-1"
                              >
                                ✓ Accept
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await rejectSongRequest(liveGig.id, request.id);
                                    alert('❌ Request rejected');
                                  } catch (error) {
                                    alert('Error: ' + error.message);
                                  }
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-lg transition-all duration-150 flex items-center gap-1"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {request.status === 'accepted' && (
                            <span className="text-green-400 font-bold text-xs">✓ Accepted</span>
                          )}
                          {request.status === 'rejected' && (
                            <span className="text-red-400 font-bold text-xs">✗ Rejected</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: MASTER PLAYLIST ==================== */}
          {liveTab === 'master' && (
            <div>
              <h3 className="artist-section-header mb-3 text-base">
                <span className="emoji-icon text-base">📚</span>
                <span>MASTER PLAYLIST</span>
              </h3>

              {/* SEARCH BAR */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search songs or artists..."
                    value={liveMasterSearch}
                    onChange={(e) => setLiveMasterSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-neon/30 rounded-lg text-white placeholder-gray-500 focus:border-neon focus:outline-none text-sm"
                  />
                  {liveMasterSearch && (
                    <button
                      onClick={() => setLiveMasterSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* SONGS COUNT */}
              <p className="text-center text-white/60 text-xs mb-3">
                {liveGigData.masterPlaylist?.length || 0} total songs
              </p>

              {/* SONGS LIST */}
              {(!liveGigData.masterPlaylist || liveGigData.masterPlaylist.length === 0) ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                  <p className="text-gray-light text-sm">No songs in master playlist. 🎵</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {liveGigData.masterPlaylist
                    .filter(song => {
                      if (!liveMasterSearch) return true;
                      const search = liveMasterSearch.toLowerCase();
                      return song.title.toLowerCase().includes(search) || 
                            song.artist.toLowerCase().includes(search);
                    })
                    .map(song => {
                      const isInQueue = (liveGigData.queuedSongs || []).some(q => q.id === song.id);

                      return (
                        <div
                          key={song.id}
                          className="bg-white/10 border border-white/20 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            
                            {/* Song Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-sm mb-1">
                                {song.title}
                              </div>
                              <div className="text-gray-300 text-xs">
                                {song.artist}
                              </div>
                            </div>

                            {/* Button - BRIGHT AND VISIBLE */}
                            {isInQueue ? (
                              <button
                                disabled
                                style={{
                                  backgroundColor: '#22c55e',
                                  color: '#000',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  border: '2px solid #16a34a',
                                  cursor: 'not-allowed'
                                }}
                              >
                                ✓ Added
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const gigRef = doc(db, 'liveGigs', String(liveGig.id));
                                    const gigSnap = await getDoc(gigRef);
                                    const currentQueue = gigSnap.data().queuedSongs || [];
                                    const votes = gigSnap.data().votes || {};
                                    
                                    const updatedQueue = [...currentQueue, song].sort((a, b) => {
                                      const votesA = votes[Math.floor(a.id)] || 0;
                                      const votesB = votes[Math.floor(b.id)] || 0;
                                      return votesB - votesA;
                                    });
                                    
                                    await updateDoc(gigRef, {
                                      queuedSongs: updatedQueue
                                    });
                                  } catch (error) {
                                    alert('Error: ' + error.message);
                                  }
                                }}
                                style={{
                                  backgroundColor: '#3b82f6',
                                  color: '#fff',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  border: '2px solid #2563eb',
                                  cursor: 'pointer'
                                }}
                              >
                                Add to Queue
                              </button>
                            )}

                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

  // Audience Mode - Live Concert Experience
  if (mode === 'audience' && liveGig) {
    // 🔍 Load artist profile if not loaded
    if (!artistProfile && liveGig.artistId) {
      console.log('🔥 LOADING ARTIST PROFILE NOW:', liveGig.artistId);
      getArtistProfile(liveGig.artistId).then(profile => {
        console.log('✅ PROFILE LOADED:', profile);
        setArtistProfile(profile);
      });
    }
    
    console.log('🎸 RENDERING AUDIENCE MODE');
    console.log('🎸 liveGig.artistId:', liveGig.artistId);
    console.log('🎸 artistProfile:', artistProfile);
    console.log('🎸 Facebook URL:', artistProfile?.socialMedia?.facebook);

    return (
      <div className="rock-background min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm z-50 p-4 border-b border-electric/30">
            <div className="max-w-4xl mx-auto">
              {/* Live Indicator */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="concert-heading text-xl tracking-wider" style={{color: '#39FF14'}}>
                  <span className="inline-block animate-pulse" style={{
                    filter: 'drop-shadow(0 0 8px #39FF14) drop-shadow(0 0 16px #39FF14) drop-shadow(0 0 24px #39FF14) drop-shadow(0 0 32px #0f0)',
                    textShadow: '0 0 10px #39FF14, 0 0 20px #39FF14, 0 0 30px #39FF14, 0 0 40px #0f0, 0 0 70px #0f0, 0 0 100px #0f0'
                  }}>🟢</span> LIVE NOW
                </span>
              </div>
              
              {/* Artist Name */}
              <h1 className="concert-heading text-3xl md:text-4xl text-white text-center">
                {liveGig.artistName}
              </h1>
            </div>
          </div>

          {/* Main Content - Spaced from header */}
          <div className="pt-32 pb-8">
            
            {/* STANDALONE: View Gig Playlist - NO ICONS */}
            <button
              onClick={() => setShowGigPlaylistModal(true)}
              className="w-3/4 mx-auto block bg-gradient-to-r from-cyan-500 via-purple-600 to-magenta-600 text-white py-3 md:py-4 px-8 rounded-xl font-bold text-lg md:text-xl hover:scale-105 transition-transform duration-200 mb-10 mt-12"
              style={{
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.4), 0 0 30px rgba(255, 0, 255, 0.3)',
                textShadow: '0 0 10px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)',
                letterSpacing: '1px'
              }}
            >
              View Gig Playlist
            </button>

            {/* ROW 1: Request Song, Vote, Rate Artist - ALL IMAGE ICONS */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Request Song */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    alert('Please sign in to request a song!');
                    setShowAuthModal(true);
                    return;
                  }
                  setShowRequestModal(true);
                }}
                className="aspect-square flex items-center justify-center hover:scale-105 transition-all duration-300 bg-transparent p-0 m-0 border-0"
              >
                <img 
                  src={cassetteIcon} 
                  alt="Request Song" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>

              {/* Vote */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    alert('Please sign in to vote!');
                    setShowAuthModal(true);
                    return;
                  }
                  setShowVoteModal(true);
                }}
                className="aspect-square flex items-center justify-center hover:scale-105 transition-all duration-300 bg-transparent p-0 m-0 border-0"
              >
                <img 
                  src={voteIcon} 
                  alt="Vote" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>

              {/* Rate Artist */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    alert('Please sign in to rate the artist!');
                    setShowAuthModal(true);
                    return;
                  }
                  setShowRatingModal(true);
                }}
                className="aspect-square flex items-center justify-center hover:scale-105 transition-all duration-300 bg-transparent p-0 m-0 border-0"
              >
                <img 
                  src={rateArtistIcon} 
                  alt="Rate Artist" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>
            </div>

            {/* ROW 2: Artist Profile, Tip Jar, Support - ALL IMAGE ICONS */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Artist Profile */}
              <button
                onClick={() => setShowArtistProfileModal(true)}
                className="aspect-square flex items-center justify-center hover:scale-105 transition-all duration-300 bg-transparent p-0 m-0 border-0"
              >
                <img 
                  src={artistProfileIcon} 
                  alt="Artist Profile" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>

              {/* Tip Jar - Coming Soon */}
              <button
                disabled
                className="aspect-square flex items-center justify-center transition-all duration-300 bg-transparent p-0 m-0 border-0 opacity-50 cursor-not-allowed"
              >
                <img 
                  src={tipJarIcon} 
                  alt="Tip Jar" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>

              {/* Support Artist - Coming Soon */}
              <button
                disabled
                className="aspect-square flex items-center justify-center transition-all duration-300 bg-transparent p-0 m-0 border-0 opacity-50 cursor-not-allowed"
              >
                <img 
                  src={supportIcon} 
                  alt="Support Artist" 
                  className="w-full h-full object-cover drop-shadow-2xl block"
                />
              </button>
            </div>

            {/* Social Media Section */}
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-4 mb-4">
              <h3 className="text-center text-electric font-bold text-base mb-3 tracking-wider drop-shadow-lg">
                🎸 CONNECT WITH THE ARTIST
              </h3>
              
              <div className="grid grid-cols-4 gap-3">
                {/* Instagram */}
                {artistProfile?.socialMedia?.instagram ? (
                  <a
                    href={artistProfile.socialMedia.instagram.startsWith('http') 
                      ? artistProfile.socialMedia.instagram 
                      : `https://instagram.com/${artistProfile.socialMedia.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(219,39,119,0.5), 0 0 30px rgba(219,39,119,0.3)'
                    }}
                  >
                    <FaInstagram className="text-white text-3xl drop-shadow-xl" />
                  </a>
                ) : (
                  <div className="aspect-square bg-gray-800/40 border-2 border-gray-600/30 rounded-xl flex items-center justify-center opacity-40">
                    <FaInstagram className="text-gray-500 text-3xl" />
                  </div>
                )}

                {/* Facebook */}
                {artistProfile?.socialMedia?.facebook ? (
                  <a
                    href={artistProfile.socialMedia.facebook.includes('facebook.com') 
                      ? artistProfile.socialMedia.facebook 
                      : `https://facebook.com/${artistProfile.socialMedia.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(37,99,235,0.5), 0 0 30px rgba(37,99,235,0.3)'
                    }}
                  >
                    <FaFacebook className="text-white text-3xl drop-shadow-xl" />
                  </a>
                ) : (
                  <div className="aspect-square bg-gray-800/40 border-2 border-gray-600/30 rounded-xl flex items-center justify-center opacity-40">
                    <FaFacebook className="text-gray-500 text-3xl" />
                  </div>
                )}

                {/* YouTube */}
                {artistProfile?.socialMedia?.youtube ? (
                  <a
                    href={artistProfile.socialMedia.youtube.includes('youtube.com') 
                      ? artistProfile.socialMedia.youtube 
                      : `https://youtube.com/${artistProfile.socialMedia.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(220,38,38,0.5), 0 0 30px rgba(220,38,38,0.3)'
                    }}
                  >
                    <FaYoutube className="text-white text-3xl drop-shadow-xl" />
                  </a>
                ) : (
                  <div className="aspect-square bg-gray-800/40 border-2 border-gray-600/30 rounded-xl flex items-center justify-center opacity-40">
                    <FaYoutube className="text-gray-500 text-3xl" />
                  </div>
                )}

                {/* LinkedIn */}
                {artistProfile?.socialMedia?.linkedin ? (
                  <a
                    href={artistProfile.socialMedia.linkedin.includes('linkedin.com') 
                      ? artistProfile.socialMedia.linkedin 
                      : `https://linkedin.com/in/${artistProfile.socialMedia.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(29,78,216,0.5), 0 0 30px rgba(29,78,216,0.3)'
                    }}
                  >
                    <FaLinkedin className="text-white text-3xl drop-shadow-xl" />
                  </a>
                ) : (
                  <div className="aspect-square bg-gray-800/40 border-2 border-gray-600/30 rounded-xl flex items-center justify-center opacity-40">
                    <FaLinkedin className="text-gray-500 text-3xl" />
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setMode('discover')}
              className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-900 border-2 border-gray-700 rounded-xl text-white font-bold hover:scale-105 transition-all duration-300"
              style={{
                boxShadow: '0 0 15px rgba(107,114,128,0.3)'
              }}
            >
              ← Back to Discovery
            </button>
          </div>
        </div>

        {/* MODAL: Vote (Mobile-First Optimized) */}
        {showVoteModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="gig-card max-w-md w-full border-2 border-magenta relative max-h-[85vh] flex flex-col">
              
              {/* Close Button - ABSOLUTE TOP RIGHT CORNER */}
              <button
                onClick={() => setShowVoteModal(false)}
                className="absolute top-0 right-0 text-white hover:text-neon transition font-bold text-3xl leading-none z-20 p-2"
                style={{ fontWeight: '900' }}
              >
                ×
              </button>

              {/* Header - MINIMAL PADDING */}
              <div className="px-6 pt-8 pb-1">
                <h2 className="concert-heading text-base sm:text-xl text-magenta text-center whitespace-nowrap flex items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl">⚡</span>
                  <span>Vote For Songs</span>
                </h2>
                <p className="text-gray-light text-xs sm:text-sm mt-1 text-center">
                  Vote For Song To Prioritize It Or Add To Song Queue
                </p>
              </div>

              {/* Search Bar */}
              <div className="px-6 pb-3 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search songs or artists..."
                    value={playlistSearchQuery}
                    onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-magenta/30 rounded-lg text-white placeholder-gray-500 focus:border-magenta focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Combined Song List - SCROLLABLE */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                {/* Tonight's Setlist Section */}
                {liveGigData.queuedSongs && liveGigData.queuedSongs.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-electric flex items-center gap-2">
                        <span>📋</span>
                        <span>Tonight's Setlist</span>
                      </h3>
                      <p className="text-[9px] text-gray-400 italic">Click song name to vote</p>
                    </div>
                    <div className="space-y-2">
                      {liveGigData.queuedSongs
                        .filter(song => {
                          if (!liveGigData.playedSongs?.includes(song.id)) {
                            if (!playlistSearchQuery) return true;
                            const search = playlistSearchQuery.toLowerCase();
                            return song.title.toLowerCase().includes(search) || 
                                  song.artist.toLowerCase().includes(search);
                          }
                          return false;
                        })
                        .map((song, index) => {
                          const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                          const hasVoted = userVotes && userVotes[song.id];
                          
                          // Truncate song name to 5 words
                          const songWords = song.title.split(' ');
                          const truncatedSong = songWords.length > 5 
                            ? songWords.slice(0, 5).join(' ') + '...'
                            : song.title;
                          
                          // Truncate artist name to 2 words
                          const artistWords = song.artist.split(' ');
                          const truncatedArtist = artistWords.length > 2
                            ? artistWords.slice(0, 2).join(' ') + '...'
                            : song.artist;

                          return (
                            <button
                              key={song.id}
                              onClick={() => handleVote(song.id)}
                              disabled={hasVoted}
                              className="w-full p-2 rounded-lg transition bg-white/5 border border-white/10 hover:bg-white/10 hover:border-magenta disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {/* Single Row with ALL elements */}
                              <div className="flex items-center gap-2 w-full">
                                {/* Number Badge - Far Left - SAME COLOR ALWAYS */}
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-electric/30 text-electric">
                                  {index + 1}
                                </div>

                                {/* Song Info Column - Left Aligned, Takes Available Space */}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-bold text-[11px] leading-tight text-white">
                                    {truncatedSong}
                                  </p>
                                  <p className="text-gray-400 text-[9px] leading-tight">
                                    {truncatedArtist}
                                  </p>
                                </div>

                                {/* Vote Count - Far Right with Maximum Push */}
                                {voteCount > 0 && (
                                  <div className="flex-shrink-0 flex items-center gap-0.5 pl-4">
                                    <span className="text-magenta text-[10px]">⚡</span>
                                    <span className="font-bold text-[10px] text-magenta">
                                      {voteCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* More Songs Available Section */}
                {liveGig.masterPlaylist && liveGig.masterPlaylist.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-electric flex items-center gap-2">
                        <span>📚</span>
                        <span>More Songs Available</span>
                      </h3>
                      <p className="text-[9px] text-gray-400 italic">Click song name to vote</p>
                    </div>
                    <div className="space-y-2">
                      {liveGig.masterPlaylist
                        .filter(song => {
                          const isInGigPlaylist = liveGigData.queuedSongs?.some(q => q.id === song.id);
                          const isPlayed = liveGigData.playedSongs?.includes(song.id);
                          const matchesSearch = !playlistSearchQuery || 
                            song.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                            song.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase());
                          return !isInGigPlaylist && !isPlayed && matchesSearch;
                        })
                        .slice(0, 20)
                        .map((song, globalIndex) => {
                          const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                          const hasVoted = userVotes && userVotes[song.id];
                          
                          // Truncate song name to 5 words
                          const songWords = song.title.split(' ');
                          const truncatedSong = songWords.length > 5 
                            ? songWords.slice(0, 5).join(' ') + '...'
                            : song.title;
                          
                          // Truncate artist name to 2 words
                          const artistWords = song.artist.split(' ');
                          const truncatedArtist = artistWords.length > 2
                            ? artistWords.slice(0, 2).join(' ') + '...'
                            : song.artist;

                          // Calculate number starting after setlist
                          const setlistLength = liveGigData.queuedSongs?.filter(s => 
                            !liveGigData.playedSongs?.includes(s.id) &&
                            (!playlistSearchQuery || 
                            s.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                            s.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase()))
                          ).length || 0;

                          return (
                            <button
                              key={song.id}
                              onClick={() => handleVote(song.id)}
                              disabled={hasVoted}
                              className="w-full p-2 rounded-lg transition bg-white/5 border border-white/10 hover:bg-white/10 hover:border-magenta disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {/* Single Row with ALL elements */}
                              <div className="flex items-center gap-2 w-full">
                                {/* Number Badge - FIXED: Use globalIndex */}
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-electric/30 text-electric">
                                  {setlistLength + globalIndex + 1}
                                </div>

                                {/* Song Info Column - Left Aligned, Takes Available Space */}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-bold text-[11px] leading-tight text-white">
                                    {truncatedSong}
                                  </p>
                                  <p className="text-gray-400 text-[9px] leading-tight">
                                    {truncatedArtist}
                                  </p>
                                </div>

                                {/* Vote Count - Far Right with Maximum Push */}
                                {voteCount > 0 && (
                                  <div className="flex-shrink-0 flex items-center gap-0.5 pl-4">
                                    <span className="text-magenta text-[10px]">⚡</span>
                                    <span className="font-bold text-[10px] text-magenta">
                                      {voteCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {(!liveGigData.queuedSongs || liveGigData.queuedSongs.length === 0) && 
                (!liveGig.masterPlaylist || liveGig.masterPlaylist.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No songs available for voting</p>
                  </div>
                )}
              </div>

              {/* Footer Info */}
              <div className="px-6 py-4 border-t border-white/10">
                <p className="text-gray-400 text-xs text-center">
                  {userVotes && Object.keys(userVotes).length > 0 
                    ? `You've Voted For ${Object.keys(userVotes).length} Song${Object.keys(userVotes).length > 1 ? 's' : ''}`
                    : 'Tap Any Song To Vote'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Artist Profile */}
        {showArtistProfileModal && artistProfile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="rock-background gig-card border-2 border-electric max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              
              {/* Close Button - SEPARATE ROW AT TOP */}
              <div className="sticky top-0 bg-black/95 px-6 pt-4 pb-2 border-b border-white/10 z-10">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setShowArtistProfileModal(false)}
                    className="text-white hover:text-neon transition font-bold text-3xl leading-none"
                    style={{ fontWeight: '900' }}
                  >
                    ×
                  </button>
                </div>
                
                {/* Header - MOBILE OPTIMIZED, ONE LINE */}
                <h2 className="concert-heading text-base sm:text-2xl text-electric text-center whitespace-nowrap flex items-center justify-center gap-2 pb-3">
                  <span className="text-2xl sm:text-3xl">🎸</span>
                  <span>Artist Profile</span>
                </h2>
              </div>

              <div className="p-6">
                {/* Artist Name & Genre - REDUCED GAP */}
                <div className="text-center mb-6">
                  <h1 className="concert-heading text-2xl sm:text-4xl text-white mb-3">
                    {artistProfile.artistName}
                  </h1>
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="px-4 py-2 bg-magenta/20 text-magenta rounded-full text-sm font-bold border border-magenta">
                      🎵 {artistProfile.genre}
                    </span>
                    <span className="px-4 py-2 bg-electric/20 text-electric rounded-full text-sm font-bold border border-electric">
                      📍 {artistProfile.location}
                    </span>
                  </div>
                </div>

                {/* Bio - CENTER ALIGNED HEADING ONLY */}
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-electric mb-3 text-center">
                    About
                  </h3>
                  <p className="text-gray-light leading-relaxed text-left">
                    {artistProfile.bio}
                  </p>
                </div>

                {/* Social Media */}
                {artistProfile.socialMedia && (
                  <div className="mb-6">
                    <SocialFollowButtons 
                      socialMedia={artistProfile.socialMedia}
                      artistName={artistProfile.artistName}
                    />
                  </div>
                )}

                {/* Support Artist Button */}
                <button
                  disabled
                  className="w-full py-4 bg-gradient-to-r from-neon/20 to-electric/20 border-2 border-neon/50 text-white rounded-xl font-bold text-lg opacity-50 cursor-not-allowed"
                >
                  <Heart size={24} className="inline mr-2" />
                  Support Artist (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* FREE SONG REQUEST MODAL */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="gig-card max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-magenta">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex-1 text-center">
                  <h2 className="concert-heading text-3xl text-magenta">Request A Song</h2>
                  <p className="text-gray-light text-sm mt-2">Send Your Song Request To The Artist</p>
                </div>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedRequestSong(null);
                    setRequestMessage('');
                  }}
                  className="text-white hover:text-neon transition"
                >
                  <X size={32} />
                </button>
              </div>

              {/* Queue Status Banner */}
              <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400 rounded-lg">
                <h4 className="text-blue-300 font-bold mb-3 flex items-center gap-2">
                  <span>📊</span>
                  <span>Queue Status</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-light">Queue Capacity</p>
                    <p className="text-white font-bold text-lg">
                      {liveGigData.queuedSongs?.length || 0}/{liveGigData.songLimit || 20}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-light">Songs Played</p>
                    <p className="text-white font-bold text-lg">
                      {liveGigData.playedSongs?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-light">Songs Left</p>
                    <p className="text-white font-bold text-lg">
                      {(liveGigData.queuedSongs || []).filter(
                        s => !liveGigData.playedSongs?.includes(s.id)
                      ).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-light">Pending Requests</p>
                    <p className="text-white font-bold text-lg">
                      {(liveGigData.songRequests || []).filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                </div>
                
                {/* Status message */}
                <div className="mt-3">
                  {(() => {
                    const maxQueue = liveGigData.songLimit || 20;
                    const queueLength = liveGigData.queuedSongs?.length || 0;
                    const songsLeft = (liveGigData.queuedSongs || []).filter(
                      s => !liveGigData.playedSongs?.includes(s.id)
                    ).length;
                    
                    if (queueLength >= maxQueue) {
                      return (
                        <p className="text-green-300 text-sm flex items-center gap-2">
                          <span>✅</span>
                          <span>You can still request! If accepted, the artist will make room in the queue.</span>
                        </p>
                      );
                    } else if (songsLeft <= 3) {
                      return (
                        <p className="text-yellow-300 text-sm flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Only {songsLeft} songs left - your request may not be played tonight.</span>
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-green-300 text-sm flex items-center gap-2">
                          <span>✅</span>
                          <span>Queue has space - great time to request!</span>
                        </p>
                      );
                    }
                  })()}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search by song or artist name..."
                  value={playlistSearchQuery}
                  onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-magenta/30 focus:border-magenta focus:outline-none"
                />
              </div>
              
              {/* Song Selection */}
              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-3">Select A Song</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto bg-black/30 rounded-lg p-3 border border-white/10">
                  {liveGig.masterPlaylist && liveGig.masterPlaylist.length > 0 ? (
                    liveGig.masterPlaylist
                      .filter(song => {
                        // Filter out played songs
                        if (liveGigData.playedSongs?.includes(song.id)) return false;
                        
                        // Filter out songs already in gig playlist
                        const isInGigPlaylist = (liveGigData.queuedSongs || []).some(
                          queuedSong => queuedSong.id === song.id
                        );
                        
                        // Filter by search query
                        const matchesSearch = !playlistSearchQuery || 
                          song.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
                          song.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase());
                        
                        return !isInGigPlaylist && matchesSearch;
                      })
                      .map(song => {
                        // Truncate to first 5 words
                        const truncateTitle = (title) => {
                          const words = title.split(' ');
                          if (words.length <= 5) return title;
                          return words.slice(0, 5).join(' ') + '...';
                        };
                        
                        return (
                          <div
                            key={song.id}
                            onClick={() => setSelectedRequestSong(song)}
                            className={`p-3 rounded-lg cursor-pointer transition border-2 ${
                              selectedRequestSong?.id === song.id
                                ? 'bg-magenta/30 border-magenta'
                                : 'bg-white/5 border-white/10 hover:border-electric/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-bold truncate">
                                  {truncateTitle(song.title)} - {song.artist}
                                </div>
                              </div>
                              {selectedRequestSong?.id === song.id && (
                                <div className="text-magenta text-2xl flex-shrink-0">✓</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-8 text-gray-light">No songs available for request</div>
                  )}
                </div>
                <p className="text-gray-light text-sm mt-2 italic">
                  💡 Songs already in tonight's setlist can only be voted for, not requested
                </p>
              </div>

              {/* Selected Song Display */}
              {selectedRequestSong && (
                <div className="mb-6 p-4 bg-magenta/20 border-2 border-magenta rounded-lg">
                  <p className="text-magenta font-bold text-sm mb-2">SELECTED SONG:</p>
                  <h4 className="text-white font-bold text-xl">{selectedRequestSong.title}</h4>
                  <p className="text-electric">{selectedRequestSong.artist}</p>
                </div>
              )}

              {/* Optional Message */}
              <div className="mb-6">
                <label className="text-white font-bold mb-2 block">Add A Message (Optional)</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Add a dedication or message..."
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg bg-black/50 text-white placeholder-gray-400 border border-white/20 focus:border-magenta focus:outline-none resize-none"
                  rows={3}
                />
                <div className="text-right text-gray-light text-sm mt-1">
                  {requestMessage.length}/200 characters
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={handleSongRequest}
                  disabled={!selectedRequestSong}
                  className={`flex-1 py-4 rounded-lg font-bold text-lg transition ${
                    selectedRequestSong
                      ? 'btn btn-neon'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {selectedRequestSong ? 'Send Request' : 'Select a song first'}
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedRequestSong(null);
                    setRequestMessage('');
                  }}
                  className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Task 13: Artist Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="gig-card max-w-md w-full border-2 border-electric relative">
            {/* Close Button - SEPARATE ROW AT TOP */}
            <div className="flex justify-end mb-3">
              <button
                onClick={handleCloseRating}
                className="text-white hover:text-neon transition font-bold text-3xl leading-none"
                style={{ fontWeight: '900' }}
              >
                ×
              </button>
            </div>

            {/* Header - MOBILE OPTIMIZED, ONE LINE */}
            <div className="mb-6">
              <h2 className="concert-heading text-base sm:text-xl text-electric text-center whitespace-nowrap flex items-center justify-center gap-2">
                <span className="text-2xl sm:text-3xl">⭐</span>
                <span>Rate The Artist</span>
              </h2>
              <p className="text-gray-light text-xs sm:text-sm mt-2 text-center">
                How's the performance? (Optional)
              </p>
            </div>

            {hasRatedArtist && (
              <div className="mb-4 p-3 bg-neon/20 border border-neon rounded-lg">
                <p className="text-neon font-bold text-xs sm:text-sm text-center">
                  ✅ You rated this artist {currentGigRating}★ - Update your rating below
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Artist Name */}
              <div className="text-center">
                <p className="text-white text-base sm:text-lg font-bold mb-4">
                  {liveGig?.artistName || 'Artist'}
                </p>
              </div>

              {/* Star Rating - MOBILE OPTIMIZED */}
              <div>
                <div className="flex gap-1.5 sm:gap-3 justify-center mb-2 px-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setArtistRating(star)}
                      className={`text-2xl sm:text-4xl transition transform ${
                        artistRating >= star 
                          ? 'text-yellow-400 scale-110' 
                          : 'text-gray-600 hover:text-yellow-300 hover:scale-105'
                      }`}
                    >
                      {artistRating >= star ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                
                {/* Rating Label */}
                {artistRating > 0 && (
                  <p className="text-center text-electric font-bold text-base sm:text-lg">
                    {artistRating === 1 && 'Poor'}
                    {artistRating === 2 && 'Fair'}
                    {artistRating === 3 && 'Good'}
                    {artistRating === 4 && 'Great'}
                    {artistRating === 5 && 'Excellent'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmitRating}
                  disabled={artistRating === 0}
                  className={`flex-1 btn text-base sm:text-lg ${
                    artistRating === 0
                      ? 'btn-ghost opacity-50 cursor-not-allowed'
                      : 'btn-neon'
                  }`}
                >
                  <span>✓</span>
                  <span>Submit Rating</span>
                </button>
                <button
                  onClick={handleCloseRating}
                  className="btn btn-ghost text-base sm:text-lg"
                >
                  Close
                </button>
              </div>        
              <p className="text-center text-gray-light text-xs sm:text-sm">
                Your rating helps the artist improve!
              </p>
            </div>
          </div>
        </div>
      )} 

      {/* MODAL: View Gig Playlist (Audience) - SORTED BY VOTES */}
      {showGigPlaylistModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="gig-card max-w-md w-full border-2 border-electric max-h-[85vh] flex flex-col">
            
            {/* Close Button - ABSOLUTE TOP RIGHT */}
            <button
              onClick={() => setShowGigPlaylistModal(false)}
              className="absolute top-0 right-0 text-white hover:text-neon transition font-bold text-3xl leading-none z-20 p-2"
              style={{ fontWeight: '900' }}
            >
              ×
            </button>

            {/* Header - ULTRA-COMPACT INLINE */}
            <div className="px-3 pt-4 pb-1">
              <h2 className="text-[11px] sm:text-sm font-bold text-electric text-center flex items-center justify-center gap-1">
                <span className="text-sm sm:text-lg">🎵</span>
                <span className="whitespace-nowrap">Tonight's Playlist</span>
              </h2>
              <p className="text-gray-light text-[8px] sm:text-[10px] mt-0.5 text-center truncate">
                {liveGig?.artistName} • {liveGig?.venueName}
              </p>
            </div>

            {/* Playlist Content - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              
              {/* Songs in Tonight's Setlist - SORTED BY VOTES */}
              {liveGigData.queuedSongs && liveGigData.queuedSongs.length > 0 ? (
                <div className="space-y-2">
                  {liveGigData.queuedSongs
                    .filter(song => !liveGigData.playedSongs?.includes(song.id))
                    .map((song) => ({
                      ...song,
                      voteCount: liveGigData.votes[Math.floor(song.id)] || 0
                    }))
                    .sort((a, b) => b.voteCount - a.voteCount) // ✅ SORT BY VOTES DESC
                    .map((song, index) => {
                      // Truncate song name to 5 words
                      const songWords = song.title.split(' ');
                      const truncatedSong = songWords.length > 5 
                        ? songWords.slice(0, 5).join(' ') + '...'
                        : song.title;
                      
                      // Truncate artist name to 2 words
                      const artistWords = song.artist.split(' ');
                      const truncatedArtist = artistWords.length > 2
                        ? artistWords.slice(0, 2).join(' ') + '...'
                        : song.artist;
                      
                      return (
                        <div 
                          key={song.id} 
                          className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition"
                        >
                          {/* Single Row with ALL elements */}
                          <div className="flex items-center gap-2 w-full">
                            {/* Number Badge - Position in Queue */}
                            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-electric/30 text-electric">
                              {index + 1}
                            </div>

                            {/* Song Info Column - Left Aligned, Takes Available Space */}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-bold text-[11px] leading-tight text-white">
                                {truncatedSong}
                              </p>
                              <p className="text-gray-400 text-[9px] leading-tight">
                                {truncatedArtist}
                              </p>
                            </div>

                            {/* Vote Count - Far Right (ALWAYS SHOW) */}
                            <div className="flex-shrink-0 flex items-center gap-0.5 pl-4">
                              <span className="text-magenta text-[10px]">⚡</span>
                              <span className="font-bold text-[10px] text-magenta">
                                {song.voteCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-light text-sm">No songs in the playlist yet</p>
                </div>
              )}

              {/* Played Songs Section */}
              {liveGigData.playedSongs && liveGigData.playedSongs.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/20">
                  <h3 className="text-gray-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <span>✅</span>
                    <span>Already Played ({liveGigData.playedSongs.length})</span>
                  </h3>
                  <div className="space-y-2 opacity-60">
                    {liveGigData.queuedSongs
                      .filter(song => liveGigData.playedSongs.includes(song.id))
                      .map((song) => {
                        const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                        
                        // Truncate song name to 5 words
                        const songWords = song.title.split(' ');
                        const truncatedSong = songWords.length > 5 
                          ? songWords.slice(0, 5).join(' ') + '...'
                          : song.title;
                        
                        // Truncate artist name to 2 words
                        const artistWords = song.artist.split(' ');
                        const truncatedArtist = artistWords.length > 2
                          ? artistWords.slice(0, 2).join(' ') + '...'
                          : song.artist;
                        
                        return (
                          <div 
                            key={song.id} 
                            className="bg-gray-500/20 border border-gray-600 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-[10px]">✓</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-400 font-semibold text-[10px] line-through leading-tight">
                                  {truncatedSong}
                                </p>
                                <p className="text-gray-500 text-[9px] leading-tight">
                                  {truncatedArtist}
                                </p>
                              </div>
                              {voteCount > 0 && (
                                <div className="flex-shrink-0 flex items-center gap-0.5">
                                  <span className="text-gray-600 text-[9px]">⚡</span>
                                  <span className="text-gray-600 text-[9px]">{voteCount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowGigPlaylistModal(false)}
                className="w-full btn btn-electric text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}          
    </div>
  );
}

  // Task 12: Artist Profile Page (Public View)
  if (mode === 'artistProfile' && viewingArtistProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleCloseArtistProfile}
            className="btn btn-ghost mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back to Discovery</span>
          </button>

          {/* Profile Header */}
          <div className="gig-card border-2 border-electric mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Profile Picture Placeholder */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-magenta to-electric flex items-center justify-center flex-shrink-0">
                <Music size={64} className="text-white" />
              </div>

              {/* Artist Info */}
              <div className="flex-1">
                <h1 className="concert-heading text-4xl md:text-5xl text-electric mb-2">
                  {viewingArtistProfile.artistName}
                </h1>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="px-4 py-2 bg-magenta/20 text-magenta rounded-full text-sm font-bold border border-magenta">
                    🎵 {viewingArtistProfile.genre}
                  </span>
                  <span className="px-4 py-2 bg-electric/20 text-electric rounded-full text-sm font-bold border border-electric">
                    📍 {viewingArtistProfile.location}
                  </span>
                </div>

                <p className="text-gray-light text-lg mb-4">
                  {viewingArtistProfile.bio}
                </p>

                {/* Social Media Links */}
                {viewingArtistProfile.socialMedia && (
                  <div className="mt-4">
                    <SocialFollowButtons 
                      socialMedia={viewingArtistProfile.socialMedia}
                      artistName={viewingArtistProfile.artistName}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-3xl font-bold text-neon">{viewingArtistGigs.length}</p>
                <p className="text-gray-light text-sm">Upcoming Gigs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-magenta">
                  {viewingArtistProfile.totalGigs || 0}
                </p>
                <p className="text-gray-light text-sm">Total Gigs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-electric">
                  {viewingArtistProfile.followers || 0}
                </p>
                <p className="text-gray-light text-sm">Followers</p>
              </div>
            </div>
          </div>

          {/* Upcoming Gigs */}
          <div className="gig-card border-2 border-magenta">
            <h2 className="concert-heading text-3xl text-magenta mb-6">
              🎸 Upcoming Performances
            </h2>

            {viewingArtistGigs.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={64} className="text-gray mx-auto mb-4 opacity-50" />
                <p className="text-gray-light text-lg">No upcoming gigs scheduled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {viewingArtistGigs.map(gig => {
                  const gigDate = new Date(gig.gigDate);
                  const isLive = gig.status === 'live';
                  
                  return (
                    <div
                      key={gig.id}
                      className={`bg-white/5 p-6 rounded-xl border-2 transition ${
                        isLive 
                          ? 'border-neon animate-pulse' 
                          : 'border-white/10 hover:border-electric/50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-white">
                              {gig.venueName}
                            </h3>
                            {isLive && (
                              <span className="px-3 py-1 bg-neon/20 text-neon rounded-full text-sm font-bold border border-neon animate-pulse">
                                🔴 LIVE NOW
                              </span>
                            )}
                          </div>
                          
                          {gig.venueAddress && (
                            <p className="text-gray-light mb-2">
                              📍 {gig.venueAddress}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-electric font-semibold">
                            <span>
                              📅 {gigDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span>🕐 {gig.gigTime}</span>
                          </div>

                          {/* ✅ FIXED: Added comprehensive safety checks */}
                          {gig.distance != null && !isNaN(gig.distance) && Number.isFinite(gig.distance) && (
                            <p className="text-electric font-bold mt-2">
                              📏 {gig.distance < 1000 
                                ? `${Math.round(gig.distance)}m away` 
                                : `${(gig.distance/1000).toFixed(1)}km away`
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {isLive ? (
                            <button
                              onClick={() => {
                                setLiveGig(gig);
                                setLiveGigData({
                                  votes: gig.votes || {},
                                  queuedSongs: gig.queuedSongs || [],
                                  playedSongs: gig.playedSongs || [],
                                  currentSong: gig.currentSong || null,
                                  songRequests: gig.songRequests || [],
                                  maxQueueSize: gig.maxQueueSize || 20
                                });
                                setMode('audience');
                              }}
                              className="btn btn-neon"
                            >
                              <Play size={20} />
                              <span>Join Live Gig</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUpcomingGig(gig);
                                setShowGigDetailModal(true);
                              }}
                              className="btn btn-electric"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* About Section */}
          <div className="gig-card border-2 border-electric mt-6">
            <h2 className="concert-heading text-3xl text-electric mb-4">
              📖 About {viewingArtistProfile.artistName}
            </h2>
            <p className="text-white text-lg leading-relaxed">
              {viewingArtistProfile.bio}
            </p>
            
            {viewingArtistProfile.fullName && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-gray-light text-sm">
                  Artist: <span className="text-white font-semibold">{viewingArtistProfile.fullName}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="text-center text-white">        
        <h1 className="text-6xl font-bold mb-4">GigWave</h1>
        <p className="text-xl mb-8">Live Performance Platform</p>
        <button
          onClick={() => setMode('discover')}
          className="px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-2xl"
        >
          Get Started
        </button>

        {/* CONTACT EMAIL */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-gray-300 text-sm mb-2">Questions or feedback?</p>
          <a 
            href="mailto:gig.wave.2005@gmail.com"
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-base font-semibold"
          >
            📧 gig.wave.2005@gmail.com
          </a>
        </div>

      </div>
    </div>
  );
}
