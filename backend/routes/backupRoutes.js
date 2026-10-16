const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ✅ LINUX PATHS (installed via Render build command)
const MONGODUMP_PATH = './mongodb-tools/bin/mongodump';
const MONGORESTORE_PATH = './mongodb-tools/bin/mongorestore';

const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const upload = multer({ dest: TEMP_DIR });

const getMongoURI = () => {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
};

// ==========================================
// 1. GENERATE BACKUP
// ==========================================
router.get('/generate', (req, res) => {
  const MONGO_URI = getMongoURI();

  if (!MONGO_URI) {
    console.error('❌ Backup Error: MONGO_URI is undefined');
    return res.status(500).json({ 
      message: 'Database connection string missing in environment variables' 
    });
  }

  const fileName = `Gurukul_Backup_${new Date().toISOString().slice(0, 10)}.gz`;
  const filePath = path.join(TEMP_DIR, fileName);

  const args = [
    `--uri=${MONGO_URI}`,
    `--archive=${filePath}`,
    '--gzip'
  ];

  console.log('🔄 Starting backup generation...');

  execFile(MONGODUMP_PATH, args, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Backup Error: ${error.message}`);
      if (stderr) console.error(`📛 Stderr: ${stderr}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ 
        message: "Failed to generate database backup.",
        error: error.message 
      });
    }

    console.log('✅ Backup generated successfully');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Backup file not found after mongodump completed');
      return res.status(500).json({ message: "Backup file was not created." });
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      console.log('📥 Download completed, cleaning up temp file');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    fileStream.on('error', (downloadErr) => {
      console.error('❌ Download Error:', downloadErr);
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
    console.error('❌ Restore Error: MONGO_URI is undefined');
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Database connection string missing in environment variables" });
  }

  const filePath = req.file.path;
  
  console.log('🔄 Starting database restore...');

  const args = [
    `--uri=${MONGO_URI}`,
    `--archive=${filePath}`,
    '--gzip',
    '--drop'
  ];

  execFile(MONGORESTORE_PATH, args, (error, stdout, stderr) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Temp backup file deleted');
    }

    if (error) {
      console.error(`❌ Restore Error: ${error.message}`);
      if (stderr) console.error(`📛 Stderr: ${stderr}`);
      return res.status(500).json({ 
        message: "Failed to restore database.",
        error: error.message 
      });
    }

    console.log('✅ Database restored successfully');
    res.status(200).json({ message: "Database restored successfully!" });
  });
});

module.exports = router;