// Uploads web/dist (the Vite build) to the front-end FTP server configured in web/.env.
import ftp from 'basic-ftp';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

async function deploy() {
  const localDir = path.join(root, 'dist');
  if (!fs.existsSync(localDir)) {
    throw new Error('dist folder not found. Please run "npm run build" first.');
  }
  for (const key of ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD']) {
    if (!process.env[key]) throw new Error(`${key} is not set in web/.env`);
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    console.log('Connecting to FTP server...');
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      port: parseInt(process.env.FTP_PORT || '21'),
      secure: false,
    });
    console.log('############# DEPLOYING WEB TO FTP SERVER #############', localDir);
    await client.uploadFromDir(localDir);
    console.log('Web deployment completed successfully!');
  } finally {
    client.close();
  }
}

deploy().catch((err) => {
  console.error('Web deployment failed:', err);
  process.exit(1);
});
