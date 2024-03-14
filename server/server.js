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
const axios = require("axios");
const {Configuration, tinyAIapi} = require("TinyAI");
app.use(express.json());

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
    // console.log(data.data.values);
    // console.log(data2.data.values);
    const assessmentDataCount = data.data.values ? data.data.values.length : 0;
    const studentDataCount = data2.data.values ? data2.data.values.length : 0;
    // console.log(assessmentDataCount);
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
    // console.log(questions);
    const formLink = await createForm(questions);
    // console.log(formCreationResponse);
    // const formLink = formCreationResponse.formUrl;
    const emailsSent = await sendEmails(studEmails, formLink);
    if (emailsSent) {
      console.log("Emails were sent successfully");
    } else {
      console.log("Failed to send emails");
    }   
    res.json({ studentInfoLink, assessmentLink, assessmentDataCount, studentDataCount, data, data2, formLink });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process data" });
  }
});

async function createForm(questions) {
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

    const mailOptions = {
      from: process.env.EMAIL,
      to: studEmails,
      subject: "Assessment Google Form",
      text: `Here is the assessment form link: ${formLink}`,
    };

    for (const email of studEmails) {
      mailOptions.to = email;
      await transporter.sendMail(mailOptions);
    }
    return true;
  } catch (error) {
    console.error('Error sending emails:', error);
    return false;
  }
}

async function executePythonScript(prompt) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const pyprog = spawn('python', ['script.py', prompt]);
    pyprog.stdout.on('data', (data) => {
      resolve(data.toString());
    });
    pyprog.stderr.on('data', (data) => {
      reject(data.toString());
    });
  });
}


app.post("/pyscript", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const result = await executePythonScript(prompt);
    res.json({ result });
  } catch (error) {
    console.error('Error executing Python script:', error);
    res.status(500).json({ error: "Failed to execute Python script" });
  }
});

const configuration = new Configuration ({
  apiKey: process.env.API,
});
const tinyAI = new tinyAIapi(configuration);

app.post("/find-complexity", async (req, res) => {
  try {
    return res.status(200).json({message: "Working",});
  } catch (error) {}
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));