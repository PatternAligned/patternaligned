// pages/auth/signin.jsx
// Login page
// WHY: This is where users enter their email to get a magic link
// No password needed (passwordless auth is more secure + better UX)

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      // NextAuth signIn function
      // Sends verification email with magic link
      const result = await signIn("email", {
        email,
        redirect: false, // Don't auto-redirect, we'll handle it
      });

      if (result.error) {
        setError("Failed to send sign-in email. Try again.");
        console.error(result.error);
      } else {
        setMessage(
          "Check your email for a sign-in link. It expires in 24 hours."
        );
        setEmail(""); // Clear form
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <style jsx>{`
        .signin-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .signin-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
        }

        .signin-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .signin-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .signin-subtitle {
          font-size: 14px;
          color: #999;
          margin: 0;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
        }

        .form-input {
          padding: 12px 16px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          color: #ffffff;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #444;
        }

        .form-button {
          padding: 12px 16px;
          background: #ffffff;
          color: #0a0a0a;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .form-button:hover {
          opacity: 0.9;
        }

        .form-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-box {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.5;
        }

        .message-success {
          background: #1a3a1a;
          color: #90ee90;
          border: 1px solid #2a5a2a;
        }

        .message-error {
          background: #3a1a1a;
          color: #ff6b6b;
          border: 1px solid #5a2a2a;
        }

        .signin-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #999;
        }

        .signin-footer-link {
          color: #ffffff;
          text-decoration: none;
        }

        .signin-footer-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="signin-card">
        <div className="signin-header">
          <h1 className="signin-title">PatternAligned</h1>
          <p className="signin-subtitle">Sign in to your account</p>
        </div>

        {message && <div className="message-box message-success">{message}</div>}
        {error && <div className="message-box message-error">{error}</div>}

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="form-button"
            disabled={isLoading || !email}
          >
            {isLoading ? "Sending..." : "Send Sign In Link"}
          </button>
        </form>

        <div className="signin-footer">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="signin-footer-link">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
