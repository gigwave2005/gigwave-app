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

// YOUR FIREBASE CONFIG - Replace with your actual config!
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

export const searchNearbyGigs = async (userLocation, radiusKm = 5) => {
  try {
    const center = [userLocation.lat, userLocation.lng];
    const bounds = geohashQueryBounds(center, radiusKm);
    
    const promises = [];
    for (const bound of bounds) {
      const q = query(
        collection(db, 'liveGigs'),
        where('geohash', '>=', bound[0]),
        where('geohash', '<=', bound[1]),
        where('status', '==', 'live')
      );
      promises.push(getDocs(q));
    }

    const snapshots = await Promise.all(promises);
    const gigs = [];

    for (const snap of snapshots) {
      snap.forEach((doc) => {
        const gigData = doc.data();
        const gigLocation = {
          lat: gigData.location.latitude,
          lng: gigData.location.longitude
        };
        
        const distance = calculateDistance(userLocation, gigLocation);
        
        if (distance <= radiusKm * 1000) {
          gigs.push({
            id: doc.id,
            ...gigData,
            distance: Math.round(distance)
          });
        }
      });
    }

    return gigs.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error searching gigs:', error);
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
    const gigRef = doc(collection(db, 'liveGigs'));
    const geohash = geohashForLocation([gigData.location.lat, gigData.location.lng]);
    
    await setDoc(gigRef, {
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
    });
    
    return gigRef.id;
  } catch (error) {
    console.error('Error creating gig:', error);
    throw error;
  }
};

export const listenToLiveGig = (gigId, callback) => {
  const gigRef = doc(db, 'liveGigs', gigId);
  
  return onSnapshot(gigRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

export const voteForSong = async (gigId, songId, userId, userLocation, venueLocation) => {
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error('You must be within 100m of the venue to vote!');
  }
  
  const gigRef = doc(db, 'liveGigs', gigId);
  await updateDoc(gigRef, {
    [`votes.${songId}`]: increment(1),
    [`voteTimestamps.${songId}`]: serverTimestamp()
  });
};

export const addComment = async (gigId, userId, userName, text, userLocation, venueLocation) => {
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error('You must be within 100m of the venue to comment!');
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
  if (!isWithinRange(userLocation, venueLocation, 100)) {
    throw new Error('You must be within 100m of the venue to donate!');
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
  const gigRef = doc(db, 'liveGigs', gigId);
  await updateDoc(gigRef, {
    status: 'ended',
    endTime: serverTimestamp()
  });
};

export { db, auth, onAuthStateChanged, serverTimestamp, GeoPoint };
