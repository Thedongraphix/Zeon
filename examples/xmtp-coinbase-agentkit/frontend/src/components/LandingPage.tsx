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
    <div className="text-4xl font-bold text-blue-gradient mb-3">{number}</div>
    <div className="text-sm text-blue-300 uppercase tracking-wider font-medium">{label}</div>
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
      <div className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-40">
            <div className="mb-8 animate-slide-down">
              <div className="inline-flex items-center space-x-3 px-6 py-3 glass-modern rounded-full mb-8">
                <img 
                  src="/base logo.svg" 
                  alt="Base Logo" 
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-blue-300">Live on Base Sepolia</span>
                <div className="status-modern"></div>
              </div>
            </div>

            <h1 className="text-8xl md:text-9xl font-bold text-white mb-12 animate-slide-up tracking-tight leading-none">
              Zeon
              <br />
              <span className="text-blue-gradient font-bold">Protocol</span>
            </h1>

            <p className="text-2xl md:text-3xl text-blue-200 mb-16 max-w-4xl mx-auto leading-relaxed animate-slide-up font-light" style={{ animationDelay: '0.2s' }}>
              Advanced XMTP agent infrastructure for sophisticated crypto operations. 
              <br />
              Built for developers who demand enterprise-grade tooling.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={handleGetStarted}
                className="group btn-blue text-xl px-12 py-5 font-bold"
              >
                <span className="flex items-center space-x-4">
                  <span>{authenticated ? 'Launch Console' : 'Connect & Start'}</span>
                  <ArrowRightIcon className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                </span>
              </button>
              
              <a 
                href="#features" 
                className="flex items-center space-x-3 text-blue-300 hover:text-white transition-colors duration-300 font-semibold text-lg"
              >
                <span>View Documentation</span>
                <ArrowRightIcon className="h-5 w-5" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <StatCard number="99.9%" label="Uptime" />
              <StatCard number="<50ms" label="Response" />
              <StatCard number="24/7" label="Monitoring" />
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="mb-40">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-white mb-8 animate-slide-up">
                Professional Grade Infrastructure
              </h2>
              <p className="text-2xl text-blue-200 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Everything you need to build production-ready crypto applications with confidence.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-10">
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
          <section className="mb-40">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-white mb-8 animate-slide-up">
                Natural Language Interface
              </h2>
              <p className="text-2xl text-blue-200 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Interact with blockchain protocols using intuitive commands.
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="glass-modern rounded-[32px] p-10 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center space-x-4 mb-8">
                  <div className="flex space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-blue-300 font-mono font-semibold">zeon-console</span>
                </div>
                
                <div className="space-y-6">
                  {commands.map((command, index) => (
                    <div 
                      key={command} 
                      className="flex items-center space-x-6 animate-slide-up group"
                      style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                    >
                      <span className="text-blue-400 font-mono text-lg font-bold">$</span>
                      <span className="font-mono text-blue-300 text-lg hover:text-white transition-colors duration-300 cursor-pointer group-hover:text-white">
                        {command}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="text-center">
            <div className="animate-slide-up">
              <h3 className="text-3xl font-bold text-white mb-12">
                Powered by Industry Standards
              </h3>
              <div className="flex items-center justify-center space-x-16 text-blue-300">
                <div className="flex items-center space-x-3 group">
                  <CubeTransparentIcon className="h-8 w-8 group-hover:text-white transition-colors" />
                  <span className="font-semibold text-xl group-hover:text-white transition-colors">XMTP Protocol</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <CommandLineIcon className="h-8 w-8 group-hover:text-white transition-colors" />
                  <span className="font-semibold text-xl group-hover:text-white transition-colors">Coinbase SDK</span>
                </div>
                <div className="flex items-center space-x-3 group">
                  <SparklesIcon className="h-8 w-8 group-hover:text-white transition-colors" />
                  <span className="font-semibold text-xl group-hover:text-white transition-colors">OpenAI GPT-4</span>
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