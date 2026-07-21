const mongoose = require('mongoose');

async function clean() {
  const uri = 'mongodb://127.0.0.1:27027/topnet-registry';
  console.log('Connecting to embedded MongoDB...');
  try {
    await mongoose.connect(uri);
    console.log('Connected.');

    // 1. Wipe all courriers
    console.log('Wiping courriers collection...');
    const courrierRes = await mongoose.connection.collection('courriers').deleteMany({});
    console.log(`Deleted ${courrierRes.deletedCount} courriers.`);

    // 2. Clear users and seed default admin/agent accounts
    console.log('Wiping and seeding users collection...');
    await mongoose.connection.collection('users').deleteMany({});
    
    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      fullName: String,
      password: String,
      role: String
    }));

    await User.create([
      { username: 'admin', fullName: 'Administrateur BO', password: 'admin', role: 'ADMIN' },
      { username: 'agent', fullName: 'Agent Bureau d\'Ordre', password: 'agent', role: 'AGENT' }
    ]);
    console.log('Successfully seeded default users: admin, agent.');

  } catch (err) {
    console.error('Error during database cleanup:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

clean();
