// Firebase Configuration and Utilities
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  setDoc, 
  getDoc, 
  query,
  where,
  orderBy,     // ← ADD THIS
  limit,       // ← ADD THIS
  getDocs,
  onSnapshot,
  serverTimestamp,
  GeoPoint,
  increment
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,  // 🍎 ADD THIS LINE
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  reload as firebaseReload
} from 'firebase/auth';
import { 
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween
} from 'geofire-common';

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyC3kQTbaNNYojEIx1jaU9p0C8K4ue7NFIs",
  authDomain: "gigwave-397a4.firebaseapp.com",
  projectId: "gigwave-397a4",
  storageBucket: "gigwave-397a4.firebasestorage.app",
  messagingSenderId: "253503195277",
  appId: "1:253503195277:web:c6c109ccee6fdbd9c57ac4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// GEOLOCATION UTILITIES
// ============================================

export const calculateDistance = (point1, point2) => {
  return distanceBetween(
    [point1.lat, point1.lng],
    [point2.lat, point2.lng]
  ) * 1000; // Convert km to meters
};

export const isWithinRange = (userLocation, venueLocation, radiusMeters = 100) => {
  const distance = calculateDistance(userLocation, venueLocation);
  return distance <= radiusMeters;
};

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

export const searchNearbyGigs = async (userLocation, radiusKm = 50, statusFilter = null) => {
  try {
    console.log('🔍 SEARCH DEBUG: Starting search...');
    console.log('📍 User Location:', userLocation);
    console.log('📏 Search Radius:', radiusKm, 'km');
    console.log('🎯 Status Filter:', statusFilter || 'all');
    
    const center = [userLocation.lat, userLocation.lng];
    const bounds = geohashQueryBounds(center, radiusKm * 1000);
    
    console.log('🗺️ Geohash bounds:', bounds);
    
    const promises = [];
    for (const bound of bounds) {
      let q;
      if (statusFilter) {
        q = query(
          collection(db, 'liveGigs'),
          where('geohash', '>=', bound[0]),
          where('geohash', '<=', bound[1]),
          where('status', '==', statusFilter)
        );
      } else {
        q = query(
          collection(db, 'liveGigs'),
          where('geohash', '>=', bound[0]),
          where('geohash', '<=', bound[1])
        );
      }
      promises.push(getDocs(q));
    }

    console.log('⏳ Querying Firebase...');
    const snapshots = await Promise.all(promises);
    
    console.log('📦 Query results:', snapshots.map(s => s.size));
    
    const gigs = [];
    let totalDocs = 0;

    for (const snap of snapshots) {
      totalDocs += snap.size;
      snap.forEach((snapDoc) => {
        const gigData = snapDoc.data();
        console.log('📄 Found gig:', snapDoc.id, gigData);
        
        const gigLocation = {
          lat: gigData.location.latitude,
          lng: gigData.location.longitude
        };
        
        const distance = calculateDistance(userLocation, gigLocation);
        console.log('📏 Distance:', distance, 'meters');
        
        if (distance <= radiusKm * 1000 && gigData.status !== 'ended' && gigData.status !== 'cancelled') {
          console.log('✅ Gig within range!');
          gigs.push({
            id: snapDoc.id,
            ...gigData,
            distance: Math.round(distance)
          });
        } else {
          console.log('❌ Gig filtered out');
        }
      });
    }

    console.log('🎯 Total docs found:', totalDocs);
    console.log('✅ Gigs within range:', gigs.length);
    
    return gigs.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;
      return a.distance - b.distance;
    });
  } catch (error) {
    console.error('❌ Error searching gigs:', error);
    return [];
  }
};

// ============================================
// AUTHENTICATION
// ============================================

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error; // Re-throw so App.jsx can handle it
  }
};

export const signInWithFacebook = async () => {
  try {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    throw error; // Re-throw so App.jsx can handle it
  }
};

// 🍎 Sign in with Apple
export const signInWithApple = async () => {
  try {
    console.log('🍎 Initiating Apple Sign-In...');
    
    const provider = new OAuthProvider('apple.com');
    
    // Optional: Request additional scopes
    provider.addScope('email');
    provider.addScope('name');
    
    // Use popup for web
    const result = await signInWithPopup(auth, provider);
    
    console.log('✅ Apple Sign-In successful');
    console.log('👤 User:', result.user.email);
    
    return result.user;
  } catch (error) {
    console.error('❌ Apple Sign-In error:', error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

const createOrUpdateUser = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || null,
      type: 'audience',
      createdAt: serverTimestamp()
    });
  }
};

