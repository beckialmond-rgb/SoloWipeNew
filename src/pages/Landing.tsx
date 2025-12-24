import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  PoundSterling, 
  MessageSquare, 
  Navigation, 
  TrendingUp, 
  WifiOff,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  CreditCard,
  MapPin,
  Users,
  ShieldCheck,
  Zap,
  Target,
  Smartphone,
  X,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SUBSCRIPTION_TIERS } from '@/constants/subscription';
import { useRef, useState, useEffect } from 'react';
import { ExitIntentPopup, useExitIntent } from '@/components/ExitIntentPopup';
import { EmailCaptureForm } from '@/components/EmailCaptureForm';

// Image card component with error handling and multiple path attempts
const TradeImageCard = ({ img, index }: { img: { src: string; alt: string; title: string }; index: number }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(img.src);
  
  // Try alternative paths if main one fails
  const getAlternativePaths = (originalSrc: string) => {
    const base = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '');
    return [
      `${base}.jpg`,
      `${base}.jpeg`,
      `${base}.png`,
      originalSrc.replace('trade-', 'trade'),
      originalSrc.replace('trade-', 'trade_'),
      originalSrc.replace('trade-', 'image-'),
    ];
  };

  const handleImageError = () => {
    const alternatives = getAlternativePaths(img.src);
    const currentIndex = alternatives.indexOf(currentSrc);
    
    if (currentIndex < alternatives.length - 1) {
      // Try next alternative
      const nextSrc = alternatives[currentIndex + 1];
      if (process.env.NODE_ENV === 'development') {
      console.log(`Trying alternative: ${nextSrc}`);
      }
      setCurrentSrc(nextSrc);
    } else {
      // All alternatives exhausted
      if (process.env.NODE_ENV === 'development') {
      console.warn(`✗ All paths failed for: ${img.src}`);
      }
      setImageError(true);
      setImageLoaded(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.03,
        ease: "easeOut"
      }}
      className="relative group"
    >
      <div className="relative rounded-2xl overflow-hidden shadow-award border-2 border-border/80 bg-card aspect-[4/3] hover:shadow-award transition-all duration-300 ease-out card-award group">
        {!imageError ? (
          <>
            <img
              key={currentSrc}
              src={currentSrc}
              alt={img.alt}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
              onLoad={() => {
                setImageLoaded(true);
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✓ Loaded: ${currentSrc}`);
                }
              }}
              onError={handleImageError}
            />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <div className="text-muted-foreground text-sm">Loading...</div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/30">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{img.title}</h3>
              <p className="text-sm text-muted-foreground">{img.alt}</p>
            </div>
          </div>
        )}
        
        {/* Image Overlay - Fixed descriptions */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        >
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-auto">
            <h3 className="font-bold text-xl mb-2 drop-shadow-lg">
              {img.title}
            </h3>
            <p className="text-sm text-white/95 leading-relaxed drop-shadow-md">
              {img.alt}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Removed scroll tracking for performance - static hero section
  
  // Exit intent popup state
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasSeenExitIntent, setHasSeenExitIntent] = useState(false);
  
  // Check if user has already seen exit intent (stored in sessionStorage)
  useEffect(() => {
    const seen = sessionStorage.getItem('exitIntentSeen');
    if (seen) {
      setHasSeenExitIntent(true);
    }
  }, []);
  
  // Exit intent detection
  useExitIntent(() => {
    if (!hasSeenExitIntent && !showExitIntent) {
      setShowExitIntent(true);
    }
  });
  
  const handleExitIntentClose = () => {
    setShowExitIntent(false);
    setHasSeenExitIntent(true);
    sessionStorage.setItem('exitIntentSeen', 'true');
  };
  
  const handleExitIntentSuccess = (email: string) => {
    // Track successful lead capture
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        event_category: 'Lead Generation',
        event_label: 'Exit Intent Success',
        value: 1
      });
    }
    if (process.env.NODE_ENV === 'development') {
    console.log('Lead captured:', email);
    }
  };

  const scrollToSection = (id: string) => {
    try {
    const headerOffset = 72; // approximate sticky header height
    const element = document.getElementById(id);
      if (!element) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Section with id "${id}" not found`);
        }
        return;
      }
    const rect = element.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY - headerOffset;
    
    // Smooth scroll with easing
    window.scrollTo({ 
      top: Math.max(0, offsetTop), 
      behavior: 'smooth' 
    });
    
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'navigation', {
        event_category: 'Scroll',
        event_label: id,
        value: 1
      });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error scrolling to section:', error);
      }
    }
  };
  
  // Optimized scroll depth tracking - throttled and debounced for performance
  useEffect(() => {
    const trackedMilestones = new Set<number>();
    let lastScrollTime = 0;
    const SCROLL_THROTTLE = 250; // Only check every 250ms
    
    const trackScrollDepth = () => {
      const now = Date.now();
      if (now - lastScrollTime < SCROLL_THROTTLE) return;
      lastScrollTime = now;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);
      
      // Track milestones: 25%, 50%, 75%, 100%
      const milestones = [25, 50, 75, 100];
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'scroll_depth', {
              event_category: 'Engagement',
              event_label: `${milestone}%`,
              value: milestone
            });
          }
        }
      });
    };
    
    const handleScroll = () => {
          trackScrollDepth();
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      trackedMilestones.clear();
    };
  }, []);

  const trustStats = [
    { icon: PoundSterling, label: '£0 Setup Fees', value: '£0' },
    { icon: Zap, label: '30-Second SMS', value: '30s' },
    { icon: ShieldCheck, label: 'UK GDPR Compliant', value: 'GDPR' },
    { icon: CreditCard, label: 'GoCardless Ready', value: 'DD' },
  ];

  const painPoints = [
    {
      icon: Calendar,
      title: 'Messy notebooks & memory',
      description: 'Frequencies in your head. Missed streets. Forgotten one-offs. Your round falls apart.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      icon: PoundSterling,
      title: 'Chasing cash & bank transfers',
      description: '"I\'ll pay you next time" stacks up. Door-knocking. Bank transfer tracking. Unpaid work piles up.',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    },
    {
      icon: MessageSquare,
      title: 'Last-minute texting & late nights',
      description: 'Reminders, "on my way" texts, receipts—all typed manually from your sofa at 10pm.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
  ];

  const transformations = [
    {
      before: 'Notebooks, wall calendars, memory',
      after: 'Jobs auto-reschedule forever. Your round never falls apart.',
      icon: Calendar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      before: 'Chasing payments, door-knocking, "I\'ll pay next time"',
      after: 'Direct Debit auto-collects on completion. Never chase a payment again.',
      icon: CreditCard,
      color: 'text-primary',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      before: 'Typing reminders, receipts, texts line-by-line',
      after: 'Pre-written templates sent automatically. Professional communication in seconds.',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
  ];

  // Flexible image paths - try multiple naming conventions
  const getImageSrc = (num: number) => {
    // Try common naming patterns
    const patterns = [
      `/trade-${num}.jpg`,
      `/trade-${num}.jpeg`,
      `/trade-${num}.png`,
      `/trade${num}.jpg`,
      `/trade${num}.jpeg`,
      `/trade${num}.png`,
      `/trade_${num}.jpg`,
      `/trade_${num}.jpeg`,
      `/trade_${num}.png`,
      `/image-${num}.jpg`,
      `/image${num}.jpg`,
    ];
    // Return the first pattern - browser will try to load it
    return patterns[0];
  };

  const tradeImages = [
    {
      src: getImageSrc(1),
      alt: 'SoloWipe being reviewed with a customer in their living room',
      title: 'Customer Consultation',
    },
    {
      src: getImageSrc(2),
      alt: 'SoloWipe user taking a break in his van between appointments',
      title: 'In the Van',
    },
    {
      src: getImageSrc(3),
      alt: 'Team reviewing SoloWipe app in pub',
      title: 'Team Review',
    },
    {
      src: getImageSrc(4),
      alt: 'SoloWipe user showing the app to a happy customer at the door',
      title: 'Customer Service',
    },
    {
      src: getImageSrc(5),
      alt: 'SoloWipe in use while driving between jobs',
      title: 'On the Road',
    },
    {
      src: getImageSrc(6),
      alt: 'SoloWipe user discussing finances in an office with an advisor',
      title: 'Business Meeting',
    },
    {
      src: getImageSrc(7),
      alt: 'Professional using SoloWipe on the go',
      title: 'On the Go',
    },
    {
      src: getImageSrc(8),
      alt: 'SoloWipe user managing their round and scheduling jobs',
      title: 'Managing Your Round',
    },
  ];

  const features = [
    {
      icon: Calendar,
      title: 'Automatic Job Scheduling',
      description: 'Set up recurring customers once. Jobs automatically reschedule after completion so your round never falls apart.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      glowColor: 'from-blue-500/20 to-transparent',
    },
    {
      icon: CreditCard,
      title: 'Automatic Payment Collection',
      description: 'Connect GoCardless once. When you complete a job, Direct Debit collection starts automatically so you never chase payments.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      glowColor: 'from-emerald-500/20 to-transparent',
    },
    {
      icon: MessageSquare,
      title: 'Smart Customer Communication',
      description: 'Pre-written SMS templates for reminders, receipts, and updates. Send to one customer or bulk message your entire route.',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      glowColor: 'from-green-500/20 to-transparent',
    },
    {
      icon: Navigation,
      title: 'Route Optimization',
      description: 'One tap optimizes your day\'s jobs using GPS. Stop zig-zagging and wasting fuel with the most efficient route.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      glowColor: 'from-purple-500/20 to-transparent',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Earnings Tracking',
      description: 'See today\'s earnings, unpaid jobs, and weekly targets in seconds so you always know where you stand.',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      glowColor: 'from-amber-500/20 to-transparent',
    },
    {
      icon: WifiOff,
      title: 'Works Offline',
      description: 'Complete jobs, add customers, and track payments—all without internet. Everything syncs automatically when you\'re back online.',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50 dark:bg-slate-950/20',
      glowColor: 'from-slate-500/20 to-transparent',
    },
  ];

  const faqItems = [
    {
      question: 'Do I have to use Direct Debit?',
      answer:
        'No. You can still take cash or bank transfer and mark jobs as paid manually. Direct Debit is there to automate collections for customers who prefer it.',
    },
    {
      question: 'What if my signal is bad or I work in rural areas?',
      answer:
        'SoloWipe is built to work offline. You can view jobs, complete work, and add customers without internet—everything syncs automatically when you are back online.',
    },
    {
      question: 'Is SoloWipe only for UK window cleaners?',
      answer:
        'Yes. SoloWipe is designed specifically for UK window cleaners with GBP pricing, UK tax assumptions, and GoCardless Direct Debit integration.',
    },
    {
      question: 'How hard is it to switch from my paper diary or Excel?',
      answer:
        'Most users can move their round across in an evening. Start with your most regular streets, add customers with price and frequency, and SoloWipe will handle the rest.',
    },
    {
      question: 'What happens after my first 10 free jobs?',
      answer:
        'You can keep all your data. To continue automating new jobs and SMS, you can subscribe to Pro and get a 7-day free trial with full access.',
    },
    {
      question: 'Can I cancel anytime?',
      answer:
        'Yes. You can cancel your subscription at any time from within the app. There are no contracts and no cancellation phone calls.',
    },
  ];

  return (
    <div className="min-h-screen bg-background relative" role="main">
      {/* Skip to content link for accessibility */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      {/* 🏆 AWARD-WINNING STICKY NAVIGATION 🏆 */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 border-b-2 border-border/50 bg-white/90 dark:bg-slate-950/90 backdrop-premium shadow-award"
        role="banner"
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <motion.button
            onClick={() => scrollToSection('hero')}
            className="flex items-center transition-all hover:opacity-90 -my-2 focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-xl"
            aria-label="SoloWipe Home"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
              <img
              src="/SoloLogo.jpg"
              alt="SoloWipe - Automate Your Window Cleaning Round"
              className="h-16 w-auto sm:h-20 md:h-24 lg:h-28 brightness-110 contrast-110 saturate-110 drop-shadow-lg"
              loading="eager"
              width="auto"
              height="auto"
                decoding="async"
                fetchPriority="high"
            />
          </motion.button>
          <nav className="hidden md:flex items-center gap-6 text-sm" role="navigation" aria-label="Main navigation">
            {[
              { label: 'Features', section: 'features' },
              { label: 'How it Works', section: 'how-it-works' },
              { label: 'Pricing', section: 'pricing' },
              { label: 'FAQ', section: 'faq' },
            ].map((item) => (
              <motion.button
                key={item.section}
                onClick={() => scrollToSection(item.section)}
                className="text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-all font-semibold tracking-wide focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-lg px-3 py-2 relative"
                aria-label={`View ${item.label}`}
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">{item.label}</span>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-emerald-600 rounded-full"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="sm"
                onClick={() => {
                  try {
                  // Analytics tracking
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'click', {
                      event_category: 'CTA',
                      event_label: 'Header Start Free',
                      value: 1
                    });
                  }
                  navigate('/auth?mode=signup');
                  } catch (error) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error('Navigation error:', error);
                    }
                  }
                }}
                className="h-10 px-6 text-sm font-black shadow-award bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white border-0 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 btn-award"
                aria-label="Start Free - Create Account"
              >
                Start Free
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* 🏆 AWARD-WINNING 2026 HERO SECTION 🏆 */}
      <section
        id="hero"
        ref={heroRef}
        className="relative overflow-hidden py-8 px-4 min-h-[calc(100vh-4rem)] flex flex-col justify-center particle-field"
        aria-label="Hero Section"
        style={{
          background: `
            radial-gradient(ellipse 120% 100% at 50% 0%, hsl(211 100% 50% / 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 50% 100%, hsl(142 71% 45% / 0.3) 0%, transparent 50%),
            linear-gradient(135deg, hsl(220 21% 25%) 0%, hsl(211 100% 40%) 25%, hsl(211 100% 50%) 50%, hsl(142 71% 45%) 75%, hsl(220 21% 25%) 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 400% 400%'
        }}
      >
        {/* 🏆 Advanced Particle Field & Gradient Mesh System 🏆 */}
        {/* Simplified background for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Minimal static background orbs */}
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-[120px] opacity-30" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-[120px] opacity-30" />
        </div>

        <div
          className="relative max-w-6xl mx-auto w-full z-10"
        >
          {/* 🏆 AWARD-WINNING GLASSMORPHISM CONTAINER - 3D PARALLAX 🏆 */}
          <div
            className="text-center relative glass-award rounded-2xl p-4 md:p-6 border-2 border-white/50 shadow-lg z-20"
          >
            {/* Premium Multi-Layer Inner Glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tl from-transparent via-primary/5 to-emerald-400/5 pointer-events-none" />
            
            {/* Static border - animation disabled to prevent flashing */}
            {/* Static border - animations disabled */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none border-2 border-primary/30 opacity-50" />
            {/* Compact Logo */}
            <div className="mb-3 flex justify-center relative">
              <img
                src="/SoloLogo.jpg"
                alt="SoloWipe - Automate Your Window Cleaning Round"
                className="h-24 w-auto sm:h-32 md:h-40 lg:h-48 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)] relative z-10 brightness-130 contrast-115 saturate-120"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width="auto"
                height="auto"
              />
            </div>

            {/* Compact Badges - Single Row */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <div 
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-award text-white text-xs font-semibold border border-white/60 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>New to market • Built from research</span>
                </div>
              <div className="flex items-center gap-2 text-white/90">
                <Target className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-semibold">Designed for real pain points</span>
              </div>
            </div>
            
            {/* Compact Headline */}
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-3 leading-tight tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="text-white">Jobs, payments, and customer texts in one app.</span>
            </h1>
            
            <p className="text-base md:text-lg text-white/90 mb-6 max-w-2xl mx-auto font-medium leading-snug">
              Works offline. Built from real conversations with cleaners.
            </p>
            
            {/* Primary CTA - Compact */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-3 relative z-30">
                <Button
                size="lg"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'click', {
                        event_category: 'CTA',
                        event_label: 'Hero Primary CTA',
                        value: 1
                      });
                    }
                    navigate('/auth?mode=signup');
                  }}
                className="w-full sm:w-auto min-w-[280px] h-12 text-base font-bold bg-gradient-to-r from-primary to-emerald-600 text-white shadow-lg hover:shadow-xl relative overflow-hidden group border-0 focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 z-30"
                style={{ position: 'relative', zIndex: 30 }}
                  aria-label="Start Free - Automate Your First 10 Jobs"
                >
                <span className="relative z-30 flex items-center gap-2">
                  <span>Start Free - 10 Jobs</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  scrollToSection('how-it-works');
                }}
                className="w-full sm:w-auto h-12 text-sm bg-white/20 backdrop-blur-md border-white/50 text-white font-semibold hover:bg-white/30 hover:border-white/70 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-offset-2 z-30"
                style={{ position: 'relative', zIndex: 30 }}
                aria-label="See How SoloWipe Works"
              >
                See How It Works
              </Button>
            </div>

            {/* Compact Risk Reversal */}
            <p className="text-xs text-white/85 font-medium mb-4">
              <strong className="text-white">No credit card.</strong> No setup fees. Cancel anytime. <strong className="text-white">New to market.</strong>
            </p>
            
            {/* Compact Email Capture */}
            <div className="max-w-sm mx-auto">
              <p className="text-xs text-white/75 text-center mb-2">
                Get weekly tips to grow your business
              </p>
              <EmailCaptureForm
                variant="banner"
                placeholder="Enter your email for tips"
                buttonText="Get Tips"
                onSuccess={(email) => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'email_capture', {
                      event_category: 'Lead Generation',
                      event_label: 'Hero Email Capture',
                      value: 1
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Exit Intent Popup */}
      {showExitIntent && (
        <ExitIntentPopup
          onClose={handleExitIntentClose}
          onSuccess={handleExitIntentSuccess}
        />
      )}

      {/* Built from Research Section - New Authentic Messaging */}
      <section className="py-24 px-4 bg-gradient-to-b from-background via-slate-50/30 dark:via-slate-900/30 to-background relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Users className="w-4 h-4" />
              Built from Real Conversations
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              We Spoke to Local Cleaners. Here's What We Learned.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              SoloWipe isn't built on assumptions. After months of conversations with window cleaners across the UK, 
              we identified the real pain points that slow you down every day.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Calendar,
                title: 'The Scheduling Problem',
                description: 'Every cleaner we spoke to mentioned the same thing: "I forget which street is due when." Paper diaries get lost. Excel sheets get out of sync. SoloWipe auto-reschedules jobs so your round never falls apart.',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50 dark:bg-blue-950/20',
              },
              {
                icon: CreditCard,
                title: 'The Payment Chase',
                description: 'The #1 frustration: chasing payments. "I\'ll pay next time" became a weekly conversation. That\'s why we built Direct Debit integration—payments collect automatically when you complete a job.',
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
              },
              {
                icon: MessageSquare,
                title: 'The Communication Burden',
                description: 'Typing reminders and receipts line-by-line eats hours every week. SoloWipe\'s SMS templates send professional messages in seconds, so you can focus on the work that pays.',
                color: 'text-green-600',
                bgColor: 'bg-green-50 dark:bg-green-950/20',
              },
            ].map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -6,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className={cn(
                  "bg-card rounded-2xl p-8 border-2 border-border shadow-lg hover:shadow-xl transition-all relative overflow-hidden group",
                  point.bgColor
                )}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <motion.div 
                    className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md", point.bgColor)}
                    whileHover={{ 
                      scale: 1.15,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.4 }
                    }}
                  >
                    <point.icon className={cn("w-8 h-8", point.color)} />
                  </motion.div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4 leading-tight">{point.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-base group-hover:text-foreground/90 transition-colors">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-gradient-to-br from-primary/10 via-emerald-500/10 to-primary/10 rounded-2xl p-8 md:p-10 border-2 border-primary/20 text-center"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              A Fresh Approach to an Old Problem
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
              SoloWipe is new to market, but it's built on deep research. We're not trying to be everything to everyone—we're 
              laser-focused on solving the specific problems that UK window cleaners face every single day.
            </p>
            <p className="text-base text-foreground/80 font-medium">
              Start with 10 free jobs. See if it solves your pain points. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar & Preview Section - Premium Integration */}
      <section className="py-16 px-4 bg-gradient-to-b from-slate-800 via-slate-700/50 to-background relative overflow-hidden">
        {/* Subtle background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          {/* Award-Winning Trust Bar - Premium Design */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12"
          >
            {trustStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  scale: 1.08, 
                  y: -6,
                  transition: { duration: 0.3 }
                }}
                className="bg-white/20 dark:bg-slate-800/70 glass-award rounded-2xl p-6 border-2 border-white/40 dark:border-slate-700/60 shadow-award hover:shadow-award transition-all text-center group cursor-pointer card-award relative overflow-hidden transform-3d-premium"
              >
                {/* Premium Multi-Layer Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div 
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-emerald-500/40 flex items-center justify-center mx-auto mb-4 shadow-award relative z-10"
                >
                  <stat.icon className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <div className="text-4xl font-black text-white mb-2 relative z-10">
                  {stat.value}
                </div>
                <div className="text-xs text-white/95 font-bold relative z-10 uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-6 mb-16"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">UK GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/20">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-white">GoCardless Partner</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-white">Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">UK-Based Business</span>
            </div>
          </motion.div>

          {/* Living UI Preview - Premium Design */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative max-w-4xl mx-auto"
          >
            <motion.div 
              className="relative glass-award rounded-3xl shadow-award border-2 border-white/30 dark:border-slate-700/60 overflow-hidden transform-3d-premium"
              whileHover={{
                y: -4,
                scale: 1.01,
                transition: { duration: 0.3 }
              }}
            >
              {/* Premium Browser chrome */}
              <div className="bg-gradient-to-r from-muted/60 to-muted/40 px-6 py-4 border-b-2 border-border/60 flex items-center gap-2 backdrop-blur-sm">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-500 shadow-lg"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-lg"></div>
                <div className="flex-1"></div>
                <div className="text-sm text-foreground font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  SoloWipe
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* 🏆 Award-Winning Job Card 🏆 */}
                <motion.div 
                  className="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-award relative overflow-hidden card-award"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-40" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-black text-xl text-foreground mb-2 text-gradient-primary">Sarah Johnson</h3>
                        <p className="text-sm text-muted-foreground font-medium">123 High Street, London</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-foreground bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">£25</div>
                        <div className="text-xs text-muted-foreground font-semibold">Every 4 weeks</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-5">
                      <div className="flex-1 h-3 bg-primary/20 rounded-full overflow-hidden shadow-depth-1">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary via-emerald-500 to-primary rounded-full shadow-award"
                          initial={{ width: 0 }}
                          whileInView={{ width: '75%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border-2 border-primary/30 shadow-award badge-premium">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-xs font-bold text-primary">Completed · DD processing</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 🏆 Award-Winning SMS Preview 🏆 */}
                <motion.div 
                  className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl p-5 border-2 border-primary/20 shadow-award card-award"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-award">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground mb-2">
                        Tomorrow reminder sent to <span className="text-gradient-primary font-black">Sarah</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium leading-relaxed">
                        "You're booked for 10:00, £25 via Direct Debit."
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 font-semibold">
                        <Clock className="w-4 h-4 text-primary" />
                        Receipt text sent and GoCardless payment created
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Second Job Card (Pending) - Premium Styling */}
                <motion.div 
                  className="bg-card border-2 border-border/60 rounded-xl p-5 shadow-depth-2 opacity-80 hover:opacity-100 transition-all card-premium"
                  initial={{ opacity: 0.75 }}
                  whileHover={{ opacity: 1, scale: 1.01, y: -2 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-1">Mike Thompson</h3>
                      <p className="text-sm text-muted-foreground font-medium">45 Park Avenue, Manchester</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-foreground">£30</div>
                      <div className="text-xs text-muted-foreground font-semibold">Every 4 weeks</div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <div className="flex-1 h-2.5 bg-muted rounded-full shadow-depth-1"></div>
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Built for the Trade - Image Grid */}
      <section id="trade" className="py-28 px-4 bg-gradient-to-b from-background via-slate-50/50 dark:via-slate-900/50 to-background relative overflow-hidden" style={{ position: 'relative', zIndex: 10 }}>
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Real Workdays
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Built for Real Workdays
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              Every feature was designed after listening to cleaners describe their actual workflow&mdash;from the van, 
              to the customer&apos;s home, to managing payments and back to planning the next round.
            </p>
          </motion.div>

          {/* Enhanced responsive image grid with fallbacks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr relative z-10">
            {tradeImages.map((img, index) => (
              <TradeImageCard key={`trade-img-${index}-${img.title}`} img={img} index={index} />
            ))}
          </div>

        </div>
      </section>

      {/* Problem Section - "The Round You're Running Now" */}
      <section id="problem" className="py-28 px-4 bg-gradient-to-b from-background via-slate-50/30 dark:via-slate-900/30 to-muted/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold mb-6">
              The Problem
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Right now, your round is costing you more time than it should
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              These are the exact problems local cleaners told us about—the daily frustrations that eat your time
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {painPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -6,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className={cn(
                  "bg-card rounded-2xl p-8 border-2 border-border shadow-depth-2 hover:shadow-depth-4 transition-all relative overflow-hidden group card-premium",
                  point.bgColor
                )}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <motion.div 
                    className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-depth-2", point.bgColor)}
                    whileHover={{ 
                      scale: 1.15,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.4 }
                    }}
                  >
                    <point.icon className={cn("w-8 h-8", point.color)} />
                  </motion.div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4 leading-tight">{point.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-base group-hover:text-foreground/90 transition-colors">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Transformation Story - Before → After */}
      <section id="transformation" className="py-28 px-4 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
              The Solution
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              How SoloWipe Transforms Your Day
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              From manual chaos to automated wealth—here's what changes
            </p>
          </motion.div>

          <div className="space-y-6">
            {transformations.map((transformation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -4,
                  scale: 1.01,
                  transition: { duration: 0.3 }
                }}
                className={cn(
                  "relative rounded-2xl p-8 md:p-10 border-2 border-border shadow-depth-3 hover:shadow-depth-4 overflow-hidden group transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] card-premium",
                  transformation.bgColor
                )}
              >
                <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative grid md:grid-cols-2 gap-8 items-center z-10">
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      <motion.div 
                        className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-depth-2", transformation.bgColor)}
                        whileHover={{ scale: 1.1, rotate: -5 }}
                      >
                        <X className="w-7 h-7 text-destructive" />
                      </motion.div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Before</div>
                        <div className="text-lg font-bold text-foreground leading-snug">{transformation.before}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-depth-2", transformation.bgColor)}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <transformation.icon className={cn("w-7 h-7", transformation.color)} />
                      </motion.div>
                      <div>
                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">After SoloWipe</div>
                        <div className="text-lg font-bold text-foreground leading-snug">{transformation.after}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA after transformation - Fixed visibility */}
          <div className="text-center mt-12 relative z-20">
            <Button
              size="xl"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'click', {
                    event_category: 'CTA',
                    event_label: 'Transformation CTA',
                    value: 1
                  });
                }
                navigate('/auth?mode=signup');
              }}
              className="min-w-[280px] h-14 text-base font-semibold shadow-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white border-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 relative z-20"
              style={{ position: 'relative', zIndex: 20 }}
              aria-label="Start Free - Automate Your First 10 Jobs"
            >
              Automate Your First 10 Jobs Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Email Capture - Mid-Page */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-emerald-500/10 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-2xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Get Tips to Grow Your Business
            </h2>
            <p className="text-muted-foreground mb-6">
              Sign up to receive helpful tips for window cleaning businesses
            </p>
              <EmailCaptureForm
              variant="inline"
              placeholder="Enter your email"
              buttonText="Subscribe to Tips"
              onSuccess={(email) => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'email_signup', {
                    event_category: 'Lead Generation',
                    event_label: 'Tips Signup',
                    value: 1
                  });
                }
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section - Premium Bento Grid */}
      <section id="features" className="py-28 px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              All-in-One Round Control
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Every feature addresses a real pain point we discovered through months of research with local window cleaners
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className={cn(
                  "relative rounded-2xl p-6 md:p-8 border-2 border-border transition-all overflow-hidden group bg-card card-award transform-3d-premium",
                  feature.bgColor
                )}
              >
                {/* Static glow effects - animations disabled */}
                <div 
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                    feature.glowColor
                  )}
                />
                
                {/* Premium Shimmer Effect - static on hover only */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 shimmer-award" />
                </div>
                
                {/* Static border glow on hover */}
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/30 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div 
                    className={cn("w-18 h-18 rounded-2xl flex items-center justify-center mb-6 shadow-award", feature.bgColor)}
                    style={{ width: '72px', height: '72px' }}
                  >
                    <feature.icon className={cn("w-9 h-9", feature.color)} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-foreground mb-4 group-hover:text-gradient-award transition-all leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-base group-hover:text-foreground/95 transition-colors font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - 3-Step Flow */}
      <section id="how-it-works" className="py-28 px-4 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Target className="w-4 h-4" />
              Simple Process
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              How SoloWipe Fits Into Your Day
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Set up once. Work from your phone. SoloWipe handles the rest.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Set up your round once',
                description: 'Add customers with price and frequency. Optional: send Direct Debit invites right from SoloWipe so payments auto-collect.',
                icon: Users,
              },
              {
                step: 2,
                title: 'Work from the Today screen',
                description: 'See all due jobs. Send "On my way" SMS. Complete jobs. SoloWipe automatically reschedules and triggers Direct Debit payments.',
                icon: Smartphone,
              },
              {
                step: 3,
                title: 'SoloWipe chases the rest',
                description: 'Direct Debits move from processing to paid via webhooks, unpaid jobs stay visible until collected, and earnings auto-update.',
                icon: Target,
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -4,
                  scale: 1.01,
                  transition: { duration: 0.3 }
                }}
                className="relative bg-card rounded-2xl p-8 md:p-10 border-2 border-border shadow-depth-3 hover:shadow-depth-4 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group card-premium"
              >
                <div className="flex items-start gap-6">
                  <motion.div 
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/25 to-emerald-500/25 flex items-center justify-center flex-shrink-0 border-2 border-primary/40 shadow-depth-2 relative overflow-hidden"
                    whileHover={{ 
                      scale: 1.15,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.4 }
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="text-3xl font-extrabold text-primary relative z-10">{step.step}</span>
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">{step.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed group-hover:text-foreground/90 transition-colors">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-28 px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
              The Comparison
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              SoloWipe vs. Paper Diaries & Excel
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              See why SoloWipe gives you a higher likelihood of success than running your round on paper or spreadsheets.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border-2 border-emerald-500/30 bg-card p-8 shadow-xl hover:shadow-2xl transition-all"
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <img 
                  src="/SoloLogo.jpg" 
                  alt="SoloWipe" 
                  className="h-12 w-auto md:h-16"
                  loading="lazy"
                  width="auto"
                  height="auto"
                />
                <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">SoloWipe</span>
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  'Jobs auto-reschedule from customer frequency so you never miss a visit.',
                  'Direct Debit via GoCardless automatically collects payments on completion.',
                  'Pre-written SMS templates send reminders and receipts in seconds.',
                  'Route optimization reduces wasted driving and fuel.',
                  'Offline-first mobile app—works even with no signal.',
                  'UK GDPR-aligned, secure Supabase backend and RLS policies.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border-2 border-border/70 bg-muted/40 p-8 shadow-lg"
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold border-2 border-border">
                  PD/XL
                </span>
                <span>Paper Diaries & Excel</span>
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  'Frequencies live in your head or on paper—easy to miss streets and one-offs.',
                  'You manually chase cash and bank transfers and track who owes what.',
                  'Every reminder and receipt is typed by hand and easy to forget.',
                  'No automatic route planning—lots of back and forth driving.',
                  'No offline sync or mobile app intelligence—just notes.',
                  'No automated backups or role-based access control.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <X className="w-4 h-4 text-destructive mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Risk Reversal */}
      <section id="pricing" className="py-28 px-4 bg-gradient-to-b from-muted/30 via-background to-background relative overflow-hidden" style={{ position: 'relative', zIndex: 20 }}>
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
              <ShieldCheck className="w-4 h-4" />
              Risk-Free Start
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Automate Your First 10 Jobs Free
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              No credit card required. No setup fees. See exactly how SoloWipe transforms your round before you pay anything.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12 relative z-20">
            {/* Free Tier */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card rounded-2xl p-8 md:p-10 border-2 border-primary/30 shadow-xl hover:shadow-2xl relative overflow-hidden group transition-all"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-semibold mb-5 border border-primary/20">
                    Risk-Free Start
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Free Usage</h3>
                  <div className="text-6xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">£0</div>
                  <p className="text-muted-foreground font-medium">No credit card required</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'First 10 jobs free',
                    'First 10 SMS messages free',
                    'All features included',
                    'No time limit',
                    'Perfect for seasonal workers',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="xl"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'click', {
                        event_category: 'CTA',
                        event_label: 'Pricing Free Tier',
                        value: 1
                      });
                    }
                    navigate('/auth?mode=signup');
                  }}
                  className="w-full h-14 text-base font-semibold shadow-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white border-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 relative z-20"
                  style={{ position: 'relative', zIndex: 20 }}
                  aria-label="Start Free - 10 Jobs Included"
                >
                  Start Free - 10 Jobs Included
                </Button>
              </div>
            </motion.div>

            {/* Paid Tier */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-primary/5 to-emerald-500/5 rounded-2xl p-8 md:p-10 border-2 border-primary shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 relative overflow-hidden group transition-all duration-300 ease-out"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Pro Subscription</h3>
                  <div className="text-6xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                    £{SUBSCRIPTION_TIERS.monthly.price}
                    <span className="text-xl text-muted-foreground font-normal">/month</span>
                  </div>
                  <p className="text-muted-foreground font-medium">or £{SUBSCRIPTION_TIERS.annual.price}/year</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Unlimited jobs and customers',
                    'Unlimited SMS templates',
                    'Direct Debit integration',
                    'Route optimization',
                    '7-day free trial after signup',
                    'Priority support',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-5 mb-6 border border-primary/20">
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    <strong className="text-foreground">Start with 10 free jobs</strong>, then subscribe for unlimited access. 
                    When you subscribe, you'll receive a <strong className="text-foreground">7-day free trial</strong>—no payment charged during trial. 
                    Cancel anytime from Settings.
                  </p>
                </div>
                <Button
                  size="xl"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'click', {
                        event_category: 'CTA',
                        event_label: 'Pricing Pro Tier',
                        value: 1
                      });
                    }
                    navigate('/auth?mode=signup');
                  }}
                  className="w-full h-14 text-base font-semibold shadow-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white border-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 relative z-20"
                  style={{ position: 'relative', zIndex: 20 }}
                  aria-label="Subscribe with 7-Day Free Trial"
                >
                  Subscribe with 7-Day Free Trial
                </Button>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center text-sm text-muted-foreground space-y-2"
          >
            <p><strong className="text-foreground">No setup fees.</strong> No credit card. No commitment.</p>
            <p>Cancel anytime from inside Settings—no emails, no calls.</p>
            <p className="pt-4"><strong className="text-foreground">New to market, built from research.</strong> GDPR compliant. GoCardless Direct Debit ready.</p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-28 px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <MessageSquare className="w-4 h-4" />
              Questions & Answers
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Everything you need to know before you start automating your round.
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -2,
                  scale: 1.01,
                  transition: { duration: 0.2 }
                }}
                className="rounded-xl border-2 border-border bg-card p-6 md:p-7 shadow-depth-2 hover:shadow-depth-3 transition-all duration-300 ease-out group card-premium"
              >
                <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-start gap-3 leading-snug">
                  <span className="mt-0.5 text-primary text-xl font-extrabold flex-shrink-0">Q.</span>
                  <span className="group-hover:text-primary/90 transition-colors">{item.question}</span>
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed flex items-start gap-3 group-hover:text-foreground/80 transition-colors">
                  <span className="mt-0.5 text-emerald-600 text-lg font-extrabold flex-shrink-0">A.</span>
                  <span>{item.answer}</span>
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Button
              size="xl"
              onClick={() => navigate('/auth?mode=signup')}
              className="min-w-[280px] h-14 text-base font-bold shadow-depth-3 hover:shadow-depth-4 btn-premium"
            >
              Automate Your First 10 Jobs Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section - Premium Design */}
      <section className="py-28 px-4 bg-gradient-to-br from-primary/10 via-emerald-500/10 to-primary/10 relative overflow-hidden" style={{ position: 'relative', zIndex: 30 }}>
        {/* Simplified background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl opacity-60" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-40" style={{ position: 'relative', zIndex: 40 }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-40"
            style={{ position: 'relative', zIndex: 40 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-6 border border-primary/30">
              <Sparkles className="w-4 h-4" />
              Get Started Today
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
              Be among the first to experience a window cleaning app built from real conversations with cleaners like you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-50" style={{ position: 'relative', zIndex: 50 }}>
              <Button
                size="xl"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'click', {
                      event_category: 'CTA',
                      event_label: 'Final CTA',
                      value: 1
                    });
                  }
                  navigate('/auth?mode=signup');
                }}
                className="w-full sm:w-auto min-w-[280px] h-14 text-base font-semibold shadow-2xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white border-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 relative z-50"
                style={{ position: 'relative', zIndex: 50 }}
                aria-label="Start Free - Automate Your First 10 Jobs"
              >
                Automate Your First 10 Jobs Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => {
                  scrollToSection('how-it-works');
                }}
                className="w-full sm:w-auto h-14 text-base border-2 hover:scale-105 active:scale-95 transition-all duration-300 ease-out font-semibold focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 relative z-50"
                style={{ position: 'relative', zIndex: 50 }}
                aria-label="See How SoloWipe Works"
              >
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Premium Design */}
      <footer 
        className="py-16 px-4 border-t border-border/50 bg-gradient-to-b from-muted/30 to-background relative z-40"
        style={{ position: 'relative', zIndex: 40 }}
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto">
          {/* Newsletter Signup */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-12 pb-12 border-b border-border/50"
          >
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Stay Updated
              </h3>
              <p className="text-muted-foreground mb-6">
                Get weekly tips to automate and grow your window cleaning business
              </p>
              <EmailCaptureForm
                variant="banner"
                placeholder="Enter your email"
                buttonText="Subscribe"
                onSuccess={(email) => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'newsletter_signup', {
                      event_category: 'Lead Generation',
                      event_label: 'Footer Newsletter',
                      value: 1
                    });
                  }
                }}
              />
            </div>
          </motion.div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/SoloLogo.jpg" 
                alt="SoloWipe" 
                className="h-12 w-auto md:h-16 opacity-80"
                loading="lazy"
                width="auto"
                height="auto"
              />
              <span className="text-muted-foreground font-medium">© 2025 SoloWipe. All rights reserved.</span>
            </div>
            <nav className="flex gap-8" aria-label="Footer navigation">
              <button
                onClick={() => navigate('/terms')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md px-2 py-1"
                aria-label="View Terms of Service"
              >
                Terms
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md px-2 py-1"
                aria-label="View Privacy Policy"
              >
                Privacy
              </button>
              <button
                onClick={() => navigate('/legal')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md px-2 py-1"
                aria-label="View Legal Information"
              >
                Legal
              </button>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
