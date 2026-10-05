import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import exceptionRoutes from './routes/exceptionRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors({
  origin: '*', // Allow client connections
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    platform: 'Invoice & Vendor Payment Automation Platform API',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Global 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found on this server.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 InvoiceX – Invoice & Vendor Payment Automation Platform API Server`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🗄️ Database: PostgreSQL Relational Engine`);
  console.log(`🔑 Demo Accounts:`);
  console.log(`   - Admin:         admin@invoicex.local   / Password@123`);
  console.log(`   - Finance Staff: finance@invoicex.local / Password@123`);
  console.log(`   - AP Approver:   manager@invoicex.local / Password@123`);
  console.log(`================================================================`);
});
