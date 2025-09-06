import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatbotRoutes from './src/routes/botRoutes.js'
import mongoose from 'mongoose';
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use("/api/chatbot", chatbotRoutes);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_DB_DATA, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);

})