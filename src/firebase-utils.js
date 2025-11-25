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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
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
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await createOrUpdateUser(result.user);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const signInWithFacebook = async () => {
  const provider = new FacebookAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await createOrUpdateUser(result.user);
    return result.user;
  } catch (error) {
    console.error('Facebook sign-in error:', error);
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
    
    const now = new Date();
    const endTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // 5 hours from NOW
    
    const gigDocument = {
      ...gigData,
      artistId,
      geohash,
      location: new GeoPoint(gigData.location.lat, gigData.location.lng),
      status: gigData.status || 'live',
      startTime: now,
      scheduledEndTime: endTime,
      votes: {},
      voteTimestamps: {},
      comments: [],
      donations: [],
      playedSongs: []
    };
    
    console.log('💾 Saving gig to Firebase:', gigDocument);
    console.log('⏰ Scheduled end time:', endTime);
    
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
    const now = new Date();
    const endTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // 5 hours from NOW
    
    await updateDoc(gigRef, {
      status: 'live',
      startTime: now,
      scheduledEndTime: endTime,
      queuedSongs: queuedSongs,
      masterPlaylist: masterPlaylist,
      votes: {},
      voteTimestamps: {},
      comments: [],
      donations: [],
      playedSongs: []
    });
    
    console.log('✅ Gig updated to live');
    console.log('⏰ Scheduled end time:', endTime);
    return gigId;
  } catch (error) {
    console.error('❌ Error updating gig:', error);
    throw error;
  }
};

// Extend gig time by specified hours
export const extendGigTime = async (gigId, hoursToAdd = 1) => {
  try {
    console.log(`⏱️ Extending gig time by ${hoursToAdd} hour(s)`);
    
    const gigRef = doc(db, 'liveGigs', gigId);
    const gigDoc = await getDoc(gigRef);
    
    if (!gigDoc.exists()) {
      throw new Error('Gig not found');
    }
    
    const currentEndTime = gigDoc.data().scheduledEndTime?.toDate() || new Date(Date.now() + (5 * 60 * 60 * 1000));
    const newEndTime = new Date(currentEndTime.getTime() + (hoursToAdd * 60 * 60 * 1000));
    
    await updateDoc(gigRef, {
      scheduledEndTime: newEndTime
    });
    
    console.log('✅ Gig time extended to:', newEndTime);
    return newEndTime;
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
    
    // Increment vote count
    const gigRef = doc(db, 'liveGigs', String(gigId));
    const gigSnap = await getDoc(gigRef);
    const currentVotes = gigSnap.data()?.votes || {};
    const songKey = String(songId);
    
    await updateDoc(gigRef, {
      [`votes.${songKey}`]: (currentVotes[songKey] || 0) + 1
    });
    
    return true;
  } catch (error) {
    console.error('Error recording vote:', error);
    throw error;
  }
};

// Task 21: Check if artist has any active live gig
export const getActiveLiveGigForArtist = async (artistEmail) => {
  try {
    const q = query(
      collection(db, 'liveGigs'),
      where('artistEmail', '==', artistEmail),
      where('status', '==', 'live')
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const gigDoc = snapshot.docs[0];
      return { id: gigDoc.id, ...gigDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error checking active gigs:', error);
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
    const profileRef = doc(db, 'userProfiles', userId);
    
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
    console.log('✅ Artist profile saved');
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
    const profileRef = doc(db, 'userProfiles', userId);
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
    
    if (!profile) return false;
    
    return !!(
      profile.artistName &&
      profile.fullName &&
      profile.bio &&
      profile.bio.length >= 50 &&
      profile.genre &&
      profile.location
    );
  } catch (error) {
    console.error('❌ Error checking profile:', error);
    return false;
  }
};

/**
 * Send email verification
 */
export const sendEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    
    if (user.emailVerified) {
      console.log('✅ Email already verified');
      return true;
    }
    
    await user.sendEmailVerification();
    console.log('📧 Verification email sent');
    return true;
  } catch (error) {
    console.error('❌ Error sending verification:', error);
    throw error;
  }
};

/**
 * Check if email is verified
 */
export const checkEmailVerified = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    
    await user.reload(); // Refresh user data
    return user.emailVerified;
  } catch (error) {
    console.error('❌ Error checking verification:', error);
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

// ===================================
// RE-EXPORT FIREBASE UTILITIES
// ===================================
// Only re-export Firebase SDK imports that App.jsx uses
// All custom functions are already exported with 'export const' above

export {
  // Firebase Auth
  auth,
  onAuthStateChanged,
  
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
  getDocs,
  
  // Firestore Data Types & Utilities
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  GeoPoint
};
