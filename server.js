// Root server.js file for Render deployment
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import path from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the actual server directory
const serverDir = path.join(__dirname, 'server');

// Start the server from the correct directory
const serverProcess = spawn('node', ['index.js'], {
  cwd: serverDir,
  stdio: 'inherit',
  env: { ...process.env }
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server process:', err);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});