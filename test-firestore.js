const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../google-drive-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://abhimusickeys-default-rtdb.firebaseio.com"
  });

  const db = admin.firestore();

  console.log('Firebase Admin initialized successfully');

  // Test Firestore connection
  async function testFirestore() {
    try {
      console.log('Testing Firestore connection...');
      
      // Try to get a document from the payments collection
      const snapshot = await db.collection('payments').limit(1).get();
      console.log('Firestore query successful. Found', snapshot.size, 'documents');
      
      if (snapshot.size > 0) {
        const doc = snapshot.docs[0];
        console.log('Sample document:', doc.id, doc.data());
      } else {
        console.log('No documents found in payments collection');
      }
      
      console.log('Firestore connection test passed!');
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }

  testFirestore();

} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  console.error('Error details:', error.message);
  console.error('Error stack:', error.stack);
}
