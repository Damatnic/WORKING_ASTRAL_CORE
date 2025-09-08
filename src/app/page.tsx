import Link from 'next/link';
import { AccessibleSkipLink, AccessibleButton } from '@/components/accessibility/AccessibleComponents';
import { Brain, Heart, Users, Shield, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <AccessibleSkipLink targetId="main-content" />
      
      <main id="main-content" className="container mx-auto px-4 py-12" tabIndex={-1}>
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-16" aria-labelledby="hero-heading">
          <h1 
            id="hero-heading"
            className="text-4xl md:text-6xl font-bold text-neutral-800 mb-6"
          >
            Welcome to <span className="text-primary-600">Astral Core</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 mb-8" aria-describedby="hero-heading">
            We built Astral Core to be the voice people find when they&apos;ve lost their own.
            <br />
            Anonymous, immediate mental health support when you need it most.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signin"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 inline-flex items-center"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Link>
            <Link
              href="/crisis"
              className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Crisis Support
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl font-bold text-center text-neutral-800 mb-12">
            How We Support You
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Brain,
                title: "AI Therapy",
                description: "24/7 anonymous therapy sessions with AI that understands and responds with empathy.",
                color: "bg-primary-500"
              },
              {
                icon: Shield,
                title: "Crisis Support",
                description: "Immediate crisis intervention tools and emergency resources when you need them most.",
                color: "bg-red-500"
              },
              {
                icon: Heart,
                title: "Wellness Tools",
                description: "Mood tracking, mindfulness exercises, and personalized wellness plans.",
                color: "bg-wellness-mindful"
              },
              {
                icon: Users,
                title: "Peer Support",
                description: "Connect with others who understand your journey in a safe, moderated environment.",
                color: "bg-green-500"
              }
            ].map((feature, index) => (
              <article 
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-200 text-center"
                aria-labelledby={`feature-${index}-title`}
              >
                <div className={`${feature.color} rounded-xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                  <feature.icon className="w-8 h-8 text-white" aria-hidden="true" />
                </div>
                <h3 id={`feature-${index}-title`} className="text-xl font-bold text-neutral-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section 
          className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-8 md:p-12 text-center text-white"
          aria-labelledby="cta-heading"
        >
          <h2 id="cta-heading" className="text-3xl font-bold mb-4">
            You&apos;re Not Alone
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands who have found their voice again through Astral Core.
          </p>
          <Link
            href="/auth/signup"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 inline-flex items-center"
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
          </Link>
        </section>
        
        {/* Emergency Notice */}
        <aside 
          className="mt-12 p-6 bg-red-50 border-l-4 border-red-500 rounded-lg"
          role="alert"
          aria-labelledby="emergency-heading"
        >
          <h3 id="emergency-heading" className="text-lg font-semibold text-red-800 mb-2">
            In Crisis? Get Immediate Help
          </h3>
          <p className="text-red-700 mb-4">
            If you&apos;re in immediate danger or having thoughts of self-harm, please reach out for help right now.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="tel:988"
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
            >
              Call 988 - Suicide & Crisis Lifeline
            </a>
            <Link
              href="/crisis"
              className="bg-white text-red-600 border-2 border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-center"
            >
              Crisis Resources
            </Link>
          </div>
        </aside>
      </main>
      
      <footer className="bg-neutral-100 py-8 mt-16" role="contentinfo">
        <div className="container mx-auto px-4 text-center text-neutral-600">
          <p>&copy; 2024 Astral Core. Supporting mental health with compassion and technology.</p>
          <nav className="mt-4" aria-label="Footer navigation">
            <div className="flex justify-center space-x-6">
              <Link href="/privacy" className="hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                Accessibility
              </Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
