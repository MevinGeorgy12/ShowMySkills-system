'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export function Signup({ role, config }) {
  const [formData, setFormData] = useState({});
  const [showPasswords, setShowPasswords] = useState({});

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted data for role:', role, formData);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 lg:p-8">
      {/* Outer Card Container with Teal Background */}
      <div className="w-full max-w-6xl bg-[#459E93] rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row p-6 lg:p-12">

        {/* Left Section: Hidden on mobile viewports, fully visible on laptops */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between pr-8 text-white">
          <div>
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="ShowMySkills Logo"
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold tracking-wide">ShowMySkills</span>
            </div>

            {/* Dynamic Role Titles */}
            <div className="mt-16 text-center">
              <h2 className="text-3xl font-bold">{config.title}</h2>
              <p className="mt-2 text-white/80 text-sm max-w-sm mx-auto">{config.subtitle}</p>
            </div>
          </div>

          {/* Illustration Area Placeholder */}
          <div className="mt-8 flex justify-center items-center">
            <div className="w-72 h-64 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 text-white/70 text-sm">
              [{role.charAt(0).toUpperCase() + role.slice(1)} Illustration Graphic]
            </div>
          </div>
        </div>

        {/* Mobile Header: Only "ShowMySkills" branding visible on mobile viewports */}
        <div className="lg:hidden flex items-center space-x-3 mb-6 text-white">
          <img
            src="/logo.png"
            alt="ShowMySkills Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-bold tracking-wide">ShowMySkills</span>
        </div>

        {/* Right Section: Form Card */}
        <div className="w-full lg:w-1/2 bg-white rounded-2xl p-6 lg:p-10 shadow-lg flex flex-col justify-between">
          <div>
            {/* Form Header */}
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/login"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
              >
                &larr;
              </Link>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900">Sign up</h3>
                <p className="text-xs text-slate-400">Create your account</p>
              </div>
              <div className="w-8"></div> {/* Spacer for symmetry */}
            </div>

            {/* Dynamic Form Fields from Config */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {config.fields.map((field, index) => {
                const isPassword = field.type === 'password';
                const isVisible = Boolean(showPasswords[field.name]);
                const inputType = isPassword ? (isVisible ? 'text' : 'password') : field.type;

                return (
                  <div key={index} className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-slate-700">{field.label}</label>
                    <div className="relative flex items-center">
                      <input
                        type={inputType}
                        name={field.name}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#459E93] text-slate-800 ${
                          isPassword ? 'pr-11' : ''
                        }`}
                        required
                      />
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.name)}
                          aria-label={isVisible ? 'Hide password' : 'Show password'}
                          title={isVisible ? 'Hide password' : 'Show password'}
                          className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#459E93] transition-colors cursor-pointer"
                        >
                          {isVisible ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-[#009688] hover:bg-[#00796B] text-white font-semibold rounded-xl shadow-md transition duration-200"
              >
                Sign Up
              </button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-400">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button className="w-full flex items-center justify-center space-x-2 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-700">
              <span>Sign in with Google</span>
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-[#009688] font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
