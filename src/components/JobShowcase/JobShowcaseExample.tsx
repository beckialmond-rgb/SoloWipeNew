import { JobShowcaseGenerator } from './JobShowcaseGenerator';

/**
 * Example usage of JobShowcaseGenerator component
 * 
 * To test this component in App.tsx, add a route like:
 * 
 * ```tsx
 * const JobShowcaseExample = lazy(() => 
 *   import("@/components/JobShowcase/JobShowcaseExample").then(m => ({ default: m.JobShowcaseExample }))
 * );
 * 
 * // In Routes:
 * <Route path="/showcase" element={<JobShowcaseExample />} />
 * ```
 * 
 * Then visit /showcase to see the component in action.
 * Replace the image URLs with actual before/after job photos.
 */
export function JobShowcaseExample() {
  // Example image URLs - replace with actual job photos
  // For testing, using placeholder images. Replace with real before/after job photos
  const beforeImage = 'https://images.unsplash.com/photo-1568605117035-92c7bc01a0b5?w=800&h=1000&fit=crop';
  const afterImage = 'https://images.unsplash.com/photo-1568605117035-92c7bc01a0b5?w=800&h=1000&fit=crop';

  return (
    <div className="min-h-screen bg-background p-6 pb-20">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
          Job Showcase Generator
        </h1>
        <JobShowcaseGenerator 
          beforeImage={beforeImage} 
          afterImage={afterImage} 
        />
      </div>
    </div>
  );
}

export default JobShowcaseExample;

