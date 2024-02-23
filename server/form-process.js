const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const router = express.Router();


router.post('/process-google-sheets', async (req, res) => {
    try {
        const { studentInfoLink, assessmentLink } = req.body;

        console.log('Received Student Information Link:', studentInfoLink);
        console.log('Received Assessment Link:', assessmentLink);

        // Fetch questions from assessment link
        const questions = await fetchQuestionsFromSheet(assessmentLink);

        // Generate Google Form from questions
        const formUrl = await generateGoogleForm(questions);

        // Retrieve emails from Student Info Sheet and send email with Google Form link
        const studentInfoResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: studentInfoLink,
            range: 'Sheet1!C:C', // Assuming emails are in column C
        });

        const emails = studentInfoResponse.data.values.map((value) => value[0]).filter(Boolean);

        // Send email with Google Form link to each email address
        for (const email of emails) {
            await sendEmailWithFormLink(email, formUrl);
        }

        // Send response to frontend
        res.status(200).json({ message: 'Google Sheets processed successfully.' });
    } catch (error) {
        console.error('Error processing Google Sheets:', error.message || error);
        res.status(500).json({ error: 'Internal server error.' });
    }

    // Load credentials and configuration from environment variables
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    const auth = new google.auth.GoogleAuth({
        keyFile: "./credentials.json",
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const fetchQuestionsFromSheet = async (assessmentLink) => {
        try {
            const spreadsheetId = extractSpreadsheetId(assessmentLink);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A:A', // Assuming questions are in column A
            });

            const questions = response.data.values[0] || [];
            return questions.filter(Boolean); // Filter out any empty or undefined questions
        } catch (error) {
            console.error('Error fetching questions from Google Sheet:', error);
            throw new Error('Error fetching questions from Google Sheet');
        }
    };

    const generateGoogleForm = async (questions) => {
        try {
            const form = {
                title: 'Questions',
                questions: questions.map((question) => {
                    return { type: 'TEXT', text: question };
                }),
            };

            const forms = google.forms({ version: 'v1', auth });
            const response = await forms.forms.create({ requestBody: form });
            const formUrl = response.data.formUrl;
            console.log('Google Form created:', formUrl);
            return formUrl;
        } catch (error) {
            console.error('Error creating Google Form:', error);
            throw new Error('Error creating Google Form');
        }
    };

    const extractSpreadsheetId = (sheetLink) => {
        const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
        const match = sheetLink.match(regex);
        if (match && match[1]) {
            return match[1];
        } else {
            throw new Error('Invalid Google Sheets link');
        }
    };

    const sendEmailWithFormLink = async (email, formUrl) => {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: EMAIL_USER,
                to: email,
                subject: 'Here is the Google Form link',
                text: `Link to Google Form: ${formUrl}`,
            };

            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${email} with Google Form link`);
        } catch (error) {
            console.error(`Error sending email to ${email}:`, error);
            throw new Error('Error sending email');
        }
    };
});

module.exports = router;



