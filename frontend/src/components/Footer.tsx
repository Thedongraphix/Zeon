import React, { useState } from 'react';
import { 
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('https://zeon-hybrid-api.onrender.com/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setEmail('');
        setTimeout(() => setIsSubscribed(false), 5000);
      } else {
        const data = await response.json();
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative glass-modern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start lg:items-center">
            
            {/* Left Section - Brand & Social */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl font-bold text-white">Zeon</div>
                  <div className="flex items-center space-x-2 px-3 py-1 glass-subtle rounded-full w-fit">
                    <img 
                      src="/base logo.svg" 
                      alt="Base Logo" 
                      className="w-3 h-3 sm:w-4 sm:h-4"
                    />
                    <span className="text-xs font-semibold text-blue-300">Protocol</span>
                  </div>
                </div>
                <p className="text-blue-200 text-base sm:text-lg leading-relaxed max-w-md">
                  Advanced XMTP agent infrastructure for sophisticated crypto operations. 
                  Building the future of decentralized communication.
                </p>
              </div>
              
              {/* Social Links */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <a
                  href="https://x.com/_zeonai?t=5ZnjPmO3DdR-MbzX9zERmQ&s=09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-3 px-4 py-3 glass-subtle rounded-xl hover:bg-black/60 transition-all duration-300 w-full sm:w-auto"
                >
                  <svg 
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300 group-hover:text-white transition-colors flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-sm font-medium text-blue-300 group-hover:text-white transition-colors">
                    Follow us on X
                  </span>
                  <ArrowTopRightOnSquareIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 group-hover:text-white transition-colors flex-shrink-0" />
                </a>
              </div>
            </div>

            {/* Right Section - Newsletter & Waitlist */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                  Join the Waitlist
                </h3>
                <p className="text-blue-200 mb-4 sm:mb-6 text-sm sm:text-base">
                  Be the first to access Zeon Protocol. Get early access, updates, and exclusive insights.
                </p>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      disabled={isSubmitting}
                      className="input-modern w-full disabled:opacity-50 text-sm sm:text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!email.trim() || isSubmitting}
                    className="btn-blue disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-6 py-3 whitespace-nowrap w-full sm:w-auto text-sm sm:text-base"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Joining...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Join Waitlist</span>
                        <PaperAirplaneIcon className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Success Message */}
                {isSubscribed && (
                  <div className="animate-slide-up">
                    <div className="p-3 sm:p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                      <p className="text-blue-100 text-sm font-medium">
                        ✨ Welcome to the waitlist! Check your email for confirmation.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="animate-slide-up">
                    <div className="p-3 sm:p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
                      <p className="text-red-100 text-sm font-medium">
                        {error}
                      </p>
                    </div>
                  </div>
                )}
              </form>

              {/* Privacy Notice */}
              <p className="text-xs text-blue-300/70">
                We respect your privacy. Unsubscribe at any time. 
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                By joining, you agree to receive updates about Zeon Protocol.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-xs sm:text-sm text-blue-300/70 text-center md:text-left">
                © 2025 Zeon Protocol. All rights reserved.
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 md:space-x-8 text-xs sm:text-sm">
                <a 
                  href="#" 
                  className="text-blue-300 hover:text-white transition-colors duration-200"
                >
                  Privacy Policy
                </a>
                <a 
                  href="#" 
                  className="text-blue-300 hover:text-white transition-colors duration-200"
                >
                  Terms of Service
                </a>
                <a 
                  href="#" 
                  className="text-blue-300 hover:text-white transition-colors duration-200"
                >
                  Documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 