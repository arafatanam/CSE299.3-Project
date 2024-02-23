import React, { useState } from "react";
import styles from "./styles.module.css";

function Home() {
    const [studentInfoLink, setStudentInfoLink] = useState("");
    const [assessmentLink, setAssessmentLink] = useState("");

    const handleSubmit = async () => {
        try {
            const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
            if (!urlPattern.test(studentInfoLink) || !urlPattern.test(assessmentLink)) {
                alert("Please enter valid URLs for both Student Information Link and Assessment Link.");
                return;
            }

            const response = await fetch('/api/process-google-sheets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ studentInfoLink, assessmentLink }),
            });

            if (response.ok) {
                alert("Google Sheets processed successfully.");
            } else {
                throw new Error('Failed to process Google Sheets.');
            }
        } catch (error) {
            console.error('Error processing Google Sheets:', error);
            alert('An error occurred while processing Google Sheets.');
        }
    };

    const logout = () => {
        window.open(`${process.env.REACT_APP_API_URL}/auth/logout`, "_self");
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Home</h1>
            <div className={styles.form_container}>
                <div className={styles.content}>
                    <div>
                        <p>Student Information Link</p>
                        <input
                            type="text"
                            value={studentInfoLink}
                            onChange={(e) => setStudentInfoLink(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div>
                        <p>Assessment Link</p>
                        <input
                            type="text"
                            value={assessmentLink}
                            onChange={(e) => setAssessmentLink(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div>
                        <button className={styles.btn} onClick={handleSubmit}>
                            Submit
                        </button>
                        <button className={styles.btn} onClick={logout}>
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
