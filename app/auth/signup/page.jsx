'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result.error) {
        setError("Failed to send verification email. Try again.");
        console.error(result.error);
      } else {
        setMessage(
          "Check your email to verify and complete signup. Link expires in 24 hours."
        );
        setEmail("");
        setName("");
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <style jsx>{`
        .signup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .signup-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
        }

        .signup-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .signup-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .signup-subtitle {
          font-size: 14px;
          color: #999;
          margin: 0;
        }

        .signup-form {
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

        .signup-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #999;
        }

        .signup-footer-link {
          color: #ffffff;
          text-decoration: none;
        }

        .signup-footer-link:hover {
          text-decoration: underline;
        }

        .signup-legal {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #2a2a2a;
          font-size: 12px;
          color: #666;
          line-height: 1.6;
        }
      `}</style>

      <div className="signup-card">
        <div className="signup-header">
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Join PatternAligned</p>
        </div>

        {message && <div className="message-box message-success">{message}</div>}
        {error && <div className="message-box message-error">{error}</div>}

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

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
            {isLoading ? "Sending..." : "Send Verification Link"}
          </button>
        </form>

        <div className="signup-footer">
          Already have an account?{" "}
          <Link href="/auth/signin" className="signup-footer-link">
            Sign in
          </Link>
        </div>

        <div className="signup-legal">
          By signing up, you agree to our Terms of Service and Privacy Policy.
          We use behavioral analysis to improve your experience.
        </div>
      </div>
    </div>
  );
}