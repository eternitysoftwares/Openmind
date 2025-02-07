import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function Welcome() {
  const navigate = useNavigate();
  const { signUp, signIn, error, clearError, user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    password: '',
  });

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      navigate('/home');
    }
    return () => clearError();
  }, [clearError, user, navigate]);

  const validateForm = () => {
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    if (!formData.password.trim()) {
      return 'Password is required';
    }
    if (!isLogin) {
      if (!formData.name.trim()) {
        return 'Name is required';
      }
      if (!formData.dob) {
        return 'Date of birth is required';
      }
      if (formData.password.length < 6) {
        return 'Password must be at least 6 characters long';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const validationError = validateForm();
    if (validationError) {
      useAuthStore.setState({ error: validationError });
      return;
    }

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        if (!error) {
          navigate('/home');
        }
      } else {
        await signUp(formData.email, formData.password, formData.name, formData.dob);
        if (!error) {
          navigate('/setup');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const switchMode = () => {
    clearError();
    setIsLogin(!isLogin);
    setStep(1);
    setFormData({
      name: '',
      email: '',
      dob: '',
      password: '',
    });
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center p-4">
      <div className="absolute top-4 left-4">
        <button className="p-2 glass-bg rounded-lg">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <h1 className="logo text-4xl text-white mt-16 mb-24">openmind</h1>

      <div className="w-full max-w-md">
        <h2 className="text-4xl font-light text-white text-center mb-3">
          {isLogin ? 'Welcome Back' : (step === 1 ? 'Welcome' : 'Create Account')}
        </h2>
        <p className="text-gray-400 text-center mb-12">
          {isLogin ? 'Sign in to continue' : 'Enter details and setup your profile'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isLogin ? (
            <>
              <input
                type="email"
                placeholder="Enter your email"
                required
                className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Enter your password"
                required
                minLength={6}
                className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="submit"
                className="w-full bg-white py-3 rounded-lg text-gray-900 font-light hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={switchMode}
                className="w-full text-white text-sm hover:text-gray-300 transition-colors"
              >
                Don't have an account? Sign Up
              </button>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <input
                    type="text"
                    placeholder="What's your name?"
                    required
                    className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Enter your email here"
                    required
                    className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <input
                    type="date"
                    placeholder="Date of Birth"
                    required
                    className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.name && formData.email && formData.dob) {
                        setStep(2);
                      } else {
                        useAuthStore.setState({ error: 'Please fill in all fields' });
                      }
                    }}
                    className="w-full bg-white py-3 rounded-lg text-gray-900 font-light hover:bg-gray-100 transition-colors"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={switchMode}
                    className="w-full text-white text-sm hover:text-gray-300 transition-colors"
                  >
                    Already have an account? Sign In
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <input
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 bg-white py-3 rounded-lg text-gray-900 font-light hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-white py-3 rounded-lg text-gray-900 font-light hover:bg-gray-100 transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default Welcome;