// ============================================
// LIVE GIG OPERATIONS
// ============================================

export const createLiveGig = async (gigData, artistId) => {
  try {
    console.log('🎸 Creating live gig...');
    console.log('📍 Location:', gigData.location);
    
    const gigRef = doc(collection(db, 'liveGigs'));
    const geohash = geohashForLocation([gigData.location.lat, gigData.location.lng]);
    
    console.log('🗺️ Generated geohash:', geohash);
    
    // ✅ FIX: Use milliseconds timestamp instead of Date object
    const nowMs = Date.now();
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    const endTimeMs = nowMs + fiveHoursMs;
    
    const gigDocument = {
      ...gigData,
      artistId,
      geohash,
      location: new GeoPoint(gigData.location.lat, gigData.location.lng),
      status: gigData.status || 'live',
      
      // ✅ FIXED: Store as milliseconds timestamp (number)
      actualStartTimeMs: nowMs,          // When "Go Live" was clicked
      scheduledEndTimeMs: endTimeMs,     // When gig will auto-end (5 hours from now)
      
      // Keep old fields for backwards compatibility
      actualStartTime: new Date(nowMs),
      startTime: new Date(nowMs),
      scheduledEndTime: new Date(endTimeMs),
      
      votes: {},
      voteTimestamps: {},
      comments: [],
      donations: [],
      playedSongs: []
    };
    
    console.log('💾 Saving gig to Firebase:', gigDocument);
    console.log('⏰ Actual start time (ms):', nowMs, '→', new Date(nowMs).toISOString());
    console.log('⏰ Scheduled end time (ms):', endTimeMs, '→', new Date(endTimeMs).toISOString());
    
    await setDoc(gigRef, gigDocument);
    
    console.log('✅ Gig created with ID:', gigRef.id);
    
    return gigRef.id;
  } catch (error) {
    console.error('❌ Error creating gig:', error);
    throw error;
  }
};

export const listenToLiveGig = (gigId, callback) => {
  const gigRef = doc(db, 'liveGigs', gigId);
  
  return onSnapshot(gigRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      const convertTimestamps = (obj) => {
        if (!obj) return obj;
        
        if (obj?.toDate && typeof obj.toDate === 'function') {
          return obj.toDate();
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => convertTimestamps(item));
        }
        
        if (typeof obj === 'object') {
          const converted = {};
          for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertTimestamps(value);
          }
          return converted;
        }
        
        return obj;
      };
      
      const safeData = convertTimestamps(data);
      
      console.log('📡 Live gig data updated safely');
      callback({ id: docSnap.id, ...safeData });
    }
  }, (error) => {
    console.error('❌ Error listening to live gig:', error);
  });
};

export const voteForSong = async (gigId, songId, userId, userLocation, venueLocation) => {
  console.log('🗳️ Vote attempt - User location:', userLocation);
  console.log('🗳️ Vote attempt - Venue location:', venueLocation);
  
  const distance = calculateDistance(userLocation, venueLocation);
  console.log('📏 Distance to venue:', distance, 'meters');
  
  if (!isWithinRange(userLocation, venueLocation, 1000)) {
    throw new Error(`You must be within 1km of the venue to vote! You are ${Math.round(distance)}m away.`);
  }
  
  const gigRef = doc(db, 'liveGigs', gigId);
  
  const cleanSongId = String(Math.floor(songId));
  const voteKey = `votes.${cleanSongId}`;
  const timestampKey = `voteTimestamps.${cleanSongId}.${userId}`;
  
  await updateDoc(gigRef, {
    [voteKey]: increment(1),
    [timestampKey]: serverTimestamp()
  });
  
  console.log('✅ Vote recorded for song:', cleanSongId);
};

export const addComment = async (gigId, userId, userName, text, userLocation, venueLocation) => {
  const distance = calculateDistance(userLocation, venueLocation);
  
  if (!isWithinRange(userLocation, venueLocation, 1000)) {
    throw new Error(`You must be within 1km of the venue to comment! You are ${Math.round(distance)}m away.`);
  }
  
  const gigRef = doc(db, 'liveGigs', gigId);
  const gigDoc = await getDoc(gigRef);
  const comments = gigDoc.data().comments || [];
  
  await updateDoc(gigRef, {
    comments: [...comments, {
      id: Date.now(),
      userId,
      userName,
      text,
      timestamp: serverTimestamp()
    }]
  });
};

