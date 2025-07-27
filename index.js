import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRouter from './routes/user.js';
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(userRouter);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_DB_DATA, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Create MCP Server
/* const mcpServer = new McpServer({
  name: "User Registration Server",
  version: "1.0.0"
}); */

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

// Initialize MCP server
/* async function initMcpServer() {
  console.log('Initializing MCP server...');
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('MCP Server is running');
}

initMcpServer(); */
