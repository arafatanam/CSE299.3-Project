import React, { useState } from "react";
import styles from "./styles.module.css";
import axios from "axios";


function Home(userDetails) {
    const user = userDetails.user;
    const [studentInfoLink, setStudentInfoLink] = useState("");
    const [assessmentLink, setAssessmentLink] = useState("");
    const [receivedLinks, setReceivedLinks] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);


    const handleSubmit = async () => {
        try {
            const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
            if (!urlPattern.test(studentInfoLink) || !urlPattern.test(assessmentLink)) {
                alert("Please enter valid URLs for both Student Information Link and Assessment Link.");
                return;
            }
            const response = await axios.post("http://localhost:8080/getData", {
                studentInfoLink,
                assessmentLink
            });
            setReceivedLinks(response.data);
        } catch (error) {
            console.error("Error sending links:", error);
            alert("An error occurred while sending links.");
        }
    };


    const handleLogout = () => {
        window.open(`${process.env.REACT_APP_API_URL}/auth/logout`, "_self");
    };


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setPdfFile(file);
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
                        <p>Upload PDF File</p>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className={styles.input}
                        />
                    </div>
                    <div>
                        <button className={styles.btn} onClick={handleSubmit}>
                            Submit
                        </button>
                        <button className={styles.btn} onClick={handleLogout}>
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Home;





