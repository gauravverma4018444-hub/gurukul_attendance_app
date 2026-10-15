const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Full paths to the downloaded tools (WITHOUT extra quotes around the string)
const MONGODUMP_PATH = 'E:\\mongodb-database-tools-windows-x86_64-100.19.1\\mongodb-database-tools-windows-x86_64-100.19.1\\bin\\mongodump.exe';
const MONGORESTORE_PATH = 'E:\\mongodb-database-tools-windows-x86_64-100.19.1\\mongodb-database-tools-windows-x86_64-100.19.1\\bin\\mongorestore.exe';

const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const upload = multer({ dest: TEMP_DIR });

// Helper to get Mongo URI from .env
const getMongoURI = () => {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
};

// ==========================================
// 1. GENERATE BACKUP
// ==========================================
router.get('/generate', (req, res) => {
  const MONGO_URI = getMongoURI();

  // 1. Verify URI exists
  if (!MONGO_URI) {
    console.error('Backup Error: MONGO_URI is undefined in .env');
    return res.status(500).json({ 
      message: 'Database connection string (MONGO_URI / MONGODB_URI) is missing in .env' 
    });
  }

  // 2. Verify mongodump executable exists
  if (!fs.existsSync(MONGODUMP_PATH)) {
    console.error(`Backup Error: mongodump.exe not found at ${MONGODUMP_PATH}`);
    return res.status(500).json({ 
      message: `mongodump.exe not found at path: ${MONGODUMP_PATH}` 
    });
  }

  const fileName = `Gurukul_Backup_${new Date().toISOString().slice(0, 10)}.gz`;
  const filePath = path.join(TEMP_DIR, fileName);

  const args = [
    `--uri=${MONGO_URI}`,
    `--archive=${filePath}`,
    '--gzip'
  ];

  // Using execFile avoids Windows cmd.exe quote-parsing bugs
  execFile(MONGODUMP_PATH, args, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup Error: ${error.message}`);
      if (stderr) console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ message: "Failed to generate database backup." });
    }

    res.download(filePath, fileName, (downloadErr) => {
      if (downloadErr) {
        console.error('Download Error:', downloadErr);
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });
});

// ==========================================
// 2. RESTORE DATABASE
// ==========================================
router.post('/restore', upload.single('backupFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No backup file uploaded." });
  }

  const MONGO_URI = getMongoURI();

  if (!MONGO_URI) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Database connection string missing in .env" });
  }

  if (!fs.existsSync(MONGORESTORE_PATH)) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ 
      message: `mongorestore.exe not found at path: ${MONGORESTORE_PATH}` 
    });
  }

  const filePath = req.file.path;
  const args = [
    `--uri=${MONGO_URI}`,
    `--archive=${filePath}`,
    '--gzip',
    '--drop'
  ];

  execFile(MONGORESTORE_PATH, args, (error, stdout, stderr) => {
    // Delete temp uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (error) {
      console.error(`Restore Error: ${error.message}`);
      if (stderr) console.error(`Stderr: ${stderr}`);
      return res.status(500).json({ message: "Failed to restore database." });
    }

    res.status(200).json({ message: "Database restored successfully!" });
  });
});

module.exports = router;