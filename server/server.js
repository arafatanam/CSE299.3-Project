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
const googleScriptUrl = 'https://script.google.com/macros/s/your_google_script_id/exec';

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
    const sheet = new google.auth.JWT(keys.client_email, null, keys.private_key, ["https://www.googleapis.com/auth/spreadsheets"]);
    const opt = { spreadsheetId, range: "A2:A" };
    await sheet.authorize();
    const gsapi = google.sheets({ version: "v4", auth: sheet });
    const data = await gsapi.spreadsheets.values.get(opt);
    console.log(data.data.values);
    const questions = data.data.values;
    const formUrl = await createGoogleForm(questions);    
    res.json({ formUrl });

    res.json({ studentInfoLink, assessmentLink, data});
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process data" });
  }
});

const auth = new google.auth.JWT(keys.client_email, null, keys.private_key, ['https://www.googleapis.com/auth/forms']);

async function createGoogleForm(questions) {
  try {
    // Initialize Google Forms API
    const forms = google.forms({ version: 'v1', auth });

    // Create new form
    const form = await forms.forms.create({
      requestBody: {
        title: 'Your Form Title',
        description: 'Your Form Description'
      }
    });

    const formId = form.data.formId;

    // Add questions to the form
    for (const question of questions) {
      await forms.forms.update({
        formId,
        requestBody: {
          title: question, 
          
        }
      });
    }

    
    const formUrl = 'https://docs.google.com/forms/d/${formId}/viewform';

    return formUrl;
  } catch (error) {
    console.error('Error creating Google Form:', error);
    throw error;
  }
}

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));