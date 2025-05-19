import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// MongoDB Connection
const uri = `mongodb+srv://${encodeURIComponent(process.env.DB_USERNAME)}:${encodeURIComponent(process.env.DB_PASSWORD)}@cluster0.j3b3xbq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, { 
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db, students, announcements, messages;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('attendance_db');
    students = db.collection('students');
    announcements = db.collection('announcements');
    messages = db.collection('student_messages');

    await students.createIndex({ date: 1, name: 1 }, { unique: true });
    console.log('Connected to MongoDB');
    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Health check endpoint: http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

connectToDatabase();

// API Routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Attendance System API',
    status: 'running',
    documentation: 'Available endpoints: /health, /students, /announcements, /student-messages'
  });
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    await client.db().admin().ping();
    res.json({ 
      status: 'healthy', 
      database: 'connected', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Service unavailable',
      details: err.message 
    });
  }
});

// Create Student
app.post('/students', async (req, res) => {
  const { name, date, is_present = false } = req.body;
  
  if (!name || !date) {
    return res.status(400).json({ 
      status: 'error',
      error: 'Name and date are required' 
    });
  }

  try {
    const existing = await students.findOne({ name, date });
    if (existing) {
      return res.status(409).json({ 
        status: 'error',
        error: 'Student already exists for this date' 
      });
    }
    
    const student = { 
      name, 
      date, 
      is_present, 
      timestamp: new Date() 
    };
    
    const result = await students.insertOne(student);
    res.status(201).json({
      status: 'success',
      data: {
        ...student,
        _id: result.insertedId
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Update Attendance
app.put('/students/:name/:date', async (req, res) => {
  const { name, date } = req.params;
  const { is_present } = req.body;
  
  try {
    const result = await students.updateOne(
      { name, date },
      { $set: { is_present } },
      { upsert: false }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        status: 'error',
        error: 'Student not found' 
      });
    }
    
    const updated = await students.findOne({ name, date });
    res.json({
      status: 'success',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Get Students by Date
app.get('/students/:date', async (req, res) => {
  try {
    const data = await students.find({ date: req.params.date }).toArray();
    res.json({
      status: 'success',
      data: data
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Create Announcement
app.post('/announcements', async (req, res) => {
  const { content, author } = req.body;
  
  if (!content || !author) {
    return res.status(400).json({ 
      status: 'error',
      error: 'Content and author are required' 
    });
  }

  try {
    const doc = { content, author, timestamp: new Date() };
    const result = await announcements.insertOne(doc);
    res.status(201).json({
      status: 'success',
      data: {
        ...doc,
        _id: result.insertedId
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Get Announcements
app.get('/announcements', async (req, res) => {
  try {
    const data = await announcements.find().sort({ timestamp: -1 }).toArray();
    res.json({
      status: 'success',
      data: data
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Create Student Message
app.post('/student-messages', async (req, res) => {
  const { content, sender = 'Anonymous', contact_info = '' } = req.body;
  
  if (!content) {
    return res.status(400).json({ 
      status: 'error',
      error: 'Content is required' 
    });
  }

  try {
    const message = { content, sender, contact_info, timestamp: new Date() };
    const result = await messages.insertOne(message);
    res.status(201).json({
      status: 'success',
      data: {
        ...message,
        _id: result.insertedId
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Get Student Messages
app.get('/student-messages', async (req, res) => {
  try {
    const data = await messages.find().sort({ timestamp: -1 }).toArray();
    res.json({
      status: 'success',
      data: data
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Delete Message
app.delete('/student-messages/:messageId', async (req, res) => {
  try {
    const result = await messages.deleteOne({ _id: new ObjectId(req.params.messageId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        status: 'error',
        error: 'Message not found' 
      });
    }
    
    res.json({ 
      status: 'success',
      message: 'Message deleted'
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Clear Students
app.delete('/students', async (req, res) => {
  try {
    const result = await students.deleteMany({});
    res.json({
      status: 'success',
      message: `Deleted ${result.deletedCount} student records`
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Clear Announcements
app.delete('/announcements', async (req, res) => {
  try {
    const result = await announcements.deleteMany({});
    res.json({
      status: 'success',
      message: `Deleted ${result.deletedCount} announcements`
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      error: 'Server error',
      details: err.message 
    });
  }
});

// Handle client-side routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    error: 'Internal server error'
  });
});

process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});