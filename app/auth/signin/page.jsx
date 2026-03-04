'use client';

import { signIn } from "next-auth/react";

export default function SignIn() {
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
          text-align: center;
        }

        .signin-header {
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

        .signin-button {
          width: 100%;
          padding: 12px 24px;
          background: #ffffff;
          color: #0a0a0a;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 30px;
        }

        .signin-button:hover {
          opacity: 0.9;
        }

        .signin-footer {
          margin-top: 24px;
          font-size: 14px;
          color: #999;
        }
      `}</style>

      <div className="signin-card">
        <div className="signin-header">
          <h1 className="signin-title">PatterAligned</h1>
          <p className="signin-subtitle">Sign in to your account</p>
        </div>

        <button
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          className="signin-button"
        >
          Sign in with GitHub
        </button>

        <div className="signin-footer">
          Don't have an account yet? Create a GitHub account to get started.
        </div>
      </div>
    </div>
  );
}