export const processDonation = async (gigId, userId, userName, amount, message, userLocation, venueLocation) => {
  const distance = calculateDistance(userLocation, venueLocation);
  
  if (!isWithinRange(userLocation, venueLocation, 1000)) {
    throw new Error(`You must be within 1km of the venue to donate! You are ${Math.round(distance)}m away.`);
  }
  
  const gigRef = doc(db, 'liveGigs', gigId);
  const gigDoc = await getDoc(gigRef);
  const donations = gigDoc.data().donations || [];
  
  await updateDoc(gigRef, {
    donations: [...donations, {
      id: Date.now(),
      userId,
      userName,
      amount,
      message,
      timestamp: serverTimestamp()
    }],
    totalEarnings: increment(amount)
  });
};

export const endLiveGig = async (gigId) => {
  console.log('⏹️ Ending gig:', gigId);
  
  const gigRef = doc(db, 'liveGigs', gigId);
  await updateDoc(gigRef, {
    status: 'ended',
    endTime: serverTimestamp()
  });
  
  console.log('✅ Gig ended');
};

// Update existing gig to live status
export const updateGigToLive = async (gigId, queuedSongs, masterPlaylist) => {
  try {
    console.log('🔄 Updating gig to live:', gigId);
    
    const gigRef = doc(db, 'liveGigs', gigId);
    
    // ✅ FIX: Use milliseconds timestamp instead of Date object
    const nowMs = Date.now();
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    const endTimeMs = nowMs + fiveHoursMs;
    
    console.log('⏰ Current time (ms):', nowMs, '→', new Date(nowMs).toISOString());
    console.log('⏰ Calculated end time (ms):', endTimeMs, '→', new Date(endTimeMs).toISOString());
    
    await updateDoc(gigRef, {
      status: 'live',
      
      // ✅ FIXED: Store as milliseconds timestamp (number)
      actualStartTimeMs: nowMs,          // When "Go Live" was clicked
      scheduledEndTimeMs: endTimeMs,     // ALWAYS 5 hours from NOW
      
      // Keep old fields for backwards compatibility
      actualStartTime: new Date(nowMs),
      startTime: new Date(nowMs),
      scheduledEndTime: new Date(endTimeMs),
      
      queuedSongs: queuedSongs,
      masterPlaylist: masterPlaylist,
      votes: {},
      voteTimestamps: {},
      comments: [],
      donations: [],
      playedSongs: []
    });
    
    console.log('✅ Gig updated to live');
    console.log('⏰ New end time (ms):', endTimeMs);
    
    return gigId;
  } catch (error) {
    console.error('❌ Error updating gig:', error);
    throw error;
  }
};

/**
 * Extend the scheduled end time of a live gig
 * @param {string} gigId - The gig ID
 * @param {number} additionalMinutes - Minutes to add (default: 60)
 */
export const extendGigTime = async (gigId, additionalMinutes = 60) => {
  try {
    console.log(`⏰ Extending gig time by ${additionalMinutes} minutes...`);
    
    const gigRef = doc(db, 'liveGigs', gigId);
    const gigSnap = await getDoc(gigRef);
    
    if (!gigSnap.exists()) {
      throw new Error('Gig not found');
    }
    
    const gigData = gigSnap.data();
    
    // ✅ PRIORITY: Use milliseconds timestamp
    let newEndTimeMs;
    
    if (gigData.scheduledEndTimeMs) {
      // Extend from current scheduled end time
      newEndTimeMs = gigData.scheduledEndTimeMs + (additionalMinutes * 60 * 1000);
    } else if (gigData.scheduledEndTime) {
      // Fallback: Convert old timestamp and extend
      const oldEndTime = gigData.scheduledEndTime?.toDate?.() || new Date(gigData.scheduledEndTime);
      newEndTimeMs = oldEndTime.getTime() + (additionalMinutes * 60 * 1000);
    } else {
      // Last resort: Extend from now
      newEndTimeMs = Date.now() + (additionalMinutes * 60 * 1000);
    }
    
    console.log('⏰ New end time (ms):', newEndTimeMs, '→', new Date(newEndTimeMs).toISOString());
    
    await updateDoc(gigRef, {
      scheduledEndTimeMs: newEndTimeMs,
      scheduledEndTime: new Date(newEndTimeMs) // For backwards compatibility
    });
    
    console.log(`✅ Gig time extended by ${additionalMinutes} minutes`);
    console.log('⏰ New end time:', new Date(newEndTimeMs).toISOString());
    
    return newEndTimeMs;
  } catch (error) {
    console.error('❌ Error extending gig time:', error);
    throw error;
  }
};

