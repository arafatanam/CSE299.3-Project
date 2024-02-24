const express = require("express");
const router = express.Router();

router.post("/processLinks", (req, res) => {
    const { studentInfoLink, assessmentLink } = req.body;
    console.log("Received Student Information Link:", studentInfoLink);
    console.log("Received Assessment Link:", assessmentLink);
    res.status(200).send("Links processed successfully!");
});

module.exports = router;
