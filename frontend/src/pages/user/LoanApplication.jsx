import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/LoanApplication.css";
import Navbar from "../../Components/Navbar/Navbar";
import api from "../../services/api";
import useCreateLoan from "../../hooks/useCreateLoan";

export default function LoanApplication() {
  const navigate = useNavigate();
  const { loanTypeId } = useParams();

  const [error, setError] = useState("");
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("");
  const [applicationData, setApplicationData] = useState({});

  const [kycCompleted, setKycCompleted] = useState(false);
  const [kycStatus, setKycStatus] = useState("");
  const [kycLoading, setKycLoading] = useState(true);
  const { createLoan, isSubmitting: submitting } = useCreateLoan();
  const loanTypeName = loan?.loanTypeId?.replaceAll("_", " ") || "LOAN";
  const amountRangeText =
    loan?.minAmount !== undefined && loan?.maxAmount !== undefined
      ? `${loan.minAmount} - ${loan.maxAmount}`
      : "-";

  useEffect(() => {
    const checkKyc = async () => {
      try {
        const res = await api.get("/user/kyc/status");
        setKycCompleted(res.data.kycCompleted);
        setKycStatus(res.data.kycStatus || "");
      } catch (err) {
        console.error("Failed to check KYC", err);
      } finally {
        setKycLoading(false);
      }
    };

    checkKyc();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [infoRes, typeRes] = await Promise.allSettled([
          api.get(`/loans/info/${loanTypeId}`),
          api.get(`/loans/${loanTypeId}`),
        ]);

        const loanDetails =
          infoRes.status === "fulfilled" ? infoRes.value?.data?.loanDetails || {} : {};
        const loanType =
          typeRes.status === "fulfilled" ? typeRes.value?.data || {} : {};

        const mergedLoan = {
          ...loanDetails,
          minAmount: loanType.minAmount ?? loanDetails.minAmount,
          maxAmount: loanType.maxAmount ?? loanDetails.maxAmount,
          minTenure: loanType.minTenure ?? loanDetails.minTenure,
          maxTenure: loanType.maxTenure ?? loanDetails.maxTenure,
          interestRate: loanType.interestRate ?? loanDetails.interestRate,
        };

        if (!Object.keys(mergedLoan).length) {
          throw new Error("Loan configuration unavailable");
        }

        setLoan(mergedLoan);
      } catch (e) {
        setError("Failed to load loan configuration");
      } finally {
        setLoading(false);
      }
    };

    if (loanTypeId) fetchConfig();
  }, [loanTypeId]);

  const handleFileChange = (fieldName, file) => {
    if (!file) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setError(`File must be PDF, JPG, or PNG`);
      return;
    }

    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      setApplicationData((prev) => ({
        ...prev,
        [fieldName]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || !tenure) {
      setError("Loan amount and tenure are required");
      return;
    }

     // Convert input values to numbers
     const amountNum = Number(amount);
     const tenureNum = Number(tenure);

     // Validate amount range
     if (amountNum < loan?.minAmount) {
       setError(`Amount cannot be less than ${loan.minAmount}`);
       return;
     }
     if (amountNum > loan?.maxAmount) {
       setError(`Amount cannot be greater than ${loan.maxAmount}`);
       return;
     }

     // Validate tenure range
     if (tenureNum < loan?.minTenure) {
       setError(`Tenure cannot be less than ${loan.minTenure} months`);
       return;
     }
     if (tenureNum > loan?.maxTenure) {
       setError(`Tenure cannot be greater than ${loan.maxTenure} months`);
       return;
     }


    // Validate loan-specific fields
    if (loan.loanTypeId === "PERSONAL_LOAN") {
      if (!applicationData.loanPurpose || !applicationData.loanPurpose.trim()) {
        setError("Purpose of loan is required");
        return;
      }
    }

    if (loan.loanTypeId === "HOME_LOAN") {
      if (
          !applicationData.propertyAddress ||
          !applicationData.propertyAddress.trim()
      ) {
        setError("Property address is required");
        return;
      }
      if (!applicationData.propertyType) {
        setError("Property type is required");
        return;
      }
    }

    if (loan.loanTypeId === "BUSINESS_LOAN") {
      if (
          !applicationData.businessName ||
          !applicationData.businessName.trim()
      ) {
        setError("Business name is required");
        return;
      }
      if (!applicationData.businessType) {
        setError("Business type is required");
        return;
      }
      if (!applicationData.businessPan) {
        setError("Business PAN is required");
        return;
      }
    }

    if (loan.loanTypeId === "EDUCATION_LOAN") {
      if (
          !applicationData.studentName ||
          !applicationData.studentName.trim()
      ) {
        setError("Student name is required");
        return;
      }
      if (!applicationData.studentDob) {
        setError("Student date of birth is required");
        return;
      }
      if (!applicationData.courseName || !applicationData.courseName.trim()) {
        setError("Course name is required");
        return;
      }
      if (
          !applicationData.universityDetails ||
          !applicationData.universityDetails.trim()
      ) {
        setError("University/College details are required");
        return;
      }
      if (!applicationData.admissionLetter) {
        setError("Admission/Offer letter is required");
        return;
      }
      if (!applicationData.feeStructure) {
        setError("Fee structure is required");
        return;
      }
      if (
          !applicationData.courseDuration ||
          !applicationData.courseDuration.trim()
      ) {
        setError("Course duration is required");
        return;
      }
      if (
          !applicationData.coApplicantName ||
          !applicationData.coApplicantName.trim()
      ) {
        setError("Co-applicant name is required");
        return;
      }
      if (!applicationData.coApplicantIdProof) {
        setError("Co-applicant ID proof is required");
        return;
      }
      if (!applicationData.coApplicantAddressProof) {
        setError("Co-applicant address proof is required");
        return;
      }
      if (!applicationData.coApplicantIncomeProof) {
        setError("Co-applicant income proof is required");
        return;
      }
    }

    try {
      const res = await createLoan({
        loanTypeId,
        amount,
        tenure,
        applicationData,
      });

      navigate("/loan-summary", {
        state: { applicationId: res.applicationId },
      });
    } catch (err) {
      setError(err?.message || "Loan application failed");
    }
  };

  if (loading || kycLoading) {
    return (
        <>
          <Navbar />
          <div className="loading-container">
            <p>Loading...</p>
          </div>
        </>
    );
  }

  if (!loan) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <p>{error || "Loan configuration unavailable."}</p>
        </div>
      </>
    );
  }

  return (
      <div className="loan-application-page">
        <Navbar />

        <div className="loan-page">
          <div className="loan-layout">
            <aside className="loan-meta-panel">
              <div className="meta-card">
                <p className="meta-kicker">Application Profile</p>
                <h3>{loanTypeName}</h3>
                <p>Submit complete details to speed up internal verification and approval.</p>
              </div>

              <div className="meta-card">
                <h4>Loan Range</h4>
                <ul>
                  <li>
                    <span>Min Amount</span>
                    <strong>{loan?.minAmount ?? "-"}</strong>
                  </li>
                  <li>
                    <span>Max Amount</span>
                    <strong>{loan?.maxAmount ?? "-"}</strong>
                  </li>
                  <li>
                    <span>Min Tenure</span>
                    <strong>{loan?.minTenure ?? "-"} months</strong>
                  </li>
                  <li>
                    <span>Max Tenure</span>
                    <strong>{loan?.maxTenure ?? "-"} months</strong>
                  </li>
                  <li>
                    <span>Amount Range</span>
                    <strong>{amountRangeText}</strong>
                  </li>
                </ul>
              </div>
            </aside>

            <div className="card-body">
              {/* Header */}
              <h2 className="loan-title">
                Apply for {loanTypeName}
              </h2>
              <p className="loan-subtitle">
                Complete the form with accurate details for faster underwriting and approval.
              </p>

              {error && <p className="error-text">{error}</p>}
              {!kycCompleted && (
                <div className="kyc-warning">
                  <h3>KYC Verification Pending</h3>
                  <p>
                    Your application can be submitted, but approval will happen only after KYC is
                    verified.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="loan-form">
                <div className="loan-doc-section">
                  <h4 className="loan-doc-category">Basic Application Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="loan-label">
                      <span className="label-text">
                        Loan Amount <span className="required-star">*</span>
                      </span>
                        <input
                            type="number"
                            className="loan-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                        />
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="loan-label">
          <span className="label-text">
            Tenure (months) <span className="required-star">*</span>
          </span>
                        <input
                            type="number"
                            className="loan-input"
                            value={tenure}
                            onChange={(e) => setTenure(e.target.value)}
                            placeholder="e.g., 12, 24, 36"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* ========== PERSONAL LOAN ========== */}
                {loan.loanTypeId === "PERSONAL_LOAN" && (
                    <div className="loan-doc-section">
                      <h4 className="loan-doc-category">
                        Personal Loan Details
                      </h4>

                      <div className="form-group">
                        <label className="loan-label">
          <span className="label-text">
            Purpose of Loan <span className="required-star">*</span>
          </span>
                          <textarea
                              className="loan-input"
                              rows="4"
                              placeholder="Describe the purpose of the loan (e.g., medical emergency, home renovation, debt consolidation)"
                              value={applicationData.loanPurpose || ""}
                              onChange={(e) =>
                                  setApplicationData((prev) => ({
                                    ...prev,
                                    loanPurpose: e.target.value,
                                  }))
                              }
                          />
                          <span className="helper-text">
            Please provide detailed information about how you plan to use
            the loan
          </span>
                        </label>
                      </div>
                    </div>
                )}

                {/* ========== HOME LOAN ========== */}
                {loan.loanTypeId === "HOME_LOAN" && (
                    <div className="loan-doc-section">
                      <h4 className="loan-doc-category">Property Details</h4>

                      <div className="form-group">
                        <label className="loan-label">
          <span className="label-text">
            Property Address <span className="required-star">*</span>
          </span>
                          <textarea
                              className="loan-input"
                              rows="3"
                              placeholder="Enter complete property address"
                              value={applicationData.propertyAddress || ""}
                              onChange={(e) =>
                                  setApplicationData((prev) => ({
                                    ...prev,
                                    propertyAddress: e.target.value,
                                  }))
                              }
                          />
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="loan-label">
          <span className="label-text">
            Property Type <span className="required-star">*</span>
          </span>
                          <select
                              className="loan-input"
                              value={applicationData.propertyType || ""}
                              onChange={(e) =>
                                  setApplicationData((prev) => ({
                                    ...prev,
                                    propertyType: e.target.value,
                                  }))
                              }
                          >
                            <option value="">Please Select</option>
                            <option value="Flat">Flat</option>
                            <option value="Independent House">Independent House</option>
                            <option value="Plot + Construction">Plot + Construction</option>
                          </select>
                        </label>
                      </div>
                    </div>
                )}

                {/* ========== BUSINESS LOAN ========== */}
                {loan.loanTypeId === "BUSINESS_LOAN" && (
                    <div className="loan-doc-section">
                      <h4 className="loan-doc-category">Business Information</h4>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Business Name <span className="required-star">*</span>
            </span>
                            <input
                                type="text"
                                className="loan-input"
                                placeholder="Enter business name"
                                value={applicationData.businessName || ""}
                                onChange={(e) =>
                                    setApplicationData((prev) => ({
                                      ...prev,
                                      businessName: e.target.value,
                                    }))
                                }
                            />
                          </label>
                        </div>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Business Type <span className="required-star">*</span>
            </span>
                            <select
                                className="loan-input"
                                value={applicationData.businessType || ""}
                                onChange={(e) =>
                                    setApplicationData((prev) => ({
                                      ...prev,
                                      businessType: e.target.value,
                                    }))
                                }
                            >
                              <option value="">Please Select</option>
                              <option value="Proprietorship">Proprietorship</option>
                              <option value="Partnership">Partnership</option>
                              <option value="LLP">LLP</option>
                              <option value="Pvt Ltd">Pvt Ltd</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="loan-label">
                          <span className="label-text">GST Registration</span>
                          <input
                              type="text"
                              className="loan-input"
                              placeholder="Enter GST number (if applicable)"
                              value={applicationData.gstRegistration || ""}
                              onChange={(e) =>
                                  setApplicationData((prev) => ({
                                    ...prev,
                                    gstRegistration: e.target.value,
                                  }))
                              }
                          />
                          <span className="field-hint">Optional</span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="loan-label">
          <span className="label-text">
            Business PAN <span className="required-star">*</span>
          </span>
                          <input
                              type="file"
                              className="loan-input file-input"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                  handleFileChange("businessPan", e.target.files[0])
                              }
                          />
                          {applicationData.businessPan && (
                              <span className="file-selected">✓ File uploaded</span>
                          )}
                        </label>
                      </div>
                    </div>
                )}

                {/* ========== EDUCATION LOAN ========== */}
                {loan.loanTypeId === "EDUCATION_LOAN" && (
                    <>
                      {/* Student Details */}
                      <div className="loan-doc-section">
                        <h4 className="loan-doc-category">Student Details</h4>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                Student Name <span className="required-star">*</span>
              </span>
                              <input
                                  type="text"
                                  className="loan-input"
                                  placeholder="Full name"
                                  value={applicationData.studentName || ""}
                                  onChange={(e) =>
                                      setApplicationData((prev) => ({
                                        ...prev,
                                        studentName: e.target.value,
                                      }))
                                  }
                              />
                            </label>
                          </div>

                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                Date of Birth <span className="required-star">*</span>
              </span>
                              <input
                                  type="date"
                                  className="loan-input"
                                  value={applicationData.studentDob || ""}
                                  onChange={(e) =>
                                      setApplicationData((prev) => ({
                                        ...prev,
                                        studentDob: e.target.value,
                                      }))
                                  }
                              />
                              <span className="field-hint">DD-MM-YYYY</span>
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Course Name <span className="required-star">*</span>
            </span>
                            <input
                                type="text"
                                className="loan-input"
                                placeholder="e.g., B.Tech Computer Science"
                                value={applicationData.courseName || ""}
                                onChange={(e) =>
                                    setApplicationData((prev) => ({
                                      ...prev,
                                      courseName: e.target.value,
                                    }))
                                }
                            />
                          </label>
                        </div>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              University / College Details{" "}
              <span className="required-star">*</span>
            </span>
                            <textarea
                                className="loan-input"
                                rows="2"
                                placeholder="Enter university/college name and location"
                                value={applicationData.universityDetails || ""}
                                onChange={(e) =>
                                    setApplicationData((prev) => ({
                                      ...prev,
                                      universityDetails: e.target.value,
                                    }))
                                }
                            />
                          </label>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                Course Duration <span className="required-star">*</span>
              </span>
                              <input
                                  type="text"
                                  className="loan-input"
                                  placeholder="e.g., 4 years"
                                  value={applicationData.courseDuration || ""}
                                  onChange={(e) =>
                                      setApplicationData((prev) => ({
                                        ...prev,
                                        courseDuration: e.target.value,
                                      }))
                                  }
                              />
                            </label>
                          </div>

                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                Admission Letter <span className="required-star">*</span>
              </span>
                              <input
                                  type="file"
                                  className="loan-input file-input"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                      handleFileChange("admissionLetter", e.target.files[0])
                                  }
                              />
                              {applicationData.admissionLetter && (
                                  <span className="file-selected">✓ File uploaded</span>
                              )}
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Fee Structure <span className="required-star">*</span>
            </span>
                            <input
                                type="file"
                                className="loan-input file-input"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) =>
                                    handleFileChange("feeStructure", e.target.files[0])
                                }
                            />
                            {applicationData.feeStructure && (
                                <span className="file-selected">✓ File uploaded</span>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Co-Applicant Details */}
                      <div className="loan-doc-section">
                        <h4 className="loan-doc-category">
                          Co-Applicant (Parent/Guardian)
                        </h4>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Co-Applicant Name <span className="required-star">*</span>
            </span>
                            <input
                                type="text"
                                className="loan-input"
                                placeholder="Enter parent/guardian name"
                                value={applicationData.coApplicantName || ""}
                                onChange={(e) =>
                                    setApplicationData((prev) => ({
                                      ...prev,
                                      coApplicantName: e.target.value,
                                    }))
                                }
                            />
                          </label>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                ID Proof <span className="required-star">*</span>
              </span>
                              <input
                                  type="file"
                                  className="loan-input file-input"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                      handleFileChange(
                                          "coApplicantIdProof",
                                          e.target.files[0]
                                      )
                                  }
                              />
                              {applicationData.coApplicantIdProof && (
                                  <span className="file-selected">✓ File uploaded</span>
                              )}
                            </label>
                          </div>

                          <div className="form-group">
                            <label className="loan-label">
              <span className="label-text">
                Address Proof <span className="required-star">*</span>
              </span>
                              <input
                                  type="file"
                                  className="loan-input file-input"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                      handleFileChange(
                                          "coApplicantAddressProof",
                                          e.target.files[0]
                                      )
                                  }
                              />
                              {applicationData.coApplicantAddressProof && (
                                  <span className="file-selected">✓ File uploaded</span>
                              )}
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="loan-label">
            <span className="label-text">
              Income Proof <span className="required-star">*</span>
            </span>
                            <input
                                type="file"
                                className="loan-input file-input"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) =>
                                    handleFileChange(
                                        "coApplicantIncomeProof",
                                        e.target.files[0]
                                    )
                                }
                            />
                            {applicationData.coApplicantIncomeProof && (
                                <span className="file-selected">✓ File uploaded</span>
                            )}
                          </label>
                        </div>
                      </div>
                    </>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className="loan-button"
                    disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
