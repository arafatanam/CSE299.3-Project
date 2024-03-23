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
})
.then(() => {
  console.log("Connected to MongoDB database");
})
.catch((error) => {
  console.error("Error connecting to MongoDB:", error);
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
    try {
      if (err instanceof multer.MulterError) {
        throw new Error(err.message);
      }
      if (err) {
        throw new Error("Failed to upload file.");
      }
  
      if (!req.file) {
        throw new Error('No file was uploaded.');
      }
  
      const { filename, path } = req.file;
  
      // Save file information to the database
      const file = new File({
        filename,
        path
      });
      await file.save();
      console.log("File uploaded and saved to database:", file);
      res.json({ file });
    } catch (error) {
      console.error('Error handling file upload:', error);
      res.status(500).json({ error: error.message });
    }
  });
});


const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));
