import React, { useState, useEffect } from 'react';
import { Music, Plus, Trash2, Play, Users, Calendar, Heart, Star, Zap, X, Search, Upload, Settings, Edit2, Check, Mail, Lock, ArrowLeft } from 'lucide-react';

const CFG = { app: 'Gigwave', fee: 0.15, jbFee: 5, tips: [5,10,20,50] };

// LocalStorage keys
const STORAGE_KEYS = {
  AUTH: 'gigwave_auth',
  MASTER_SONGS: 'gigwave_master_songs',
  GIG_PLAYLISTS: 'gigwave_gig_playlists',
  GIGS: 'gigwave_gigs',
  USER_PROFILE: 'gigwave_user_profile',
  LIVE_GIG: 'gigwave_live_gig',
  LIVE_GIG_DATA: 'gigwave_live_gig_data',
  LIVE_GIG_SETTINGS: 'gigwave_live_gig_settings',
  AUDIENCE_VOTES: 'gigwave_audience_votes',
  AUDIENCE_RATINGS: 'gigwave_audience_ratings'
};

// Storage utility functions
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : null;
      console.log(`ðŸ“– [localStorage] GET ${key}:`, parsed ? `Found (${item.length} bytes)` : 'Not found');
      return parsed;
    } catch (error) {
      console.error(`âŒ [localStorage] Error reading ${key}:`, error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      const stringified = JSON.stringify(value);
      localStorage.setItem(key, stringified);
      console.log(`ðŸ’¾ [localStorage] SAVE ${key}:`, `${stringified.length} bytes`);
    } catch (error) {
      console.error(`âŒ [localStorage] Error writing ${key}:`, error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      console.log(`ðŸ—‘ï¸ [localStorage] DELETE ${key}`);
    } catch (error) {
      console.error(`âŒ [localStorage] Error removing ${key}:`, error);
    }
  },
  
  clear: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      console.log('ðŸ—‘ï¸ [localStorage] Cleared all Gigwave data');
    } catch (error) {
      console.error('âŒ [localStorage] Error clearing:', error);
    }
  }
};