// Auto-cancel gigs that weren't started 5 hours after scheduled time
export const checkAndCancelExpiredGigs = async (userId) => {
  try {
    console.log('🔍 Checking for expired gigs...');
    const now = new Date();
    const cancelledGigs = [];
    
    // Query all upcoming/confirmed gigs for this artist
    const gigsRef = collection(db, 'gigs');
    const q = query(
      gigsRef,
      where('artistId', '==', userId),
      where('status', 'in', ['upcoming', 'confirmed'])
    );
    
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      const gig = { id: docSnap.id, ...docSnap.data() };
      
      // Only check gigs that have a date and time
      if (gig.date && gig.time) {
        // Combine date and time into a Date object
        const gigDateTime = new Date(`${gig.date}T${gig.time}`);
        const expiryTime = new Date(gigDateTime.getTime() + (5 * 60 * 60 * 1000)); // +5 hours
        
        // If current time is past expiry time, cancel the gig
        if (now > expiryTime) {
          console.log(`⏰ Auto-cancelling expired gig: ${gig.venueName}`);
          
          const gigRef = doc(db, 'gigs', gig.id);
          await updateDoc(gigRef, {
            status: 'cancelled',
            cancelReason: 'Auto-cancelled: Not started within 5 hours of scheduled time',
            cancelledAt: now
          });
          
          cancelledGigs.push(gig.venueName);
        }
      }
    }
    
    if (cancelledGigs.length > 0) {
      console.log(`✅ Auto-cancelled ${cancelledGigs.length} expired gig(s):`, cancelledGigs);
      return cancelledGigs;
    }
    
    console.log('✅ No expired gigs found');
    return [];
  } catch (error) {
    console.error('❌ Error checking expired gigs:', error);
    return [];
  }
};

