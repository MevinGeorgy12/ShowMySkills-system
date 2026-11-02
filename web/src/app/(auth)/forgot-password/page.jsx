"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { authService } from "@/services/apiClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to send reset code. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 500);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.resetPassword(email, otp.join(""), newPassword);
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4B9C93] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/20">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <img
              src="/logo.png"
              alt="ShowMySkills Logo"
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-gray-900 font-extrabold text-2xl tracking-tight">
              ShowMy<span className="text-[#4B9C93]">Skills</span>
            </span>
          </Link>

          <h2 className="text-2xl font-extrabold text-gray-900">
            {step === 1 && "Reset Password"}
            {step === 2 && "Enter Verification Code"}
            {step === 3 && "Set New Password"}
            {step === 4 && "Password Reset Complete"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {step === 1 && "Enter your registered email to receive a 6-digit recovery OTP."}
            {step === 2 && `We sent a 6-digit OTP code to ${email}`}
            {step === 3 && "Create a secure new password for your account."}
            {step === 4 && "Your credentials have been updated successfully."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Account Email</label>
              <div className="flex items-center h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#4B9C93] focus-within:bg-white transition-all">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="you@university.edu or you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent pl-2.5 text-xs sm:text-sm text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#009689] hover:bg-[#007e73] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? "Sending OTP..." : "Send Verification OTP"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-gray-200 bg-gray-50 focus:border-[#4B9C93] focus:bg-white focus:outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#009689] hover:bg-[#007e73] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? "Verifying..." : "Verify Code"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Change Email Address
            </button>
          </form>
        )}

        {/* Step 3: New Password Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">New Password</label>
              <div className="flex items-center h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#4B9C93] focus-within:bg-white transition-all">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent pl-2.5 pr-1.5 text-xs sm:text-sm text-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  title={showNewPassword ? "Hide password" : "Show password"}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#4B9C93] shrink-0 transition-colors cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Confirm New Password</label>
              <div className="flex items-center h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus-within:border-[#4B9C93] focus-within:bg-white transition-all">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent pl-2.5 pr-1.5 text-xs sm:text-sm text-gray-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#4B9C93] shrink-0 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#009689] hover:bg-[#007e73] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? "Updating..." : "Update Password"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 4: Success State */}
        {step === 4 && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Your password has been changed successfully. You can now log in with your updated credentials.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="w-full h-11 rounded-xl bg-[#009689] hover:bg-[#007e73] text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              Return to Log In
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#4B9C93] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
