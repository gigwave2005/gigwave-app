import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase-utils';
import { BarChart3, Users, Music, Calendar, TrendingUp, Activity, Clock, DollarSign } from 'lucide-react';

// Admin email - ONLY THIS EMAIL CAN ACCESS
const ADMIN_EMAIL = 'gig.wave.2005@gmail.com';

const AdminDashboard = ({ currentUser, visitorCount, onClose }) => {
  const [stats, setStats] = useState({
    totalArtists: 0,
    totalGigs: 0,
    liveGigs: 0,
    completedGigs: 0,
    totalAudience: 0,
    totalVotes: 0,
    totalSongRequests: 0,
    recentSignups: [],
    recentGigs: [],
    loading: true
  });

  const [timeRange, setTimeRange] = useState('all'); // 'today', 'week', 'month', 'all'

  // ✅ ALL HOOKS MUST COME BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    // Only fetch if user is admin
    if (currentUser?.email === ADMIN_EMAIL) {
      fetchAnalytics();
    }
  }, [timeRange, currentUser]);

  const fetchAnalytics = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      // Calculate time range
      const now = Date.now();
      let startTime = 0;
      
      if (timeRange === 'today') {
        startTime = now - (24 * 60 * 60 * 1000);
      } else if (timeRange === 'week') {
        startTime = now - (7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'month') {
        startTime = now - (30 * 24 * 60 * 60 * 1000);
      }

      // Fetch Artists
      const artistsRef = collection(db, 'artists');
      let artistsQuery = query(artistsRef);
      
      if (startTime > 0) {
        artistsQuery = query(artistsRef, where('createdAt', '>=', startTime));
      }
      
      const artistsSnap = await getDocs(artistsQuery);
      const totalArtists = artistsSnap.size;

      // Get recent artist signups
      const recentArtistsQuery = query(artistsRef, orderBy('createdAt', 'desc'), limit(10));
      const recentArtistsSnap = await getDocs(recentArtistsQuery);
      const recentSignups = recentArtistsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch Live Gigs
      const liveGigsRef = collection(db, 'liveGigs');
      const liveGigsSnap = await getDocs(liveGigsRef);
      const totalGigs = liveGigsSnap.size;

      // Count votes and requests across all gigs
      let totalVotes = 0;
      let totalSongRequests = 0;
      let totalAudienceMembers = new Set();

      liveGigsSnap.docs.forEach(doc => {
        const gigData = doc.data();
        
        // Count votes
        if (gigData.votes) {
          totalVotes += Object.values(gigData.votes).reduce((sum, v) => sum + v, 0);
        }
        
        // Count song requests
        if (gigData.songRequests) {
          totalSongRequests += gigData.songRequests.length;
        }

        // Count unique audience members
        if (gigData.audienceTracking?.joinedUsers) {
          Object.keys(gigData.audienceTracking.joinedUsers).forEach(userId => {
            totalAudienceMembers.add(userId);
          });
        }
      });

      // Get recent gigs
      const recentGigsQuery = query(liveGigsRef, orderBy('startTime', 'desc'), limit(10));
      const recentGigsSnap = await getDocs(recentGigsQuery);
      const recentGigs = recentGigsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch Gig Playlists (scheduled gigs)
      const gigPlaylistsRef = collection(db, 'gigPlaylists');
      const gigPlaylistsSnap = await getDocs(gigPlaylistsRef);
      const scheduledGigs = gigPlaylistsSnap.size;

      setStats({
        totalArtists,
        totalGigs,
        liveGigs: liveGigsSnap.docs.filter(d => d.data().isActive).length,
        completedGigs: liveGigsSnap.docs.filter(d => !d.data().isActive).length,
        scheduledGigs,
        totalAudience: totalAudienceMembers.size,
        totalVotes,
        totalSongRequests,
        recentSignups,
        recentGigs,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // ✅ ADMIN CHECK MOVED AFTER ALL HOOKS
  if (currentUser?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl text-red-500 mb-4">🚫 Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (stats.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-neon mx-auto mb-4"></div>
          <p className="text-neon text-xl">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neon mb-2" style={{textShadow: '0 0 20px #39FF14'}}>
              🎸 GigWave Admin Dashboard
            </h1>
            <p className="text-gray-400">Real-time analytics and insights</p>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all"
          >
            ✕ Close
          </button>
        </div>

        {/* ✅ ADD VISITOR COUNTER HERE */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-6xl">📊</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-300 mb-1">Website Visitors</h2>
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-bold text-cyan-400">
                  {visitorCount?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-400 text-sm">all-time visits</div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex gap-2 mb-6">
          {['today', 'week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                timeRange === range
                  ? 'bg-neon text-black'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Total Artists */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="text-purple-400" size={32} />
              <span className="text-3xl">🎤</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Artists</h3>
            <p className="text-4xl font-bold text-white">{stats.totalArtists}</p>
          </div>

          {/* Total Gigs */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 border border-cyan-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="text-cyan-400" size={32} />
              <span className="text-3xl">🎸</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Gigs</h3>
            <p className="text-4xl font-bold text-white">{stats.totalGigs}</p>
            <p className="text-xs text-cyan-300 mt-1">
              {stats.liveGigs} live • {stats.completedGigs} completed
            </p>
          </div>

          {/* Total Audience */}
          <div className="bg-gradient-to-br from-pink-500/20 to-pink-700/20 border border-pink-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="text-pink-400" size={32} />
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Unique Audience</h3>
            <p className="text-4xl font-bold text-white">{stats.totalAudience}</p>
          </div>

          {/* Total Engagement */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-700/20 border border-green-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="text-green-400" size={32} />
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Votes</h3>
            <p className="text-4xl font-bold text-white">{stats.totalVotes}</p>
          </div>

        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Music className="text-cyan-400" size={24} />
              <h3 className="text-white font-bold">Song Requests</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats.totalSongRequests}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-purple-400" size={24} />
              <h3 className="text-white font-bold">Scheduled Gigs</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{stats.scheduledGigs || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-green-400" size={24} />
              <h3 className="text-white font-bold">Avg Votes/Gig</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {stats.totalGigs > 0 ? Math.round(stats.totalVotes / stats.totalGigs) : 0}
            </p>
          </div>

        </div>

        {/* Recent Activity Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Artist Signups */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-electric mb-4">
              🎤 Recent Artist Signups
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentSignups.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No recent signups</p>
              ) : (
                stats.recentSignups.map((artist, index) => (
                  <div key={artist.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold">{artist.artistName || 'Unknown Artist'}</p>
                        <p className="text-gray-400 text-xs">{artist.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-neon text-xs">
                          {artist.createdAt ? new Date(artist.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Gigs */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-magenta mb-4">
              🎸 Recent Gigs
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentGigs.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No recent gigs</p>
              ) : (
                stats.recentGigs.map((gig, index) => (
                  <div key={gig.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-white font-bold">{gig.artistName}</p>
                        <p className="text-gray-400 text-xs">{gig.venue || 'Unknown Venue'}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        gig.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {gig.isActive ? '🟢 LIVE' : '⚫ ENDED'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>👥 {gig.audienceTracking?.currentlyActive || 0} active</span>
                      <span>⚡ {Object.values(gig.votes || {}).reduce((sum, v) => sum + v, 0)} votes</span>
                      <span>🎵 {(gig.songRequests || []).length} requests</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-neon hover:bg-neon/80 text-black font-bold rounded-lg transition-all"
          >
            🔄 Refresh Data
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;