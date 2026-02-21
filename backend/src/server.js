require('dotenv').config();
const express = require('express');
const cors = require('cors');
const leadRoutes = require('./routes/lead.routes');
const { errorMiddleware } = require('./middleware/error.middleware');
const logger = require('./services/logger.service');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', leadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
});
