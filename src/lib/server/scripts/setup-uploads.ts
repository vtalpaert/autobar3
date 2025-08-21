import { mkdir, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get uploads directory from environment or use default
const uploadsDir = process.env.UPLOADS_PATH || 'uploads';

async function setupUploadsDirectory() {
  console.log(`Setting up uploads directory: ${uploadsDir}`);
  
  try {
    // Create uploads directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
      console.log(`Created directory: ${uploadsDir}`);
    } else {
      console.log(`Directory already exists: ${uploadsDir}`);
    }
    
    // Set secure permissions: owner read/write/execute only (700)
    // This ensures only the server process can access the uploads
    await chmod(uploadsDir, 0o700);
    console.log('Set secure permissions (700) - owner access only');
    
    console.log('Uploads directory setup complete');
    
  } catch (error) {
    console.error('Error setting up uploads directory:', error);
    process.exit(1);
  }
}

setupUploadsDirectory();
