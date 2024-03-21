import React, { useState } from "react";
import styles from "./styles.module.css";
import axios from "axios";

function Home(userDetails) {
    const user = userDetails.user;
    const [studentInfoLink, setStudentInfoLink] = useState("");
    const [assessmentLink, setAssessmentLink] = useState("");
    const [receivedLinks, setReceivedLinks] = useState(null);
    const [pdfFiles, setPdfFiles] = useState([]);

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
        const files = e.target.files;
        setPdfFiles([...pdfFiles, ...files]);
    };

    const handleUpload = async () => {
        try {
            const formData = new FormData();
            pdfFiles.forEach(file => {
                formData.append('files', file);
            });
            const response = await axios.post("http://localhost:8080/uploadFiles", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log("Upload response:", response);
        } catch (error) {
            console.error("Error uploading files:", error);
            alert("An error occurred while uploading files.");
        }
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
                    <div className={styles.file_input_container}>
                        <p className={styles.file_input_label}></p>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className={styles.file_input}
                            multiple
                        />
                        <button className={styles.btn2} onClick={handleUpload}>
                            Upload
                        </button>
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