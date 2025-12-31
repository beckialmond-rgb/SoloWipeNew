import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Calendar, 
  MessageSquare, 
  Navigation, 
  TrendingUp,
  ArrowRight,
  CreditCard,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  PoundSterling,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef, useState, useEffect } from 'react';
import { ExitIntentPopup, useExitIntent } from '@/components/ExitIntentPopup';

const Landing = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  // Enhanced parallax transforms for floating hero image
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  
  // Parallax for solution section image
  const solutionY = useTransform(scrollYProgress, [0.2, 0.8], ['-5%', '10%']);
  
  // Parallax for features section image
  const featuresY = useTransform(scrollYProgress, [0.4, 1], ['-8%', '12%']);
  
  // Exit intent popup state
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasSeenExitIntent, setHasSeenExitIntent] = useState(false);
  
  useEffect(() => {
    const seen = sessionStorage.getItem('exitIntentSeen');
    if (seen) {
      setHasSeenExitIntent(true);
    }
  }, []);
  
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
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        event_category: 'Lead Generation',
        event_label: 'Exit Intent Success',
        value: 1
      });
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const headerOffset = 80;
    const rect = element.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY - headerOffset;
    window.scrollTo({ 
      top: Math.max(0, offsetTop), 
      behavior: 'smooth' 
    });
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'navigation', {
        event_category: 'Scroll',
        event_label: id,
        value: 1
      });
    }
  };

  const problems = [
    {
      icon: Clock,
      text: 'Chasing payments takes hours every week.',
    },
    {
      icon: FileText,
      text: 'Manual scheduling falls apart when life gets busy.',
    },
    {
      icon: AlertCircle,
      text: 'Forgetting to send reminders loses customers.',
    },
  ];

  const features = [
    {
      icon: CreditCard,
      title: 'Direct Debit Payments',
      description: 'Payments collect automatically when you complete a job.',
    },
    {
      icon: Calendar,
      title: 'Automatic Scheduling',
      description: 'Jobs reschedule themselves forever. Your round never falls apart.',
    },
    {
      icon: MessageSquare,
      title: 'Automated Messaging',
      description: 'Professional reminders and receipts sent automatically.',
    },
    {
      icon: Users,
      title: 'Helper Management',
      description: 'Assign jobs, track work, and split payments automatically.',
    },
    {
      icon: Navigation,
      title: 'Route Optimisation',
      description: 'Optimise your daily route to save time and fuel.',
    },
    {
      icon: TrendingUp,
      title: 'Price Increases',
      description: 'Automatically increase prices annually. Set it once, forget about it.',
    },
  ];

  const trustItems = [
    { icon: ShieldCheck, label: 'GDPR Compliant' },
    { icon: Zap, label: 'Works Offline' },
    { icon: PoundSterling, label: 'UK Based' },
    { icon: CheckCircle2, label: 'No Setup Fees' },
  ];

  const tradeImages = [
    '/trade-1.jpg',
    '/trade-2.jpg',
    '/trade-3.jpg',
    '/trade-4.jpg',
    '/trade-5.jpg',
    '/trade-6.jpg',
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* HERO SECTION - Premium Split-Screen */}
      <section
        id="hero"
        ref={heroRef}
        className="relative min-h-screen flex items-center overflow-hidden pt-20"
      >
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        
        {/* Layered gradient orbs for depth */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] opacity-60 z-[1]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[100px] opacity-50 z-[1]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[150px] opacity-40 z-[1]" />
        
        {/* Logo - Top Left */}
        <div className="absolute top-8 left-8 z-30">
          <img 
            src="/SoloLogo.jpg" 
            alt="SoloWipe" 
            className="h-32 md:h-40 lg:h-48 w-auto"
            loading="eager"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
            
            {/* LEFT SIDE - Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 lg:space-y-10 relative z-20"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight">
                The simple admin app for{' '}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  service businesses
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-xl">
                Built for window cleaners, bin cleaners, and valet companies that want their admin to run itself.
              </p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Button
                  size="xl"
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
                  className="h-14 px-8 text-lg font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.4)] hover:shadow-[0_6px_20px_0_rgba(37,99,235,0.5)] transition-all"
                >
                  Start Free — 10 Jobs
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => scrollToSection('pricing')}
                  className="h-14 px-8 text-lg font-semibold bg-white/10 backdrop-blur-md text-slate-200 hover:bg-white/20 border-0 rounded-xl transition-all"
                >
                  See Pricing
                </Button>
              </motion.div>
            </motion.div>
            
            {/* RIGHT SIDE - Hero Image - app-image-3.png - FLOATING & LAYERED */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                y: heroY, 
                opacity: heroOpacity,
                scale: heroScale,
              }}
              className="relative w-full max-w-lg mx-auto lg:mx-0 z-[8]"
            >
              {/* Background mesh/gradient behind image */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Layered blurred circles for depth */}
                <div className="absolute w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] opacity-60" />
                <div className="absolute w-[300px] h-[300px] bg-indigo-500/25 rounded-full blur-[60px] opacity-50" />
                <div className="absolute w-[200px] h-[200px] bg-purple-500/20 rounded-full blur-[40px] opacity-40" />
                
                {/* Glassmorphism panels */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 rotate-12" />
                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-white/5 rounded-xl backdrop-blur-xl border border-white/10 -rotate-12" />
              </div>
              
              {/* Image container */}
              <div className="relative">
                {/* Subtle radial gradient glow behind phone - Grounding effect */}
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                  <div className="w-[600px] h-[600px] bg-[#4F46E5] rounded-full blur-3xl opacity-20" />
                </div>
                
                {/* Floating glow effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-8 bg-blue-500/10 rounded-[3rem] blur-3xl -z-10"
                />
                
                {/* Image container with depth */}
                <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                  <img
                    src="/app-image-3.png"
                    alt="SoloWipe app interface"
                    className="w-full h-auto"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Section divider */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-[9]" />
      </section>

      {/* TRUST BAR */}
      <section className="py-16 border-y border-border/30 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {trustItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground text-center">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMS SECTION - Ultra Simple */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Running a service business is hard enough
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-border/50 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <problem.icon className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {problem.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION - Premium Split Layout with floating image */}
      <section id="solution" ref={solutionRef} className="py-32 px-6 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
        {/* Background blend layer */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right_center,_var(--tw-gradient-stops))] from-transparent via-background/30 to-background/70 pointer-events-none z-[1]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text - positioned above image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8 relative z-20"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
                SoloWipe automates everything
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Your round runs itself. Jobs reschedule automatically. Payments collect via Direct Debit. 
                Reminders send themselves. You focus on the work, not the admin.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Built specifically for UK service businesses. Works completely offline. 
                No complicated setup. No training required.
              </p>
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'click', {
                      event_category: 'CTA',
                      event_label: 'Solution CTA',
                      value: 1
                    });
                  }
                  navigate('/auth?mode=signup');
                }}
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-depth-2 hover:shadow-depth-3 transition-all"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            
            {/* Right: app-image-2.png - FLOATING & LAYERED */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 1.5 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ y: solutionY }}
              className="relative z-[8]"
            >
              {/* Soft shadow layers */}
              <div className="absolute -inset-10 bg-primary/8 rounded-[3rem] blur-2xl opacity-50 -z-10" />
              <div className="absolute -inset-6 bg-accent/4 rounded-[3rem] blur-xl opacity-30 -z-10" />
              
              {/* Image container */}
              <div className="relative rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-border/20 bg-card/50 backdrop-blur-sm">
                <img
                  src="/app-image-2.png"
                  alt="SoloWipe solution"
                  className="w-full h-auto"
                  loading="lazy"
                />
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left_center,_transparent_40%,_hsl(var(--background)/0.5)_80%)] pointer-events-none" />
              </div>
              
              {/* Floating glow */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -inset-12 bg-primary/4 rounded-[3rem] blur-3xl -z-20"
              />
            </motion.div>
          </div>
        </div>
        
        {/* Section divider overlap */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-[9]" />
      </section>

      {/* FEATURES SECTION - Apple Grid with floating image */}
      <section id="features" ref={featuresRef} className="py-32 px-6 bg-background relative overflow-hidden">
        {/* Background blend */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-background/20 to-background/60 pointer-events-none z-[1]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20 relative z-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Everything you need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No bloat. No complexity. Just the tools you actually use.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 relative z-20">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-8 rounded-2xl bg-card border border-border/50 hover:border-border shadow-sm hover:shadow-depth-2 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Floating app-image-1.png - CENTERED & LAYERED */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotate: -1 }}
            whileInView={{ opacity: 1, y: 0, rotate: -0.5 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: featuresY }}
            className="relative max-w-4xl mx-auto z-[8] mt-20"
          >
            {/* Multi-layer shadows for depth */}
            <div className="absolute -inset-16 bg-accent/10 rounded-[3rem] blur-3xl opacity-40 -z-10" />
            <div className="absolute -inset-12 bg-primary/6 rounded-[3rem] blur-2xl opacity-30 -z-10" />
            <div className="absolute -inset-8 bg-accent/4 rounded-[3rem] blur-xl opacity-20 -z-10" />
            
            {/* Image container */}
            <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-border/20 bg-card/50 backdrop-blur-sm">
              <img
                src="/app-image-1.png"
                alt="SoloWipe features"
                className="w-full h-auto"
                loading="lazy"
              />
              {/* Radial gradient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_hsl(var(--background)/0.4)_75%,_hsl(var(--background)/0.9))] pointer-events-none" />
            </div>
            
            {/* Animated floating glow */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.25, 0.45, 0.25],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-20 bg-accent/5 rounded-[3rem] blur-3xl -z-20"
            />
          </motion.div>
        </div>
        
        {/* Section divider overlap */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-[9]" />
      </section>

      {/* REAL WORKDAY SECTION */}
      <section className="py-32 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Built for real workdays
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how UK service businesses use SoloWipe every day.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {tradeImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-card border border-border/30 shadow-sm hover:shadow-depth-2 transition-all"
              >
                <img
                  src={image}
                  alt={`Service business ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section id="pricing" className="py-32 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Simple pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade when you're ready.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-2xl border-2 border-border bg-card"
            >
              <h3 className="text-2xl font-semibold text-foreground mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground">£0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">10 jobs per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">All core features</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Offline support</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">No credit card required</span>
                </li>
              </ul>
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'click', {
                      event_category: 'CTA',
                      event_label: 'Pricing Free CTA',
                      value: 1
                    });
                  }
                  navigate('/auth?mode=signup');
                }}
                variant="outline"
                className="w-full h-12"
              >
                Get Started
              </Button>
            </motion.div>
            
            {/* Pro Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-2xl border-2 border-primary bg-card relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-bl-lg">
                Popular
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground">£25</span>
                <span className="text-muted-foreground">/month</span>
                <div className="text-sm text-muted-foreground mt-2">
                  or £250/year (save £50)
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Unlimited jobs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Direct Debit integration</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Helper management</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Route optimisation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">60-day trial available</span>
                </li>
              </ul>
              <Button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'click', {
                      event_category: 'CTA',
                      event_label: 'Pricing Pro CTA',
                      value: 1
                    });
                  }
                  navigate('/auth?mode=signup');
                }}
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
              >
                Start Free Trial
              </Button>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center text-sm text-muted-foreground"
          >
            <p className="mb-2">
              <strong className="text-foreground">Add helpers:</strong> £5/month per active helper
            </p>
            <p>
              No setup fees. Cancel anytime. 60-day free trial available to first customers who register interest.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Ready to transform your round?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with 10 free jobs. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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
                className="h-16 px-10 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-depth-3 hover:shadow-depth-4 transition-all btn-premium"
              >
                Start Free — 10 Jobs
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border/30 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/SoloLogo.jpg" 
                alt="SoloWipe" 
                className="h-16 md:h-20 w-auto opacity-80"
                loading="lazy"
              />
              <span className="text-muted-foreground">© 2025 SoloWipe. All rights reserved.</span>
            </div>
            <nav className="flex gap-6">
              <button
                onClick={() => navigate('/terms')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </button>
            </nav>
          </div>
        </div>
      </footer>

      {/* Exit Intent Popup */}
      {showExitIntent && (
        <ExitIntentPopup
          onClose={handleExitIntentClose}
          onSuccess={handleExitIntentSuccess}
        />
      )}
    </div>
  );
};

export default Landing;