// Auto-swap songs based on votes
export const checkAndSwapSongs = async (gigId, gigData) => {
  try {
    console.log('🔄 Checking for song swaps...');
    
    const queuedSongs = gigData.queuedSongs || [];
    const masterPlaylist = gigData.masterPlaylist || [];
    const votes = gigData.votes || {};
    const playedSongs = gigData.playedSongs || [];
    
    const unplayedGigSongs = queuedSongs.filter(song => !playedSongs.includes(song.id));
    
    if (unplayedGigSongs.length === 0) {
      console.log('⚠️ No unplayed gig songs to swap');
      return;
    }
    
    const gigSongIds = queuedSongs.map(s => s.id);
    const availableMasterSongs = masterPlaylist.filter(song => !gigSongIds.includes(song.id));
    
    if (availableMasterSongs.length === 0) {
      console.log('⚠️ No master songs available for swap');
      return;
    }
    
    const lowestGigSong = unplayedGigSongs.reduce((lowest, song) => {
      const lowestVotes = votes[Math.floor(lowest.id)] || 0;
      const currentVotes = votes[Math.floor(song.id)] || 0;
      return currentVotes < lowestVotes ? song : lowest;
    });
    
    const lowestGigVotes = votes[Math.floor(lowestGigSong.id)] || 0;
    console.log(`📊 Lowest gig song: ${lowestGigSong.title} with ${lowestGigVotes} votes`);
    
    const highestMasterSong = availableMasterSongs.reduce((highest, song) => {
      const highestVotes = votes[Math.floor(highest?.id)] || 0;
      const currentVotes = votes[Math.floor(song.id)] || 0;
      return currentVotes > highestVotes ? song : highest;
    }, availableMasterSongs[0]);
    
    const highestMasterVotes = votes[Math.floor(highestMasterSong.id)] || 0;
    console.log(`📊 Highest master song: ${highestMasterSong.title} with ${highestMasterVotes} votes`);
    
    if (highestMasterVotes > lowestGigVotes) {
      console.log(`🔄 SWAPPING: ${highestMasterSong.title} (${highestMasterVotes}) replaces ${lowestGigSong.title} (${lowestGigVotes})`);
      
      const newQueue = queuedSongs
        .filter(song => song.id !== lowestGigSong.id)
        .concat([highestMasterSong])
        .sort((a, b) => {
          const votesA = votes[Math.floor(a.id)] || 0;
          const votesB = votes[Math.floor(b.id)] || 0;
          return votesB - votesA;
        });
      
      const gigRef = doc(db, 'liveGigs', gigId);
      await updateDoc(gigRef, {
        queuedSongs: newQueue
      });
      
      console.log('✅ Swap completed!');
      return true;
    } else {
      console.log('✅ No swap needed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in checkAndSwapSongs:', error);
    return false;
  }
};

// Delete a gig from Firebase
export const deleteGigFromFirebase = async (gigId) => {
  try {
    console.log('🗑️ Deleting gig:', gigId);
    const gigRef = doc(db, 'liveGigs', gigId);
    await deleteDoc(gigRef);
    console.log('✅ Gig deleted from Firebase');
  } catch (error) {
    console.error('❌ Error deleting gig:', error);
    throw error;
  }
};

// Mark user as interested in a gig
export const markAsInterested = async (gigId, userId) => {
  try {
    const interestedRef = doc(db, 'liveGigs', gigId, 'interestedUsers', userId);
    await setDoc(interestedRef, {
      userId: userId,
      timestamp: serverTimestamp()
    });
    console.log('✅ Marked as interested');
  } catch (error) {
    console.error('❌ Error marking interested:', error);
    throw error;
  }
};

// Unmark user as interested
export const unmarkAsInterested = async (gigId, userId) => {
  try {
    const interestedRef = doc(db, 'liveGigs', gigId, 'interestedUsers', userId);
    await deleteDoc(interestedRef);
    console.log('✅ Unmarked as interested');
  } catch (error) {
    console.error('❌ Error unmarking interested:', error);
    throw error;
  }
};

// Get interested count for a gig
export const getInterestedCount = async (gigId) => {
  try {
    const interestedRef = collection(db, 'liveGigs', gigId, 'interestedUsers');
    const snapshot = await getDocs(interestedRef);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting interested count:', error);
    return 0;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in with email:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Email sign-in error:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await createOrUpdateUser(userCredential.user);
    
    console.log('✅ Signed up with email:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Email sign-up error:', error);
    throw error;
  }
};

// Task 20: Check if user already voted for a song in this gig
export const hasUserVoted = async (gigId, songId, userId) => {
  try {
    const voteRef = doc(db, 'liveGigs', String(gigId), 'votes', `${userId}_${songId}`);
    const voteSnap = await getDoc(voteRef);
    return voteSnap.exists();
  } catch (error) {
    console.error('Error checking vote:', error);
    return false;
  }
};

// Task 20: Record user vote
export const recordUserVote = async (gigId, songId, userId) => {
  try {
    const voteRef = doc(db, 'liveGigs', String(gigId), 'votes', `${userId}_${songId}`);
    await setDoc(voteRef, {
      userId,
      songId,
      gigId: String(gigId),
      timestamp: serverTimestamp()
    });
    
    // Increment vote count AND track last vote time
    const gigRef = doc(db, 'liveGigs', String(gigId));
    const gigSnap = await getDoc(gigRef);
    const gigData = gigSnap.data();
    const currentVotes = gigData?.votes || {};
    const lastVoteTime = gigData?.lastVoteTime || {}; // ✅ GET CURRENT
    const songKey = String(songId);
    
    // ✅ UPDATE: Track last vote time
    lastVoteTime[songKey] = new Date().toISOString();
    
    await updateDoc(gigRef, {
      [`votes.${songKey}`]: (currentVotes[songKey] || 0) + 1,
      lastVoteTime: lastVoteTime // ✅ SAVE TIMESTAMP
    });
    
    console.log('✅ Vote recorded with timestamp');
    return true;
  } catch (error) {
    console.error('Error recording vote:', error);
    throw error;
  }
};

// Task 21: Check if artist has any active live gig
export const getActiveLiveGigForArtist = async (artistId) => {
  try {
    console.log('🔍 Checking for active live gigs for artist:', artistId);
    
    const q = query(
      collection(db, 'liveGigs'),
      where('artistId', '==', artistId),
      where('status', '==', 'live')
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const gigDoc = snapshot.docs[0];
      const gigData = { id: gigDoc.id, ...gigDoc.data() };
      
      console.log('✅ Active live gig found:', gigData.venueName);
      return gigData;
    }
    
    console.log('✅ No active live gigs found');
    return null;
  } catch (error) {
    console.error('❌ Error checking active gigs:', error);
    return null;
  }
};

// ===================================
// ARTIST PROFILE FUNCTIONS
// ===================================

/**
 * Create or update artist profile
 */
export const saveArtistProfile = async (userId, profileData) => {
  try {
    // ✅ FIXED: Save to users/{userId}/profile/data instead of userProfiles/{userId}
    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    
    const profileToSave = {
      ...profileData,
      updatedAt: serverTimestamp(),
      profileComplete: !!(
        profileData.artistName &&
        profileData.fullName &&
        profileData.bio &&
        profileData.genre &&
        profileData.location
      )
    };
    
    // If new profile, add createdAt
    const existingProfile = await getDoc(profileRef);
    if (!existingProfile.exists()) {
      profileToSave.createdAt = serverTimestamp();
    }
    
    await setDoc(profileRef, profileToSave, { merge: true });
    console.log('✅ Artist profile saved to users/{uid}/profile/data');
    return profileToSave;
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    throw error;
  }
};

/**
 * Get artist profile by user ID
 */
export const getArtistProfile = async (userId) => {
  try {
    // ✅ FIXED: Read from users/{userId}/profile/data
    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return { id: profileSnap.id, ...profileSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting profile:', error);
    throw error;
  }
};

/**
 * Check if artist profile is complete
 */
  export const isProfileComplete = async (userId) => {
    try {
      const profile = await getArtistProfile(userId);
      console.log('🔍 isProfileComplete - profile:', profile);
      
      if (!profile) {
        console.log('🔍 isProfileComplete - No profile, returning false');
        return false;
      }
      
      const checks = {
        artistName: !!profile.artistName,
        fullName: !!profile.fullName,
        bio: !!profile.bio,
        bioLength: profile.bio && profile.bio.length >= 50,
        genre: !!profile.genre,
        location: !!profile.location
      };
      
      console.log('🔍 isProfileComplete - checks:', checks);
      
      const complete = !!(
        profile.artistName &&
        profile.fullName &&
        profile.bio &&
        profile.bio.length >= 50 &&
        profile.genre &&
        profile.location
      );
      
      console.log('🔍 isProfileComplete - result:', complete);
      return complete;
    } catch (error) {
      console.error('❌ Error checking profile:', error);
      return false;
    }
  };

/**
 * Upload profile photo to Firebase Storage
 */
export const uploadProfilePhoto = async (userId, file) => {
  try {
    // Note: You'll need to import and configure Firebase Storage
    // For now, we'll return a placeholder
    // TODO: Implement Firebase Storage upload
    console.log('📸 Profile photo upload - TODO: Implement Storage');
    return 'https://via.placeholder.com/150';
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    throw error;
  }
};

/**
 * Send email verification
 */
export const sendEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in. Please sign in first.');
    }
    
    if (user.emailVerified) {
      console.log('✅ Email already verified');
      return { success: true, message: 'Email already verified' };
    }
    
    await firebaseSendEmailVerification(user);
    console.log('📧 Verification email sent to:', user.email);
    
    return { success: true, message: 'Verification email sent! Check your inbox.' };
  } catch (error) {
    console.error('❌ Error sending verification:', error);
    
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please wait a few minutes and try again.');
    }
    
    throw new Error(error.message || 'Failed to send verification email');
  }
};

