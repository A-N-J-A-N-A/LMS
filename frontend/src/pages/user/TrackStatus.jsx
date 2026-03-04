import React, { useState } from "react";
import { trackApplicationById } from "../../services/loanService";
import { renderValue } from "../../utils/renderValue";
import "../../styles/TrackStatus.css";
import Navbar from "../../Components/Navbar/Navbar";

function TrackStatus() {
    const [applicationId, setApplicationId] = useState("");
    const [application, setApplication] = useState(null);
    const [error, setError] = useState("");

    const handleTrack = async () => {
        setError("");
        setApplication(null);

        if (!applicationId) {
            setError("Please enter Application ID");
            return;
        }

        try {
            const res = await trackApplicationById(applicationId);
            setApplication(res.data);
        } catch (err) {
            setError("Application not found or unauthorized");
        }
    };

    return (
        <>
            <Navbar />

            <div className="track-page">
                <div className="track-card">
                    <h2 className="track-title">Track Application</h2>

                    <div className="track-form">
                        <input
                            type="text"
                            placeholder="Enter Application ID"
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            className="track-input"
                        />

                        <button onClick={handleTrack} className="track-button">
                            Track
                        </button>
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    {application && (
                        <div className="track-result">
                            <p>
                                <strong>Application ID:</strong>{" "}
                                {renderValue(application.applicationId)}
                            </p>
                            <p>
                                <strong>Loan Type:</strong>{" "}
                                {renderValue(application.loanName)}
                            </p>
                            <p>
                                <strong>Amount:</strong> ₹{renderValue(application.loanAmount)}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {renderValue(application.status)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default TrackStatus;
