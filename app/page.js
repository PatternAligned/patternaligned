import Header from './components/landing/Header';
import Hero from './components/landing/Hero';
import HowItWorks from './components/landing/HowItWorks';
import ValueProps from './components/landing/ValueProps';
import CTA from './components/landing/CTA';
import WaitlistSection from './components/landing/WaitlistSection';
import Footer from './components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="bg-black">
      <Header />
      <Hero />
      <HowItWorks />
      <ValueProps />
      <CTA />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
