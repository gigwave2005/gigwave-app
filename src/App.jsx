import React, { useState, useEffect } from 'react';
import { Music, Plus, Trash2, Play, Users, Calendar, Heart, Star, Zap, X, Search, Upload, Settings, Edit2, Check, Mail, Lock, ArrowLeft, MapPin, Navigation } from 'lucide-react';

// Import Firebase utilities
import {
  auth,
  db,
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
  
  // Artist data
  const [masterSongs, setMasterSongs] = useState([]);
  const [gigPlaylists, setGigPlaylists] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [showGigModal, setShowGigModal] = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  
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
    
    const unsubscribe = listenToLiveGig(liveGig.id, (gigData) => {
      setLiveGigData({
        votes: gigData.votes || {},
        comments: gigData.comments || [],
        donations: gigData.donations || [],
        queuedSongs: gigData.queuedSongs || [],
        currentSong: gigData.currentSong || null,
        playedSongs: gigData.playedSongs || []
      });
    });
    
    return () => unsubscribe();
  }, [liveGig?.id]);

  // Get user location on mount
  useEffect(() => {
    getUserLocation()
      .then(loc => setUserLocation(loc))
      .catch(err => console.log('Location not available:', err));
  }, []);

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
      
      const gigs = await searchNearbyGigs(location, 5);
      setNearbyGigs(gigs);
      
      if (gigs.length === 0) {
        alert('No live gigs found nearby. Try again later!');
      }
    } catch (error) {
      alert('Error finding gigs: ' + error.message);
    } finally {
      setLoadingGigs(false);
    }
  };

  const handleVote = async (songId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      const location = await getUserLocation();
      const venueLocation = {
        lat: liveGig.location.latitude,
        lng: liveGig.location.longitude
      };
      
      await firebaseVoteForSong(liveGig.id, songId, currentUser.uid, location, venueLocation);
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

  const createGig = () => {
    setEditingGig({
      id: Date.now(),
      venueName: '',
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

  const handleGoLive = async (gig) => {
    try {
      let location = gig.location;
      
      if (!location) {
        location = await getUserLocation();
      }
      
      // Get songs from assigned playlist or master
      let songs = masterSongs;
      if (gig.playlistId) {
        const playlist = gigPlaylists.find(p => p.id === gig.playlistId);
        if (playlist) {
          songs = playlist.songs.map(id => masterSongs.find(s => s.id === id)).filter(Boolean);
        }
      }
      
      const gigData = {
        artistId: currentUser.uid,
        artistName: currentUser.displayName || 'Artist',
        venueName: gig.venueName,
        location: location,
        queuedSongs: songs.slice(0, 20),
        status: 'live'
      };
      
      const gigId = await createLiveGig(gigData, currentUser.uid);
      setLiveGig({...gigData, id: gigId});
      setMode('live');
      
      alert(`✅ You're live!\n\nAudience can find you by searching nearby!`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEndGig = async () => {
    if (!window.confirm('End this gig?')) return;
    
    try {
      await firebaseEndLiveGig(liveGig.id);
      setMode('artist');
      setLiveGig(null);
      alert('✅ Gig ended!');
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

          <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Add from Master Playlist</h3>
            {masterSongs.length === 0 ? (
              <p className="text-purple-200">No songs in master playlist. Add songs first!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {masterSongs
                  .filter(s => !editingPlaylist.songs.includes(s.id))
                  .map(song => (
                    <div key={song.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold">{song.title}</div>
                        <div className="text-purple-200 text-sm">{song.artist}</div>
                      </div>
                      <button
                        onClick={() => addSongToGigPlaylist(song.id)}
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

  // Gig Modal
  if (showGigModal && editingGig) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-2xl p-8 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">
              {gigs.find(g => g.id === editingGig.id) ? 'Edit Gig' : 'Create New Gig'}
            </h2>
            <button onClick={() => setShowGigModal(false)} className="text-white">
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
                placeholder="e.g. The Blue Note"
              />
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
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-white/30"
              >
                <option value="">No playlist (use master)</option>
                {gigPlaylists.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.songs.length} songs)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={async () => {
                try {
                  const location = await getUserLocation();
                  setEditingGig({...editingGig, location});
                  alert('✅ Location captured!');
                } catch (error) {
                  alert('Error getting location: ' + error.message);
                }
              }}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
            >
              📍 Capture Current Location
            </button>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveGig}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
              >
                <Check className="inline mr-2" size={20}/>Save Gig
              </button>
              <button
                onClick={() => setShowGigModal(false)}
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
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white mb-4">🎸 Live Gigs Near You</h2>
              {nearbyGigs.map(gig => (
                <div
                  key={gig.id}
                  onClick={() => {
                    setLiveGig(gig);
                    setMode('audience');
                  }}
                  className="bg-white/10 hover:bg-white/20 rounded-xl p-6 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-red-500 text-2xl">🔴</span>
                        <h3 className="text-2xl font-bold text-white">{gig.artistName}</h3>
                      </div>
                      <p className="text-purple-200 text-lg mb-2">📍 {gig.venueName}</p>
                      <p className="text-green-300 font-semibold">
                        {gig.distance < 1000 
                          ? `${gig.distance}m away` 
                          : `${(gig.distance/1000).toFixed(1)}km away`}
                      </p>
                    </div>
                    <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold">
                      Join Gig →
                    </button>
                  </div>
                </div>
              ))}
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
                      return (
                        <div key={gig.id} className="bg-white/5 p-6 rounded-xl">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-2">{gig.venueName}</h3>
                              <p className="text-purple-200">📅 {gig.date} at {gig.time}</p>
                              {gig.location && <p className="text-green-300 text-sm mt-1">📍 Location captured</p>}
                              {playlist && <p className="text-blue-300 text-sm mt-1">🎵 Playlist: {playlist.name} ({playlist.songs.length} songs)</p>}
                            </div>
                            <button
                              onClick={() => handleGoLive(gig)}
                              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold"
                            >
                              <Play className="inline mr-2" size={20}/>Go Live
                            </button>
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
            <h3 className="text-2xl font-bold text-white mb-4">🎵 Song Votes</h3>
            {Object.keys(liveGigData.votes).length === 0 ? (
              <p className="text-gray-300">No votes yet. Audience will vote when they're within 100m!</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(liveGigData.votes)
                  .sort(([,a], [,b]) => b - a)
                  .map(([songId, count]) => {
                    const song = liveGigData.queuedSongs.find(s => s.id == songId) || {};
                    return (
                      <div key={songId} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-white">{song.title || `Song ${songId}`} - {song.artist || 'Unknown'}</span>
                        <span className="text-pink-300 font-bold">❤️ {count} votes</span>
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
                {liveGigData.queuedSongs.slice(0, 10).map((song, index) => (
                  <div key={song.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-purple-300 font-bold text-xl">{index + 1}</span>
                      <div>
                        <div className="text-white font-semibold">{song.title}</div>
                        <div className="text-purple-200 text-sm">{song.artist}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(song.id)}
                      className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold"
                    >
                      ❤️ Vote
                    </button>
                  </div>
                ))}
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
