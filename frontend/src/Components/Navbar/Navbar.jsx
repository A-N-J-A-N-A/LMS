import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import { getUnreadNotificationCount } from "../../services/notificationService";
import { getAllLoans } from "../../services/loanService";
import api from "../../services/api";

function Navbar({
  searchQuery: externalSearchQuery,
  setSearchQuery: setExternalSearchQuery,
  noSpacer = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery ?? localSearchQuery;
  const setSearchQuery = setExternalSearchQuery ?? setLocalSearchQuery;
  const [loanOptions, setLoanOptions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isLoggedIn = !!token && role === "USER";
  const [profileImage, setProfileImage] = useState(localStorage.getItem("profileImage") || "");
  const [displayName, setDisplayName] = useState(user?.name || user?.fullName || "");
  const initial = (displayName || user?.name || user?.fullName || "").trim().charAt(0).toUpperCase();

  // Profile dropdown
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const profileRef = useRef(null);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef(null);

  const [showNavbar, setShowNavbar] = useState(true);
  const downloadBase = process.env.PUBLIC_URL || "";
  const downloads = [
    {
      label: "Application Guide",
      file: "CrediFlow_Apply_Guide.pdf",
    },
    {
      label: "Interest Rates and Fees",
      file: "CrediFlow_Interest_Rates_and_Fees.pdf",
    },
    {
      label: "Offers and Benefits",
      file: "CrediFlow_Offers_and_Benefits.pdf",
    },
    {
      label: "FAQs and Support",
      file: "CrediFlow_FAQs_and_Support.pdf",
    },
  ];

  const buildDownloadUrl = (file) =>
      `${downloadBase}/downloads/${encodeURIComponent(file)}`;

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 500);
  };

  const filteredLoanOptions = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    const base = Array.isArray(loanOptions) ? loanOptions : [];
    if (!q) return base.slice(0, 6);
    return base
        .filter((loan) =>
            `${loan?.name || ""} ${loan?.loanTypeId || ""}`.toLowerCase().includes(q)
        )
        .slice(0, 8);
  }, [loanOptions, searchQuery]);

  const selectLoanFromSearch = (loan) => {
    if (!loan?.id) return;
    setSearchQuery(loan.name || loan.loanTypeId || "");
    setSearchOpen(false);
    navigate(`/loan-details/${loan.id}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const firstMatch = filteredLoanOptions[0];
    if (firstMatch?.id) {
      selectLoanFromSearch(firstMatch);
      return;
    }
    navigate("/loans");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Ensure mobile drawer is closed when switching to desktop width
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Click outside to close profile dropdown (desktop)
  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  useEffect(() => {
    const syncProfileImage = () => {
      setProfileImage(localStorage.getItem("profileImage") || "");
    };

    window.addEventListener("storage", syncProfileImage);
    window.addEventListener("profile-image-updated", syncProfileImage);
    return () => {
      window.removeEventListener("storage", syncProfileImage);
      window.removeEventListener("profile-image-updated", syncProfileImage);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfileName = async () => {
      if (!isLoggedIn) {
        if (mounted) setDisplayName("");
        return;
      }

      if (displayName) return;

      try {
        const res = await api.get("/user/profile");
        const name = res.data?.fullName || res.data?.name || "";
        if (mounted && name) {
          setDisplayName(name);
        }
      } catch (e) {
        // Keep fallback initial when profile name is unavailable.
      }
    };

    loadProfileName();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, displayName]);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      if (!isLoggedIn) {
        if (mounted) setUnreadCount(0);
        return;
      }
      try {
        const res = await getUnreadNotificationCount();
        if (mounted) {
          setUnreadCount(Number(res.data?.unreadCount || 0));
        }
      } catch (e) {
        if (mounted) setUnreadCount(0);
      }
    };

    loadUnreadCount();
    const id = setInterval(loadUnreadCount, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    let mounted = true;
    const loadLoans = async () => {
      try {
        const res = await getAllLoans();
        if (mounted) {
          setLoanOptions(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (mounted) setLoanOptions([]);
      }
    };
    loadLoans();
    return () => {
      mounted = false;
    };
  }, []);

  // On mobile, open profile dropdown on click instead of hover
  const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  const onProfileClick = () => {
    if (isTouch) setOpen((v) => !v);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadRef.current && !downloadRef.current.contains(event.target)) {
        setDownloadOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
      <>
        <nav className={`navbar ${showNavbar ? "navbar-visible" : "navbar-hidden"}`}>
          <div className="left-side">
            {/* Hamburger */}
            <button
                className={`hamburger ${mobileOpen ? "is-active" : ""}`}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>

            {/* Logo */}
            <div className="logo">
              <Link to="/">
                <span className="logo-text">CrediFlow</span>
              </Link>
            </div>
          </div>

          {/* Search */}
          <form className="search-bar" onSubmit={handleSearch} role="search" ref={searchRef}>
            <input
                type="text"
                placeholder="Search loans"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                aria-label="Search loans"
            />
            {searchOpen && filteredLoanOptions.length > 0 && (
                <div className="search-dropdown" role="listbox" aria-label="Loan suggestions">
                  {filteredLoanOptions.map((loan) => (
                      <button
                          key={loan.id}
                          type="button"
                          className="search-option"
                          onClick={() => selectLoanFromSearch(loan)}
                      >
                        <span className="search-option-name">{loan.name || loan.loanTypeId}</span>
                        <span className="search-option-meta">
                  {(loan.loanTypeId || "").replaceAll("_", " ")} | {Number(loan.interestRate || 0)}%
                </span>
                      </button>
                  ))}
                </div>
            )}
          </form>

          {/* Desktop links */}
          <ul className="nav-links desktop-only">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/loans">Loans</Link></li>
            <li onClick={() => navigate("/CalculatorHome")}>Calculator</li>
            <li className="downloads-wrapper" ref={downloadRef}>
              <div onClick={() => setDownloadOpen(!downloadOpen)}>
                Loan Info ▾
              </div>

              {downloadOpen && (
                  <div className="downloads-dropdown">
                    {downloads.map((doc) => (
                        <a key={doc.file} href={buildDownloadUrl(doc.file)} download={doc.file}>
                          {doc.label}
                        </a>
                    ))}
                  </div>
              )}
            </li>

            <li onClick={() => navigate("/notifications")} className="notifications-nav-item">
              Notifications
              {isLoggedIn && unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </li>
            <li onClick={() => navigate("/about")}>About us</li>

            {isLoggedIn ? (
                <li
                    className="profile-wrapper"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    ref={profileRef}
                    onClick={onProfileClick}
                >
                  <div className="profile-circle" aria-haspopup="menu" aria-expanded={open}>
                    {profileImage ? (
                        <img src={profileImage} alt="Profile" className="navbar-profile-image" />
                    ) : (
                        initial
                    )}
                  </div>

                  {open && (
                      <div className="profile-dropdown" role="menu">
                        <p role="menuitem" onClick={() => navigate("/profile")}>
                          View Profile
                        </p>
                        <p role="menuitem" onClick={() => navigate("/track-status")}>
                          Track Application
                        </p>
                        <p role="menuitem" onClick={logout}>
                          Logout
                        </p>
                      </div>
                  )}
                </li>
            ) : (
                <li className="login-btn" onClick={() => navigate("/login")}>
                  Login
                </li>
            )}
          </ul>

          {/* Overlay for mobile */}
          {mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}

          {/* Mobile slide-in menu */}
          <div
              id="mobile-menu"
              className={`mobile-menu ${mobileOpen ? "open" : ""}`}
              ref={mobileMenuRef}
              role="dialog"
              aria-modal="true"
          >
            <ul className="mobile-links">
              <li onClick={() => navigate("/")}>Home</li>
              <li onClick={() => navigate("/loans")}>Loans</li>
              <li onClick={() => navigate("/CalculatorHome")}>Calculator</li>
              {downloads.map((doc) => (
                  <li key={`mobile-${doc.file}`}>
                    <a href={buildDownloadUrl(doc.file)} download={doc.file}>
                      {doc.label}
                    </a>
                  </li>
              ))}
              <li onClick={() => navigate("/notifications")}>
                Notifications
                {isLoggedIn && unreadCount > 0 ? ` (${unreadCount > 99 ? "99+" : unreadCount})` : ""}
              </li>
              <li onClick={() => navigate("/about")}>About us</li>

              <div className="mobile-divider" />

              {isLoggedIn ? (
                  <>
                    <li onClick={() => navigate("/profile")}>View Profile</li>
                    <li onClick={() => navigate("/track-status")}>Track Application</li>
                    <li onClick={logout}>Logout</li>
                  </>
              ) : (
                  <li onClick={() => navigate("/login")}>Login</li>
              )}
            </ul>
          </div>
        </nav>
        {!noSpacer && <div className="navbar-spacer" />}
      </>
  );
}

export default Navbar;
