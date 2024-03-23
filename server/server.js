require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require('multer');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB database");
});

// Define a schema for storing file information
const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
  // Add any other relevant fields you need
});

const File = mongoose.model('File', fileSchema);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage }).single('file');

// Route to handle file upload
app.post("/uploadFile", (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: "Failed to upload file." });
    }

    if (!req.file) {
      return res.status(400).send('No file was uploaded.');
    }

    const { filename, path } = req.file;

    // Save file information to the database
    try {
      const file = new File({
        filename,
        path
      });
      await file.save();
      console.log("File uploaded and saved to database:", file);
      res.json({ file });
    } catch (error) {
      console.error('Error saving file to database:', error);
      return res.status(500).json({ error: "Failed to save file to database." });
    }
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));


