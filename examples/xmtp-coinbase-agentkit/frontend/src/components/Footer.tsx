import React, { useState } from 'react';
import { 
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubscribed(true);
    setEmail('');
    setIsSubmitting(false);
    
    // Reset success message after 3 seconds
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  return (
    <footer className="relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative glass-modern">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Section - Brand & Social */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="text-3xl font-bold text-white">Zeon</div>
                  <div className="flex items-center space-x-2 px-3 py-1 glass-subtle rounded-full">
                    <img 
                      src="/base logo.svg" 
                      alt="Base Logo" 
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-blue-300">Protocol</span>
                  </div>
                </div>
                <p className="text-blue-200 text-lg leading-relaxed max-w-md">
                  Advanced XMTP agent infrastructure for sophisticated crypto operations. 
                  Building the future of decentralized communication.
                </p>
              </div>
              
              {/* Social Links */}
              <div className="flex items-center space-x-6">
                <a
                  href="https://x.com/zeonprotocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-3 px-4 py-3 glass-subtle rounded-xl hover:bg-black/60 transition-all duration-300"
                >
                  <svg 
                    className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-sm font-medium text-blue-300 group-hover:text-white transition-colors">
                    Follow us on X
                  </span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>

            {/* Right Section - Newsletter & Waitlist */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Join the Waitlist
                </h3>
                <p className="text-blue-200 mb-6">
                  Be the first to access Zeon Protocol. Get early access, updates, and exclusive insights.
                </p>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      disabled={isSubmitting}
                      className="input-modern w-full disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!email.trim() || isSubmitting}
                    className="btn-blue disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Joining...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Join Waitlist</span>
                        <PaperAirplaneIcon className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Success Message */}
                {isSubscribed && (
                  <div className="animate-slide-up">
                    <div className="p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                      <p className="text-blue-100 text-sm font-medium">
                        ✨ Welcome to the waitlist! Check your email for confirmation.
                      </p>
                    </div>
                  </div>
                )}
              </form>

              {/* Privacy Notice */}
              <p className="text-xs text-blue-300/70">
                We respect your privacy. Unsubscribe at any time. 
                <br />
                By joining, you agree to receive updates about Zeon Protocol.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-blue-300/70">
                © 2024 Zeon Protocol. All rights reserved.
              </div>
              <div className="flex items-center space-x-8 text-sm">
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