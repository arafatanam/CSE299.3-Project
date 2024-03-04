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
    console.log(data.data.values);
    console.log(data2.data.values);
    res.json({ studentInfoLink, assessmentLink, data, data2 });

  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process data" });
  }
});


async function runSample(query) {
  const authClient = new googleform.auth.GoogleAuth({
    credentials: require('./routes/keys.json'),
    scopes: 'https://www.googleapis.com/auth/drive',
  });
  const forms = googleform.forms({ version: 'v1', auth: authClient, });
  const newForm = { info: { title: 'Assessment', }, };
  const response = await forms.forms.create({ requestBody: newForm, });
  console.log(response.data);
  // return response.data;
  const update = {
    requests: [
      {
        createItem: {
          item: {
            title: 'Homework video',
            videoItem: {
              video: {
                youtubeUri: 'https://www.youtube.com/watch?v=Lt5HqPvM-eI',
              },
            },
          },
          location: {
            index: 0,
          },
        },
      },
    ],
  };
  const res = await forms.forms.batchUpdate({
    formId: response.data.formId,
    requestBody: update,
  });
  console.log(res.data);
  return res.data;
}

if (module === require.main) {
  runSample().catch(console.error);
}
module.exports = runSample;


const port = process.env.PORT || 8080;
app.listen(port, () => console.log(Listening on port ${port}...));