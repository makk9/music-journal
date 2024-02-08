import React from 'react';
import styles from './Login.module.css';

function Login() {
    return (
        <div className="App">
            <header className="App-header">
                <a className={styles.loginSpotifyBtn} href="/auth/login" >
                    Login with Spotify
                </a>
            </header>
        </div>
    );
}

export default Login;