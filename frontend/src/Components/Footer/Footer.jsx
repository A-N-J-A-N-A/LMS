import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-content">
        <div className="app-footer-brand">
          <h3>CrediFlow</h3>
          <p>Secure, efficient, and reliable loan management solutions.</p>
        </div>

        <div className="app-footer-links">
          <h4>Company</h4>
          <a href="/about">About</a>
          <a href="">Support</a>
          <a href="">Careers</a>
        </div>

        <div className="app-footer-links">
          <h4>Resources</h4>
          <a href="">Privacy Policy</a>
          <a href="">Terms of Service</a>
          <a href="">Contact</a>
        </div>
      </div>

      <div className="app-footer-bottom">© 2026 CrediFlow. All Rights Reserved.</div>
    </footer>
  );
}

export default Footer;
