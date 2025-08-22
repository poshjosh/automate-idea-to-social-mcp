#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const zlib = require('zlib');
const os = require('os');

/**
 * Gets the age of a directory in days
 * @param {string} directoryPath - Path to the directory
 * @returns {number} - Age of the directory in days
 * @throws {Error} - If directory doesn't exist or cannot be accessed
 */
function getDirectoryAgeInDays(directoryPath) {
  try {
    const stats = fs.statSync(directoryPath);

    if (!stats.isDirectory()) {
      throw new Error(`Path "${directoryPath}" is not a directory`);
    }

    const createdTime = stats.birthtime || stats.mtime;
    const modifiedTime = stats.mtime;
    const directoryTime = createdTime < modifiedTime ? createdTime : modifiedTime;

    const currentTime = new Date();
    const ageInMilliseconds = currentTime - directoryTime;
    return ageInMilliseconds / (1000 * 60 * 60 * 24);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Directory "${directoryPath}" does not exist`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied accessing directory "${directoryPath}"`);
    }
    throw error;
  }
}

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;

    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(outputPath);
        return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        return reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlinkSync(outputPath);
        reject(err);
      });
    }).on('error', (err) => {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

async function extractZip(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    try {
      // Read the zip file
      const zipData = fs.readFileSync(zipPath);

      // Simple ZIP file parser for extracting files
      let offset = 0;
      const entries = [];

      // Find central directory
      let centralDirOffset = -1;
      for (let i = zipData.length - 22; i >= 0; i--) {
        if (zipData.readUInt32LE(i) === 0x06054b50) { // End of central directory signature
          centralDirOffset = zipData.readUInt32LE(i + 16);
          break;
        }
      }

      if (centralDirOffset === -1) {
        throw new Error('Invalid ZIP file: Central directory not found');
      }

      // Read central directory entries
      offset = centralDirOffset;
      while (offset < zipData.length - 22) {
        if (zipData.readUInt32LE(offset) !== 0x02014b50) break; // Central directory file header signature

        const fileNameLength = zipData.readUInt16LE(offset + 28);
        const extraFieldLength = zipData.readUInt16LE(offset + 30);
        const commentLength = zipData.readUInt16LE(offset + 32);
        const localHeaderOffset = zipData.readUInt32LE(offset + 42);

        const fileName = zipData.toString('utf8', offset + 46, offset + 46 + fileNameLength);

        entries.push({
          fileName,
          localHeaderOffset
        });

        offset += 46 + fileNameLength + extraFieldLength + commentLength;
      }

      // Extract files
      for (const entry of entries) {
        const localOffset = entry.localHeaderOffset;

        // Read local file header
        if (zipData.readUInt32LE(localOffset) !== 0x04034b50) {
          continue; // Skip invalid entries
        }

        const compressionMethod = zipData.readUInt16LE(localOffset + 8);
        const compressedSize = zipData.readUInt32LE(localOffset + 18);
        const uncompressedSize = zipData.readUInt32LE(localOffset + 22);
        const fileNameLength = zipData.readUInt16LE(localOffset + 26);
        const extraFieldLength = zipData.readUInt16LE(localOffset + 28);

        const dataOffset = localOffset + 30 + fileNameLength + extraFieldLength;
        const compressedData = zipData.slice(dataOffset, dataOffset + compressedSize);

        const fullPath = path.join(extractPath, entry.fileName);

        // Skip if it's a directory
        if (entry.fileName.endsWith('/')) {
          fs.mkdirSync(fullPath, { recursive: true });
          continue;
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });

        let fileData;
        if (compressionMethod === 0) {
          // No compression
          fileData = compressedData;
        } else if (compressionMethod === 8) {
          // Deflate compression
          try {
            fileData = zlib.inflateRawSync(compressedData);
          } catch (err) {
            console.warn(`Warning: Could not decompress ${entry.fileName}, trying as raw data`);
            fileData = compressedData;
          }
        } else {
          console.warn(`Warning: Unsupported compression method ${compressionMethod} for ${entry.fileName}`);
          fileData = compressedData;
        }

        fs.writeFileSync(fullPath, fileData);
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function runCommand(command, cwd) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`✓ Command completed: ${command}`);
  } catch (error) {
    console.error(`✗ Command failed: ${command}`);
    throw error;
  }
}

async function main() {

  try {
    console.log('Starting auto-setup process...');

    const projectName = 'automate-idea-to-social-mcp';
    const projectRef = 'main';
    const zipUrl = `https://github.com/poshjosh/${projectName}/archive/refs/heads/${projectRef}.zip`;
    const targetDir = path.join(os.homedir(), `.${projectName}`);
    const updateIntervalDays = 7;

    console.log(`ZIP URL: ${zipUrl}`);
    console.log(`Target directory: ${targetDir}`);

    // Check if directory exists
    if (fs.existsSync(targetDir) && getDirectoryAgeInDays(targetDir) <= updateIntervalDays) {
      console.log('✓ Directory already exists, skipping download and extraction');
    } else {
      console.log(`Directory does not exist, or is older than ${updateIntervalDays} days, proceeding with download...`);

      // Create parent directories if they don't exist
      const parentDir = path.dirname(targetDir);
      fs.mkdirSync(parentDir, { recursive: true });

      // Download zip file to a temporary location
      const tempZipPath = path.join(os.tmpdir(), 'temp-download.zip');
      console.log(`Downloading zip file to ${tempZipPath}...`);
      await downloadFile(zipUrl, tempZipPath);
      console.log('✓ Download completed');

      // Extract zip file
      console.log(`Extracting zip file to ${targetDir}...`);
      await extractZip(tempZipPath, targetDir);
      console.log('✓ Extraction completed');

      // Delete the zip file
      fs.unlinkSync(tempZipPath);
      console.log(`✓ Temporary zip file deleted: ${tempZipPath}`);
    }

    // Compose project dir
    const projectDir = path.join(targetDir, `${projectName}-${projectRef}`);
    console.log(`Project directory: ${projectDir}`);

    // Run npm install
    console.log('Installing dependencies...');
    runCommand('npm install', projectDir);

    // Run npm run build
    console.log('Building project...');
    runCommand('npm run build', projectDir);

    // Run the built application
    console.log('Running application...');
    runCommand('node ./build/index.js', projectDir);

    console.log('✓ Setup and execution completed successfully!');

  } catch (error) {
    console.error('✗ Error occurred:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main();