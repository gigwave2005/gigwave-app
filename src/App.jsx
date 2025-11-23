import './styles/rockTheme.css';
import React, { useState, useEffect } from 'react';
import { Music, Plus, Trash2, Play, Users, Calendar, Heart, Star, Zap, X, Search, Upload, Settings, Edit2, Check, Mail, Lock, ArrowLeft, MapPin, Navigation } from 'lucide-react';

// Import Firebase utilities
import {
  auth,
  db,
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
  GeoPoint
  hasUserVoted,
  recordUserVote,
  getActiveLiveGigForArtist,
} from './firebase-utils';

const CFG = { app: 'Gigwave', fee: 0.15, jbFee: 5, tips: [5,10,20,50] };

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Mode state
  const [mode, setMode] = useState('discover');
  const [tab, setTab] = useState('master');
  
  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyGigs, setNearbyGigs] = useState([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
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

  // Listen to auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to live gig updates
  useEffect(() => {
    if (!liveGig?.id) return;
    
    const unsubscribe = listenToLiveGig(liveGig.id, async (gigData) => {
      console.log('🎵 Live gig update received');
      console.log('👤 Current User:', currentUser?.uid);
      console.log('🎸 Artist ID:', gigData.artistId);
      
      setLiveGigData({
        votes: gigData.votes || {},
        comments: gigData.comments || [],
        donations: gigData.donations || [],
        queuedSongs: gigData.queuedSongs || [],
        masterPlaylist: gigData.masterPlaylist || [],
        currentSong: gigData.currentSong || null,
        playedSongs: gigData.playedSongs || [],
        scheduledEndTime: gigData.scheduledEndTime || null
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
  if (!liveGig?.id || mode !== 'live') return;
  
  const checkTimer = async () => {
    if (!liveGigData.scheduledEndTime) return;
    
    const endTime = liveGigData.scheduledEndTime instanceof Date 
      ? liveGigData.scheduledEndTime 
      : liveGigData.scheduledEndTime?.toDate?.();
    
    if (!endTime) return;
    
    const now = new Date();
    const remaining = endTime - now;
    const remainingMinutes = Math.floor(remaining / 60000);
    
    setTimeRemaining(remainingMinutes);
    
    // Show warning at 10 minutes
    if (remainingMinutes <= 10 && remainingMinutes > 0 && !showTimeWarning) {
      setShowTimeWarning(true);
      alert(`⚠️ Your gig will auto-end in ${remainingMinutes} minutes!\n\nClick "Add 1 Hour" to extend.`);
    }
    
    // Auto-end at 0 - ONLY RUN ONCE
    if (remainingMinutes <= 0 && mode === 'live') {
      try {
        await handleEndGig();
        alert('⏰ Time limit reached! Your gig has been automatically ended.');
      } catch (error) {
        console.error('Error auto-ending gig:', error);
      }
    }
  };
  
  // Check immediately and then every minute
  checkTimer();
  const interval = setInterval(checkTimer, 60000);
  
  return () => clearInterval(interval);
}, [liveGig?.id, liveGigData.scheduledEndTime, mode, showTimeWarning]);

  // Get user location on mount
  useEffect(() => {
    getUserLocation()
      .then(loc => setUserLocation(loc))
      .catch(err => console.log('Location not available:', err));
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    if (currentUser) {
      const savedSongs = localStorage.getItem(`gigwave_songs_${currentUser.uid}`);
      const savedPlaylists = localStorage.getItem(`gigwave_playlists_${currentUser.uid}`);
      const savedGigs = localStorage.getItem(`gigwave_gigs_${currentUser.uid}`);
      
      if (savedSongs) setMasterSongs(JSON.parse(savedSongs));
      if (savedPlaylists) setGigPlaylists(JSON.parse(savedPlaylists));
      if (savedGigs) setGigs(JSON.parse(savedGigs));
      
      console.log('✅ Data loaded from localStorage');
    }
  }, [currentUser]);

  // Load live gig from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedLiveGig = localStorage.getItem(`gigwave_live_${currentUser.uid}`);
      if (savedLiveGig) {
        const liveGigData = JSON.parse(savedLiveGig);
        
        // Convert any timestamp strings back to Date objects or remove them
        const cleanGigData = {
          ...liveGigData,
          startTime: liveGigData.startTime ? new Date(liveGigData.startTime) : null,
          endTime: liveGigData.endTime ? new Date(liveGigData.endTime) : null,
          // Remove any problematic nested timestamp objects
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
        setMode('live'); // Lock into live mode
        console.log('🔴 Resumed live gig from localStorage (cleaned)');
      }
    }
  }, [currentUser]);

  // Load interested gigs from localStorage
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`gigwave_interested_${currentUser.uid}`);
      if (saved) {
        setInterestedGigs(JSON.parse(saved));
        console.log('✅ Loaded interested gigs from localStorage');
      }
    }
  }, [currentUser]);

  // Save interested gigs to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`gigwave_interested_${currentUser.uid}`, JSON.stringify(interestedGigs));
    }
  }, [interestedGigs, currentUser]);

  // Backup polling for audience mode - refresh every minute
  useEffect(() => {
    if (mode !== 'audience' || !liveGig?.id) return;
    
    console.log('🔄 Starting audience polling (every 60 seconds)');
    
    // The real-time listener (listenToLiveGig) already handles updates
    // This polling just ensures we stay connected and logs activity
    const pollInterval = setInterval(() => {
      console.log('🔄 Audience mode active - data updating in real-time');
    }, 60000); // 60 seconds
    
    return () => {
      console.log('⏹️ Stopping audience polling');
      clearInterval(pollInterval);
    };
  }, [mode, liveGig?.id]);

  // Save live gig to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      if (liveGig) {
        localStorage.setItem(`gigwave_live_${currentUser.uid}`, JSON.stringify(liveGig));
        console.log('💾 Live gig saved to localStorage');
      } else {
        localStorage.removeItem(`gigwave_live_${currentUser.uid}`);
        console.log('🗑️ Live gig removed from localStorage');
      }
    }
  }, [liveGig, currentUser]);
  
  // Save master songs to localStorage
  useEffect(() => {
    if (currentUser && masterSongs.length >= 0) {
      localStorage.setItem(`gigwave_songs_${currentUser.uid}`, JSON.stringify(masterSongs));
      console.log('💾 Master songs saved:', masterSongs.length);
    }
  }, [masterSongs, currentUser]);

  // Save gig playlists to localStorage
  useEffect(() => {
    if (currentUser && gigPlaylists.length >= 0) {
      localStorage.setItem(`gigwave_playlists_${currentUser.uid}`, JSON.stringify(gigPlaylists));
      console.log('💾 Playlists saved:', gigPlaylists.length);
    }
  }, [gigPlaylists, currentUser]);

  // Save gigs to localStorage
  useEffect(() => {
    if (currentUser && gigs.length >= 0) {
      localStorage.setItem(`gigwave_gigs_${currentUser.uid}`, JSON.stringify(gigs));
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
  
  const handleSignIn = async (provider) => {
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'facebook') {
        await signInWithFacebook();
      }
      setShowAuthModal(false);
    } catch (error) {
      alert('Sign-in failed: ' + error.message);
    }
  };

  const handleSearchGigs = async () => {
    try {
      setLoadingGigs(true);
      let location = userLocation;
      
      if (!location) {
        location = await getUserLocation();
        setUserLocation(location);
      }
      
      const gigs = await searchNearbyGigs(location, 50);
      setNearbyGigs(gigs);
      setFilteredGigs(gigs);
      
      if (gigs.length === 0) {
        alert('No gigs found within 50km. Try again later!');
      } else {
        alert(`✅ Found ${gigs.length} gig${gigs.length > 1 ? 's' : ''} nearby!`);
      }
    } catch (error) {
      alert('Error finding gigs: ' + error.message);
    } finally {
      setLoadingGigs(false);
    }
  };

  const handleJoinGig = async (gig) => {
  try {
    // Get current location
    let location = userLocation;
    
    if (!location) {
      alert('Getting your location...');
      location = await getUserLocation();
      setUserLocation(location);
    }
    
    // Get venue location
    const venueLocation = {
      lat: gig.location.latitude,
      lng: gig.location.longitude
    };
    
    // Check if within range (1km = 1000m)
    const distance = calculateDistance(location, venueLocation);
    const maxDistance = 1000; // 1km in meters
    
    if (distance > maxDistance) {
      const distanceKm = (distance / 1000).toFixed(1);
      alert(`⚠️ You're too far away!\n\nYou must be within 1km of the venue to join.\n\nYou are currently ${distanceKm}km away from ${gig.venueName}.`);
      return;
    }
    
    // Within range - allow join
    setLiveGig(gig);
    setMode('audience');
  } catch (error) {
    alert('Error getting your location: ' + error.message);
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
  
  const handleVote = async (songId) => {
    // Check if user is logged in
    if (!currentUser) {
      alert('Please sign in to vote!');
      setShowAuthModal(true);
      return;
    }
    
    // Make sure we're in a live gig
    if (!liveGig) return;
    
    try {
      // ⭐ TASK 20: Check if this user already voted for this song
      const alreadyVoted = await hasUserVoted(liveGig.id, songId, currentUser.uid);
      
      if (alreadyVoted) {
        alert('⚠️ You already voted for this song!');
        return;  // ← STOP HERE, don't allow second vote
      }
      
      // Record the new vote in Firebase
      await recordUserVote(liveGig.id, songId, currentUser.uid);
      
      alert('✅ Vote recorded!');
      
      // Refresh the vote counts from Firebase
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
    id: Math.floor(song.id), // Convert to integer HERE
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    album: song.album || '',
    key: ''
  };
  
  setMasterSongs([...masterSongs, cleanSong]);
  alert(`✅ Added "${song.title}" to master playlist!`);
  
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
      status: 'upcoming'
    });
    setShowGigModal(true);
  };

  const saveGig = async () => {
    if (!editingGig.venueName || !editingGig.date || !editingGig.time) {
      alert('Please fill in venue name, date, and time!');
      return;
    }
    
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
      
      // Prepare gig data for Firebase
      // Get songs from assigned playlist or master
      let queuedSongs = [];
      let masterPlaylistData = masterSongs;
      
      if (editingGig.playlistId) {
        const playlist = gigPlaylists.find(p => p.id === editingGig.playlistId);
        if (playlist) {
          queuedSongs = playlist.songs.map(id => masterSongs.find(s => s.id === id)).filter(Boolean);
        }
      }
      
      const gigData = {
        artistId: currentUser.uid,
        artistName: currentUser.displayName || 'Artist',
        venueName: editingGig.venueName,
        venueAddress: editingGig.address || '',
        location: location,
        status: 'upcoming',
        gigDate: editingGig.date,
        gigTime: editingGig.time,
        playlistId: editingGig.playlistId || null,
        queuedSongs: queuedSongs,
        masterPlaylist: masterPlaylistData,
        notes: editingGig.notes || ''
      };

      // Save to Firebase
      const gigId = await createLiveGig(gigData, currentUser.uid);
      
      // Update local state
      const savedGig = { ...editingGig, id: gigId, location, status: 'upcoming' };
      
      if (gigs.find(g => g.id === editingGig.id)) {
        setGigs(gigs.map(g => g.id === editingGig.id ? savedGig : g));
      } else {
        setGigs([...gigs, savedGig]);
      }
      
      setShowGigModal(false);
      setEditingGig(null);
      
      alert('✅ Gig saved! Audience can now find this upcoming gig.');
    } catch (error) {
      alert('Error saving gig: ' + error.message);
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
    // Check if already live (NEW - FIRST CHECK!)
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
    const existingLiveGig = await getActiveLiveGigForArtist(currentUser.email);
    
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
      
      // Get songs from assigned playlist or master
      let songs = masterSongs;
      if (gig.playlistId) {
        const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
        if (playlist) {
          songs = playlist.songs.map(id => masterSongs.find(s => s.id === id)).filter(Boolean);
        }
      }
      
      // Create unique gig ID using venue + date + time
      const uniqueGigKey = `${gig.venueName}_${gig.date}_${gig.time}`.replace(/\s/g, '_');
      
      const gigData = {
        artistId: currentUser.uid,
        artistName: currentUser.displayName || 'Artist',
        venueName: gig.venueName,
        venueAddress: gig.address || '',
        location: location,
        queuedSongs: songs.slice(0, 20),
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
        gigId = await updateGigToLive(gig.id, songs.slice(0, 20), masterSongs);
      } else {
        // New gig - create in Firebase
        console.log('🆕 Creating new live gig');
        gigId = await createLiveGig(gigData, currentUser.uid);
      }
      
      setLiveGig({...gigData, id: gigId});
      setMode('live');
      
      alert(`✅ You're live at ${gig.venueName}!\n\nAudience can find you by searching nearby!`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleExtendTime = async () => {
  try {
    await extendGigTime(liveGig.id, 1);
    setShowTimeWarning(false);
    alert('✅ Added 1 hour to your gig!');
  } catch (error) {
    alert('Error extending time: ' + error.message);
  }
};

  const handleEndGig = async () => {
    if (!window.confirm('End this gig?')) return;
    
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
        localStorage.setItem(`gigwave_gigs_${currentUser.uid}`, JSON.stringify(updatedGigs));
        console.log('💾 Gig status updated to ended in localStorage');
      }
      
      // Clear live gig
      setMode('artist');
      setLiveGig(null);
      
      alert('✅ Gig ended! Status updated to ended.');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
     
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Music size={80} className="mx-auto mb-4 animate-pulse" />
          <h1 className="text-4xl font-bold">Loading Gigwave...</h1>
        </div>
      </div>
    );
  }

  // Auth Modal - Backstage Access
  if (showAuthModal) {
    const handleEmailAuth = async () => {
      setAuthError('');
      try {
        if (authTab === 'signup') {
          await signUpWithEmail(authEmail, authPassword);
        } else {
          await signInWithEmail(authEmail, authPassword);
        }
        setShowAuthModal(false);
        alert(`✅ ${authTab === 'signup' ? 'Account created' : 'Signed in'} successfully!`);
      } catch (error) {
        setAuthError(error.message);
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
            {/* Social Sign In */}
            <button
              onClick={() => handleSignIn('google')}
              className="w-full px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <span>🔐</span>
              <span>Continue with Google</span>
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

  // Playlist Editor Modal - Setlist Builder
  if (showPlaylistModal && editingPlaylist) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rock-background gig-card border-2 border-magenta max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="concert-heading text-3xl md:text-4xl text-magenta">
              🎸 SETLIST BUILDER
            </h2>
            <button 
              onClick={() => {
                setShowPlaylistModal(false);
                setEditingPlaylist(null);
              }} 
              className="text-white hover:text-red-400 p-2 touch-target"
            >
              <X size={32}/>
            </button>
          </div>
  
          {/* Playlist Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                Playlist Name *
              </label>
              <input
                type="text"
                value={editingPlaylist.name}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, name: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                placeholder="e.g., Friday Night Rock"
              />
            </div>
            
            <div>
              <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={editingPlaylist.description}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, description: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-electric/30 focus:border-electric focus:outline-none"
                rows={2}
                placeholder="Optional description..."
              />
            </div>
          </div>
  
          {/* Songs in Playlist */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="concert-heading text-2xl text-neon mb-4">
              🎵 SONGS IN SETLIST ({editingPlaylist.songs.length})
            </h3>
            {editingPlaylist.songs.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                <p className="text-gray-light">No songs yet. Add from master playlist below. 🎸</p>
              </div>
            ) : (
              <div className="space-y-2">
                {editingPlaylist.songs.map((songId, index) => {
                  const song = masterSongs.find(s => s.id === songId);
                  return song ? (
                    <div 
                      key={songId} 
                      className="bg-white/5 p-3 rounded-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3 border border-white/10 hover:border-electric/50 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="concert-heading text-electric text-xl min-w-[40px]">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold truncate">{song.title}</div>
                          <div className="text-gray-light text-sm truncate">{song.artist}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSongFromGigPlaylist(songId)}
                        className="text-red-400 hover:text-red-300 p-2 touch-target self-end md:self-center"
                      >
                        <Trash2 size={20}/>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
  
          {/* Add Songs Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="concert-heading text-2xl text-electric mb-4">
              📚 ADD FROM MASTER PLAYLIST
            </h3>
            {masterSongs.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                <p className="text-gray-light">
                  No songs in master playlist. Add songs in the Master Playlist tab first! 🎵
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {masterSongs
                  .filter(song => !editingPlaylist.songs.includes(song.id))
                  .map(song => (
                    <div 
                      key={song.id} 
                      className="bg-white/5 p-3 rounded-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3 border border-white/10 hover:bg-white/10 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate">{song.title}</div>
                        <div className="text-gray-light text-sm truncate">{song.artist}</div>
                      </div>
                      <button
                        onClick={() => addSongToGigPlaylist(song.id)}
                        className="btn btn-neon text-sm self-end md:self-center"
                      >
                        <Plus size={18}/>
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                {masterSongs.filter(song => !editingPlaylist.songs.includes(song.id)).length === 0 && (
                  <div className="bg-white/5 rounded-lg p-6 text-center border border-neon/30">
                    <p className="text-neon font-bold">
                      ✅ All master songs have been added to this setlist!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={saveGigPlaylist}
              className="flex-1 btn btn-neon text-lg"
            >
              <Check size={20}/>
              <span>Save Setlist</span>
            </button>
            <button
              onClick={() => {
                setShowPlaylistModal(false);
                setEditingPlaylist(null);
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gig Modal - Show Creator
  if (showGigModal && editingGig) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rock-background gig-card border-2 border-orange max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="concert-heading text-xl text-neon flex items-center">
                <MapPin className="mr-2" size={24}/>
                VENUE LOCATION
              </h3>
              
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
  
              {/* Manual Address Entry */}
              <div>
                <label className="text-gray-light font-semibold mb-2 block text-sm">
                  Or Enter Address:
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={editingGig.address || ''}
                    onChange={(e) => setEditingGig({...editingGig, address: e.target.value})}
                    className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/30 focus:border-electric focus:outline-none"
                    placeholder="e.g. 131 W 3rd St, New York, NY"
                  />
                  <button
                    onClick={searchVenueAddress}
                    disabled={searchingAddress}
                    className="btn btn-neon disabled:opacity-50 whitespace-nowrap"
                  >
                    {searchingAddress ? (
                      <>
                        <span className="loading-pulse">🔍</span>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
  
              {/* Display Coordinates if captured */}
              {editingGig.location && (
                <div className="bg-neon/20 border border-neon rounded-lg p-4">
                  <p className="text-neon font-bold mb-2 flex items-center gap-2">
                    <span>✅</span>
                    <span>Location Captured:</span>
                  </p>
                  <p className="text-white text-sm font-mono">
                    📍 {editingGig.location.lat.toFixed(6)}°N, {editingGig.location.lng.toFixed(6)}°W
                  </p>
                  {editingGig.address && (
                    <p className="text-gray-light text-sm mt-2">
                      📌 {editingGig.address}
                    </p>
                  )}
                </div>
              )}
            </div>
  
            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                  Date *
                </label>
                <input
                  type="date"
                  value={editingGig.date}
                  onChange={(e) => setEditingGig({...editingGig, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-electric/30 focus:border-electric focus:outline-none"
                />
              </div>
              <div>
                <label className="text-electric font-bold mb-2 block text-sm uppercase tracking-wider">
                  Time *
                </label>
                <input
                  type="time"
                  value={editingGig.time}
                  onChange={(e) => setEditingGig({...editingGig, time: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-electric/30 focus:border-electric focus:outline-none"
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
  
            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <button
                onClick={saveGig}
                className="flex-1 btn btn-neon text-lg"
              >
                <Check size={20}/>
                <span>Save Show</span>
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
        <div className="rock-background gig-card border-2 border-electric max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="concert-heading text-3xl md:text-4xl text-electric">
              🎸 BACKSTAGE PASS
            </h2>
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
  
          {/* Artist Header */}
          <div className="bg-gradient-to-r from-magenta/20 to-electric/20 border border-electric/50 rounded-xl p-6 mb-6">
            <h3 className="concert-heading text-3xl md:text-4xl text-white mb-4">
              {selectedUpcomingGig.artistName}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-gray-light">
                <span className="text-electric text-xl">📍</span>
                <div>
                  <p className="font-bold text-white">{selectedUpcomingGig.venueName}</p>
                  {selectedUpcomingGig.venueAddress && (
                    <p className="text-sm text-gray">{selectedUpcomingGig.venueAddress}</p>
                  )}
                </div>
              </div>
              
              {selectedUpcomingGig.gigDate && (
                <p className="flex items-center gap-3">
                  <span className="text-magenta text-xl">📅</span>
                  <span className="font-bold text-white">
                    {new Date(selectedUpcomingGig.gigDate).toLocaleDateString('en-US', {
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </span>
                </p>
              )}
              
              {selectedUpcomingGig.gigTime && (
                <p className="flex items-center gap-3">
                  <span className="text-neon text-xl">🕐</span>
                  <span className="font-bold text-white">{selectedUpcomingGig.gigTime}</span>
                </p>
              )}
              
              <p className="flex items-center gap-3">
                <span className="text-electric text-xl">📏</span>
                <span className="font-bold text-electric">
                  {selectedUpcomingGig.distance < 1000 
                    ? `${selectedUpcomingGig.distance}m away` 
                    : `${(selectedUpcomingGig.distance/1000).toFixed(1)}km away`
                  }
                </span>
              </p>
            </div>
          </div>
  
          {/* Setlist Preview */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="concert-heading text-2xl text-magenta mb-4">
              🎵 EXPECTED SETLIST
            </h3>
            {(() => {
              const songs = selectedUpcomingGig.queuedSongs && selectedUpcomingGig.queuedSongs.length > 0
                ? selectedUpcomingGig.queuedSongs
                : selectedUpcomingGig.masterPlaylist || [];
              
              const playlistType = selectedUpcomingGig.queuedSongs && selectedUpcomingGig.queuedSongs.length > 0
                ? 'Curated Queue'
                : 'Master Playlist';
              
              return songs.length > 0 ? (
                <>
                  <p className="text-electric text-sm mb-4 font-semibold">
                    Showing: {playlistType}
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {songs.map((song, index) => (
                      <div 
                        key={song.id || index} 
                        className="bg-white/5 p-3 rounded-lg flex items-center gap-3 hover:bg-white/10 transition border border-white/10"
                      >
                        <span className="concert-heading text-electric text-xl min-w-[40px]">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold truncate">{song.title}</div>
                          <div className="text-gray-light text-sm truncate">{song.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray text-sm mt-4 italic text-center">
                    {songs.length} song{songs.length !== 1 ? 's' : ''} • Final setlist may vary
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
  
          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={async () => {
                // Check if user is logged in
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
              className={`flex-1 btn text-lg ${
                interestedGigs.includes(selectedUpcomingGig.id)
                  ? 'btn-neon'
                  : 'btn-electric'
              }`}
            >
              {interestedGigs.includes(selectedUpcomingGig.id) ? (
                <>
                  <span>⭐</span>
                  <span>Interested!</span>
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
              className="btn btn-ghost"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Discovery Page
  if (mode === 'discover') {
    return (
      <div className="rock-background min-h-screen p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto pt-8 md:pt-20">
          {/* Hero Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="relative inline-block mb-6">
              <Music size={80} className="text-electric mx-auto animate-pulse" />
              <div className="absolute inset-0 blur-xl opacity-50">
                <Music size={80} className="text-electric mx-auto" />
              </div>
            </div>
            {/* Logo and Title */}
  <div className="flex items-center justify-center gap-4 mb-4">
    {/* Soundwave Logo */}
    <div className="relative">
      <svg width="80" height="80" viewBox="0 0 100 100" className="text-electric">
        {/* Soundwave bars */}
        <rect x="10" y="30" width="8" height="40" fill="currentColor" rx="4">
          <animate attributeName="height" values="40;60;40" dur="1s" repeatCount="indefinite" />
          <animate attributeName="y" values="30;20;30" dur="1s" repeatCount="indefinite" />
        </rect>
        <rect x="25" y="20" width="8" height="60" fill="currentColor" rx="4">
          <animate attributeName="height" values="60;80;60" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="20;10;20" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="40" y="15" width="8" height="70" fill="#FF1B6D" rx="4">
          <animate attributeName="height" values="70;90;70" dur="0.8s" repeatCount="indefinite" />
          <animate attributeName="y" values="15;5;15" dur="0.8s" repeatCount="indefinite" />
        </rect>
        <rect x="55" y="20" width="8" height="60" fill="currentColor" rx="4">
          <animate attributeName="height" values="60;80;60" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="y" values="20;10;20" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="70" y="30" width="8" height="40" fill="currentColor" rx="4">
          <animate attributeName="height" values="40;60;40" dur="1s" repeatCount="indefinite" />
          <animate attributeName="y" values="30;20;30" dur="1s" repeatCount="indefinite" />
        </rect>
      </svg>
      {/* Glow effect */}
      <div className="absolute inset-0 blur-xl opacity-50">
        <svg width="80" height="80" viewBox="0 0 100 100" className="text-electric">
          <rect x="40" y="15" width="8" height="70" fill="currentColor" rx="4" />
        </svg>
      </div>
    </div>
    
    {/* App Name */}
    <h1 className="concert-heading text-6xl md:text-7xl font-bold text-white drop-shadow-lg">
      GigWave
    </h1>
  </div>
  
  {/* Tagline */}
  <p className="text-lg md:text-xl text-electric font-bold tracking-widest uppercase mb-12">
    Ride the wave of live music
  </p>
          <p className="text-xl md:text-2xl text-electric font-semibold tracking-wide uppercase">
            ⚡ Discover Live Music Near You ⚡
          </p>
        </div>

        {/* Search Button */}
        <div className="gig-card mb-8 hover:scale-105 transition-transform">
          <button
            onClick={handleSearchGigs}
            disabled={loadingGigs}
            className="btn btn-electric w-full text-xl md:text-2xl py-6 md:py-8"
          >
            {loadingGigs ? (
              <>
                <span className="loading-pulse">🔍</span>
                <span>SEARCHING...</span>
              </>
            ) : (
              <>
                <span>📍</span>
                <span>FIND LIVE GIGS</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {nearbyGigs.length > 0 && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="gig-card">
              <h3 className="concert-heading text-2xl text-electric mb-4">
                📅 FILTER BY DATE
              </h3>
              <div className="grid grid-cols-2 md:flex gap-3">
                <button
                  onClick={() => filterGigsByDate('all')}
                  className={`btn ${dateFilter === 'all' ? 'btn-electric' : 'btn-ghost'} flex-1`}
                >
                  All Dates
                </button>
                <button
                  onClick={() => filterGigsByDate('today')}
                  className={`btn ${dateFilter === 'today' ? 'btn-electric' : 'btn-ghost'} flex-1`}
                >
                  Today
                </button>
                <button
                  onClick={() => filterGigsByDate('tomorrow')}
                  className={`btn ${dateFilter === 'tomorrow' ? 'btn-electric' : 'btn-ghost'} flex-1`}
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => filterGigsByDate('week')}
                  className={`btn ${dateFilter === 'week' ? 'btn-electric' : 'btn-ghost'} flex-1`}
                >
                  This Week
                </button>
              </div>
              <p className="text-gray-light text-sm mt-4 text-center">
                🎵 Showing <span className="text-electric font-bold">{filteredGigs.length}</span> of <span className="text-electric font-bold">{nearbyGigs.length}</span> gigs
              </p>
            </div>

              {/* Gig Results */}
              <div className="space-y-4">
                {/* Live Gigs Section */}
                {filteredGigs.filter(g => g.status === 'live').length > 0 && (
                  <div className="space-y-4 mb-8">
                    <h2 className="text-3xl font-bold text-white">🔴 Live Now</h2>
                    
                    {filteredGigs.filter(g => g.status === 'live').map(gig => {
                      const gigDateTime = gig.gigDate && gig.gigTime 
                        ? `${new Date(gig.gigDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at ${gig.gigTime}`
                        : 'Time TBD';
                      
                      return (
                        <div 
                          key={gig.id} 
                          className="gig-card gig-card-live hover:scale-[1.02] transition-all cursor-pointer"
                          onClick={() => {
                            setLiveGig(gig);
                            setMode('audience');
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="flex-1">
                              {/* Live Indicator */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                  <div className="w-4 h-4 bg-neon rounded-full animate-pulse"></div>
                                  <div className="absolute inset-0 w-4 h-4 bg-neon rounded-full animate-ping"></div>
                                </div>
                                <span className="concert-heading text-neon text-xl tracking-wider">
                                  🔴 LIVE NOW
                                </span>
                              </div>
                      
                              {/* Artist Name */}
                              <h3 className="concert-heading text-3xl md:text-4xl text-white mb-4">
                                {gig.artistName}
                              </h3>
                      
                              {/* Venue Info */}
                              <div className="space-y-2 text-gray-light">
                                <p className="flex items-center gap-2 text-lg">
                                  <span className="text-electric">📍</span>
                                  <span className="font-semibold">{gig.venueName}</span>
                                </p>
                                
                                {gig.venueAddress && (
                                  <p className="flex items-center gap-2 text-sm text-gray">
                                    <span className="text-electric">🗺️</span>
                                    <span>{gig.venueAddress}</span>
                                  </p>
                                )}
                                
                                <p className="flex items-center gap-2 text-electric font-bold">
                                  <span>📏</span>
                                  <span>
                                    {gig.distance < 1000 
                                      ? `${gig.distance}m away` 
                                      : `${(gig.distance/1000).toFixed(1)}km away`
                                    }
                                  </span>
                                </p>
                      
                                {/* Interested Status */}
                                {interestedGigs.includes(gig.id) && (
                                  <p className="flex items-center gap-2 text-neon font-semibold mt-3">
                                    <span>⭐</span>
                                    <span>You're interested!</span>
                                  </p>
                                )}
                      
                                {/* Interested Count */}
                                {gig.interestedCount > 0 && (
                                  <p className="flex items-center gap-2 text-magenta font-semibold">
                                    <span>👥</span>
                                    <span>
                                      {gig.interestedCount} {gig.interestedCount === 1 ? 'person' : 'people'} interested
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                      
                            {/* Join Button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinGig(gig);
                              }}
                              className="btn btn-neon text-lg md:text-xl whitespace-nowrap self-start md:self-center touch-target"
                            >
                              <span>🎵</span>
                              <span>JOIN LIVE</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming Gigs Section */}
                {filteredGigs.filter(g => g.status === 'upcoming').length > 0 && (
                  <div className="space-y-4">
                    <h2 className="concert-heading text-4xl text-electric mb-6">
                      📅 UPCOMING GIGS
                    </h2>
                    
                    {filteredGigs.filter(g => g.status === 'upcoming').map(gig => {
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
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 bg-electric rounded-full"></div>
                                <span className="text-electric font-bold text-sm uppercase tracking-wider">
                                  Upcoming
                                </span>
                              </div>
                
                              {/* Artist Name */}
                              <h3 className="concert-heading text-2xl md:text-3xl text-white mb-2">
                                {gig.artistName}
                              </h3>
                
                              {/* Date/Time */}
                              <p className="text-magenta font-bold text-lg mb-4">
                                🎸 {gigDateTime}
                              </p>
                
                              {/* Venue Info */}
                              <div className="space-y-2 text-gray-light">
                                <p className="flex items-center gap-2">
                                  <span className="text-electric">📍</span>
                                  <span className="font-semibold">{gig.venueName}</span>
                                </p>
                                
                                {gig.venueAddress && (
                                  <p className="flex items-center gap-2 text-sm text-gray">
                                    <span className="text-electric">🗺️</span>
                                    <span>{gig.venueAddress}</span>
                                  </p>
                                )}
                                
                                <p className="flex items-center gap-2 text-electric font-bold">
                                  <span>📏</span>
                                  <span>
                                    {gig.distance < 1000 
                                      ? `${gig.distance}m away` 
                                      : `${(gig.distance/1000).toFixed(1)}km away`
                                    }
                                  </span>
                                </p>
                
                                {/* Interested Status */}
                                {interestedGigs.includes(gig.id) && (
                                  <p className="flex items-center gap-2 text-neon font-semibold mt-3">
                                    <span>⭐</span>
                                    <span>You're interested!</span>
                                  </p>
                                )}
                
                                {/* Interested Count */}
                                {gig.interestedCount > 0 && (
                                  <p className="flex items-center gap-2 text-magenta font-semibold">
                                    <span>👥</span>
                                    <span>
                                      {gig.interestedCount} {gig.interestedCount === 1 ? 'person' : 'people'} interested
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                
                            {/* View Details Button */}
                            <button 
                              onClick={async () => {
                                try {
                                  // Get full gig data from Firebase
                                  const gigRef = doc(db, 'liveGigs', gig.id);
                                  const gigSnap = await getDoc(gigRef);
                                  
                                  if (gigSnap.exists()) {
                                    const fullGigData = { id: gigSnap.id, ...gigSnap.data(), distance: gig.distance };
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
                              className="btn btn-electric text-lg md:text-xl whitespace-nowrap self-start md:self-center touch-target"
                            >
                              <span>🎫</span>
                              <span>VIEW DETAILS</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredGigs.length === 0 && (
                  <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-6 text-center">
                    <p className="text-yellow-200 text-lg">No gigs found for selected date filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <button
                  onClick={async () => {
                    await signOutUser();
                    setMode('discover');
                  }}
                  className="block mx-auto px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold text-xl"
              >
                🎤 Artist Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Artist Mode  
  if (mode === 'artist') {
    return (
      <div className="rock-background min-h-screen p-4 pb-24 md:pb-4">
        <div className="max-w-6xl mx-auto pt-6">
          {/* Header */}
          <div className="gig-card mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="concert-heading text-4xl md:text-5xl text-white mb-2">
                  🎸 ARTIST DASHBOARD
                </h1>
                <p className="text-electric text-lg font-semibold">
                  Welcome, {currentUser?.displayName || currentUser?.email}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('discover')}
                  className="btn btn-ghost"
                >
                  ← Back
                </button>
                <button
                  onClick={async () => {
                    await signOutUser();
                    setMode('discover');
                  }}
                  className="btn btn-fire"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
  
          {/* Navigation Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            <button 
              onClick={() => setTab('master')} 
              className={`btn ${tab === 'master' ? 'btn-electric' : 'btn-ghost'} text-lg`}
            >
              <Music className="inline mr-2" size={20}/>
              <span>Master Playlist</span>
            </button>
            <button 
              onClick={() => setTab('playlists')} 
              className={`btn ${tab === 'playlists' ? 'btn-electric' : 'btn-ghost'} text-lg`}
            >
              <Music className="inline mr-2" size={20}/>
              <span>Gig Playlists</span>
            </button>
            <button 
              onClick={() => setTab('gigs')} 
              className={`btn ${tab === 'gigs' ? 'btn-electric' : 'btn-ghost'} text-lg`}
            >
              <Calendar className="inline mr-2" size={20}/>
              <span>My Gigs</span>
            </button>
          </div>
  
          {tab === 'master' && (
            <div className="space-y-6">
              {/* iTunes Search Card */}
              <div className="gig-card">
                <h3 className="concert-heading text-2xl text-electric mb-4">
                  🎵 SEARCH ITUNES MUSIC
                </h3>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <input 
                    type="text" 
                    value={itunesSearch} 
                    onChange={e => setItunesSearch(e.target.value)} 
                    onKeyPress={e => e.key === 'Enter' && searchItunesAPI()}
                    placeholder="Search for songs, artists, albums..."
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-electric/30 focus:border-electric focus:outline-none"
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
                    <p className="text-gray-light font-semibold mb-3">
                      🎼 Found <span className="text-electric">{itunesResults.length}</span> songs
                    </p>
                    {itunesResults.map(song => (
                      <div 
                        key={song.id} 
                        className="bg-white/5 p-3 rounded-lg flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/10 transition border border-white/10"
                      >
                        {song.artwork && (
                          <img 
                            src={song.artwork} 
                            alt={song.title}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-lg truncate">{song.title}</div>
                          <div className="text-electric text-sm">{song.artist}</div>
                          {song.album && (
                            <div className="text-gray text-xs truncate">{song.album}</div>
                          )}
                          {song.duration && (
                            <div className="text-neon text-xs">⏱️ {song.duration}</div>
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
                    <div className="text-electric text-lg loading-pulse">🔍 Searching iTunes...</div>
                  </div>
                )}
              </div>
  
              {/* Master Playlist Card */}
              <div className="gig-card">
                <h2 className="concert-heading text-3xl text-magenta mb-4">
                  🎵 MASTER PLAYLIST
                </h2>
                <button 
                  onClick={addToMaster} 
                  className="btn btn-electric mb-4"
                >
                  <Plus size={20}/>
                  <span>Add Song</span>
                </button>
                
                {masterSongs.length === 0 ? (
                  <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                    <p className="text-gray-light text-lg">No songs yet. Click "Add Song" to start building your library! 🎸</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {masterSongs.map(song => (
                      <div 
                        key={song.id} 
                        className="bg-white/5 p-4 rounded-lg flex justify-between items-center hover:bg-white/10 transition border border-white/10"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-lg truncate">{song.title}</div>
                          <div className="text-electric text-sm">{song.artist}</div>
                        </div>
                        <button 
                          onClick={() => removeFromMaster(song.id)} 
                          className="text-red-400 hover:text-red-300 p-2 touch-target"
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
              <div className="gig-card">
                <h2 className="concert-heading text-3xl text-magenta mb-4">
                  🎸 GIG PLAYLISTS
                </h2>
                <button 
                  onClick={createGigPlaylist} 
                  className="btn btn-electric mb-4"
                >
                  <Plus size={20}/>
                  <span>Create Playlist</span>
                </button>
                
                {gigPlaylists.length === 0 ? (
                  <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                    <p className="text-gray-light text-lg">No playlists yet. Create custom setlists for different gigs! 🎵</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gigPlaylists.map(playlist => (
                      <div key={playlist.id} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-electric/50 transition">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                          <div className="flex-1">
                            <h3 className="concert-heading text-2xl text-white mb-2">{playlist.name}</h3>
                            {playlist.description && (
                              <p className="text-gray-light text-sm mb-2">{playlist.description}</p>
                            )}
                            <p className="text-electric font-bold">🎵 {playlist.songs.length} songs</p>
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
                          <div className="space-y-1 mt-4 pt-4 border-t border-white/10">
                            <p className="text-white font-semibold mb-2">Songs:</p>
                            {playlist.songs.slice(0, 5).map((songId, index) => {
                              const song = masterSongs.find(s => s.id === songId);
                              return song ? (
                                <div key={songId} className="text-gray-light text-sm flex items-center gap-2">
                                  <span className="text-electric font-bold">{index + 1}.</span>
                                  <span>{song.title}</span>
                                  <span className="text-gray">-</span>
                                  <span className="text-gray">{song.artist}</span>
                                </div>
                              ) : null;
                            })}
                            {playlist.songs.length > 5 && (
                              <div className="text-magenta text-sm font-semibold">
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
              <div className="gig-card">
                <h2 className="concert-heading text-3xl text-neon mb-4">
                  ⚡ MY GIGS
                </h2>
                <button 
                  onClick={createGig} 
                  className="btn btn-electric mb-4"
                >
                  <Plus size={20}/>
                  <span>Create Gig</span>
                </button>
          
                {gigs.length === 0 ? (
                  <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                    <p className="text-gray-light text-lg">No gigs yet. Click "Create Gig" to add one! ⚡</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gigs.map(gig => {
                      const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
                      const isEnded = gig.status === 'ended';
                      const statusColors = {
                        upcoming: 'bg-electric/20 border-electric text-electric',
                        live: 'bg-neon/20 border-neon text-neon',
                        ended: 'bg-gray-500/20 border-gray-400 text-gray-300'
                      };
                      const statusLabel = {
                        upcoming: '🔵 Upcoming',
                        live: '🟢 Live',
                        ended: '⚫ Ended'
                      };
                      
                      return (
                        <div key={gig.id} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-electric/50 transition">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <h3 className="concert-heading text-2xl text-white">{gig.venueName}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[gig.status || 'upcoming']}`}>
                                  {statusLabel[gig.status || 'upcoming']}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <p className="text-electric font-bold">📅 {gig.date} at {gig.time}</p>
                                {gig.address && (
                                  <p className="text-gray-light">📍 {gig.address}</p>
                                )}
                                {gig.location && (
                                  <p className="text-neon text-xs">
                                    ✅ Location: {gig.location.lat.toFixed(4)}°, {gig.location.lng.toFixed(4)}°
                                  </p>
                                )}
                                {playlist && (
                                  <p className="text-magenta font-semibold">
                                    🎵 Playlist: {playlist.name} ({playlist.songs.length} songs)
                                  </p>
                                )}
                                {gig.interestedCount > 0 && (
                                  <p className="text-magenta font-semibold">
                                    👥 {gig.interestedCount} {gig.interestedCount === 1 ? 'person' : 'people'} interested
                                  </p>
                                )}
                                {isEnded && (
                                  <p className="text-red-400 font-bold mt-2">⚠️ This gig has ended</p>
                                )}
                              </div>
                            </div>
                            
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
                                disabled={isEnded}
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
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
                </div>
              </div>
            );
          }

  // Live Mode & Audience Mode remain the same as before
  // (keeping existing code for these modes)

  // Live Mode
  if (mode === 'live' && liveGig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-4">
        <div className="max-w-6xl mx-auto pt-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white">🔴 LIVE: {liveGig.venueName}</h1>
              <p className="text-teal-200 text-lg">Artist: {liveGig.artistName}</p>
              {timeRemaining !== null && (
                <div className="mt-2">
                  <p className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-red-300 animate-pulse' : 'text-green-300'}`}>
                    ⏰ Time Remaining: {Math.floor(timeRemaining / 60)}h {timeRemaining % 60}m
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExtendTime}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold"
              >
                ⏱️ Add 1 Hour
              </button>
              <button
                onClick={handleEndGig}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
              >
                ⏹️ End Gig
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-500/20 border border-green-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {Object.values(liveGigData.votes).reduce((sum, count) => sum + count, 0)}
              </div>
              <div className="text-green-200 font-semibold">Total Votes</div>
            </div>
            <div className="bg-blue-500/20 border border-blue-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {liveGigData.comments.length}
              </div>
              <div className="text-blue-200 font-semibold">Comments</div>
            </div>
            <div className="bg-purple-500/20 border border-purple-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">
                ${liveGigData.donations.reduce((sum, d) => sum + d.amount, 0)}
              </div>
              <div className="text-purple-200 font-semibold">Donations</div>
            </div>
          </div>
          
         <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4">🎵 Song Queue with Votes</h3>
            
            {/* Unplayed Songs - Sorted by Votes */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-green-300 mb-3">▶️ Ready to Play ({liveGigData.queuedSongs.filter(s => !liveGigData.playedSongs?.includes(s.id)).length})</h4>
              
              {liveGigData.queuedSongs
                .filter(song => !liveGigData.playedSongs?.includes(song.id))
                .sort((a, b) => {
                  const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
                  const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
                  return votesB - votesA;
                })
                .map((song, index) => {
                  const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                  return (
                    <div key={song.id} className="bg-green-500/20 border border-green-400 p-4 rounded-lg mb-3 flex justify-between items-center">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-green-300 font-bold text-2xl min-w-[50px]">#{index + 1}</span>
                        <div>
                          <div className="text-white font-semibold text-lg">{song.title}</div>
                          <div className="text-green-200 text-sm">{song.artist}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-pink-300 font-bold text-2xl">⚡ {voteCount}</div>
                          <div className="text-pink-200 text-xs">votes</div>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Mark "${song.title}" as played?`)) {
                              try {
                                const gigRef = doc(db, 'liveGigs', liveGig.id);
                                await updateDoc(gigRef, {
                                  playedSongs: arrayUnion(song.id)
                                });
                                alert('✅ Song marked as played!');
                              } catch (error) {
                                alert('Error: ' + error.message);
                              }
                            }
                          }}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold whitespace-nowrap"
                        >
                          ✅ Mark Played
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Master Playlist Section - ADD SONGS ON THE FLY */}
          <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4">📚 Master Playlist - Add Songs</h3>
            <p className="text-purple-200 text-sm mb-4">Add songs from your master playlist to the queue during the performance</p>
            
            {liveGigData.masterPlaylist && liveGigData.masterPlaylist.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {liveGigData.masterPlaylist
                  .filter(song => !liveGigData.playedSongs?.includes(song.id))
                  .map(song => {
                    const isInQueue = liveGigData.queuedSongs.some(q => q.id === song.id);
                    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                    
                    return (
                      <div key={song.id} className={`p-4 rounded-lg flex justify-between items-center ${isInQueue ? 'bg-green-500/20 border border-green-400' : 'bg-white/5 border border-white/20'}`}>
                        <div className="flex-1">
                          <div className="text-white font-semibold text-lg">{song.title}</div>
                          <div className="text-purple-200 text-sm">{song.artist}</div>
                          {voteCount > 0 && (
                            <div className="text-pink-300 text-sm mt-1">⚡ {voteCount} votes</div>
                          )}
                        </div>
                        
                        {isInQueue ? (
                          <div className="px-6 py-3 bg-green-500/50 text-green-200 rounded-lg font-bold">
                            ✓ In Queue
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const gigRef = doc(db, 'liveGigs', liveGig.id);
                                const updatedQueue = [...liveGigData.queuedSongs, song].sort((a, b) => {
                                  const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
                                  const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
                                  return votesB - votesA;
                                });
                                
                                await updateDoc(gigRef, {
                                  queuedSongs: updatedQueue
                                });
                                
                                alert(`✅ "${song.title}" added to queue!`);
                              } catch (error) {
                                alert('Error adding song: ' + error.message);
                              }
                            }}
                            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold whitespace-nowrap"
                          >
                            ➕ Add to Queue
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center text-purple-300 py-8">
                No songs in master playlist
              </div>
            )}
          </div>
              
              {liveGigData.queuedSongs.filter(s => !liveGigData.playedSongs?.includes(s.id)).length === 0 && (
                <p className="text-gray-300 text-center py-4">All songs have been played!</p>
              )}
            </div>
            
            {/* Played Songs */}
            {liveGigData.playedSongs && liveGigData.playedSongs.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-400 mb-3">✅ Already Played ({liveGigData.playedSongs.length})</h4>
                {liveGigData.queuedSongs
                  .filter(song => liveGigData.playedSongs.includes(song.id))
                  .map((song) => {
                    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                    return (
                      <div key={song.id} className="bg-gray-500/20 border border-gray-600 p-4 rounded-lg mb-2 opacity-60">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400">✅</span>
                            <div>
                              <div className="text-gray-300 font-semibold line-through">{song.title}</div>
                              <div className="text-gray-400 text-sm">{song.artist}</div>
                            </div>
                          </div>
                          <div className="text-gray-400 text-sm">⚡ {voteCount} votes</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {liveGigData.comments.length > 0 && (
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">💬 Live Comments</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {liveGigData.comments.slice(-20).reverse().map(comment => (
                  <div key={comment.id} className="bg-white/5 p-3 rounded-lg">
                    <p className="text-white font-semibold text-sm">{comment.userName}</p>
                    <p className="text-gray-300">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Audience Mode - Live Concert Experience
  if (mode === 'audience' && liveGig) {
    return (
      <div className="rock-background min-h-screen p-4 pb-24 md:pb-4">
        <div className="max-w-4xl mx-auto pt-6">
          {/* Header */}
          <div className="gig-card gig-card-live mb-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1">
                {/* Live Indicator */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-4 h-4 bg-neon rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-neon rounded-full animate-ping"></div>
                  </div>
                  <span className="concert-heading text-neon text-xl tracking-wider">
                    🔴 LIVE NOW
                  </span>
                </div>
                
                <h1 className="concert-heading text-4xl md:text-5xl text-white mb-2">
                  {liveGig.artistName}
                </h1>
                <p className="text-electric font-bold text-lg">📍 {liveGig.venueName}</p>
                {liveGig.venueAddress && (
                  <p className="text-gray text-sm">📌 {liveGig.venueAddress}</p>
                )}
              </div>
              <button
                onClick={() => setMode('discover')}
                className="btn btn-ghost self-start md:self-center"
              >
                ← Back
              </button>
            </div>
          </div>
  
          {/* Now Playing Section */}
          {liveGigData.currentSong && (
            <div className="relative mb-6 overflow-hidden rounded-2xl">
              {/* Stage lighting effect background */}
              <div className="absolute inset-0 bg-gradient-to-r from-magenta/40 via-purple-500/40 to-electric/40 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
              
              <div className="relative gig-card border-2 border-magenta p-8 text-center">
                <p className="text-magenta font-bold text-sm uppercase tracking-widest mb-3 animate-pulse">
                  🎵 NOW PLAYING
                </p>
                <h2 className="concert-heading text-4xl md:text-5xl text-white mb-3 drop-shadow-lg">
                  {liveGigData.currentSong.title}
                </h2>
                <p className="text-2xl text-electric font-bold">
                  {liveGigData.currentSong.artist}
                </p>
              </div>
            </div>
          )}
  
          {/* Song Queue */}
          <div className="gig-card mb-6">
            <h3 className="concert-heading text-3xl text-electric mb-4">
              📋 UP NEXT
            </h3>
            
            {liveGigData.queuedSongs.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                <p className="text-gray-light text-lg">No songs in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Unplayed Songs - Sorted by Votes */}
                {liveGigData.queuedSongs
                  .filter(song => !liveGigData.playedSongs?.includes(song.id))
                  .sort((a, b) => {
                    const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
                    const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
                    return votesB - votesA;
                  })
                  .slice(0, 10)
                  .map((song, index) => {
                    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                    return (
                      <div 
                        key={song.id} 
                        className="bg-white/5 p-4 rounded-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3 border border-white/10 hover:border-electric/50 transition"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="concert-heading text-electric text-2xl min-w-[40px]">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-lg truncate">{song.title}</div>
                            <div className="text-gray-light text-sm truncate">{song.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 md:ml-auto">
                          {voteCount > 0 && (
                            <span className="text-magenta font-bold text-lg whitespace-nowrap">
                              ⚡ {voteCount}
                            </span>
                          )}
                          <button
                            onClick={() => handleVote(song.id)}
                            className="btn btn-fire text-sm"
                          >
                            <span>⚡</span>
                            <span>Vote</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                
                {/* Played Songs */}
                {liveGigData.playedSongs && liveGigData.playedSongs.length > 0 && (
                  <>
                    <div className="border-t border-white/20 my-4 pt-4">
                      <h4 className="concert-heading text-xl text-gray mb-3">
                        ✅ ALREADY PLAYED
                      </h4>
                    </div>
                    {liveGigData.queuedSongs
                      .filter(song => liveGigData.playedSongs.includes(song.id))
                      .map((song) => {
                        const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                        return (
                          <div 
                            key={song.id} 
                            className="bg-gray-500/10 border border-gray-600/50 p-4 rounded-lg opacity-60"
                          >
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                              <div className="flex items-center gap-4 flex-1">
                                <span className="text-neon text-2xl">✅</span>
                                <div>
                                  <div className="text-gray-300 font-semibold line-through">{song.title}</div>
                                  <div className="text-gray-400 text-sm">{song.artist}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {voteCount > 0 && (
                                  <span className="text-gray-400">⚡ {voteCount}</span>
                                )}
                                <span className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg font-bold text-sm cursor-not-allowed">
                                  ✅ Played
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            )}
          </div>
  
          {/* Master Playlist - All Available Songs */}
          <div className="gig-card border-2 border-electric/50 mb-6">
            <h3 className="concert-heading text-3xl text-electric mb-2">
              📚 ALL AVAILABLE SONGS
            </h3>
            <p className="text-gray-light text-sm mb-4">
              Vote for songs not in tonight's setlist! Highly voted songs may get added to the gig.
            </p>
            
            {!liveGig.masterPlaylist || liveGig.masterPlaylist.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center border border-electric/30">
                <p className="text-gray-light">No additional songs available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const gigSongIds = (liveGigData.queuedSongs || []).map(s => s.id);
                  const availableSongs = liveGig.masterPlaylist
                    .filter(song => !gigSongIds.includes(song.id))
                    .sort((a, b) => {
                      const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
                      const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
                      return votesB - votesA;
                    });
                  
                  if (availableSongs.length === 0) {
                    return (
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <p className="text-gray-light">All songs are in the gig playlist!</p>
                      </div>
                    );
                  }
                  
                  return availableSongs.map((song) => {
                    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                    const isPlayed = liveGigData.playedSongs?.includes(song.id);
                    
                    return (
                      <div 
                        key={song.id} 
                        className={`p-3 rounded-lg flex flex-col md:flex-row md:justify-between md:items-center gap-3 transition border ${
                          isPlayed 
                            ? 'bg-gray-500/10 opacity-50 border-gray-600/50' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold truncate ${isPlayed ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {song.title}
                          </div>
                          <div className={`text-sm truncate ${isPlayed ? 'text-gray-500' : 'text-electric'}`}>
                            {song.artist}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {voteCount > 0 && (
                            <span className={`font-bold whitespace-nowrap ${isPlayed ? 'text-gray-400' : 'text-magenta'}`}>
                              ⚡ {voteCount}
                            </span>
                          )}
                          {isPlayed ? (
                            <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded-lg text-sm cursor-not-allowed">
                              ✅ Played
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVote(song.id)}
                              className="btn btn-electric text-sm"
                            >
                              <span>⚡</span>
                              <span>Vote</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
  
          {/* Comments Section */}
          {liveGigData.comments.length > 0 && (
            <div className="gig-card">
              <h3 className="concert-heading text-2xl text-magenta mb-4">
                💬 LIVE CHAT
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {liveGigData.comments.slice(-10).reverse().map(comment => (
                  <div key={comment.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-electric font-bold text-sm">{comment.userName}</p>
                    <p className="text-gray-light">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <Music size={80} className="mx-auto mb-6" />
        <h1 className="text-6xl font-bold mb-4">Gigwave</h1>
        <p className="text-xl mb-8">Live Performance Platform</p>
        <button
          onClick={() => setMode('discover')}
          className="px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-2xl"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
