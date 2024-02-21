import styles from "./styles.module.css";

function Home(userDetails) {
    const user = userDetails.user;
    const logout = () => {
        window.open(`${process.env.REACT_APP_API_URL}/auth/logout`, "_self");
    };
    const handleSubmit = () => {
        // Logic for handling form submission
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Home</h1>
            <div className={styles.form_container}>
                <div className={styles.content}>
                    <img src={user.picture} alt="profile" className={styles.profile_img} />
                    <div><p>Student Information Link</p>
                        <input type="text" className={styles.input}/>
                    </div>
                    <div><p>Assessment Link</p>
                        <input type="text" className={styles.input}/>
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
