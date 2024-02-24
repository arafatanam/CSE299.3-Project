require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportSetup = require("./passport");
const authRoute = require("./routes/auth");
const formProcessRoute = require("./form-process");
const cookieSession = require("cookie-session");
const app = express();
const bodyParser = require("body-parser");

app.use(
    cookieSession({
        name: "session",
        keys: ["cyberwolve"],
        maxAge: 24 * 60 * 60 * 100,
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: "GET,POST,PUT,DELETE",
        credentials: true,
    })
);
app.use(bodyParser.json());

app.use("/auth", authRoute);
app.use("/form-process", formProcessRoute);

app.post("/getData", (req, res) => {
    const { studentInfoLink, assessmentLink } = req.body;
    console.log("Student Information Link:", studentInfoLink);
    console.log("Assessment Link:", assessmentLink);
    res.json({ studentInfoLink, assessmentLink });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(Listening on port ${port}...));