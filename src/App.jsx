import React, { useState, useEffect } from 'react';
import { Music, Plus, Trash2, Play, Users, Calendar, Heart, Star, Zap, X, Search, Upload, Settings, Edit2, Check, Mail, Lock, ArrowLeft, MapPin, Navigation } from 'lucide-react';

// Import Firebase utilities
import {
  auth,
  db,
  doc,
  updateDoc,
  arrayUnion,
  onAuthStateChanged,
  signInWithGoogle,
  signInWithFacebook,
  signOutUser,
  getUserLocation,
  calculateDistance,
  isWithinRange,
  searchNearbyGigs,
  createLiveGig,
  listenToLiveGig,
  voteForSong as firebaseVoteForSong,
  addComment as firebaseAddComment,
  processDonation as firebaseProcessDonation,
  endLiveGig as firebaseEndLiveGig,
  checkAndSwapSongs,
  serverTimestamp,
  GeoPoint
} from './firebase-utils';

const CFG = { app: 'Gigwave', fee: 0.15, jbFee: 5, tips: [5,10,20,50] };

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
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
        currentSong: gigData.currentSong || null,
        playedSongs: gigData.playedSongs || []
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
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if user already voted for this song in this gig
    const voteKey = `vote_${liveGig.id}_${songId}`;
    const hasVoted = localStorage.getItem(voteKey);
    
    if (hasVoted) {
      alert('⚠️ You already voted for this song in this gig!');
      return;
    }
    
    try {
      const location = await getUserLocation();
      const venueLocation = {
        lat: liveGig.location.latitude,
        lng: liveGig.location.longitude
      };
      
      await firebaseVoteForSong(liveGig.id, songId, currentUser.uid, location, venueLocation);
      
      // Mark as voted in localStorage
      localStorage.setItem(voteKey, 'true');
      
      alert('✅ Vote recorded!');
    } catch (error) {
      alert(error.message);
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

  const saveGig = () => {
    if (!editingGig.venueName || !editingGig.date || !editingGig.time) {
      alert('Please fill in venue name, date, and time!');
      return;
    }
    
    if (gigs.find(g => g.id === editingGig.id)) {
      setGigs(gigs.map(g => g.id === editingGig.id ? editingGig : g));
    } else {
      setGigs([...gigs, editingGig]);
    }
    
    setShowGigModal(false);
    setEditingGig(null);
  };

  const deleteGig = (id) => {
    if (window.confirm('Are you sure you want to delete this gig? This cannot be undone.')) {
      setGigs(gigs.filter(g => g.id !== id));
      alert('✅ Gig deleted successfully!');
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
      
      const gigId = await createLiveGig(gigData, currentUser.uid);
      setLiveGig({...gigData, id: gigId});
      setMode('live');
      
      alert(`✅ You're live at ${gig.venueName}!\n\nAudience can find you by searching nearby!`);
    } catch (error) {
      alert('Error: ' + error.message);
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

  // Auth Modal
  if (showAuthModal) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Sign In</h2>
            <button onClick={() => setShowAuthModal(false)} className="text-white">
              <X size={32} />
            </button>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => handleSignIn('google')}
              className="w-full px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold"
            >
              Continue with Google
            </button>
            <button
              onClick={() => handleSignIn('facebook')}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Continue with Facebook
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playlist Editor Modal
  if (showPlaylistModal && editingPlaylist) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Edit Playlist</h2>
            <button 
              onClick={() => {
                setShowPlaylistModal(false);
                setEditingPlaylist(null);
              }} 
              className="text-white hover:text-red-300"
            >
              <X size={32}/>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white font-semibold mb-2 block">Playlist Name *</label>
              <input
                type="text"
                value={editingPlaylist.name}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, name: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                placeholder="e.g., Friday Night Jazz"
              />
            </div>
            
            <div>
              <label className="text-white font-semibold mb-2 block">Description</label>
              <textarea
                value={editingPlaylist.description}
                onChange={(e) => setEditingPlaylist({...editingPlaylist, description: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                rows={2}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Songs in Playlist ({editingPlaylist.songs.length})
            </h3>
            {editingPlaylist.songs.length === 0 ? (
              <p className="text-purple-200">No songs yet. Add from master playlist below.</p>
            ) : (
              <div className="space-y-2">
                {editingPlaylist.songs.map((songId, index) => {
                  const song = masterSongs.find(s => s.id === songId);
                  return song ? (
                    <div key={songId} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold">{index + 1}. {song.title}</div>
                        <div className="text-purple-200 text-sm">{song.artist}</div>
                      </div>
                      <button
                        onClick={() => removeSongFromGigPlaylist(songId)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={20}/>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={saveGigPlaylist}
              className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
            >
              <Check className="inline mr-2" size={20}/>Save Playlist
            </button>
            <button
              onClick={() => {
                setShowPlaylistModal(false);
                setEditingPlaylist(null);
              }}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gig Modal with Venue Location
  if (showGigModal && editingGig) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">
              {gigs.find(g => g.id === editingGig.id) ? 'Edit Gig' : 'Create New Gig'}
            </h2>
            <button onClick={() => {setShowGigModal(false); setEditingGig(null);}} className="text-white">
              <X size={32} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white font-semibold mb-2 block">Venue Name *</label>
              <input
                type="text"
                value={editingGig.venueName}
                onChange={(e) => setEditingGig({...editingGig, venueName: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                placeholder="e.g. The Blue Note Jazz Club"
              />
            </div>

            {/* Venue Location Section */}
            <div className="bg-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <MapPin className="mr-2" size={24}/>Venue Location
              </h3>
              
              {/* GPS Capture Button */}
              <button
                onClick={captureGPSLocation}
                disabled={capturingGPS}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {capturingGPS ? '📍 Capturing...' : '📍 Use My Current Location'}
              </button>

              {/* Manual Address Entry */}
              <div>
                <label className="text-white font-semibold mb-2 block">Or Enter Address:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingGig.address || ''}
                    onChange={(e) => setEditingGig({...editingGig, address: e.target.value})}
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    placeholder="e.g. 131 W 3rd St, New York, NY"
                  />
                  <button
                    onClick={searchVenueAddress}
                    disabled={searchingAddress}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {searchingAddress ? '🔍' : '🔍 Search'}
                  </button>
                </div>
              </div>

              {/* Display Coordinates if captured */}
              {editingGig.location && (
                <div className="bg-green-500/20 border border-green-400 rounded-lg p-4">
                  <p className="text-green-200 font-semibold mb-2">✅ Location Captured:</p>
                  <p className="text-white text-sm">
                    📍 {editingGig.location.lat.toFixed(6)}°N, {editingGig.location.lng.toFixed(6)}°W
                  </p>
                  {editingGig.address && (
                    <p className="text-green-100 text-sm mt-1">📌 {editingGig.address}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Date *</label>
                <input
                  type="date"
                  value={editingGig.date}
                  onChange={(e) => setEditingGig({...editingGig, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Time *</label>
                <input
                  type="time"
                  value={editingGig.time}
                  onChange={(e) => setEditingGig({...editingGig, time: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Assign Playlist (Optional)</label>
              <select
                value={editingGig.playlistId || ''}
                onChange={(e) => setEditingGig({
                  ...editingGig,
                  playlistId: e.target.value ? parseInt(e.target.value) : null
                })}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-white/30"
              >
                <option value="" className="bg-white text-gray-900">No playlist (use master)</option>
                {gigPlaylists.map(p => (
                  <option key={p.id} value={p.id} className="bg-white text-gray-900">
                    {p.name} ({p.songs.length} songs)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveGig}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
              >
                <Check className="inline mr-2" size={20}/>Save Gig
              </button>
              <button
                onClick={() => {setShowGigModal(false); setEditingGig(null);}}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Discovery Page
  if (mode === 'discover') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-12">
            <Music size={100} className="text-purple-300 mx-auto mb-6" />
            <h1 className="text-7xl font-bold text-white mb-4">Gigwave</h1>
            <p className="text-2xl text-purple-200 mb-12">Discover Live Music Near You</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8">
            <button
              onClick={handleSearchGigs}
              disabled={loadingGigs}
              className="w-full px-8 py-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-2xl shadow-2xl disabled:opacity-50"
            >
              {loadingGigs ? '🔍 Searching...' : '📍 Find Live Gigs Near Me'}
            </button>
          </div>

          {nearbyGigs.length > 0 && (
            <div className="space-y-6">
              {/* Date Filter */}
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">📅 Filter by Date</h3>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => filterGigsByDate('all')}
                    className={`px-6 py-3 rounded-lg font-bold ${dateFilter === 'all' ? 'bg-purple-500' : 'bg-white/20 hover:bg-white/30'} text-white`}
                  >
                    All Dates
                  </button>
                  <button
                    onClick={() => filterGigsByDate('today')}
                    className={`px-6 py-3 rounded-lg font-bold ${dateFilter === 'today' ? 'bg-purple-500' : 'bg-white/20 hover:bg-white/30'} text-white`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => filterGigsByDate('tomorrow')}
                    className={`px-6 py-3 rounded-lg font-bold ${dateFilter === 'tomorrow' ? 'bg-purple-500' : 'bg-white/20 hover:bg-white/30'} text-white`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => filterGigsByDate('week')}
                    className={`px-6 py-3 rounded-lg font-bold ${dateFilter === 'week' ? 'bg-purple-500' : 'bg-white/20 hover:bg-white/30'} text-white`}
                  >
                    This Week
                  </button>
                </div>
                <p className="text-purple-200 text-sm mt-3">
                  Showing {filteredGigs.length} of {nearbyGigs.length} gigs
                </p>
              </div>

              {/* Gig Results */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white">
                  {filteredGigs.filter(g => g.status === 'live').length > 0 ? '🔴 Live Now' : '🎸 Nearby Gigs'}
                </h2>
                
                {filteredGigs.length === 0 ? (
                  <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-6 text-center">
                    <p className="text-yellow-200 text-lg">No gigs found for selected date filter.</p>
                  </div>
                ) : (
                  filteredGigs.map(gig => {
                    const isLive = gig.status === 'live';
                    const isEnded = gig.status === 'ended';
                    const isUpcoming = !isLive && !isEnded;
                    
                    const gigDateTime = gig.gigDate && gig.gigTime 
                      ? `${new Date(gig.gigDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at ${gig.gigTime}`
                      : 'Time TBD';
                    
                    // Status colors
                    let statusColor = 'from-blue-500/20 to-cyan-500/20 border-blue-400';
                    let statusBadge = '🔵';
                    let statusText = `Upcoming - ${gigDateTime}`;
                    let buttonColor = 'bg-blue-500 hover:bg-blue-600';
                    let buttonText = 'ℹ️ View Details';
                    let canJoin = false;
                    
                    if (isLive) {
                      statusColor = 'from-green-500/20 to-emerald-500/20 border-2 border-green-400';
                      statusBadge = '🟢';
                      statusText = 'LIVE NOW';
                      buttonColor = 'bg-green-500 hover:bg-green-600';
                      buttonText = '🎵 Join Live →';
                      canJoin = true;
                    } else if (isEnded) {
                      statusColor = 'from-red-500/20 to-pink-500/20 border-red-400';
                      statusBadge = '🔴';
                      statusText = 'Ended';
                      buttonColor = 'bg-gray-500 cursor-not-allowed';
                      buttonText = '⚫ Ended';
                      canJoin = false;
                    }
                    
                    return (
                      <div
                        key={gig.id}
                        className={`rounded-xl p-6 transition ${statusColor} ${canJoin ? 'cursor-pointer hover:from-green-500/30 hover:to-emerald-500/30' : ''}`}
                        onClick={() => {
                          if (canJoin) {
                            setLiveGig(gig);
                            setMode('audience');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-3xl ${isLive ? 'animate-pulse' : ''}`}>{statusBadge}</span>
                              <div>
                                <h3 className="text-2xl font-bold text-white">{gig.artistName}</h3>
                                <p className={`text-sm font-semibold ${isLive ? 'text-green-300' : isEnded ? 'text-red-300' : 'text-blue-300'}`}>
                                  {statusText}
                                </p>
                              </div>
                            </div>
                            <p className="text-purple-200 text-lg mb-1">📍 {gig.venueName}</p>
                            {gig.venueAddress && (
                              <p className="text-purple-300 text-sm mb-2">📌 {gig.venueAddress}</p>
                            )}
                            <p className="text-green-300 font-semibold">
                              📏 {gig.distance < 1000 
                                ? `${gig.distance}m away` 
                                : `${(gig.distance/1000).toFixed(1)}km away`}
                            </p>
                          </div>
                          <button 
                            disabled={!canJoin && isEnded}
                            className={`px-6 py-3 ${buttonColor} text-white rounded-lg font-bold text-lg`}
                          >
                            {buttonText}
                          </button>
                        </div>
                      </div>
                    );
                  })
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto pt-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white">🎤 Artist Dashboard</h1>
              <p className="text-purple-200 text-lg mt-2">Welcome, {currentUser?.displayName || currentUser?.email}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('discover')}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold"
              >
                ← Back
              </button>
              <button
                onClick={async () => {
                  await signOutUser();
                  setMode('discover');
                }}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setTab('master')} className={`px-6 py-3 rounded-lg font-semibold text-white transition ${tab === 'master' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'}`}>
              <Music className="inline mr-2" size={20}/>Master Playlist
            </button>
            <button onClick={() => setTab('playlists')} className={`px-6 py-3 rounded-lg font-semibold text-white transition ${tab === 'playlists' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'}`}>
              <Music className="inline mr-2" size={20}/>Gig Playlists
            </button>
            <button onClick={() => setTab('gigs')} className={`px-6 py-3 rounded-lg font-semibold text-white transition ${tab === 'gigs' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'}`}>
              <Calendar className="inline mr-2" size={20}/>My Gigs
            </button>
          </div>

          {tab === 'master' && (
            <div className="space-y-6">
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">🎵 Search iTunes Music</h3>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={itunesSearch} 
                    onChange={e => setItunesSearch(e.target.value)} 
                    onKeyPress={e => e.key === 'Enter' && searchItunesAPI()}
                    placeholder="Search for songs, artists, albums..."
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    disabled={searchingItunes}
                  />
                  <button 
                    onClick={searchItunesAPI} 
                    disabled={searchingItunes}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg font-bold"
                  >
                    {searchingItunes ? '⏳' : '🔍'} Search
                  </button>
                </div>
                
                {itunesResults.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <p className="text-purple-200 font-semibold mb-3">
                      Found {itunesResults.length} songs:
                    </p>
                    {itunesResults.map(song => (
                      <div 
                        key={song.id} 
                        className="bg-white/5 p-3 rounded-lg flex items-center gap-4 hover:bg-white/10 transition"
                      >
                        {song.artwork && (
                          <img 
                            src={song.artwork} 
                            alt={song.title}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-white font-semibold text-lg">{song.title}</div>
                          <div className="text-purple-200 text-sm">{song.artist}</div>
                          {song.album && (
                            <div className="text-purple-300 text-xs">{song.album}</div>
                          )}
                          {song.duration && (
                            <div className="text-green-300 text-xs">⏱️ {song.duration}</div>
                          )}
                        </div>
                        <button 
                          onClick={() => addItunesSongToMaster(song)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold whitespace-nowrap"
                        >
                          <Plus size={18} className="inline mr-1"/>Add to Master
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchingItunes && (
                  <div className="text-center py-8">
                    <div className="text-purple-200 text-lg">🔍 Searching iTunes...</div>
                  </div>
                )}
              </div>
              <div className="bg-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">🎵 Master Playlist</h2>
                <button onClick={addToMaster} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold mb-4">
                  <Plus className="inline mr-2" size={20}/>Add Song
                </button>
                
                {masterSongs.length === 0 ? (
                  <p className="text-purple-200">No songs yet. Click "Add Song" to start!</p>
                ) : (
                  <div className="space-y-2">
                    {masterSongs.map(song => (
                      <div key={song.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold text-lg">{song.title}</div>
                          <div className="text-purple-200 text-sm">{song.artist}</div>
                        </div>
                        <button onClick={() => removeFromMaster(song.id)} className="text-red-400 hover:text-red-300">
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
              <div className="bg-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">🎸 Gig Playlists</h2>
                <button onClick={createGigPlaylist} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold mb-4">
                  <Plus className="inline mr-2" size={20}/>Create Playlist
                </button>
                
                {gigPlaylists.length === 0 ? (
                  <p className="text-purple-200">No playlists yet. Create custom setlists for different gigs!</p>
                ) : (
                  <div className="space-y-4">
                    {gigPlaylists.map(playlist => (
                      <div key={playlist.id} className="bg-white/5 p-6 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-2">{playlist.name}</h3>
                            {playlist.description && (
                              <p className="text-purple-200 text-sm mb-2">{playlist.description}</p>
                            )}
                            <p className="text-purple-300 font-semibold">🎵 {playlist.songs.length} songs</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPlaylist(playlist);
                                setShowPlaylistModal(true);
                              }}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
                            >
                              <Edit2 className="inline mr-1" size={16}/>Edit
                            </button>
                            <button
                              onClick={() => deleteGigPlaylist(playlist.id)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                            >
                              <Trash2 className="inline" size={16}/>
                            </button>
                          </div>
                        </div>
                        
                        {playlist.songs.length > 0 && (
                          <div className="space-y-1 mt-4">
                            <p className="text-white font-semibold mb-2">Songs:</p>
                            {playlist.songs.slice(0, 5).map((songId, index) => {
                              const song = masterSongs.find(s => s.id === songId);
                              return song ? (
                                <div key={songId} className="text-purple-200 text-sm">
                                  {index + 1}. {song.title} - {song.artist}
                                </div>
                              ) : null;
                            })}
                            {playlist.songs.length > 5 && (
                              <div className="text-purple-300 text-sm font-semibold">
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
              <div className="bg-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">🎸 My Gigs</h2>
                <button onClick={createGig} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold mb-4">
                  <Plus className="inline mr-2" size={20}/>Create Gig
                </button>

                {gigs.length === 0 ? (
                  <p className="text-purple-200">No gigs yet. Click "Create Gig" to add one!</p>
                ) : (
                  <div className="space-y-4">
                    {gigs.map(gig => {
                      const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
                      const isEnded = gig.status === 'ended';
                      const statusColors = {
                        upcoming: 'bg-blue-500/20 border-blue-400 text-blue-200',
                        live: 'bg-green-500/20 border-green-400 text-green-200',
                        ended: 'bg-gray-500/20 border-gray-400 text-gray-300'
                      };
                      const statusLabel = {
                        upcoming: '🔵 Upcoming',
                        live: '🟢 Live',
                        ended: '⚫ Ended'
                      };
                      
                      return (
                        <div key={gig.id} className="bg-white/5 p-6 rounded-xl">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold text-white">{gig.venueName}</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[gig.status || 'upcoming']}`}>
                                  {statusLabel[gig.status || 'upcoming']}
                                </span>
                              </div>
                              <p className="text-purple-200">📅 {gig.date} at {gig.time}</p>
                              {gig.address && (
                                <p className="text-purple-300 text-sm mt-1">📍 {gig.address}</p>
                              )}
                              {gig.location && (
                                <p className="text-green-300 text-sm mt-1">
                                  ✅ Location: {gig.location.lat.toFixed(4)}°, {gig.location.lng.toFixed(4)}°
                                </p>
                              )}
                              {playlist && <p className="text-blue-300 text-sm mt-1">🎵 Playlist: {playlist.name} ({playlist.songs.length} songs)</p>}
                              {isEnded && (
                                <p className="text-red-300 text-sm mt-2 font-semibold">⚠️ This gig has ended</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!isEnded && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingGig(gig);
                                      setShowGigModal(true);
                                    }}
                                    className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
                                    title="Edit gig details"
                                  >
                                    <Edit2 className="inline mr-2" size={20}/>Edit
                                  </button>
                                  <button
                                    onClick={() => deleteGig(gig.id)}
                                    className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                                    title="Delete this gig"
                                  >
                                    <Trash2 className="inline mr-2" size={20}/>Delete
                                  </button>
                                </>
                              )}
                              {isEnded && (
                                <button
                                  onClick={() => deleteGig(gig.id)}
                                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                                  title="Delete this gig"
                                >
                                  <Trash2 className="inline mr-2" size={20}/>Delete
                                </button>
                              )}
                              <button
                                onClick={() => handleGoLive(gig)}
                                disabled={isEnded}
                                className={`px-6 py-3 ${isEnded ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg font-bold`}
                                title={isEnded ? 'Cannot go live - gig has ended' : 'Go live with this gig'}
                              >
                                <Play className="inline mr-2" size={20}/>{isEnded ? 'Ended' : 'Go Live'}
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
            </div>
            <button
              onClick={handleEndGig}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
            >
              ⏹️ End Gig
            </button>
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
                          <div className="text-pink-300 font-bold text-2xl">❤️ {voteCount}</div>
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
                          <div className="text-gray-400 text-sm">❤️ {voteCount} votes</div>
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

  // Audience Mode
  if (mode === 'audience' && liveGig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-4xl mx-auto pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white">{liveGig.artistName}</h1>
              <p className="text-purple-200">📍 {liveGig.venueName}</p>
              {liveGig.venueAddress && (
                <p className="text-purple-300 text-sm">📌 {liveGig.venueAddress}</p>
              )}
            </div>
            <button
              onClick={() => setMode('discover')}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold"
            >
              ← Back
            </button>
          </div>

          {liveGigData.currentSong && (
            <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400 rounded-xl p-8 mb-6">
              <p className="text-purple-200 text-sm mb-2">🎵 NOW PLAYING</p>
              <h2 className="text-3xl font-bold text-white mb-2">{liveGigData.currentSong.title}</h2>
              <p className="text-xl text-purple-200">{liveGigData.currentSong.artist}</p>
            </div>
          )}

          <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4">📋 Song Queue</h3>
            
            {liveGigData.queuedSongs.length === 0 ? (
              <p className="text-purple-200">No songs in queue</p>
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
                      <div key={song.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-purple-300 font-bold text-xl min-w-[40px]">{index + 1}</span>
                          <div>
                            <div className="text-white font-semibold">{song.title}</div>
                            <div className="text-purple-200 text-sm">{song.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {voteCount > 0 && (
                            <span className="text-pink-300 font-bold">❤️ {voteCount}</span>
                          )}
                          <button
                            onClick={() => handleVote(song.id)}
                            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold"
                          >
                            ❤️ Vote
                          </button>
                        </div>
                      </div>
                    );
                  })}
                
                {/* Played Songs */}
                {liveGigData.playedSongs && liveGigData.playedSongs.length > 0 && (
                  <>
                    <div className="border-t border-white/20 my-4 pt-4">
                      <h4 className="text-lg font-semibold text-gray-400 mb-3">✅ Already Played</h4>
                    </div>
                    {liveGigData.queuedSongs
                      .filter(song => liveGigData.playedSongs.includes(song.id))
                      .map((song) => {
                        const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                        return (
                          <div key={song.id} className="bg-gray-500/20 border border-gray-600 p-4 rounded-lg opacity-60">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <span className="text-green-400 text-2xl">✅</span>
                                <div>
                                  <div className="text-gray-300 font-semibold line-through">{song.title}</div>
                                  <div className="text-gray-400 text-sm">{song.artist}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {voteCount > 0 && (
                                  <span className="text-gray-400">❤️ {voteCount}</span>
                                )}
                                <span className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg font-bold cursor-not-allowed">
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

          {/* MASTER PLAYLIST - All Available Songs */}
          <div className="bg-gradient-to-r from-blue-500/20 to-teal-500/20 border-2 border-blue-400 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4">📚 All Available Songs</h3>
            <p className="text-blue-200 text-sm mb-4">
              Vote for songs not in tonight's setlist! Highly voted songs may get added to the gig.
            </p>
            
            {!liveGig.masterPlaylist || liveGig.masterPlaylist.length === 0 ? (
              <p className="text-blue-200">No additional songs available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  // Get IDs of songs already in gig queue
                  const gigSongIds = (liveGigData.queuedSongs || []).map(s => s.id);
                  
                  // Filter master playlist to exclude gig songs
                  const availableSongs = liveGig.masterPlaylist
                    .filter(song => !gigSongIds.includes(song.id))
                    .sort((a, b) => {
                      // Sort by votes (highest first)
                      const votesA = liveGigData.votes[Math.floor(a.id)] || 0;
                      const votesB = liveGigData.votes[Math.floor(b.id)] || 0;
                      return votesB - votesA;
                    });
                  
                  if (availableSongs.length === 0) {
                    return <p className="text-blue-200">All songs are in the gig playlist!</p>;
                  }
                  
                  return availableSongs.map((song) => {
                    const voteCount = liveGigData.votes[Math.floor(song.id)] || 0;
                    const isPlayed = liveGigData.playedSongs?.includes(song.id);
                    
                    return (
                      <div 
                        key={song.id} 
                        className={`p-3 rounded-lg flex justify-between items-center transition ${
                          isPlayed 
                            ? 'bg-gray-500/20 opacity-50' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className={`font-semibold ${isPlayed ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {song.title}
                          </div>
                          <div className={`text-sm ${isPlayed ? 'text-gray-500' : 'text-blue-200'}`}>
                            {song.artist}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {voteCount > 0 && (
                            <span className={isPlayed ? 'text-gray-400' : 'text-pink-300 font-bold'}>
                              ❤️ {voteCount}
                            </span>
                          )}
                          {isPlayed ? (
                            <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded-lg text-sm cursor-not-allowed">
                              ✅ Played
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVote(song.id)}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm"
                            >
                              ❤️ Vote
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

          {liveGigData.comments.length > 0 && (
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">💬 Comments</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {liveGigData.comments.slice(-10).reverse().map(comment => (
                  <div key={comment.id} className="bg-white/5 p-3 rounded-lg">
                    <p className="text-white font-semibold text-sm">{comment.userName}</p>
                    <p className="text-purple-200">{comment.text}</p>
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
