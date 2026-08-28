import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { ENV } from './config/env';
import { registerAllAgents } from './agents/configs/registerAllAgents';
import { authMiddleware } from './middleware/auth';

// Route imports
import authRoutes from './routes/auth.routes';
import hospitalRoutes from './routes/hospital.routes';
import patientRoutes from './routes/patient.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import treatmentRoutes from './routes/treatment.routes';
import clinicalNoteRoutes from './routes/clinicalNote.routes';
import prescriptionRoutes from './routes/prescription.routes';
import labRoutes from './routes/lab.routes';
import billingRoutes from './routes/billing.routes';
import telehealthRoutes from './routes/telehealth.routes';
import communicationRoutes from './routes/communication.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';
import dbHealthRoutes from './routes/dbHealth.routes';

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(authMiddleware);

// Initialize Shared Agent Framework
registerAllAgents();

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Nexa Health AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    llmProvider: ENV.LLM_PROVIDER,
  });
});
app.use('/api/health', dbHealthRoutes);

// Modular REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/clinical-notes', clinicalNoteRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/telehealth', telehealthRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io Real-time Signaling & Events
io.on('connection', (socket) => {
  console.log(`[SOCKET.IO] Client connected: ${socket.id}`);

  // Telehealth Room Joining
  socket.on('join-room', (roomId: string, userId: string) => {
    socket.join(roomId);
    console.log(`[SOCKET.IO] User ${userId} joined telehealth room: ${roomId}`);
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', (data: { roomId: string; sdp: any; senderId: string }) => {
    socket.to(data.roomId).emit('signal-offer', data);
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', (data: { roomId: string; sdp: any; senderId: string }) => {
    socket.to(data.roomId).emit('signal-answer', data);
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('signal-candidate', (data: { roomId: string; candidate: any; senderId: string }) => {
    socket.to(data.roomId).emit('signal-candidate', data);
  });

  // Telehealth Chat
  socket.on('telehealth-chat', (data: { roomId: string; message: any }) => {
    io.to(data.roomId).emit('telehealth-chat', data.message);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = ENV.PORT;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🩺 Nexa Health AI API & Agent Server Active on port ${PORT}`);
  console.log(` 🏥 Mode: ${ENV.NODE_ENV} | LLM Provider: ${ENV.LLM_PROVIDER}`);
  console.log(` 🌐 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

export { app, server, io };
