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


async function createForm(questions) {
  const authClient = new google.auth.GoogleAuth({
    credentials: require('./routes/keys.json'),
    scopes: 'https://www.googleapis.com/auth/drive',
  });
  const forms = googleform.forms({ version: 'v1', auth: authClient });
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const newForm = {
    info: {
      title: 'Assessment',
      deadline: deadline,
    },
    items: questions.map(question => ({
      title: question,
      paragraphItem: {}, // You can remove this if you don't want additional settings for the paragraph item
      type: 'PARAGRAPH_TEXT'
    })),
  };
  const response = await forms.forms.create({ requestBody: newForm });
  const formId = response.data.formId;
  console.log(response.data);
  const formLink = `https://docs.google.com/forms/d/${formId}`;
  return formLink;
}


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
    const mailsData = [];
    for (const email of studEmails) {
      const mark = Math.floor(Math.random() * 100) + 1;
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Assessment Google Form",
        text: `Here is the assessment form link: ${formLink}. Your random mark is: ${mark}`, 
      };
      await transporter.sendMail(mailOptions);
      mailsData.push({ email, mark }); 
    }
    console.log("Emails were sent successfully with marks:", mailsData);
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


app.post("/update-form-deadline", async (req, res) => {
  try {
    const { formId, newDeadline } = req.body;
    const response = await updateFormDeadline(formId, newDeadline);
    res.json(response);
  } catch (error) {
    console.error('Error updating form deadline:', error);
    res.status(500).json({ error: "Failed to update form deadline" });
  }
});


async function updateFormDeadline(formId, newDeadline) {
  try {
    const authClient = new google.auth.JWT(keys.client_email, null, keys.private_key, ["https://www.googleapis.com/auth/forms"]);
    await authClient.authorize();
    const forms = google.forms({ version: 'v1', auth: authClient });
    const requestBody = {
      deadline: newDeadline.toISOString(),
    };
    const response = await forms.forms.update({
      formId: formId,
      requestBody: requestBody
    });
    console.log('Form deadline updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating form deadline:', error);
    throw error;
  }
}


async function updateFormDeadline(formId, newDeadline) {
  try {
    const authClient = await auth.getClient({
      keyFile: './routes/keys.json',
      scopes: 'https://www.googleapis.com/auth/forms',
    });
    const forms = google.forms({ version: 'v1', auth: authClient });
    const requestBody = {
      deadline: newDeadline.toISOString(),
    };
    const response = await forms.forms.update({
      formId: formId,
      requestBody: requestBody
    });
    console.log('Form deadline updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating form deadline:', error);
    throw error;
  }
}


require("./pdfData");
const pdfparse = require('pdf-parse');
const PdfTableExtractor = require("pdf-table-extractor");


app.post("/upload-files", upload.array("pdfFiles"), async (req, res) => {
  try {
    const files = req.files;
    const uploadedFiles = [];
    for (const file of files) {
      let pdfData = "";
      let tableData = [];
      if (file.mimetype === 'application/pdf') {
        const pdfFile = fs.readFileSync(file.path);
        try {
          const pdfText = await pdfparse(pdfFile);
          pdfData = pdfText.text;
          const pdfTables = await PdfTableExtractor.process(pdfFile);
          pdfTables.forEach(pageTables => {
            pageTables.forEach(table => {
              tableData.push(table);
            });
          });
        } catch (error) {
          console.error('Error extracting tables from PDF:', error);
        }
      } else {
        console.log(`Unsupported file type: ${file.mimetype}`);
      }
      uploadedFiles.push({ filename: file.originalname, pdfdata: pdfData, tables: tableData });
    }
    await PdfSchema.insertMany(uploadedFiles);
    return res.json({ status: "Success", files: uploadedFiles });
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    return res.status(500).json({ status: "error", message: "Failed to process uploaded files" });
  }
});


const { spawn } = require('child_process');
app.post("/call-python-script", async (req, res) => {
  try {
    const { question, context } = req.body;
    const result = await callPythonScript(question, context);
    res.json({ result });
  } catch (error) {
    console.error('Error calling Python script:', error);
    res.status(500).json({ error: "Failed to call Python script" });
  }
});


function callPythonScript(question, context) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['model.py', question, context]);
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error from Python script: ${data}`);
      reject(data);
    });
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(result.trim());
      } else {
        console.error(`Python script exited with code ${code}`);
        reject(`Python script exited with code ${code}`);
      }
    });
  });
}


const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));
