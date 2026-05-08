import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import HowItWorks from '@/components/landing/HowItWorks';
import ArchitectureSection from '@/components/landing/Architecture';
import ProvenInTesting from '@/components/landing/ProvenInTesting';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
        <HowItWorks />
        <ArchitectureSection />
        <ProvenInTesting />
      </main>
      <Footer />
    </div>
  );
}
