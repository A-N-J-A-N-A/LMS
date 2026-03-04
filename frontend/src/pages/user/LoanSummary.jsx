import { useLocation } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import { useState } from "react";

function LoanSummary() {
    const location = useLocation();
    const applicationId = location.state?.applicationId;

    const [copied, setCopied] = useState(false);

    if (applicationId) {
        localStorage.setItem("lastApplicationId", applicationId);
    }

    const handleCopy = () => {
        if (applicationId) {
            navigator.clipboard.writeText(applicationId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", textAlign: "center" }}>
                <h2>Loan Application Submitted 🎉</h2>
                <p>Your loan application has been successfully submitted.</p>

                {applicationId && (
                    <>
                        <p style={{ marginTop: "16px", fontWeight: "600" }}>Application ID</p>

                        {/* Container with ID + copy icon */}
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <p
                                style={{
                                    padding: "10px 16px",
                                    background: "#f4f6f8",
                                    borderRadius: "6px",
                                    fontFamily: "monospace",
                                    fontSize: "15px",
                                    margin: 0,
                                }}
                            >
                                {applicationId}
                            </p>
                            <span
                                onClick={handleCopy}
                                style={{
                                    position: "absolute",
                                    right: "-6px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    cursor: "pointer",
                                    fontSize: "16px",
                                    color: "#555",
                                }}
                                title="Copy to clipboard"
                            >
                                📋
                            </span>
                        </div>

                        {copied && (
                            <div style={{ color: "green", fontSize: "14px", marginTop: "4px" }}>
                                Copied!
                            </div>
                        )}

                        <p style={{ marginTop: "16px" }}>
                            Please save this ID to track your application later.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

export default LoanSummary;
