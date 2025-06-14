import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { 
  SparklesIcon, 
  ShieldCheckIcon, 
  BoltIcon,
  ArrowRightIcon,
  CodeBracketIcon,
  CubeTransparentIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import Footer from './Footer';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FeatureCard = ({ icon, title, description, delay }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) => (
  <div 
    className="card-modern animate-slide-up group"
    style={{ animationDelay: delay }}
  >
    <div className="flex flex-col space-y-6">
      <div className="w-16 h-16 rounded-2xl glass-subtle flex items-center justify-center">
        <div className="text-blue-400 group-hover:text-blue-300 transition-colors duration-500">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-100 transition-colors duration-500">
          {title}
        </h3>
        <p className="text-blue-200 leading-relaxed group-hover:text-blue-100 transition-colors duration-500">
          {description}
        </p>
      </div>
    </div>
  </div>
);

const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="text-center">
    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-gradient mb-2 sm:mb-3">{number}</div>
    <div className="text-xs sm:text-sm text-blue-300 uppercase tracking-wider font-medium">{label}</div>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { authenticated, login } = usePrivy();

  const handleGetStarted = () => {
    if (authenticated) {
      onGetStarted();
    } else {
      login();
    }
  };

  const features = [
    {
      icon: <CodeBracketIcon className="h-8 w-8" />,
      title: "Developer-First",
      description: "Built with modern TypeScript, React, and industry-standard patterns. Full SDK integration with comprehensive documentation."
    },
    {
      icon: <ShieldCheckIcon className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "End-to-end encrypted messaging with XMTP protocol. Hardware wallet support and non-custodial architecture."
    },
    {
      icon: <BoltIcon className="h-8 w-8" />,
      title: "Production Ready",
      description: "Optimized for scale with efficient state management, responsive design, and cross-platform compatibility."
    }
  ];

  const commands = [
    "wallet.getBalance()",
    "transfer(0.1, 'ETH', 'vitalik.eth')",
    "swap('USDC', 'ETH', 1000)",
    "deploy('ERC20Token')",
    "createFundraiser(goal: 5)",
    "generateQR(address, amount)"
  ];

  return (
    <div className="min-h-screen black-gradient relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-24 sm:pt-32 md:pt-40 pb-12 md:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-20 sm:mb-32 md:mb-40">
            <div className="mb-8 animate-slide-down">
              <div className="inline-flex items-center space-x-3 px-6 py-3 glass-modern rounded-full mb-8">
                <img 
                  src="/base logo.svg" 
                  alt="Base Logo" 
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-blue-300">Live on Base Sepolia</span>
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-8 md:mb-12 animate-slide-up tracking-tight leading-none">
              Zeon
              <br />
              <span className="text-blue-gradient font-bold">Protocol</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-200 mb-12 md:mb-16 max-w-4xl mx-auto leading-relaxed animate-slide-up font-light px-4" style={{ animationDelay: '0.2s' }}>
              Advanced XMTP agent infrastructure for sophisticated crypto operations. 
              <br className="hidden sm:block" />
              Built for developers who demand enterprise-grade tooling.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-12 md:mb-16 animate-slide-up px-4" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={handleGetStarted}
                className="group btn-blue text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 font-bold w-full sm:w-auto"
              >
                <span className="flex items-center justify-center space-x-3 sm:space-x-4">
                  <span>{authenticated ? 'Launch Console' : 'Connect & Start'}</span>
                  <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-2" />
                </span>
              </button>
              
              <a 
                href="#features" 
                className="flex items-center justify-center space-x-3 text-blue-300 hover:text-white transition-colors duration-300 font-semibold text-base sm:text-lg w-full sm:w-auto py-2"
              >
                <span>View Documentation</span>
                <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12 max-w-2xl mx-auto animate-slide-up px-4" style={{ animationDelay: '0.6s' }}>
              <StatCard number="99.9%" label="Uptime" />
              <StatCard number="<50ms" label="Response" />
              <StatCard number="24/7" label="Monitoring" />
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="mb-20 sm:mb-32 md:mb-40">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 animate-slide-up px-4">
                Professional Grade Infrastructure
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
                Everything you need to build production-ready crypto applications with confidence.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={`${0.4 + index * 0.2}s`}
                />
              ))}
            </div>
          </section>

          {/* Code Console */}
          <section className="mb-20 sm:mb-32 md:mb-40">
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 animate-slide-up px-4">
                Natural Language Interface
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
                Interact with blockchain protocols using intuitive commands.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="glass-modern rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 md:p-10 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                  <div className="flex space-x-2 sm:space-x-3">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-blue-300 font-mono font-semibold text-sm sm:text-base">zeon-console</span>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  {commands.map((command, index) => (
                    <div 
                      key={command} 
                      className="flex items-center space-x-3 sm:space-x-6 animate-slide-up group"
                      style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                    >
                      <span className="text-blue-400 font-mono text-base sm:text-lg font-bold flex-shrink-0">$</span>
                      <span className="font-mono text-blue-300 text-sm sm:text-base md:text-lg hover:text-white transition-colors duration-300 cursor-pointer group-hover:text-white break-all">
                        {command}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="text-center px-4">
            <div className="animate-slide-up">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-8 sm:mb-12">
                Powered by Industry Standards
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-8 md:space-x-16 text-blue-300">
                <div className="flex items-center space-x-3 group">
                  <CubeTransparentIcon className="h-6 w-6 sm:h-8 sm:w-8 group-hover:text-white transition-colors flex-shrink-0" />
                  <span className="font-semibold text-lg sm:text-xl group-hover:text-white transition-colors">XMTP Protocol</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <CommandLineIcon className="h-6 w-6 sm:h-8 sm:w-8 group-hover:text-white transition-colors flex-shrink-0" />
                  <span className="font-semibold text-lg sm:text-xl group-hover:text-white transition-colors">Coinbase SDK</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <SparklesIcon className="h-6 w-6 sm:h-8 sm:w-8 group-hover:text-white transition-colors flex-shrink-0" />
                  <span className="font-semibold text-lg sm:text-xl group-hover:text-white transition-colors">OpenAI GPT-4</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage; 