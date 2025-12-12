import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface OptimizeRouteButtonProps {
  jobs: JobWithCustomer[];
  onReorder?: (sortedJobs: JobWithCustomer[]) => void;
}

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Simple nearest neighbor algorithm for route optimization
const optimizeRoute = (
  jobs: JobWithCustomer[], 
  startLat: number, 
  startLon: number
): JobWithCustomer[] => {
  const jobsWithCoords = jobs.filter(j => j.customer.latitude && j.customer.longitude);
  const jobsWithoutCoords = jobs.filter(j => !j.customer.latitude || !j.customer.longitude);
  
  if (jobsWithCoords.length === 0) return jobs;
  
  const result: JobWithCustomer[] = [];
  const remaining = [...jobsWithCoords];
  let currentLat = startLat;
  let currentLon = startLon;
  
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    remaining.forEach((job, idx) => {
      const dist = calculateDistance(
        currentLat, 
        currentLon, 
        job.customer.latitude!, 
        job.customer.longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });
    
    const nearest = remaining.splice(nearestIdx, 1)[0];
    result.push(nearest);
    currentLat = nearest.customer.latitude!;
    currentLon = nearest.customer.longitude!;
  }
  
  // Add jobs without coordinates at the end
  return [...result, ...jobsWithoutCoords];
};

export const OptimizeRouteButton = ({ jobs, onReorder }: OptimizeRouteButtonProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const { toast } = useToast();

  if (jobs.length < 2) return null;

  const handleOptimize = async () => {
    setIsOptimizing(true);
    
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      
      const { latitude, longitude } = position.coords;
      const optimized = optimizeRoute(jobs, latitude, longitude);
      
      if (onReorder) {
        onReorder(optimized);
      }
      
      setIsOptimized(true);
      toast({
        title: 'Route optimized!',
        description: 'Jobs sorted by proximity to save driving time.',
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast({
        title: 'Could not optimize',
        description: 'Enable location access to optimize your route.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const openInMaps = () => {
    // Build Google Maps directions URL with waypoints
    const jobsWithCoords = jobs.filter(j => j.customer.latitude && j.customer.longitude);
    
    if (jobsWithCoords.length === 0) {
      // Use addresses instead
      const addresses = jobs.map(j => encodeURIComponent(j.customer.address));
      const destination = addresses.pop();
      const waypoints = addresses.join('|');
      
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
      window.open(url, '_blank');
      return;
    }
    
    // Use coordinates
    const destination = `${jobsWithCoords[jobsWithCoords.length - 1].customer.latitude},${jobsWithCoords[jobsWithCoords.length - 1].customer.longitude}`;
    const waypoints = jobsWithCoords.slice(0, -1)
      .map(j => `${j.customer.latitude},${j.customer.longitude}`)
      .join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-2"
        onClick={handleOptimize}
        disabled={isOptimizing}
      >
        {isOptimizing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Route className="w-4 h-4" />
        )}
        {isOptimized ? 'Re-optimize' : 'Optimize Route'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={openInMaps}
      >
        <Navigation className="w-4 h-4" />
        Open Maps
      </Button>
    </motion.div>
  );
};
