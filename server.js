const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket server for real-time updates
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to ingest house point events
async function ingestHousePoint(event) {
  try {
    const housePoint = await prisma.housePoint.create({
      data: {
        id: event.id,
        category: event.category,
        points: event.points,
        timestamp: new Date(event.timestamp)
      }
    });
    
    console.log('Ingested house point:', housePoint);
    
    // Broadcast the new point to all connected clients
    broadcast({
      type: 'new_point',
      data: housePoint
    });
    
    return housePoint;
  } catch (error) {
    console.error('Error ingesting house point:', error);
    throw error;
  }
}

// API endpoint to manually ingest events
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    const result = await ingestHousePoint(event);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get house totals for different time windows
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { timeWindow = 'all' } = req.query;
    
    let whereClause = {};
    
    // Calculate time window
    if (timeWindow === '5min') {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      whereClause.timestamp = { gte: fiveMinutesAgo };
    } else if (timeWindow === '1hour') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      whereClause.timestamp = { gte: oneHourAgo };
    }
    
    // Get aggregated data by house
    const houseTotals = await prisma.housePoint.groupBy({
      by: ['category'],
      where: whereClause,
      _sum: {
        points: true
      },
      _count: {
        points: true
      }
    });
    
    // Format the response
    const leaderboard = houseTotals.map(house => ({
      house: house.category,
      points: house._sum.points || 0,
      events: house._count.points || 0
    })).sort((a, b) => b.points - a.points);
    
    res.json({
      timeWindow,
      leaderboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get recent events
app.get('/api/events/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentEvents = await prisma.housePoint.findMany({
      take: parseInt(limit),
      orderBy: { timestamp: 'desc' }
    });
    
    res.json(recentEvents);
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start data generator process
let dataGeneratorProcess = null;

function startDataGenerator() {
  if (dataGeneratorProcess) {
    console.log('Data generator already running');
    return;
  }
  
  console.log('Starting data generator...');
  dataGeneratorProcess = spawn('python3', ['data_gen.py'], {
    cwd: __dirname
  });
  
  dataGeneratorProcess.stdout.on('data', async (data) => {
    try {
      const lines = data.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        const event = JSON.parse(line);
        await ingestHousePoint(event);
      }
    } catch (error) {
      console.error('Error processing data generator output:', error);
    }
  });
  
  dataGeneratorProcess.stderr.on('data', (data) => {
    console.error('Data generator error:', data.toString());
  });
  
  dataGeneratorProcess.on('close', (code) => {
    console.log(`Data generator process exited with code ${code}`);
    dataGeneratorProcess = null;
  });
}

function stopDataGenerator() {
  if (dataGeneratorProcess) {
    console.log('Stopping data generator...');
    dataGeneratorProcess.kill();
    dataGeneratorProcess = null;
  }
}

// API endpoints to control data generator
app.post('/api/generator/start', (req, res) => {
  startDataGenerator();
  res.json({ success: true, message: 'Data generator started' });
});

app.post('/api/generator/stop', (req, res) => {
  stopDataGenerator();
  res.json({ success: true, message: 'Data generator stopped' });
});

app.get('/api/generator/status', (req, res) => {
  res.json({ 
    running: dataGeneratorProcess !== null,
    message: dataGeneratorProcess ? 'Running' : 'Stopped'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize Prisma
    await prisma.$connect();
    console.log('Connected to database');
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  stopDataGenerator();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