/**
 * Check if email is verified
 */
export const checkEmailVerified = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('⚠️ No user logged in');
      return false;
    }
    
    await firebaseReload(user);
    
    console.log('🔄 Email verification status:', user.emailVerified);
    return user.emailVerified;
  } catch (error) {
    console.error('❌ Error checking verification:', error);
    
    if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
      console.log('⚠️ User session expired');
      return false;
    }
    
    return false;
  }
};

// ========================================
// ADD THIS FUNCTION TO firebase-utils.js
// Insert it BEFORE the final export block (before line 897)
// ========================================

// 🎵 Submit a song request (FREE or PAID)
export const submitSongRequest = async (gigId, song, userId, userName, message, amount, isPaid) => {
  try {
    const gigRef = doc(db, 'liveGigs', String(gigId));
    
    // ✅ FIX: Use regular Date instead of serverTimestamp() in arrayUnion
    const requestData = {
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      songId: song.id,
      songTitle: song.title,
      songArtist: song.artist,
      requesterId: userId,
      requesterName: userName,
      message: message || '',
      amount: amount || 0,
      isPaid: isPaid || false,
      status: 'pending',
      timestamp: new Date().toISOString(), // ✅ Use regular Date string instead of serverTimestamp()
      createdAt: new Date() // ✅ Add this for sorting
    };
    
    // Get current song requests
    const gigSnap = await getDoc(gigRef);
    if (!gigSnap.exists()) {
      throw new Error('Gig not found');
    }
    
    const currentRequests = gigSnap.data().songRequests || [];
    
    // Add new request to the array
    const updatedRequests = [...currentRequests, requestData];
    
    // Update Firebase with the new array
    await updateDoc(gigRef, {
      songRequests: updatedRequests
    });
    
    console.log('✅ Song request submitted:', requestData);
    return requestData;
    
  } catch (error) {
    console.error('❌ Error submitting song request:', error);
    throw error;
  }
};

