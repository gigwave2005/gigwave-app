const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// 🔄 SCHEDULED FUNCTION: Runs every hour
exports.autoCleanupExpiredGigs = functions.pubsub
  .schedule('0 * * * *') // Every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
  .timeZone('America/New_York') // Change to your timezone
  .onRun(async (context) => {
    console.log('🔍 Starting auto-cleanup of expired gigs...');
    
    try {
      const now = new Date();
      const cancelledGigs = [];
      
      // Query all upcoming/confirmed gigs
      const gigsSnapshot = await db.collection('gigs')
        .where('status', 'in', ['upcoming', 'confirmed'])
        .get();
      
      console.log(`📊 Found ${gigsSnapshot.size} gigs to check`);
      
      // Check each gig
      const batch = db.batch();
      let batchCount = 0;
      
      for (const doc of gigsSnapshot.docs) {
        const gig = doc.data();
        
        // Only check gigs with date and time
        if (gig.date && gig.time) {
          // Combine date and time into a Date object
          const gigDateTime = new Date(`${gig.date}T${gig.time}`);
          const expiryTime = new Date(gigDateTime.getTime() + (5 * 60 * 60 * 1000)); // +5 hours
          
          // If current time is past expiry time, cancel the gig
          if (now > expiryTime) {
            console.log(`⏰ Auto-cancelling expired gig: ${gig.venueName} (scheduled: ${gig.date} ${gig.time})`);
            
            batch.update(doc.ref, {
              status: 'cancelled',
              cancelReason: 'Auto-cancelled: Not started within 5 hours of scheduled time',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            cancelledGigs.push({
              id: doc.id,
              venueName: gig.venueName,
              scheduledTime: gigDateTime.toISOString()
            });
            
            batchCount++;
            
            // Firestore batch limit is 500 operations
            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
        }
      }
      
      // Commit any remaining updates
      if (batchCount > 0) {
        await batch.commit();
      }
      
      if (cancelledGigs.length > 0) {
        console.log(`✅ Auto-cancelled ${cancelledGigs.length} expired gig(s):`, 
          cancelledGigs.map(g => g.venueName).join(', '));
        
        // Optional: Send email notification to artists
        // await sendCancellationEmails(cancelledGigs);
      } else {
        console.log('✅ No expired gigs found');
      }
      
      return {
        success: true,
        cancelledCount: cancelledGigs.length,
        cancelledGigs: cancelledGigs
      };
      
    } catch (error) {
      console.error('❌ Error in auto-cleanup function:', error);
      throw error;
    }
  });

// 🔄 ALTERNATIVE: Check every 30 minutes
// exports.autoCleanupExpiredGigs = functions.pubsub
//   .schedule('*/30 * * * *') // Every 30 minutes
//   .timeZone('America/New_York')
//   .onRun(async (context) => { ... });

// 🔄 ALTERNATIVE: Check every day at 2 AM
// exports.autoCleanupExpiredGigs = functions.pubsub
//   .schedule('0 2 * * *') // Daily at 2:00 AM
//   .timeZone('America/New_York')
//   .onRun(async (context) => { ... });
