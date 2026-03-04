import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import "../../styles/UpdateKyc.css";

function UpdateKyc() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullNameAsPan: "",
        dateOfBirth: "",
        gender: "",
        maritalStatus: "",
        employmentType: "",
        cibilConsentGiven: false,
    });

    const [panCard, setPanCard] = useState(null);
    const [aadhaarCard, setAadhaarCard] = useState(null);
    const [salarySlips, setSalarySlips] = useState([]);
    const [bankStatement, setBankStatement] = useState(null);

    const [error, setError] = useState("");
    const [popupError, setPopupError] = useState("");
    const [loading, setLoading] = useState(false);

    const showError = (message) => {
        setError(message);
        setPopupError(message);
    };

    const clearError = () => {
        setError("");
        setPopupError("");
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleFile = (file, setter) => {
        if (!file) return;

        const validTypes = ["application/pdf", "image/jpeg", "image/png"];
        if (!validTypes.includes(file.type)) {
            showError("File must be PDF, JPG, or PNG");
            return;
        }

        clearError();
        const reader = new FileReader();
        reader.onload = () => setter(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSalarySlips = (files) => {
        if (files.length < 3 || files.length > 6) {
            showError("Salary slips are required: upload 3 to 6 files");
            return;
        }

        const validTypes = ["application/pdf", "image/jpeg", "image/png"];
        if ([...files].some((f) => !validTypes.includes(f.type))) {
            showError("All files must be PDF, JPG, or PNG");
            return;
        }

        clearError();
        Promise.all(
            [...files].map(
                (file) =>
                    new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    })
            )
        ).then(setSalarySlips);
    };

    const getValidationError = () => {
        if (!panCard) return "PAN Card is required";
        if (!aadhaarCard) return "Aadhaar Card is required";
        if (!formData.fullNameAsPan?.trim()) return "Full name (as per PAN) is required";
        if (!formData.dateOfBirth) return "Date of birth is required";
        if (!formData.gender) return "Gender is required";
        if (!formData.maritalStatus) return "Marital status is required";
        if (!formData.employmentType) return "Employment type is required";

        if (formData.employmentType === "SALARIED") {
            if (salarySlips.length < 3 || salarySlips.length > 6) {
                return "Salary slips are required: upload 3 to 6 files";
            }
        }

        if (formData.employmentType === "SELF_EMPLOYED" && !bankStatement) {
            return "Bank statement is required for self-employed";
        }

        if (!formData.cibilConsentGiven) return "CIBIL consent is required";

        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        const validationError = getValidationError();
        if (validationError) {
            showError(validationError);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const apiUrl =
                process.env.REACT_APP_API_URL || "http://localhost:8080";

            const payload = {
                ...formData,
                panCard,
                aadhaarCard,
                salarySlips:
                    formData.employmentType === "SALARIED" ? salarySlips : undefined,
                bankStatement:
                    formData.employmentType === "SELF_EMPLOYED"
                        ? bankStatement
                        : undefined,
            };

            const res = await fetch(`${apiUrl}/user/kyc/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let message = "KYC update failed";
                try {
                    const errorBody = await res.json();
                    if (errorBody?.message) {
                        message = errorBody.message;
                    }
                } catch {
                    // Keep default fallback message.
                }
                throw new Error(message);
            }

            navigate("/profile");
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar noSpacer />

            <div className="loan-application-page update-kyc-page">
                <div className="loan-page">
                    <div className="card-body">
                        <button
                            type="button"
                            className="kyc-back-button"
                            onClick={() => navigate(-1)}
                        >
                            {"Back"}
                        </button>
                        <h2 className="loan-title">Complete Your KYC</h2>
                        <p className="loan-subtitle">
                            Please provide accurate details to complete verification
                        </p>

                        {error && <p className="error-text">{error}</p>}

                        <form className="loan-form" onSubmit={handleSubmit}>
                            <div className="loan-doc-section">
                                <h4 className="loan-doc-category">Identity Proof</h4>

                                <label className="loan-label">
                                    <span className="label-text">
                                        PAN Card <span className="required-star">*</span>
                                    </span>
                                    <input
                                        type="file"
                                        className="loan-input file-input"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required
                                        onChange={(e) => handleFile(e.target.files[0], setPanCard)}
                                    />
                                    {panCard && <span className="file-selected">Uploaded</span>}
                                </label>

                                <label className="loan-label">
                                    <span className="label-text">
                                        Aadhaar Card <span className="required-star">*</span>
                                    </span>
                                    <input
                                        type="file"
                                        className="loan-input file-input"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required
                                        onChange={(e) => handleFile(e.target.files[0], setAadhaarCard)}
                                    />
                                    {aadhaarCard && <span className="file-selected">Uploaded</span>}
                                </label>
                            </div>

                            <div className="loan-doc-section">
                                <h4 className="loan-doc-category">Personal Details</h4>

                                <div className="form-row">
                                    <label className="loan-label">
                                        <span className="label-text">
                                            Full Name (as per PAN) <span className="required-star">*</span>
                                        </span>
                                        <input
                                            className="loan-input"
                                            name="fullNameAsPan"
                                            value={formData.fullNameAsPan}
                                            required
                                            onChange={handleChange}
                                        />
                                    </label>

                                    <label className="loan-label">
                                        <span className="label-text">
                                            Date of Birth <span className="required-star">*</span>
                                        </span>
                                        <input
                                            type="date"
                                            className="loan-input"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            required
                                            onChange={handleChange}
                                        />
                                    </label>
                                </div>

                                <div className="form-row">
                                    <label className="loan-label">
                                        <span className="label-text">
                                            Gender <span className="required-star">*</span>
                                        </span>
                                        <select
                                            className="loan-input"
                                            name="gender"
                                            value={formData.gender}
                                            required
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </label>

                                    <label className="loan-label">
                                        <span className="label-text">
                                            Marital Status <span className="required-star">*</span>
                                        </span>
                                        <select
                                            className="loan-input"
                                            name="maritalStatus"
                                            value={formData.maritalStatus}
                                            required
                                            onChange={handleChange}
                                        >
                                            <option value="">Select Status</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Divorced">Divorced</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div className="loan-doc-section">
                                <h4 className="loan-doc-category">Employment</h4>

                                <label className="loan-label">
                                    <span className="label-text">
                                        Employment Type <span className="required-star">*</span>
                                    </span>
                                    <select
                                        className="loan-input"
                                        name="employmentType"
                                        value={formData.employmentType}
                                        required
                                        onChange={handleChange}
                                    >
                                        <option value="">Select</option>
                                        <option value="SALARIED">Salaried</option>
                                        <option value="SELF_EMPLOYED">Self Employed</option>
                                    </select>
                                </label>

                                {formData.employmentType === "SALARIED" && (
                                    <label className="loan-label">
                                        <span className="label-text">
                                            Salary Slips (3-6 months) <span className="required-star">*</span>
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            className="loan-input file-input"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            required
                                            onChange={(e) => handleSalarySlips(e.target.files)}
                                        />
                                        {salarySlips.length > 0 && (
                                            <span className="file-selected">
                                                {salarySlips.length} files uploaded
                                            </span>
                                        )}
                                    </label>
                                )}

                                {formData.employmentType === "SELF_EMPLOYED" && (
                                    <label className="loan-label">
                                        <span className="label-text">
                                            Bank Statement <span className="required-star">*</span>
                                        </span>
                                        <input
                                            type="file"
                                            className="loan-input file-input"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            required
                                            onChange={(e) =>
                                                handleFile(e.target.files[0], setBankStatement)
                                            }
                                        />
                                        {bankStatement && (
                                            <span className="file-selected">Uploaded</span>
                                        )}
                                    </label>
                                )}
                            </div>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="cibilConsentGiven"
                                    required
                                    checked={formData.cibilConsentGiven}
                                    onChange={handleChange}
                                />
                                <span>
                                    I consent to fetch my CIBIL score{" "}
                                    <span className="required-star">*</span>
                                </span>
                            </label>

                            <button className="loan-button" disabled={loading}>
                                {loading ? "Submitting..." : "Submit KYC"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            {popupError && (
                <div className="kyc-error-modal-backdrop" onClick={() => setPopupError("")}>
                    <div
                        className="kyc-error-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="KYC error"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="kyc-error-title">KYC Submission Error</h4>
                        <p className="kyc-error-message">{popupError}</p>
                        <button
                            type="button"
                            className="kyc-error-close"
                            onClick={() => setPopupError("")}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default UpdateKyc;