export default function App() {
  // Lazy initialization - only runs once on mount
  const [auth, setAuth] = useState(() => storage.get(STORAGE_KEYS.AUTH));
  const [authMode, setAuthMode] = useState('');
  const [authType, setAuthType] = useState('');
  const [mode, setMode] = useState(() => storage.get(STORAGE_KEYS.AUTH) ? 'art' : 'sel');
  const [tab, setTab] = useState('master');
  const [masterSongs, setMasterSongs] = useState(() => storage.get(STORAGE_KEYS.MASTER_SONGS) || []);
  const [gigPlaylists, setGigPlaylists] = useState(() => storage.get(STORAGE_KEYS.GIG_PLAYLISTS) || []);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [gigs, setGigs] = useState(() => storage.get(STORAGE_KEYS.GIGS) || []);
  const [editingGig, setEditingGig] = useState(null);
  const [showGigModal, setShowGigModal] = useState(false);
  const [liveGig, setLiveGig] = useState(() => storage.get(STORAGE_KEYS.LIVE_GIG));
  const [liveGigSettings, setLiveGigSettings] = useState(() => storage.get(STORAGE_KEYS.LIVE_GIG_SETTINGS) || {
    minDonation: 5,
    donationIncrement: 5,
    currency: 'USD',
    jukeboxEnabled: false,
    jukeboxPrice: 10,
    biddingEnabled: false,
    minBidAmount: 15,
    bidIncrement: 5,
    songLimit: 20,
    acceptingVotes: true
  });
  const [liveGigData, setLiveGigData] = useState(() => storage.get(STORAGE_KEYS.LIVE_GIG_DATA) || {
    donations: [],
    songRequests: [],
    votes: {},
    ratings: [],
    comments: [],
    currentSong: null,
    playedSongs: [],
    queuedSongs: [],
    photos: [],
    videos: [],
    totalEarnings: 0,
    donationEarnings: 0,
    requestEarnings: 0
  });
  const [audienceVotes, setAudienceVotes] = useState(() => storage.get(STORAGE_KEYS.AUDIENCE_VOTES) || {});
  const [audienceRatings, setAudienceRatings] = useState(() => storage.get(STORAGE_KEYS.AUDIENCE_RATINGS) || {song: 0, artist: 0, gig: 0});
  const [showDonation, setShowDonation] = useState(false);
  const [showJukebox, setShowJukebox] = useState(false);
  const [donationAmount, setDonationAmount] = useState(5);
  const [customDonation, setCustomDonation] = useState('');
  const [donationMessage, setDonationMessage] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [requestAmount, setRequestAmount] = useState(10);
  const [requestMessage, setRequestMessage] = useState('');
  const [commentText, setCommentText] = useState('');
  const [viewTab, setViewTab] = useState('queue');
  const [userProfile, setUserProfile] = useState(() => storage.get(STORAGE_KEYS.USER_PROFILE) || {
    name: '',
    bio: '',
    profilePicture: '',
    genre: '',
    location: '',
    website: '',
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: '',
      spotify: '',
      youtube: ''
    },
    stats: {
      totalGigs: 0,
      totalSongs: 0,
      followers: 0
    }
  });

  const quickLogin = (type) => {
    const userName = type === 'artist' ? 'Demo Artist' : 'Demo User';
    setAuth({name: userName, type});
    setUserProfile({
      ...userProfile,
      name: userName,
      bio: type === 'artist' ? 'Professional musician and performer' : 'Music enthusiast',
      genre: type === 'artist' ? 'Rock, Pop' : '',
      location: 'New York, NY'
    });
    setAuthMode('');
    if(type === 'artist') setMode('art');
    else setMode('aud');
  };

  const addToMaster = (song) => {
    if(!masterSongs.find(s => s.id === song.id)){
      setMasterSongs([...masterSongs, song]);
    }
  };

  const removeFromMaster = (id) => {
    if(window.confirm('Remove from master playlist?')){
      setMasterSongs(masterSongs.filter(s => s.id !== id));
      // Remove song from all gig playlists that contain it
      setGigPlaylists(gigPlaylists.map(p => ({
        ...p,
        songs: p.songs.filter(songId => songId !== id)
      })));
    }
  };

  const createGigPlaylist = () => {
    const newPlaylist = {
      id: Date.now(),
      name: 'New Playlist',
      description: '',
      songs: [],
      editing: true
    };
    setGigPlaylists([...gigPlaylists, newPlaylist]);
    setEditingPlaylist(newPlaylist);
  };

  const saveGigPlaylist = (playlist) => {
    setGigPlaylists(gigPlaylists.map(p => p.id === playlist.id ? {...playlist, editing: false} : p));
    setEditingPlaylist(null);
  };

  const deleteGigPlaylist = (id) => {
    if(window.confirm('Delete this playlist?')){
      setGigPlaylists(gigPlaylists.filter(p => p.id !== id));
      if(editingPlaylist && editingPlaylist.id === id) {
        setEditingPlaylist(null);
      }
    }
  };

  const addSongToGigPlaylist = (playlistId, songId) => {
    setGigPlaylists(gigPlaylists.map(p => {
      if(p.id === playlistId && !p.songs.includes(songId)){
        return {...p, songs: [...p.songs, songId]};
      }
      return p;
    }));
  };

  const removeSongFromGigPlaylist = (playlistId, songId) => {
    setGigPlaylists(gigPlaylists.map(p => {
      if(p.id === playlistId){
        return {...p, songs: p.songs.filter(id => id !== songId)};
      }
      return p;
    }));
  };

  const importFromPlatform = (platform) => {
    const samples = [
      {id: Date.now()+1, title: `${platform} Song 1`, artist: 'Artist A', duration: '3:30', key: 'C'},
      {id: Date.now()+2, title: `${platform} Song 2`, artist: 'Artist B', duration: '4:15', key: 'G'},
      {id: Date.now()+3, title: `${platform} Song 3`, artist: 'Artist C', duration: '3:45', key: 'Am'}
    ];
    samples.forEach(s => addToMaster(s));
    setShowImport(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const imported = [];
      lines.forEach((line, idx) => {
        if(idx === 0 || !line.trim()) return;
        const parts = line.split(',');
        if(parts.length >= 2){
          imported.push({
            id: Date.now() + idx,
            title: parts[0]?.trim() || 'Unknown',
            artist: parts[1]?.trim() || 'Unknown',
            duration: parts[2]?.trim() || '',
            key: parts[3]?.trim() || ''
          });
        }
      });
      imported.forEach(s => addToMaster(s));
      setShowImport(false);
    };
    reader.readAsText(file);
  };

  const searchOnline = () => {
    if(!searchQuery.trim()) return;
    const results = [
      {id: `s${Date.now()}1`, title: searchQuery, artist: 'Artist A', duration: '3:45', key: 'Am'},
      {id: `s${Date.now()}2`, title: `${searchQuery} (Remix)`, artist: 'Artist B', duration: '4:20', key: 'G'},
      {id: `s${Date.now()}3`, title: `${searchQuery} Live`, artist: 'Artist C', duration: '5:00', key: 'C'}
    ];
    setSearchResults(results);
  };

  const createGig = () => {
    const newGig = {
      id: Date.now(),
      venueName: '',
      location: '',
      googleLocation: '',
      date: '',
      time: '',
      playlist: null,
      notes: '',
      status: 'upcoming'
    };
    setEditingGig(newGig);
    setShowGigModal(true);
  };

  const saveGig = (gig) => {
    if(gig.id && gigs.find(g => g.id === gig.id)){
      setGigs(gigs.map(g => g.id === gig.id ? gig : g));
    } else {
      setGigs([...gigs, {...gig, id: gig.id || Date.now()}]);
    }
    setShowGigModal(false);
    setEditingGig(null);
  };

  const editGig = (gig) => {
    setEditingGig({...gig});
    setShowGigModal(true);
  };

  const deleteGig = (id) => {
    if(window.confirm('Delete this gig?')){
      setGigs(gigs.filter(g => g.id !== id));
      if(editingGig && editingGig.id === id){
        setEditingGig(null);
        setShowGigModal(false);
      }
    }
  };

  const getLocationFromGoogle = () => {
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setEditingGig({...editingGig, googleLocation: location});
          window.alert('Location captured: ' + location);
        },
        (error) => {
          window.alert('Unable to get location: ' + error.message);
        }
      );
    } else {
      window.alert('Geolocation is not supported by your browser');
    }
  };

  const startLiveGig = (gig) => {
    const playlist = gigPlaylists.find(p => p.id === gig.playlist);
    const gigSongs = playlist ? playlist.songs.map(id => masterSongs.find(s => s.id === id)).filter(Boolean) : [];
    
    setLiveGig(gig);
    setLiveGigData({
      donations: [],
      songRequests: [],
      votes: {},
      ratings: [],
      comments: [],
      currentSong: null,
      playedSongs: [],
      queuedSongs: gigSongs.slice(0, liveGigSettings.songLimit),
      photos: [],
      videos: [],
      totalEarnings: 0,
      donationEarnings: 0,
      requestEarnings: 0
    });
    setMode('live');
  };

  const endLiveGig = () => {
    if(window.confirm('End this live gig? This will finalize all earnings and ratings.')){
      setMode('art');
      setLiveGig(null);
    }
  };

  const pauseLiveGig = () => {
    window.alert('Gig paused. You can resume anytime.');
  };

  const processDonation = (amount, message = '') => {
    const donation = {id: Date.now(), amount, message, timestamp: new Date(), donor: auth?.name || 'Anonymous'};
    setLiveGigData(prev => ({
      ...prev,
      donations: [...prev.donations, donation],
      totalEarnings: prev.totalEarnings + amount,
      donationEarnings: prev.donationEarnings + amount
    }));
  };

  const processSongRequest = (song, amount, message = '', isBid = false) => {
    const request = {
      id: Date.now(), 
      song, 
      amount, 
      message, 
      requester: auth?.name || 'Anonymous', 
      timestamp: new Date(),
      type: isBid ? 'bid' : 'request',
      status: 'pending'
    };
    
    setLiveGigData(prev => {
      const newRequests = [...prev.songRequests, request];
      const sortedRequests = newRequests.sort((a, b) => b.amount - a.amount);
      
      return {
        ...prev,
        songRequests: sortedRequests,
        totalEarnings: prev.totalEarnings + amount,
        requestEarnings: prev.requestEarnings + amount
      };
    });
    
    updateGigQueue();
  };

  const voteForSong = (songId) => {
    const currentVote = audienceVotes[songId];
    const newVotes = {...audienceVotes};
    
    if(currentVote){
      delete newVotes[songId];
      setLiveGigData(prev => {
        const updatedGigVotes = {...prev.votes};
        updatedGigVotes[songId] = (updatedGigVotes[songId] || 1) - 1;
        return {...prev, votes: updatedGigVotes};
      });
    } else {
      newVotes[songId] = true;
      setLiveGigData(prev => {
        const updatedGigVotes = {...prev.votes};
        updatedGigVotes[songId] = (updatedGigVotes[songId] || 0) + 1;
        return {...prev, votes: updatedGigVotes};
      });
    }
    
    setAudienceVotes(newVotes);
    updateGigQueue();
  };

  const updateGigQueue = () => {
    if(!liveGig) return;
    
    const paidRequests = liveGigData.songRequests
      .filter(r => r.status === 'pending')
      .map(r => r.song);
    
    const votedSongs = Object.entries(liveGigData.votes)
      .filter(([id, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => masterSongs.find(s => s.id === parseInt(id)))
      .filter(Boolean);
    
    const playlistSongs = gigPlaylists.find(p => p.id === liveGig?.playlist)?.songs
      .map(id => masterSongs.find(s => s.id === id))
      .filter(Boolean) || [];
    
    const allSongs = [...paidRequests, ...votedSongs, ...playlistSongs];
    const uniqueSongs = allSongs.filter((song, index, self) => 
      song && !liveGigData.playedSongs.includes(song.id) && 
      index === self.findIndex(s => s.id === song.id)
    );
    
    const limitedQueue = uniqueSongs.slice(0, liveGigSettings.songLimit);
    
    setLiveGigData(prev => ({...prev, queuedSongs: limitedQueue}));
  };

  const playSong = (song) => {
    setLiveGigData(prev => ({
      ...prev,
      currentSong: song,
      playedSongs: [...prev.playedSongs, song.id],
      queuedSongs: prev.queuedSongs.filter(s => s.id !== song.id)
    }));
  };

  const skipSong = (songId) => {
    setLiveGigData(prev => ({
      ...prev,
      queuedSongs: prev.queuedSongs.filter(s => s.id !== songId)
    }));
  };

  const addComment = (text, type = 'general') => {
    const comment = {
      id: Date.now(),
      text,
      type,
      author: auth?.name || 'Anonymous',
      timestamp: new Date()
    };
    setLiveGigData(prev => ({
      ...prev,
      comments: [...prev.comments, comment]
    }));
  };

  const submitRating = (type, rating) => {
    setAudienceRatings({...audienceRatings, [type]: rating});
    const ratingEntry = {
      id: Date.now(),
      type,
      rating,
      user: auth?.name || 'Anonymous',
      timestamp: new Date()
    };
    setLiveGigData(prev => ({
      ...prev,
      ratings: [...prev.ratings, ratingEntry]
    }));
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {USD: '$', EUR: 'â‚¬', GBP: 'Â£', INR: 'â‚¹', JPY: 'Â¥'};
    return symbols[currency] || currency;
  };

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (auth) {
      storage.set(STORAGE_KEYS.AUTH, auth);
    } else {
      storage.remove(STORAGE_KEYS.AUTH);
    }
  }, [auth]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.MASTER_SONGS, masterSongs);
  }, [masterSongs]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.GIG_PLAYLISTS, gigPlaylists);
  }, [gigPlaylists]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.GIGS, gigs);
  }, [gigs]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.USER_PROFILE, userProfile);
  }, [userProfile]);

  useEffect(() => {
    if (liveGig) {
      storage.set(STORAGE_KEYS.LIVE_GIG, liveGig);
    } else {
      storage.remove(STORAGE_KEYS.LIVE_GIG);
    }
  }, [liveGig]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.LIVE_GIG_DATA, liveGigData);
  }, [liveGigData]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.LIVE_GIG_SETTINGS, liveGigSettings);
  }, [liveGigSettings]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.AUDIENCE_VOTES, audienceVotes);
  }, [audienceVotes]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.AUDIENCE_RATINGS, audienceRatings);
  }, [audienceRatings]);

  // Login Screen
  if(!auth || authMode){
    return(
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {!authMode ? (
            <div className="text-center">
              <Music size={80} className="text-purple-300 mx-auto mb-6"/>
              <h1 className="text-6xl font-bold text-white mb-4">{CFG.app}</h1>
              <p className="text-xl text-purple-200 mb-12">Live Performance Platform</p>
              <div className="space-y-4">
                <button onClick={()=>{setAuthMode('choice');setAuthType('artist');}} className="w-full px-12 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-2xl shadow-2xl">
                  <Music size={32} className="inline mr-3"/>Artist Login
                </button>
                <button onClick={()=>{setAuthMode('choice');setAuthType('audience');}} className="w-full px-12 py-6 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white rounded-xl font-bold text-2xl shadow-2xl">
                  <Users size={32} className="inline mr-3"/>Audience Login
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              <button onClick={()=>setAuthMode('')} className="text-white mb-4 hover:text-purple-300"><ArrowLeft size={24}/></button>
              <h2 className="text-3xl font-bold text-white mb-6 text-center">{authType === 'artist' ? 'Artist' : 'Audience'} Login</h2>
              <div className="space-y-4">
                <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 mb-4">
                  <p className="text-blue-300 text-sm">ðŸ’¡ Demo Mode: Click "Quick Login" for instant access!</p>
                </div>
                <button onClick={()=>quickLogin(authType)} className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg">
                  Quick Demo Login
                </button>
                <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-purple-900 text-white">Or continue with</span></div></div>
                <button onClick={()=>quickLogin(authType)} className="w-full px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold">Google</button>
                <button onClick={()=>quickLogin(authType)} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Facebook</button>
                <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-purple-900 text-white">Or use email</span></div></div>
                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"/>
                <input type="password" placeholder="Password" className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"/>
                <button onClick={()=>quickLogin(authType)} className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold">
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>

        {showImport && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Import Songs</h2>
                <button onClick={()=>setShowImport(false)} className="text-white hover:text-red-300">
                  <X size={32}/>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">ðŸ“ Upload CSV File</h3>
                  <p className="text-purple-200 mb-4 text-sm">Format: Title, Artist, Duration, Key</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="w-full px-4 py-3 bg-white/20 text-white rounded-lg border border-white/30"/>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">ðŸŽµ Import from Platform</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={()=>importFromPlatform('Spotify')} className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                      Spotify
                    </button>
                    <button onClick={()=>importFromPlatform('Apple Music')} className="px-6 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold">
                      Apple Music
                    </button>
                    <button onClick={()=>importFromPlatform('YouTube')} className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold">
                      YouTube
                    </button>
                    <button onClick={()=>importFromPlatform('SoundCloud')} className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold">
                      SoundCloud
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingPlaylist && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Edit Playlist</h2>
                <button onClick={()=>setEditingPlaylist(null)} className="text-white hover:text-red-300">
                  <X size={32}/>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white font-semibold mb-2 block">Playlist Name</label>
                  <input 
                    type="text" 
                    value={editingPlaylist.name} 
                    onChange={(e)=>setEditingPlaylist({...editingPlaylist, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                  />
                </div>
                <div>
                  <label className="text-white font-semibold mb-2 block">Description</label>
                  <textarea 
                    value={editingPlaylist.description} 
                    onChange={(e)=>setEditingPlaylist({...editingPlaylist, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Songs in Playlist ({editingPlaylist.songs.length})</h3>
                {editingPlaylist.songs.length === 0 ? (
                  <p className="text-purple-200">No songs added yet. Add songs from your master playlist below.</p>
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
                            onClick={()=>removeSongFromGigPlaylist(editingPlaylist.id, songId)}
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

              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Add Songs from Master Playlist</h3>
                {masterSongs.length === 0 ? (
                  <p className="text-purple-200">No songs in master playlist. Add songs to your master playlist first.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {masterSongs.filter(s => !editingPlaylist.songs.includes(s.id)).map(song => (
                      <div key={song.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold">{song.title}</div>
                          <div className="text-purple-200 text-sm">{song.artist}</div>
                        </div>
                        <button 
                          onClick={()=>addSongToGigPlaylist(editingPlaylist.id, song.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
                        >
                          <Plus size={18}/> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={()=>saveGigPlaylist(editingPlaylist)}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                >
                  <Check className="inline mr-2" size={20}/>Save Playlist
                </button>
                <button 
                  onClick={()=>setEditingPlaylist(null)}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Artist Mode
  if(mode === 'art'){
    return(
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 p-4">
        {/* localStorage Debug Banner */}
        <div className="mb-4 bg-green-500/20 border-2 border-green-400 rounded-xl p-4 backdrop-blur">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="text-2xl">âœ…</div>
              <div>
                <p className="font-bold text-lg">localStorage is ACTIVE</p>
                <p className="text-sm text-green-200">
                  Songs: {masterSongs.length} | Playlists: {gigPlaylists.length} | Gigs: {gigs.length}
                </p>
              </div>
            </div>
            <div className="text-sm text-green-200 text-right">
              <p className="font-bold">âœ¨ Your data is saved automatically</p>
              <p>Press F5 to test - data will persist!</p>
            </div>
          </div>
        </div>

        {showImport && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Import Songs</h2>
                <button onClick={()=>setShowImport(false)} className="text-white hover:text-red-300">
                  <X size={32}/>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">ðŸ“ Upload CSV File</h3>
                  <p className="text-purple-200 mb-4 text-sm">Format: Title, Artist, Duration, Key</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="w-full px-4 py-3 bg-white/20 text-white rounded-lg border border-white/30"/>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">ðŸŽµ Import from Platform</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={()=>importFromPlatform('Spotify')} className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                      Spotify
                    </button>
                    <button onClick={()=>importFromPlatform('Apple Music')} className="px-6 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold">
                      Apple Music
                    </button>
                    <button onClick={()=>importFromPlatform('YouTube')} className="px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold">
                      YouTube
                    </button>
                    <button onClick={()=>importFromPlatform('SoundCloud')} className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold">
                      SoundCloud
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingPlaylist && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Edit Playlist</h2>
                <button onClick={()=>setEditingPlaylist(null)} className="text-white hover:text-red-300">
                  <X size={32}/>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-white font-semibold mb-2 block">Playlist Name</label>
                  <input 
                    type="text" 
                    value={editingPlaylist.name} 
                    onChange={(e)=>setEditingPlaylist({...editingPlaylist, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                  />
                </div>
                <div>
                  <label className="text-white font-semibold mb-2 block">Description</label>
                  <textarea 
                    value={editingPlaylist.description} 
                    onChange={(e)=>setEditingPlaylist({...editingPlaylist, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Songs in Playlist ({editingPlaylist.songs.length})</h3>
                {editingPlaylist.songs.length === 0 ? (
                  <p className="text-purple-200">No songs added yet. Add songs from your master playlist below.</p>
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
                            onClick={()=>removeSongFromGigPlaylist(editingPlaylist.id, songId)}
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

              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Add Songs from Master Playlist</h3>
                {masterSongs.length === 0 ? (
                  <p className="text-purple-200">No songs in master playlist. Add songs to your master playlist first.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {masterSongs.filter(s => !editingPlaylist.songs.includes(s.id)).map(song => (
                      <div key={song.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold">{song.title}</div>
                          <div className="text-purple-200 text-sm">{song.artist}</div>
                        </div>
                        <button 
                          onClick={()=>addSongToGigPlaylist(editingPlaylist.id, song.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
                        >
                          <Plus size={18}/> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={()=>saveGigPlaylist(editingPlaylist)}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                >
                  <Check className="inline mr-2" size={20}/>Save Playlist
                </button>
                <button 
                  onClick={()=>setEditingPlaylist(null)}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showGigModal && editingGig && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">{editingGig.id && gigs.find(g => g.id === editingGig.id) ? 'Edit Gig' : 'Add New Gig'}</h2>
                <button onClick={()=>{setShowGigModal(false);setEditingGig(null);}} className="text-white hover:text-red-300">
                  <X size={32}/>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white font-semibold mb-2 block">Venue Name *</label>
                  <input 
                    type="text" 
                    value={editingGig.venueName} 
                    onChange={(e)=>setEditingGig({...editingGig, venueName: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    placeholder="e.g. The Blue Note Jazz Club"
                    required
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Location (Optional)</label>
                  <input 
                    type="text" 
                    value={editingGig.location} 
                    onChange={(e)=>setEditingGig({...editingGig, location: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    placeholder="e.g. 131 W 3rd St, New York, NY"
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Google Location (Optional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editingGig.googleLocation} 
                      onChange={(e)=>setEditingGig({...editingGig, googleLocation: e.target.value})}
                      className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="Coordinates will appear here"
                      readOnly
                    />
                    <button 
                      onClick={getLocationFromGoogle}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold whitespace-nowrap"
                    >
                      ðŸ“ Get Location
                    </button>
                  </div>
                  <p className="text-orange-200 text-sm mt-1">Click to use your device's current location</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Date *</label>
                    <input 
                      type="date" 
                      value={editingGig.date} 
                      onChange={(e)=>setEditingGig({...editingGig, date: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Time *</label>
                    <input 
                      type="time" 
                      value={editingGig.time} 
                      onChange={(e)=>setEditingGig({...editingGig, time: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Assign Playlist (Optional)</label>
                  <select 
                    value={editingGig.playlist || ''} 
                    onChange={(e)=>setEditingGig({...editingGig, playlist: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
                  >
                    <option value="">No playlist assigned</option>
                    {gigPlaylists.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.songs.length} songs)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Notes (Optional)</label>
                  <textarea 
                    value={editingGig.notes} 
                    onChange={(e)=>setEditingGig({...editingGig, notes: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                    rows={3}
                    placeholder="Special requests, set list notes, etc."
                  />
                </div>

                <div>
                  <label className="text-white font-semibold mb-2 block">Status</label>
                  <select 
                    value={editingGig.status} 
                    onChange={(e)=>setEditingGig({...editingGig, status: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={()=>{
                    if(!editingGig.venueName || !editingGig.date || !editingGig.time){
                      window.alert('Please fill in all required fields (Venue Name, Date, Time)');
                      return;
                    }
                    saveGig(editingGig);
                  }}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                >
                  <Check className="inline mr-2" size={20}/>Save Gig
                </button>
                <button 
                  onClick={()=>{setShowGigModal(false);setEditingGig(null);}}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <header className="text-white mb-6 pt-6 flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">{CFG.app}</h1>
              <p className="text-purple-200 text-lg mt-1">{auth.name}</p>
            </div>
            <button onClick={()=>setMode('sel')} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold">Exit</button>
          </header>

          <div className="flex gap-2 mb-6">
            <button onClick={()=>setTab('master')} className={'px-6 py-3 rounded-lg font-semibold text-white transition '+(tab==='master'?'bg-purple-500':'bg-white/10 hover:bg-white/20')}>
              <Music className="inline mr-2" size={20}/>Master Playlist
            </button>
            <button onClick={()=>setTab('gig')} className={'px-6 py-3 rounded-lg font-semibold text-white transition '+(tab==='gig'?'bg-purple-500':'bg-white/10 hover:bg-white/20')}>
              <Calendar className="inline mr-2" size={20}/>Gig Playlists
            </button>
            <button onClick={()=>setTab('venues')} className={'px-6 py-3 rounded-lg font-semibold text-white transition '+(tab==='venues'?'bg-purple-500':'bg-white/10 hover:bg-white/20')}>
              <Zap className="inline mr-2" size={20}/>My Gigs
            </button>
            <button onClick={()=>setTab('profile')} className={'px-6 py-3 rounded-lg font-semibold text-white transition '+(tab==='profile'?'bg-purple-500':'bg-white/10 hover:bg-white/20')}>
              <Settings className="inline mr-2" size={20}/>Profile
            </button>
          </div>

          {tab==='master' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400 rounded-xl p-6">
                <h2 className="text-3xl font-bold text-white mb-2">ðŸŽµ Master Playlist</h2>
                <p className="text-purple-200 mb-4">Your complete song library</p>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={()=>setShowImport(true)} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                    <Upload className="inline mr-2" size={20}/>Import Songs
                  </button>
                  <button onClick={()=>{const title=window.prompt('Song title:');const artist=window.prompt('Artist:');if(title)addToMaster({id:Date.now(),title,artist:artist||'',duration:'',key:''});}} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold">
                    <Plus className="inline mr-2" size={20}/>Add Manually
                  </button>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">ðŸ” Search Online</h3>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyPress={e=>e.key==='Enter'&&searchOnline()} placeholder="Search for songs..." className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"/>
                  <button onClick={searchOnline} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold">
                    <Search size={20}/>
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map(r=>
                      <div key={r.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold">{r.title}</div>
                          <div className="text-purple-200 text-sm">{r.artist} â€¢ {r.duration}</div>
                        </div>
                        <button onClick={()=>{addToMaster(r);setSearchResults(searchResults.filter(sr => sr.id !== r.id));}} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold">
                          <Plus size={18}/> Add
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">ðŸ“š Master Songs ({masterSongs.length})</h3>
                {masterSongs.length === 0 ? (
                  <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-6 text-center">
                    <p className="text-blue-200 text-lg">No songs yet! Start by importing or adding songs above â¬†ï¸</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {masterSongs.map(s=>
                      <div key={s.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center hover:bg-white/10 transition">
                        <div>
                          <div className="text-white font-semibold text-lg">{s.title}</div>
                          <div className="text-purple-200 text-sm">{s.artist} {s.duration && `â€¢ ${s.duration}`} {s.key && `â€¢ Key: ${s.key}`}</div>
                        </div>
                        <button onClick={()=>removeFromMaster(s.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab==='gig' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/20 to-teal-500/20 border-2 border-blue-400 rounded-xl p-6">
                <h2 className="text-3xl font-bold text-white mb-2">ðŸŽ¸ Gig Playlists</h2>
                <p className="text-blue-200 mb-4">Create custom playlists for different gigs</p>
                <button onClick={createGigPlaylist} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                  <Plus className="inline mr-2" size={20}/>Create Gig Playlist
                </button>
              </div>

              {gigPlaylists.length === 0 ? (
                <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-8 text-center">
                  <Calendar size={60} className="text-yellow-300 mx-auto mb-4"/>
                  <p className="text-yellow-200 text-lg">No gig playlists yet. Click above to create one! ðŸŽµ</p>
                </div>
              ) : (
                gigPlaylists.map(p=>
                  <div key={p.id} className="bg-white/10 rounded-xl p-6 hover:bg-white/15 transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white">{p.name}</h3>
                        {p.description && <p className="text-purple-200 text-sm mt-1">{p.description}</p>}
                        <p className="text-purple-300 font-semibold mt-2">ðŸŽµ {p.songs.length} songs</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>setEditingPlaylist(p)} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                          <Edit2 size={20}/>
                        </button>
                        <button onClick={()=>deleteGigPlaylist(p.id)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    </div>
                    {p.songs.length > 0 && (
                      <div className="space-y-2">
                        {p.songs.slice(0,5).map((sid, i)=>{
                          const song = masterSongs.find(s => s.id === sid);
                          return song ? (
                            <div key={sid} className="bg-white/5 p-2 rounded text-white text-sm">
                              {i+1}. {song.title} - {song.artist}
                            </div>
                          ) : null;
                        })}
                        {p.songs.length > 5 && <div className="text-purple-300 text-sm font-semibold">+{p.songs.length-5} more...</div>}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {tab==='venues' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-400 rounded-xl p-6">
                <h2 className="text-3xl font-bold text-white mb-2">ðŸŽ¤ My Gigs</h2>
                <p className="text-orange-200 mb-4">Manage your upcoming and past performances</p>
                <button onClick={createGig} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                  <Plus className="inline mr-2" size={20}/>Add New Gig
                </button>
              </div>

              {gigs.length === 0 ? (
                <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-8 text-center">
                  <Zap size={60} className="text-yellow-300 mx-auto mb-4"/>
                  <p className="text-yellow-200 text-lg">No gigs yet. Click above to add your first gig! ðŸŽ¸</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gigs.sort((a,b) => new Date(a.date) - new Date(b.date)).map(gig => {
                    const playlist = gigPlaylists.find(p => p.id === gig.playlist);
                    const statusColors = {
                      upcoming: 'bg-blue-500/20 border-blue-400 text-blue-200',
                      confirmed: 'bg-green-500/20 border-green-400 text-green-200',
                      completed: 'bg-gray-500/20 border-gray-400 text-gray-200',
                      cancelled: 'bg-red-500/20 border-red-400 text-red-200'
                    };
                    return (
                      <div key={gig.id} className="bg-white/10 rounded-xl p-6 hover:bg-white/15 transition">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-white">{gig.venueName}</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[gig.status]}`}>
                                {gig.status.charAt(0).toUpperCase() + gig.status.slice(1)}
                              </span>
                            </div>
                            {gig.location && (
                              <p className="text-purple-200 text-sm mb-1">ðŸ“ {gig.location}</p>
                            )}
                            {gig.googleLocation && (
                              <p className="text-purple-200 text-sm mb-1">ðŸ—ºï¸ Coordinates: {gig.googleLocation}</p>
                            )}
                            <div className="flex gap-4 text-purple-300 font-semibold mt-2">
                              <span>ðŸ“… {new Date(gig.date).toLocaleDateString('en-US', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</span>
                              <span>ðŸ• {gig.time}</span>
                            </div>
                            {playlist && (
                              <p className="text-blue-300 mt-2">ðŸŽµ Playlist: {playlist.name} ({playlist.songs.length} songs)</p>
                            )}
                            {gig.notes && (
                              <p className="text-purple-200 text-sm mt-2 italic">ðŸ’­ {gig.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={()=>editGig(gig)} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                              <Edit2 size={20}/>
                            </button>
                            <button onClick={()=>startLiveGig(gig)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                              <Play size={20} className="inline mr-1"/>Go Live
                            </button>
                            <button onClick={()=>deleteGig(gig.id)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                              <Trash2 size={20}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab==='profile' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-2 border-indigo-400 rounded-xl p-6">
                <h2 className="text-3xl font-bold text-white mb-2">ðŸ‘¤ Artist Profile</h2>
                <p className="text-indigo-200 mb-4">Manage your profile and settings</p>
              </div>

              {/* Profile Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">{masterSongs.length}</div>
                  <div className="text-purple-200 font-semibold">Total Songs</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-teal-500/20 border border-blue-400 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">{gigPlaylists.length}</div>
                  <div className="text-blue-200 font-semibold">Gig Playlists</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">{userProfile.stats.followers}</div>
                  <div className="text-green-200 font-semibold">Followers</div>
                </div>
              </div>

              {/* Profile Information */}
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Settings className="inline mr-2" size={24}/>
                  Profile Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Name</label>
                    <input 
                      type="text" 
                      value={userProfile.name} 
                      onChange={(e)=>setUserProfile({...userProfile, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Bio</label>
                    <textarea 
                      value={userProfile.bio} 
                      onChange={(e)=>setUserProfile({...userProfile, bio: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white font-semibold mb-2 block">Genre</label>
                      <input 
                        type="text" 
                        value={userProfile.genre} 
                        onChange={(e)=>setUserProfile({...userProfile, genre: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                        placeholder="e.g. Rock, Jazz, Pop"
                      />
                    </div>
                    <div>
                      <label className="text-white font-semibold mb-2 block">Location</label>
                      <input 
                        type="text" 
                        value={userProfile.location} 
                        onChange={(e)=>setUserProfile({...userProfile, location: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block">Website</label>
                    <input 
                      type="url" 
                      value={userProfile.website} 
                      onChange={(e)=>setUserProfile({...userProfile, website: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Star className="inline mr-2" size={24}/>
                  Social Links
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block flex items-center">
                      <span className="mr-2">ðŸ“·</span> Instagram
                    </label>
                    <input 
                      type="text" 
                      value={userProfile.socialLinks.instagram} 
                      onChange={(e)=>setUserProfile({...userProfile, socialLinks: {...userProfile.socialLinks, instagram: e.target.value}})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block flex items-center">
                      <span className="mr-2">ðŸ‘</span> Facebook
                    </label>
                    <input 
                      type="text" 
                      value={userProfile.socialLinks.facebook} 
                      onChange={(e)=>setUserProfile({...userProfile, socialLinks: {...userProfile.socialLinks, facebook: e.target.value}})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="facebook.com/yourpage"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block flex items-center">
                      <span className="mr-2">ðŸ¦</span> Twitter/X
                    </label>
                    <input 
                      type="text" 
                      value={userProfile.socialLinks.twitter} 
                      onChange={(e)=>setUserProfile({...userProfile, socialLinks: {...userProfile.socialLinks, twitter: e.target.value}})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block flex items-center">
                      <span className="mr-2">ðŸŽµ</span> Spotify
                    </label>
                    <input 
                      type="text" 
                      value={userProfile.socialLinks.spotify} 
                      onChange={(e)=>setUserProfile({...userProfile, socialLinks: {...userProfile.socialLinks, spotify: e.target.value}})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="spotify.com/artist/..."
                    />
                  </div>
                  <div>
                    <label className="text-white font-semibold mb-2 block flex items-center">
                      <span className="mr-2">ðŸ“º</span> YouTube
                    </label>
                    <input 
                      type="text" 
                      value={userProfile.socialLinks.youtube} 
                      onChange={(e)=>setUserProfile({...userProfile, socialLinks: {...userProfile.socialLinks, youtube: e.target.value}})}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      placeholder="youtube.com/c/yourchannel"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button 
                  onClick={()=>window.alert('Profile saved successfully!')}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-lg"
                >
                  <Check className="inline mr-2" size={20}/>
                  Save Profile
                </button>
              </div>

              {/* Account Settings */}
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Lock className="inline mr-2" size={24}/>
                  Account Settings
                </h3>
                <div className="space-y-4">
                  <button className="w-full px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg font-semibold text-left border border-blue-400">
                    <Mail className="inline mr-2" size={20}/>
                    Change Email
                  </button>
                  <button className="w-full px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg font-semibold text-left border border-purple-400">
                    <Lock className="inline mr-2" size={20}/>
                    Change Password
                  </button>
                  <button className="w-full px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg font-semibold text-left border border-red-400">
                    <Trash2 className="inline mr-2" size={20}/>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Live Gig Mode (Artist)
  if(mode === 'live' && auth?.type === 'artist'){
    return(
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-4">
        <div className="max-w-7xl mx-auto">
          <header className="text-white mb-6 pt-6 flex justify-between items-center">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-300 to-teal-300 bg-clip-text text-transparent">ðŸŽ¤ LIVE GIG</h1>
              <p className="text-teal-200 text-lg mt-1">{liveGig?.venueName} â€¢ {auth.name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={pauseLiveGig} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold">
                â¸ï¸ Pause
              </button>
              <button onClick={endLiveGig} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold">
                â¹ï¸ End Gig
              </button>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">{getCurrencySymbol(liveGigSettings.currency)}{liveGigData.totalEarnings}</div>
              <div className="text-green-200 font-semibold">Total Earnings</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">{liveGigData.queuedSongs.length}</div>
              <div className="text-blue-200 font-semibold">Songs in Queue</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-white mb-2">{liveGigData.songRequests.length}</div>
              <div className="text-purple-200 font-semibold">Song Requests</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸŽµ Now Playing</h3>
                {liveGigData.currentSong ? (
                  <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400 rounded-xl p-6">
                    <div className="text-3xl font-bold text-white mb-2">{liveGigData.currentSong.title}</div>
                    <div className="text-xl text-purple-200">{liveGigData.currentSong.artist}</div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-center py-8">No song currently playing</p>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸ“‹ Song Queue ({liveGigData.queuedSongs.length}/{liveGigSettings.songLimit})</h3>
                {liveGigData.queuedSongs.length === 0 ? (
                  <p className="text-gray-300 text-center py-4">Queue is empty</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {liveGigData.queuedSongs.map((song, index) => (
                      <div key={song.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-teal-300 font-bold text-lg">{index + 1}</span>
                          <div>
                            <div className="text-white font-semibold">{song.title}</div>
                            <div className="text-gray-300 text-sm">{song.artist}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>playSong(song)} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-bold">
                            <Play size={16} className="inline"/>Play
                          </button>
                          <button onClick={()=>skipSong(song.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-bold">
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">âš™ï¸ Live Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Song Limit</span>
                    <input 
                      type="number" 
                      value={liveGigSettings.songLimit}
                      onChange={(e)=>setLiveGigSettings({...liveGigSettings, songLimit: parseInt(e.target.value)})}
                      className="w-20 px-3 py-1 rounded bg-white/20 text-white border border-white/30"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Jukebox Mode</span>
                    <button 
                      onClick={()=>setLiveGigSettings({...liveGigSettings, jukeboxEnabled: !liveGigSettings.jukeboxEnabled})}
                      className={`px-4 py-2 rounded font-bold ${liveGigSettings.jukeboxEnabled ? 'bg-green-500' : 'bg-gray-500'}`}
                    >
                      {liveGigSettings.jukeboxEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {liveGigSettings.jukeboxEnabled && (
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-white">Bidding Mode</span>
                      <button 
                        onClick={()=>setLiveGigSettings({...liveGigSettings, biddingEnabled: !liveGigSettings.biddingEnabled})}
                        className={`px-4 py-2 rounded font-bold ${liveGigSettings.biddingEnabled ? 'bg-green-500' : 'bg-gray-500'}`}
                      >
                        {liveGigSettings.biddingEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white">Accepting Votes</span>
                    <button 
                      onClick={()=>setLiveGigSettings({...liveGigSettings, acceptingVotes: !liveGigSettings.acceptingVotes})}
                      className={`px-4 py-2 rounded font-bold ${liveGigSettings.acceptingVotes ? 'bg-green-500' : 'bg-gray-500'}`}
                    >
                      {liveGigSettings.acceptingVotes ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸ’° Song Requests ({liveGigData.songRequests.length})</h3>
                {liveGigData.songRequests.length === 0 ? (
                  <p className="text-gray-300 text-center py-4">No requests yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {liveGigData.songRequests.map(req => (
                      <div key={req.id} className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-white font-bold">{req.song.title}</div>
                            <div className="text-gray-300 text-sm">{req.requester}</div>
                          </div>
                          <div className="text-yellow-300 font-bold text-lg">{getCurrencySymbol(liveGigSettings.currency)}{req.amount}</div>
                        </div>
                        {req.message && (
                          <div className="text-yellow-200 text-sm italic mt-2">ðŸ’¬ "{req.message}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸ’µ Donations ({liveGigData.donations.length})</h3>
                {liveGigData.donations.length === 0 ? (
                  <p className="text-gray-300 text-center py-4">No donations yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {liveGigData.donations.map(don => (
                      <div key={don.id} className="bg-green-500/20 border border-green-400 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">{don.donor}</span>
                          <span className="text-green-300 font-bold">{getCurrencySymbol(liveGigSettings.currency)}{don.amount}</span>
                        </div>
                        {don.message && (
                          <div className="text-green-200 text-sm italic mt-1">ðŸ’¬ "{don.message}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸ’¬ Comments ({liveGigData.comments.length})</h3>
                {liveGigData.comments.length === 0 ? (
                  <p className="text-gray-300 text-center py-4">No comments yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {liveGigData.comments.map(comment => (
                      <div key={comment.id} className="bg-blue-500/20 border border-blue-400 p-3 rounded-lg">
                        <div className="text-white font-semibold text-sm">{comment.author}</div>
                        <div className="text-blue-200 text-sm">{comment.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-4">ðŸ“Š Earnings Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>Donations:</span>
                    <span className="font-bold">{getCurrencySymbol(liveGigSettings.currency)}{liveGigData.donationEarnings}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Song Requests:</span>
                    <span className="font-bold">{getCurrencySymbol(liveGigSettings.currency)}{liveGigData.requestEarnings}</span>
                  </div>
                  <div className="border-t border-white/30 pt-2 mt-2 flex justify-between text-white text-xl">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">{getCurrencySymbol(liveGigSettings.currency)}{liveGigData.totalEarnings}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Audience Mode
  if(mode === 'aud'){
    // If there's a live gig, show live gig interface
    if(liveGig){
      const donationOptions = [
        liveGigSettings.minDonation,
        liveGigSettings.minDonation + liveGigSettings.donationIncrement,
        liveGigSettings.minDonation + (liveGigSettings.donationIncrement * 2),
        liveGigSettings.minDonation + (liveGigSettings.donationIncrement * 3)
      ];

      const handleDonation = () => {
        const amount = customDonation ? parseFloat(customDonation) : donationAmount;
        const minDonation = liveGigSettings?.minDonation || 5;
        if(amount < minDonation){
          window.alert(`Minimum donation is ${getCurrencySymbol(liveGigSettings.currency)}${minDonation}`);
          return;
        }
        processDonation(amount, donationMessage);
        window.alert('Thank you for your donation!');
        setShowDonation(false);
        setDonationMessage('');
        setCustomDonation('');
        setDonationAmount(minDonation);
      };

      const handleSongRequest = () => {
        if(!selectedSong) return;
        if(requestMessage.length > 200){
          window.alert('Message must be 200 characters or less');
          return;
        }
        const amount = liveGigSettings.biddingEnabled ? requestAmount : liveGigSettings.jukeboxPrice;
        processSongRequest(selectedSong, amount, requestMessage, liveGigSettings.biddingEnabled);
        window.alert('Song request submitted!');
        setShowJukebox(false);
        setSelectedSong(null);
        setRequestMessage('');
        setRequestAmount(liveGigSettings.jukeboxPrice);
      };

      return(
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
          <div className="max-w-7xl mx-auto">
            <header className="text-white mb-6 pt-6 flex justify-between items-center">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">ðŸŽ¤ {liveGig.venueName}</h1>
                <p className="text-purple-200 text-lg mt-1">Performing: {userProfile.name}</p>
                <p className="text-purple-300 text-sm">{auth.name} â€¢ Audience Member</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setShowDonation(true)} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-lg">
                  <Heart className="inline mr-2" size={20}/>Donate
                </button>
                {liveGigSettings.jukeboxEnabled && (
                  <button onClick={()=>setShowJukebox(true)} className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-bold shadow-lg">
                    <Music className="inline mr-2" size={20}/>Request Song
                  </button>
                )}
                <button onClick={()=>setMode('sel')} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold">
                  Exit
                </button>
              </div>
            </header>

            {/* Donation Modal */}
            {showDonation && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-2xl p-8 max-w-2xl w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white">ðŸ’š Support the Artist</h2>
                    <button onClick={()=>setShowDonation(false)} className="text-white hover:text-red-300">
                      <X size={32}/>
                    </button>
                  </div>
                  <p className="text-green-200 mb-6">Minimum donation: {getCurrencySymbol(liveGigSettings.currency)}{liveGigSettings.minDonation}</p>
                  
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {donationOptions.map(amount => (
                      <button
                        key={amount}
                        onClick={()=>{setDonationAmount(amount);setCustomDonation('');}}
                        className={`px-6 py-4 rounded-lg font-bold text-xl ${donationAmount === amount && !customDonation ? 'bg-green-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                      >
                        {getCurrencySymbol(liveGigSettings.currency)}{amount}
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <label className="text-white font-semibold mb-2 block">Custom Amount</label>
                    <input
                      type="number"
                      value={customDonation}
                      onChange={(e)=>setCustomDonation(e.target.value)}
                      placeholder={`${getCurrencySymbol(liveGigSettings.currency)}${liveGigSettings.minDonation} or more`}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      min={liveGigSettings.minDonation}
                    />
                  </div>

                  <div className="mb-6">
                    <label className="text-white font-semibold mb-2 block">Message (Optional)</label>
                    <textarea
                      value={donationMessage}
                      onChange={(e)=>setDonationMessage(e.target.value)}
                      placeholder="Leave a message for the artist..."
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                      rows={3}
                    />
                  </div>

                  <button onClick={handleDonation} className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xl">
                    Donate {getCurrencySymbol(liveGigSettings.currency)}{customDonation || donationAmount}
                  </button>
                </div>
              </div>
            )}

            {/* Jukebox Modal */}
            {showJukebox && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-gradient-to-br from-orange-900 to-yellow-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white">ðŸŽµ Request a Song</h2>
                    <button onClick={()=>setShowJukebox(false)} className="text-white hover:text-red-300">
                      <X size={32}/>
                    </button>
                  </div>
                  
                  <p className="text-yellow-200 mb-4">
                    {liveGigSettings.biddingEnabled 
                      ? `Bidding mode active! Minimum bid: ${getCurrencySymbol(liveGigSettings.currency)}${liveGigSettings.minBidAmount}`
                      : `Request price: ${getCurrencySymbol(liveGigSettings.currency)}${liveGigSettings.jukeboxPrice} per song`
                    }
                  </p>

                  <div className="bg-white/10 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
                    <h3 className="text-xl font-bold text-white mb-4">Select a Song</h3>
                    {masterSongs.map(song => (
                      <div
                        key={song.id}
                        onClick={()=>setSelectedSong(song)}
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition ${
                          selectedSong?.id === song.id 
                            ? 'bg-yellow-500/40 border-2 border-yellow-400' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/20'
                        } ${liveGigData.playedSongs.includes(song.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-white font-semibold">{song.title}</div>
                        <div className="text-gray-300 text-sm">{song.artist}</div>
                        {liveGigData.playedSongs.includes(song.id) && (
                          <div className="text-red-300 text-xs mt-1">Already played</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedSong && (
                    <div className="space-y-4">
                      {liveGigSettings.biddingEnabled && (
                        <div>
                          <label className="text-white font-semibold mb-2 block">Your Bid</label>
                          <input
                            type="number"
                            value={requestAmount}
                            onChange={(e)=>setRequestAmount(parseFloat(e.target.value))}
                            min={liveGigSettings.minBidAmount}
                            step={liveGigSettings.bidIncrement}
                            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-white font-semibold mb-2 block">Message (Max 200 chars)</label>
                        <textarea
                          value={requestMessage}
                          onChange={(e)=>setRequestMessage(e.target.value)}
                          placeholder="Add a message the artist can announce..."
                          maxLength={200}
                          className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30"
                          rows={3}
                        />
                        <div className="text-yellow-200 text-sm mt-1">{requestMessage.length}/200</div>
                      </div>

                      <button onClick={handleSongRequest} className="w-full px-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-xl">
                        {liveGigSettings.biddingEnabled ? `Place Bid ${getCurrencySymbol(liveGigSettings.currency)}${requestAmount}` : `Request ${getCurrencySymbol(liveGigSettings.currency)}${liveGigSettings.jukeboxPrice}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 mb-6">
              <button onClick={()=>setViewTab('queue')} className={`p-6 rounded-xl font-bold text-xl ${viewTab==='queue' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'} text-white`}>
                ðŸ“‹ Queue
              </button>
              <button onClick={()=>setViewTab('playlists')} className={`p-6 rounded-xl font-bold text-xl ${viewTab==='playlists' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'} text-white`}>
                ðŸŽµ Playlists
              </button>
              <button onClick={()=>setViewTab('interact')} className={`p-6 rounded-xl font-bold text-xl ${viewTab==='interact' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'} text-white`}>
                â­ Interact
              </button>
            </div>

            {viewTab === 'queue' && (
              <div className="space-y-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-3xl font-bold text-white mb-4">ðŸŽµ Now Playing</h3>
                  {liveGigData.currentSong ? (
                    <div className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-2 border-pink-400 rounded-xl p-8 text-center">
                      <div className="text-4xl font-bold text-white mb-3">{liveGigData.currentSong.title}</div>
                      <div className="text-2xl text-purple-200">{liveGigData.currentSong.artist}</div>
                    </div>
                  ) : (
                    <p className="text-gray-300 text-center py-8 text-xl">Waiting for first song...</p>
                  )}
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">ðŸ“‹ Up Next ({liveGigData.queuedSongs.length} songs)</h3>
                  {liveGigData.queuedSongs.length === 0 ? (
                    <p className="text-gray-300 text-center py-4">No songs in queue</p>
                  ) : (
                    <div className="space-y-2">
                      {liveGigData.queuedSongs.slice(0, 10).map((song, index) => (
                        <div key={song.id} className="bg-white/5 p-4 rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="text-purple-300 font-bold text-xl w-8">{index + 1}</span>
                            <div className="flex-1">
                              <div className="text-white font-semibold text-lg">{song.title}</div>
                              <div className="text-gray-300">{song.artist}</div>
                            </div>
                            {liveGigData.votes[song.id] && (
                              <span className="text-green-300 font-bold">â¤ï¸ {liveGigData.votes[song.id]}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewTab === 'playlists' && (
              <div className="space-y-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">ðŸŽµ Tonight's Playlist</h3>
                  {gigPlaylists.find(p => p.id === liveGig.playlist)?.songs.map(songId => {
                    const song = masterSongs.find(s => s.id === songId);
                    if(!song) return null;
                    const hasVoted = audienceVotes[song.id];
                    const voteCount = liveGigData.votes[song.id] || 0;
                    const isPlayed = liveGigData.playedSongs.includes(song.id);
                    
                    return (
                      <div key={song.id} className={`bg-white/5 p-4 rounded-lg mb-2 ${isPlayed ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-semibold text-lg">{song.title}</div>
                            <div className="text-gray-300">{song.artist}</div>
                            {isPlayed && <span className="text-green-300 text-sm">âœ“ Played</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {voteCount > 0 && (
                              <span className="text-pink-300 font-bold">â¤ï¸ {voteCount}</span>
                            )}
                            {liveGigSettings.acceptingVotes && !isPlayed && (
                              <button
                                onClick={()=>voteForSong(song.id)}
                                className={`px-4 py-2 rounded-lg font-bold ${hasVoted ? 'bg-pink-500' : 'bg-white/20 hover:bg-pink-500'} text-white`}
                              >
                                {hasVoted ? 'â¤ï¸ Voted' : 'ðŸ¤ Vote'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">ðŸ“š Master Playlist</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {masterSongs.map(song => {
                      const hasVoted = audienceVotes[song.id];
                      const voteCount = liveGigData.votes[song.id] || 0;
                      const isPlayed = liveGigData.playedSongs.includes(song.id);
                      
                      return (
                        <div key={song.id} className={`bg-white/5 p-3 rounded-lg ${isPlayed ? 'opacity-50' : ''}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-white font-semibold">{song.title}</div>
                              <div className="text-gray-300 text-sm">{song.artist}</div>
                              {isPlayed && <span className="text-green-300 text-xs">âœ“ Played</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {voteCount > 0 && (
                                <span className="text-pink-300 font-bold text-sm">â¤ï¸ {voteCount}</span>
                              )}
                              {liveGigSettings.acceptingVotes && !isPlayed && (
                                <button
                                  onClick={()=>voteForSong(song.id)}
                                  className={`px-3 py-1 rounded text-sm font-bold ${hasVoted ? 'bg-pink-500' : 'bg-white/20 hover:bg-pink-500'} text-white`}
                                >
                                  {hasVoted ? 'â¤ï¸' : 'ðŸ¤'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {viewTab === 'interact' && (
              <div className="space-y-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-6">â­ Rate the Performance</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-white font-semibold mb-3 block">Current Song</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={()=>submitRating('song', star)}
                            className={`text-4xl ${audienceRatings.song >= star ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-400`}
                          >
                            â­
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-semibold mb-3 block">Artist Performance</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={()=>submitRating('artist', star)}
                            className={`text-4xl ${audienceRatings.artist >= star ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-400`}
                          >
                            â­
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-semibold mb-3 block">Overall Gig</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={()=>submitRating('gig', star)}
                            className={`text-4xl ${audienceRatings.gig >= star ? 'text-yellow-400' : 'text-gray-500'} hover:text-yellow-400`}
                          >
                            â­
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">ðŸ’¬ Leave a Comment</h3>
                  <textarea
                    value={commentText}
                    onChange={(e)=>setCommentText(e.target.value)}
                    placeholder="Share your thoughts about the performance..."
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 mb-4"
                    rows={4}
                  />
                  <button
                    onClick={()=>{
                      if(commentText.trim()){
                        addComment(commentText);
                        setCommentText('');
                        window.alert('Comment posted!');
                      }
                    }}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
                  >
                    Post Comment
                  </button>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">ðŸ”— Follow the Artist</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {userProfile.socialLinks.instagram && (
                      <a href={`https://instagram.com/${userProfile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-bold text-center">
                        ðŸ“· Instagram
                      </a>
                    )}
                    {userProfile.socialLinks.facebook && (
                      <a href={userProfile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-center">
                        ðŸ‘ Facebook
                      </a>
                    )}
                    {userProfile.socialLinks.twitter && (
                      <a href={`https://twitter.com/${userProfile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-center">
                        ðŸ¦ Twitter
                      </a>
                    )}
                    {userProfile.socialLinks.spotify && (
                      <a href={userProfile.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-center">
                        ðŸŽµ Spotify
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // No live gig - show waiting screen
    return(
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-green-900 p-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-white mb-6 pt-6 flex justify-between">
            <div>
              <h1 className="text-4xl font-bold">{CFG.app}</h1>
              <p className="text-teal-200">{auth.name}</p>
            </div>
            <button onClick={()=>setMode('sel')} className="px-4 py-2 bg-white/20 text-white rounded-lg">Exit</button>
          </header>
          <div className="bg-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Audience Mode</h2>
            <p className="text-teal-200">No live gig currently. Check back when an artist goes live!</p>
          </div>
        </div>
      </div>
    );
  }

  // Default mode selector
  return(
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-green-900 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-white mb-6 pt-6 flex justify-between">
          <div>
            <h1 className="text-4xl font-bold">{CFG.app}</h1>
            <p className="text-teal-200">{auth.name}</p>
          </div>
          <button onClick={()=>setMode('sel')} className="px-4 py-2 bg-white/20 text-white rounded-lg">Exit</button>
        </header>
        <div className="bg-white/10 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome</h2>
          <p className="text-teal-200">Please select a mode to continue</p>
        </div>
      </div>
    </div>
  );
}
