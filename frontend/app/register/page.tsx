'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Register User
      await api.post('/auth/register', {
        full_name: fullName,
        email: email,
        password: password,
      }, false);

      // Step 2: Automatically log them in by fetching token
      const tokenResponse = await api.post<{ access_token: string }>('/auth/login', {
        email: email,
        password: password,
      }, false);

      // Step 3: Store token & redirect via context login helper
      localStorage.setItem('token', tokenResponse.access_token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-zinc-950 text-zinc-50">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-8 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            Get started with ExecuteAI, the AI agent operating system.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition duration-150"
              placeholder="Sarah Connor"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition duration-150"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition duration-150"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border border-zinc-950 border-t-transparent" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-zinc-300 hover:underline hover:text-zinc-100">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