// Accept a song request
export const acceptSongRequest = async (gigId, requestId) => {
  try {
    const gigRef = doc(db, 'liveGigs', String(gigId));
    const gigSnap = await getDoc(gigRef);
    
    if (!gigSnap.exists()) {
      throw new Error('Live gig not found');
    }

    const gigData = gigSnap.data();
    const requests = gigData.songRequests || [];
    const currentQueue = gigData.queuedSongs || [];
    const maxQueueSize = gigData.maxQueueSize || 20;
    const masterPlaylist = gigData.masterPlaylist || [];
    const votes = gigData.votes || {};
    
    // Find the request
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      throw new Error('Request not found');
    }
    
    // Find the song in master playlist
    const requestedSong = masterPlaylist.find(s => s.id === request.songId);
    if (!requestedSong) {
      throw new Error('Requested song not found in master playlist');
    }
    
    // Check if song is already in queue
    const songAlreadyInQueue = currentQueue.some(s => s.id === requestedSong.id);
    if (songAlreadyInQueue) {
      console.log('⚠️ Song already in queue, just marking request as accepted');
      
      // Update request status only
      const updatedRequests = requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'accepted' }
          : req
      );
      
      await updateDoc(gigRef, {
        songRequests: updatedRequests
      });
      
      return;
    }
    
    // Build the final queue
    let finalQueue = [...currentQueue];
    
    // If queue is at max capacity, remove the LAST unplayed song
    const playedSongs = gigData.playedSongs || [];
    const unplayedQueue = finalQueue.filter(s => !playedSongs.includes(s.id));
    
    if (finalQueue.length >= maxQueueSize && unplayedQueue.length > 0) {
      console.log('🗑️ Queue at capacity, removing last unplayed song');
      
      // Find the last unplayed song
      const lastUnplayedIndex = finalQueue.map(s => s.id).lastIndexOf(unplayedQueue[unplayedQueue.length - 1].id);
      finalQueue.splice(lastUnplayedIndex, 1);
    }
    
    // Add the requested song to queue
    finalQueue.push(requestedSong);
    
    // Sort queue: Requested songs FIRST, then by votes, then original order
    const requestedSongIds = requests
      .filter(r => r.status === 'accepted')
      .map(r => r.songId);
    
    finalQueue.sort((a, b) => {
      const aIsRequested = requestedSongIds.includes(a.id);
      const bIsRequested = requestedSongIds.includes(b.id);
      const aVotes = votes[Math.floor(a.id)] || 0;
      const bVotes = votes[Math.floor(b.id)] || 0;
      
      // 1. Requested songs FIRST
      if (aIsRequested && !bIsRequested) return -1;
      if (!aIsRequested && bIsRequested) return 1;
      
      // 2. If both requested, most voted first
      if (aIsRequested && bIsRequested) {
        if (bVotes !== aVotes) return bVotes - aVotes;
        return 0;
      }
      
      // 3. If neither requested, sort by votes
      if (bVotes !== aVotes) return bVotes - aVotes;
      
      // 4. Keep original order
      return 0;
    });
    
    // Update Firebase
    const updatedRequests = requests.map(req => 
      req.id === requestId 
        ? { ...req, status: 'accepted' }
        : req
    );
    
    await updateDoc(gigRef, {
      songRequests: updatedRequests,
      queuedSongs: finalQueue
    });

    console.log('✅ Song request accepted and added to queue:', requestedSong.title);
  } catch (error) {
    console.error('❌ Error accepting request:', error);
    throw error;
  }
};

