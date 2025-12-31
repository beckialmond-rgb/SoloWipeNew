import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
  name: string;
  business: string;
  location: string;
  rating: number;
  text: string;
  image?: string;
  results?: string;
}

// Example testimonials - replace with real customer testimonials when available
const testimonials: Testimonial[] = [
  {
    name: 'James M.',
    business: 'Window Cleaning Business',
    location: 'Manchester',
    rating: 5,
    text: 'SoloWipe has completely transformed how I run my round. I used to spend hours every Sunday planning the week ahead. Now jobs just appear in my calendar automatically. The Direct Debit feature means I never chase payments anymore.',
  },
  {
    name: 'Sarah W.',
    business: 'Service Business',
    location: 'Birmingham',
    rating: 5,
    text: 'The SMS templates are a game-changer. I can send reminders and receipts in seconds instead of typing them out manually. My customers love the professional communication, and I love the time I save.',
  },
  {
    name: 'Mike T.',
    business: 'Window Services',
    location: 'Leeds',
    rating: 5,
    text: 'As someone who works in rural areas with poor signal, the offline functionality is brilliant. I can complete jobs and add customers without internet, and everything syncs when I get back to town.',
  },
  {
    name: 'Emma D.',
    business: 'Window Cleaning',
    location: 'London',
    rating: 5,
    text: 'I was skeptical about switching from my paper diary, but SoloWipe made it so easy. The route optimization feature helps me plan my day more efficiently.',
  },
  {
    name: 'David B.',
    business: 'Window Cleaning',
    location: 'Sheffield',
    rating: 5,
    text: 'The free tier let me try everything risk-free. After automating my first 10 jobs, I was sold. The subscription is worth it for the time it saves me.',
  },
];

const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-card rounded-2xl p-6 md:p-8 border-2 border-border shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary">
              {testimonial.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground mb-1">{testimonial.name}</h3>
            <p className="text-sm text-muted-foreground">{testimonial.business}</p>
            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4',
                i < testimonial.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted-foreground'
              )}
            />
          ))}
        </div>

        <div className="relative mb-4">
          <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />
          <p className="text-muted-foreground leading-relaxed pl-6">
            {testimonial.text}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Trusted by Window Cleaners
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            What Our Users Say
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            See how SoloWipe is helping window cleaners save time and reduce admin
          </p>
          <p className="text-sm text-muted-foreground mt-2 italic">
            *Examples shown - individual results may vary
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

      </div>
    </section>
  );
};

