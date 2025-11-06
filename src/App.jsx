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
  const [mode, setMode] = useState('discover'); // 'discover', 'artist', 'live'
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyGigs, setNearbyGigs] = useState([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [liveGig, setLiveGig] = useState(null);
  const [liveGigData, setLiveGigData] = useState({
    votes: {},
    comments: [],
    donations: [],
    queuedSongs: [],
    currentSong: null
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
        currentSong: gigData.currentSong || null
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

  // Discovery Landing Page
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
                    setSelectedGig(gig);
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

  // Simple audience view when viewing a gig
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
            <h3 className="text-2xl font-bold text-white mb-4">📋 Up Next</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🎸</div>
            <h2 className="text-3xl font-bold text-white mb-4">Go Live!</h2>
            <p className="text-green-200 mb-6">Start a live performance now</p>
            <button
              onClick={async () => {
                try {
                  const location = await getUserLocation();
                  const venueName = prompt('Enter venue name:');
                  if (!venueName) return;
                  
                  const gigData = {
                    artistName: currentUser.displayName || 'Artist',
                    venueName: venueName,
                    location: location,
                    queuedSongs: [],
                    status: 'live'
                  };
                  
                  const gigId = await createLiveGig(gigData, currentUser.uid);
                  setLiveGig({...gigData, id: gigId});
                  setMode('live');
                  
                  alert(`✅ You're live!\n\nShare: ${window.location.origin}\n\nAudience can find you by searching nearby!`);
                } catch (error) {
                  alert('Error: ' + error.message);
                }
              }}
              className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xl shadow-lg"
            >
              🔴 Start Live Gig
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-400 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-3xl font-bold text-white mb-4">Your Stats</h2>
            <div className="space-y-3 text-left">
              <div className="flex justify-between text-blue-200">
                <span>Total Gigs:</span>
                <span className="font-bold text-white">0</span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span>Total Earnings:</span>
                <span className="font-bold text-white">$0</span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span>Followers:</span>
                <span className="font-bold text-white">0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-4">🎵 Quick Start Guide</h3>
          <div className="space-y-4 text-purple-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-bold text-white">Click "Start Live Gig"</p>
                <p className="text-sm">Enter your venue name and allow location access</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-bold text-white">Share with your audience</p>
                <p className="text-sm">They can find you by searching nearby gigs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-bold text-white">See votes & donations in real-time</p>
                <p className="text-sm">Audience must be within 100m to interact</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live Mode (Simplified for now)
if (mode === 'live' && liveGig) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto pt-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white">🔴 LIVE: {liveGig.venueName}</h1>
            <p className="text-teal-200 text-lg">Gig ID: {liveGig.id}</p>
          </div>
          <button
            onClick={async () => {
              if (window.confirm('End this gig?')) {
                await firebaseEndLiveGig(liveGig.id);
                setMode('artist');
                setLiveGig(null);
                alert('✅ Gig ended!');
              }
            }}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
          >
            ⏹️ End Gig
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-500/20 border border-green-400 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {Object.keys(liveGigData.votes).length}
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
            <p className="text-gray-300">No votes yet. Audience can vote when they're within 100m!</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(liveGigData.votes)
                .sort(([,a], [,b]) => b - a)
                .map(([songId, count]) => (
                  <div key={songId} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                    <span className="text-white">Song ID: {songId}</span>
                    <span className="text-pink-300 font-bold">❤️ {count} votes</span>
                  </div>
                ))}
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
