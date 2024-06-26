require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const authRoute = require("./routes/auth");
const cookieSession = require("cookie-session");
const passportSetup = require("./passport");
const app = express();
const bodyParser = require("body-parser");
const { google } = require('googleapis');
const keys = require('./routes/keys.json');
const path = require('path');
'use strict';
const googleform = require('@googleapis/forms');
const nodemailer = require('nodemailer');
const fs = require('fs');
const pdfparse = require('pdf-parse');
const mongoose = require("mongoose");
const PdfTableExtractor = require("pdf-table-extractor");


app.use(express.json());
app.use(cors());
app.use(cookieSession({ name: "session", keys: ["cyberwolve"], maxAge: 24 * 60 * 60 * 100, }));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors({ origin: "http://localhost:3000", methods: "GET,POST,PUT,DELETE", credentials: true, }));
app.use(bodyParser.json());
app.use("/auth", authRoute);


function getSpreadsheetIdFromLink(assessmentLink) {
  const url = new URL(assessmentLink);
  const pathSegments = url.pathname.split('/');
  if (pathSegments.length < 4 || pathSegments[1] !== "spreadsheets" || pathSegments[2] !== "d") {
    throw new Error("Invalid assessment link format. Expected: https://docs.google.com/spreadsheets/d/<spreadsheet_id>");
  }
  return pathSegments[3];
}


app.post("/getData", async (req, res) => {
  try {
    const { studentInfoLink, assessmentLink } = req.body;
    const spreadsheetId = getSpreadsheetIdFromLink(assessmentLink);
    const spreadsheetId2 = getSpreadsheetIdFromLink(studentInfoLink);
    const cred = new google.auth.JWT(keys.client_email, null, keys.private_key, ["https://www.googleapis.com/auth/spreadsheets"]);
    const opt = { spreadsheetId, range: "A2:A" };
    const stud = { spreadsheetId: spreadsheetId2, range: "C2:C" };
    await cred.authorize();
    const sheet = google.sheets({ version: "v4", auth: cred });
    const data = await sheet.spreadsheets.values.get(opt);
    const data2 = await sheet.spreadsheets.values.get(stud);
    const assessmentDataCount = data.data.values ? data.data.values.length : 0;
    const studentDataCount = data2.data.values ? data2.data.values.length : 0;
    const questions = [];
    for (let i = 0; i < assessmentDataCount; i++) {
      const question = data.data.values[i][0];
      questions.push(question);
    }
    const studEmails = [];
    for (let i = 0; i < studentDataCount; i++) {
      const studEmail = data2.data.values[i][0];
      studEmails.push(studEmail);
    }
    const formLink = await createForm(questions);
    const emailsSent = await sendEmails(studEmails, formLink);
    if (emailsSent) {
      console.log("Emails were sent successfully");
    } else {
      console.log("Failed to send emails");
    }
    await runScript(questions);
    res.json({ studentInfoLink, assessmentLink, assessmentDataCount, studentDataCount, data, data2, formLink });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process data" });
  }
});


async function createForm(questions, deadline) {
  const authClient = new googleform.auth.GoogleAuth({
    credentials: require('./routes/keys.json'),
    scopes: 'https://www.googleapis.com/auth/drive',
  });
  const forms = googleform.forms({ version: 'v1', auth: authClient });
  const newForm = { info: { title: 'Assessment' } };
  const response = await forms.forms.create({ requestBody: newForm });
  const formId = response.data.formId;
  console.log(response.data);

  const requests = questions.map((question, index) => ({
    createItem: {
      item: {
        title: question,
        textItem: {}
      },
      location: {
        index: index
      }
    }
  }));

  await forms.forms.batchUpdate({
    formId: formId,
    resource: { requests }
  });

  const formLink = `https://docs.google.com/forms/d/${formId}`;
  await setFormDeadline(formId, deadline);  // Set the deadline after form creation
  return formLink;
}

  const requests = questions.map((question, index) => ({
    createItem: {
      item: {
        title: question,
        textItem: {}
      },
      location: {
        index: index
      }
    }
  }));


  await forms.forms.batchUpdate({
    formId: formId,
    resource: { requests }
  });

  const formLink = `https://docs.google.com/forms/d/${formId}`;
  return formLink;

  async function sendEmails(studEmails, formLink) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASS,
        },
      });
  
      for (const email of studEmails) {
        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: "Assessment Google Form",
          text: `Dear student,\n\nPlease fill out the assessment form using the following link:\n\n${formLink}\n\nThank you.`,
        };
        await transporter.sendMail(mailOptions);
      }
      return true;
    } catch (error) {
      console.error('Error sending emails:', error);
      return false;
    }
  }
  


const mongoUrl = "mongodb+srv://autoassess:autoassess@autoassess.lzuiaky.mongodb.net/?retryWrites=true&w=majority&appName=AutoAssess"
mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => console.log(e));


const multer = require("multer");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});


require("./pdfData");
const PdfSchema = mongoose.model("PdfData");
const upload = multer({ storage: storage });
const pdfTextExtract = require('pdf-text-extract');


app.post("/upload-files", upload.single("file"), async (req, res) => {
  const fileName = req.file.filename;
  const filePath = `./files/${fileName}`;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const textContent = await extractTextFromPDF(pdfDoc);
    
    await PdfSchema.create({ pdf: fileName, pdfdata: textContent });
    res.send({ status: "Success" });
  } catch (error) {
    console.error('Error processing PDF file:', error);
    res.status(500).json({ status: "error", message: "Failed to process PDF file" });
  }
});

async function extractTextFromPDF(pdfDoc) {
  const pages = pdfDoc.getPages();
  let textContent = '';

  for (const page of pages) {
    const text = await page.getTextContent();
    textContent += text.items.map(item => item.str).join(' ') + '\n';
  }
  return textContent;
}


async function runScript(inputData) {
  try {
    const script = `
      import sys
      input_data = sys.argv[1]
      # Your script logic here
    `;
    const pythonScript = spawn('python', ['-c', script, inputData]);
    
    pythonScript.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    pythonScript.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    return new Promise((resolve, reject) => {
      pythonScript.on('close', (code) => {
        if (code === 0) {
          console.log(`Script execution successful`);
          resolve();
        } else {
          console.error(`Script execution failed with code ${code}`);
          reject(`Script execution failed with code ${code}`);
        }
      });
    });
  } catch (error) {
    console.error("Error executing script:", error);
    throw error;
  }
}

runScript(JSON.stringify(inputData))
  .then(() => {
    console.log("Script executed successfully on backend startup.");
  })
  .catch((error) => {
    console.error("Error executing script on backend startup:", error);
  });

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));
