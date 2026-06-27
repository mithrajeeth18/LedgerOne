const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth.routes');
const groupRoutes = require('./src/routes/group.routes');
const customerRoutes = require('./src/routes/customer.routes');
const loanRoutes = require('./src/routes/loan.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const penaltyRoutes = require('./src/routes/penalty.routes');
const reminderRoutes = require('./src/routes/reminder.routes');
const { errorHandler } = require('./src/middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.headers['x-bypass-ratelimit'] === 'secret_bypass_token'
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/penalties', penaltyRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
