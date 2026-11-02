'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/services/apiClient';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    college: '',
    graduationYear: '',
    collegeId: '',
    collegeIdFile: null
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setError('');
    setMessage('');

    if (!file) {
      setFormData({
        ...formData,
        collegeIdFile: null
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG and PNG images are allowed');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('College ID photo must be less than 5MB');
      e.target.value = '';
      return;
    }

    setFormData({
      ...formData,
      collegeIdFile: file
    });

    setMessage('College ID photo selected successfully');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Enter a valid email');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be 10 digits');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.college.trim()) {
      setError('College is required');
      return;
    }

    if (!formData.graduationYear) {
      setError('Graduation year is required');
      return;
    }

    if (!formData.collegeId.trim()) {
      setError('College ID is required');
      return;
    }

    if (!formData.collegeIdFile) {
      setError('College ID photo is required');
      return;
    }

    try {
      setIsLoading(true);

      const data = new FormData();

      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('password', formData.password);
      data.append('college', formData.college);
      data.append('graduationYear', formData.graduationYear);
      data.append('collegeId', formData.collegeId);
      data.append('collegeIdFile', formData.collegeIdFile);

      await apiRequest('/auth/register', 'POST', data);

      setMessage(
        'Registration successful! OTP has been sent to your email.'
      );

      setTimeout(() => {
        router.push(
          `/verify-email?email=${encodeURIComponent(formData.email)}`
        );
      }, 500);
    } catch (error) {
      setError(
        error.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10">

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Create Your Account
          </h1>

          <p className="text-slate-500 mt-2">
            Join ShowMySkills and showcase your skills
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 text-emerald-600 text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>

            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone
              </label>

              <input
                type="tel"
                name="phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(/\D/g, '')
                  })
                }
                className={inputClass}
              />
            </div>

          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>

            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#459E93] transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* College */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              College
            </label>

            <input
              type="text"
              name="college"
              placeholder="Enter your college"
              value={formData.college}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Graduation + College ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Graduation Year
              </label>

              <select
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select year</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
                <option value="2030">2030</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                College ID
              </label>

              <input
                type="text"
                name="collegeId"
                placeholder="College ID number"
                value={formData.collegeId}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

          </div>

          {/* College ID Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload College ID
            </label>

            <input
              type="file"
              name="collegeIdFile"
              accept="image/jpeg,image/png"
              capture="environment"
              onChange={handleFileChange}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700"
            />

            <p className="text-xs text-slate-400 mt-2">
              JPG or PNG only • Maximum 5MB
            </p>

            {formData.collegeIdFile && (
              <p className="text-xs text-emerald-600 mt-2">
                ✓ {formData.collegeIdFile.name}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

        </form>

        {/* Login */}
        <p className="text-center text-sm text-slate-500 mt-7">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-teal-600 font-semibold hover:text-teal-700"
          >
            Sign In
          </button>
        </p>

      </div>
    </div>
  );
}