// Reject a song request
export const rejectSongRequest = async (gigId, requestId) => {
  try {
    const gigRef = doc(db, 'liveGigs', String(gigId));
    const gigSnap = await getDoc(gigRef);
    
    if (!gigSnap.exists()) {
      throw new Error('Live gig not found');
    }

    const gigData = gigSnap.data();
    const requests = gigData.songRequests || [];
    
    // Find and update the request status
    const updatedRequests = requests.map(req => 
      req.id === requestId 
        ? { ...req, status: 'rejected' }
        : req
    );
    
    await updateDoc(gigRef, {
      songRequests: updatedRequests
    });

    console.log('❌ Song request rejected:', requestId);
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    throw error;
  }
};

// Update jukebox/request settings
export const updateJukeboxSettings = async (gigId, settings) => {
  try {
    const gigRef = doc(db, 'liveGigs', String(gigId));
    
    await updateDoc(gigRef, {
      requestsEnabled: settings.requestsEnabled !== undefined ? settings.requestsEnabled : true,
      jukeboxMode: settings.jukeboxMode || false,
      jukeboxPrice: settings.jukeboxPrice || 0
    });

    console.log('✅ Request settings updated:', settings);
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    throw error;
  }
};

// Sort song requests by priority (pending first, then by amount, then by timestamp)
export const getSortedSongRequests = (requests) => {
  if (!requests || requests.length === 0) return [];
  
  return [...requests].sort((a, b) => {
    // First priority: pending requests before accepted/rejected
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    
    // Second priority: paid requests (higher amounts first)
    if (a.isPaid && !b.isPaid) return -1;
    if (!a.isPaid && b.isPaid) return 1;
    if (a.isPaid && b.isPaid && a.amount !== b.amount) {
      return b.amount - a.amount; // Higher amounts first
    }
    
    // Third priority: by timestamp (most recent first)
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });
};

// ===================================
// MASTER PLAYLIST & GIG PLAYLISTS SYNC
// ===================================

/**
 * Save master playlist to Firebase
 */
export const saveMasterPlaylist = async (userId, songs) => {
  try {
    const playlistRef = doc(db, 'artistData', userId);
    await setDoc(playlistRef, {
      masterSongs: songs,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ Master playlist saved to Firebase:', songs.length, 'songs');
  } catch (error) {
    console.error('❌ Error saving master playlist:', error);
    throw error;
  }
};

/**
 * Get master playlist from Firebase
 */
export const getMasterPlaylist = async (userId) => {
  try {
    const playlistRef = doc(db, 'artistData', userId);
    const playlistSnap = await getDoc(playlistRef);
    
    if (playlistSnap.exists()) {
      return playlistSnap.data().masterSongs || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting master playlist:', error);
    return [];
  }
};

/**
 * Save gig playlists to Firebase
 */
export const saveGigPlaylists = async (userId, playlists) => {
  try {
    const playlistRef = doc(db, 'artistData', userId);
    await setDoc(playlistRef, {
      gigPlaylists: playlists,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ Gig playlists saved to Firebase:', playlists.length, 'playlists');
  } catch (error) {
    console.error('❌ Error saving gig playlists:', error);
    throw error;
  }
};

/**
 * Get gig playlists from Firebase
 */
export const getGigPlaylists = async (userId) => {
  try {
    const playlistRef = doc(db, 'artistData', userId);
    const playlistSnap = await getDoc(playlistRef);
    
    if (playlistSnap.exists()) {
      return playlistSnap.data().gigPlaylists || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting gig playlists:', error);
    return [];
  }
};

/**
 * Listen to playlist changes in real-time
 */
export const listenToPlaylists = (userId, callback) => {
  const playlistRef = doc(db, 'artistData', userId);
  
  return onSnapshot(playlistRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        masterSongs: data.masterSongs || [],
        gigPlaylists: data.gigPlaylists || []
      });
      console.log('📡 Playlists updated from Firebase');
    }
  }, (error) => {
    console.error('❌ Error listening to playlists:', error);
  });
};

// ===================================
// RE-EXPORT FIREBASE UTILITIES
// ===================================
// Only re-export Firebase SDK imports that App.jsx uses
// All custom functions are already exported with 'export const' above

export {
  // Firebase Auth
  auth,
  firebaseOnAuthStateChanged as onAuthStateChanged,
  
  // Firestore Instance
  db,
  
  // Firestore Document Operations
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  
  // Firestore Query Operations
  collection,
  query,
  where,
  orderBy,     // ← ADD THIS
  limit,       // ← ADD THIS
  getDocs,
  onSnapshot,
  
  // Firestore Data Types & Utilities
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  GeoPoint
};
