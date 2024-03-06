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
    const stud = { spreadsheetId: spreadsheetId2, range: "A2:A" };
    await cred.authorize();
    const sheet = google.sheets({ version: "v4", auth: cred });
    const data = await sheet.spreadsheets.values.get(opt);
    const data2 = await sheet.spreadsheets.values.get(stud);
    // console.log(data.data.values);
    // console.log(data2.data.values);
    const assessmentDataCount = data.data.values ? data.data.values.length : 0;
    // console.log(assessmentDataCount);
    const questions = [];
    for (let i = 0; i < assessmentDataCount; i++) {
      const question = data.data.values[i][0];
      questions.push(question);
    }
    // console.log(questions);
    const formCreationResponse = await createForm(questions);
    // console.log(formCreationResponse);

    const emails = data2.data.values.map(row => row[0]);
    const formLink = formCreationResponse.formUrl;

    // Send email to each recipient
    for (const email of emails) {
      const emailSubject = 'Assessment Form';
      const emailText = Dear Student, \n\nPlease fill out the assessment form: ${formLink};
      await sendEmail(email, emailSubject, emailText);
    }
    res.json({ studentInfoLink, assessmentLink, assessmentDataCount, data, data2, formLink: formCreationResponse.formUrl });
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

  const res = await forms.forms.batchUpdate({
    formId: response.data.formId,
    requestBody: { requests }
  });
  return res.data;
}

async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: 'arafatanam01@gmail.com', // Your Gmail email address
      to: to,
      subject: subject,
      text: text
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


const port = process.env.PORT || 8080;
app.listen(port, () => console.log(Listening on port ${port}...));