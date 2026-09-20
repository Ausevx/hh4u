import app from './app';
import connectDB from './config/db';

const port = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
