'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
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

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ access_token: string }>('/auth/login', {
        email,
        password,
      }, false);

      await login(response.access_token);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password.');
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
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            Sign in to manage your ExecuteAI workflows.
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
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          New to ExecuteAI?{' '}
          <Link href="/register" className="text-zinc-300 hover:underline hover:text-zinc-100">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
