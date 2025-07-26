import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from 'mongoose';
import userRouter from './routes/user.js';
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(userRouter);

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/mcp_users')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// Create MCP Server
const mcpServer = new McpServer({
  name: "User Registration Server",
  version: "1.0.0"
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

// Initialize MCP server
async function initMcpServer() {
  console.log('Initializing MCP server...');
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('MCP Server is running');
}

initMcpServer();
