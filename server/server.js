require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LedgerOne API Running 🚀',
  });
});
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
