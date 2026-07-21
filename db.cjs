const mongoose = require('mongoose');

// default connection URL (local mongodb)
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/topnet-registry';

// connect to the database (accepts custom uri for embedded server)
async function connectDB(customUri) {
  let uri = customUri || mongoURI;

  try {
    // ensure the URI directs to the topnet-registry database instead of default "test" or random memory server DB
    const urlObj = new URL(uri);
    urlObj.pathname = '/topnet-registry';
    uri = urlObj.toString();

    await mongoose.connect(uri);
    console.log('MongoDB connected successfully at', uri);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

// schema for system users
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true, trim: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'AGENT', 'READER'], default: 'READER' }
});

const commentSchema = new mongoose.Schema({
  id: String,
  user: String,
  date: Date,
  text: String
}, { _id: false });

const historySchema = new mongoose.Schema({
  date: Date,
  action: String,
  user: String
}, { _id: false });

// schema for registry documents (courriers)
const courrierSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  reference: { type: String },
  type: { type: String, enum: ['INCOMING', 'OUTGOING'], required: true },
  date: { type: Date, required: true },
  sender: { type: String },
  senderContact: { type: String },
  senderAddress: { type: String },
  recipientDept: { type: String, required: true },
  recipientName: { type: String },
  subject: { type: String },
  category: { type: String, required: true },
  status: { type: String, enum: ['RECEIVED', 'HOLD', 'DELIVERED'], default: 'RECEIVED' },
  fileName: { type: String },
  fileSize: { type: String },
  fileData: { type: String }, // stores file attachment base64 payload if any
  departReference: { type: String }, // linked Départ reference
  departFileName: { type: String },  // linked Départ file name
  departFileData: { type: String },  // linked Départ file data (base64)
  comments: [commentSchema],
  history: [historySchema],
  createdBy: { type: String },
  createdByUsername: { type: String }
});

const User = mongoose.model('User', userSchema);
const Courrier = mongoose.model('Courrier', courrierSchema);

module.exports = {
  connectDB,
  User,
  Courrier
};
