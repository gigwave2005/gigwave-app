const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// 🔄 Auto-cancel expired gigs every hour
exports.autoCleanupExpiredGigs = functions.pubsub
  .schedule('0 * * * *') // Run every hour at :00
  .timeZone('America/New_York') // Adjust to your timezone
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
      
      // Prepare batch update
      const batch = db.batch();
      let batchCount = 0;
      
      for (const doc of gigsSnapshot.docs) {
        const gig = doc.data();
        
        // Check if gig has date and time
        if (gig.date && gig.time) {
          // Parse scheduled time
          const gigDateTime = new Date(`${gig.date}T${gig.time}`);
          const expiryTime = new Date(gigDateTime.getTime() + (5 * 60 * 60 * 1000)); // +5 hours
          
          // Check if expired
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
          }
        }
      }
      
      // Commit batch updates
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully cancelled ${cancelledGigs.length} expired gig(s):`);
        cancelledGigs.forEach(gig => {
          console.log(`   - ${gig.venueName} (${gig.scheduledTime})`);
        });
      } else {
        console.log('✅ No expired gigs found. All gigs are within their time window.');
      }
      
      return {
        success: true,
        cancelledCount: cancelledGigs.length,
        cancelledGigs: cancelledGigs.map(g => g.venueName)
      };
      
    } catch (error) {
      console.error('❌ Error in auto-cleanup function:', error);
      throw error;
    }
  });

// 🧪 Test function - can be called manually for testing
exports.testCleanupGigs = functions.https.onRequest(async (req, res) => {
  try {
    console.log('🧪 Manual test triggered');
    const result = await exports.autoCleanupExpiredGigs.run();
    res.json({
      success: true,
      message: 'Cleanup completed',
      result: result
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
