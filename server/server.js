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
    const studentMarks = []; // Array to store student marks
    for (let i = 0; i < studentDataCount; i++) {
      const studEmail = data2.data.values[i][0];
      const mark = Math.floor(Math.random() * 100) + 1; // Generate random mark
      studEmails.push(studEmail);
      studentMarks.push({ email: studEmail, mark }); // Push email and mark to the array
    }
    const formLink = await createForm(questions);
    const emailsSent = await sendEmails(studEmails, formLink);
    if (emailsSent) {
      console.log("Emails were sent successfully");
    } else {
      console.log("Failed to send emails");
    }
    await runScript(questions);
    res.json({ studentInfoLink, assessmentLink, assessmentDataCount, studentDataCount, data, data2, formLink, studentMarks }); // Include student marks in the response
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process data" });
  }
});

async function createForm(questions, deadline) {
  try {
    const authClient = new google.auth.GoogleAuth({
      credentials: require('./routes/keys.json'),
      scopes: 'https://www.googleapis.com/auth/drive',
    });
    const forms = googleform.forms({ version: 'v1', auth: authClient });

    const newForm = {
      info: {
        title: 'Assessment',
        deadline: deadline.toISOString(),
      },
      items: questions.map(question => ({
        title: question,
        paragraphItem: {},
        type: 'PARAGRAPH_TEXT'
      })),
    };
    const response = await forms.forms.create({ requestBody: newForm });
    const formId = response.data.formId;
    console.log(response.data);
    const formLink = `https://docs.google.com/forms/d/${formId}`;
    return formLink;
  } catch (error) {
    console.error('Error creating form:', error.message);
    throw new Error('Failed to create form');
  }
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
      const mark = Math.floor(Math.random() * 100) + 1; // Generate a random mark
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Assessment Google Form",
        text: `Here is the assessment form link: ${formLink}. Your random mark is: ${mark}`, // Include the random mark in the email text
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
    if (!formId || !newDeadline) {
      throw new Error("Missing formId or newDeadline in request body");
    }
    const response = await updateFormDeadline(formId, new Date(newDeadline));
    res.json(response);
  } catch (error) {
    console.error('Error updating form deadline:', error.message);
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

require("./pdfData");
const pdfparse = require('pdf-parse');
const upload = multer({ dest: "uploads/" });

app.post("/upload-files", upload.array("pdfFiles", 10), async (req, res) => {
  try {
    const files = req.files;
    const uploadedFiles = [];
    for (const file of files) {
      let vectorData = [];
      if (file.mimetype === 'application/pdf') {
        const pdfFile = fs.readFileSync(file.path);
        vectorData = await extractVectorDataFromPDF(pdfFile);
      }
      uploadedFiles.push({ filename: file.originalname, vectorData: vectorData });
    }
    return res.json({ status: "Success", files: uploadedFiles });
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    return res.status(500).json({ status: "error", message: "Failed to process uploaded files" });
  }
});

async function extractVectorDataFromPDF(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument(data).promise;
  const pageNum = doc.numPages;
  const vectorData = [];
  for (let i = 1; i <= pageNum; i++) {
    const page = await doc.getPage(i);
    const operatorList = await page.getOperatorList();
    const svgGfx = new pdfjs.SVGGraphics(page.commonObjs, page.objs);
    const svg = await svgGfx.getSVG(operatorList);
    vectorData.push(svg);
  }
  return vectorData;
}

const { spawn } = require('child_process');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.post("/call-python-script", async (req, res) => {
  try {
    const { queries } = req.body;
    if (!queries || !Array.isArray(queries)) {
      throw new Error("Missing queries array in request body");
    }
    const results = await Promise.all(queries.map(async query => {
      const { question, context } = query;
      if (!question || !context) {
        throw new Error("Missing question or context in query object");
      }
      return callRAGModel(question, context);
    }));
    res.json({ results });
  } catch (error) {
    console.error('Error calling RAG model:', error.message);
    res.status(500).json({ error: "Failed to call RAG model" });
  }
});

async function callRAGModel(question, context) {
  try {
    const response = await axios.post('RAG_MODEL_API_ENDPOINT', {
      question: question,
      context: context,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data.answer;
  } catch (error) {
    console.error('Error calling RAG model:', error.message);
    throw new Error('Failed to call RAG model');
  }
}

async function callPythonScript(question, context) {
 try {
 const result = await callRetrievalAugmentedGeneration(question, context);
 return result;
 } catch (error) {
 console.error('Error calling Python script:', error.message);
 throw new Error('Failed to call retrieval-augmented generation model');
 }
}

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));