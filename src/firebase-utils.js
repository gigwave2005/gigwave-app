// Firebase Configuration and Utilities
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
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
  onAuthStateChanged
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
        // Get all gigs (live + upcoming)
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
      snap.forEach((doc) => {
        const gigData = doc.data();
        console.log('📄 Found gig:', doc.id, gigData);
        
        const gigLocation = {
          lat: gigData.location.latitude,
          lng: gigData.location.longitude
        };
        
        const distance = calculateDistance(userLocation, gigLocation);
        console.log('📏 Distance:', distance, 'meters');
        
        // Only include live or upcoming gigs (not ended)
        if (distance <= radiusKm * 1000 && gigData.status !== 'ended') {
          console.log('✅ Gig within range!');
          gigs.push({
            id: doc.id,
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
    
    // Sort by status (live first) then distance
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
    
    // Check if gig with this uniqueKey already exists
    if (gigData.uniqueKey) {
      const existingQuery = query(
        collection(db, 'liveGigs'),
        where('uniqueKey', '==', gigData.uniqueKey),
        where('status', '==', 'live')
      );
      
      const existingGigs = await getDocs(existingQuery);
      
      if (!existingGigs.empty) {
        console.log('⚠️ Gig already exists!');
        const existingGig = existingGigs.docs[0];
        return existingGig.id; // Return existing gig ID
      }
    }
    
    const gigRef = doc(collection(db, 'liveGigs'));
    const geohash = geohashForLocation([gigData.location.lat, gigData.location.lng]);
    
    console.log('🗺️ Generated geohash:', geohash);
    
    const gigDocument = {
      ...gigData,
      artistId,
      geohash,
      location: new GeoPoint(gigData.location.lat, gigData.location.lng),
      status: 'live',
      startTime: serverTimestamp(),
      votes: {},
      voteTimestamps: {},
      comments: [],
      donations: []
    };
    
    console.log('💾 Saving gig to Firebase:', gigDocument);
    
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
  
  return onSnapshot(gigRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      
      // Convert Firestore Timestamps to safe formats
      const safeData = {
        ...data,
        startTime: data.startTime?.toDate?.() || null,
        endTime: data.endTime?.toDate?.() || null,
        // Convert nested timestamp objects in votes, comments, etc
        voteTimestamps: data.voteTimestamps ? 
          Object.fromEntries(
            Object.entries(data.voteTimestamps).map(([key, val]) => [
              key, 
              val?.toDate?.() || val
            ])
          ) : {},
        comments: (data.comments || []).map(c => ({
          ...c,
          timestamp: c.timestamp?.toDate?.() || c.timestamp
        })),
        donations: (data.donations || []).map(d => ({
          ...d,
          timestamp: d.timestamp?.toDate?.() || d.timestamp
        })),
        ratings: (data.ratings || []).map(r => ({
          ...r,
          timestamp: r.timestamp?.toDate?.() || r.timestamp
        }))
      };
      
      console.log('📡 Live gig data updated safely');
      callback({ id: doc.id, ...safeData });
    }
  });
};

export const voteForSong = async (gigId, songId, userId, userLocation, venueLocation) => {
  console.log('🗳️ Vote attempt - User location:', userLocation);
  console.log('🗳️ Vote attempt - Venue location:', venueLocation);
  
  const distance = calculateDistance(userLocation, venueLocation);
  console.log('📏 Distance to venue:', distance, 'meters');
  
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error(`You must be within 100m of the venue to vote! You are ${Math.round(distance)}m away.`);
  }
  
  const gigRef = doc(db, 'liveGigs', gigId);
  await updateDoc(gigRef, {
    [`votes.${songId}`]: increment(1),
    [`voteTimestamps.${songId}`]: serverTimestamp()
  });
  
  console.log('✅ Vote recorded for song:', songId);
};

export const addComment = async (gigId, userId, userName, text, userLocation, venueLocation) => {
  const distance = calculateDistance(userLocation, venueLocation);
  
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error(`You must be within 100m of the venue to comment! You are ${Math.round(distance)}m away.`);
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
  
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error(`You must be within 100m of the venue to donate! You are ${Math.round(distance)}m away.`);
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

export { db, auth, onAuthStateChanged, serverTimestamp, GeoPoint };
