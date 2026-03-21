const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const studentAuthRouter = require('./routes/studentAuth');
const educatorAuthRouter = require('./routes/educatorAuth');
const adminAuthRouter = require('./routes/adminAuth');
const studyPlannerRouter = require('./routes/studyPlanner');

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/student/auth', studentAuthRouter);
app.use('/api/educator/auth', educatorAuthRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api', studyPlannerRouter);

app.get('/api/hello', (req, res) => res.json({ message: 'Hello from backend' }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Database: PostgreSQL via Prisma');
});
