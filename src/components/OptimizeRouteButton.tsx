import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OptimizeRouteButtonProps {
  jobs: JobWithCustomer[];
  onReorder?: (sortedJobs: JobWithCustomer[]) => void;
}

// Geocode an address to get coordinates using Nominatim (OpenStreetMap)
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    // Use Nominatim API (free, no API key required)
    // Add country code restriction to improve accuracy for UK addresses
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=gb&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SoloWipe/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) {
      console.warn(`[geocodeAddress] Request failed for "${address}":`, response.status, response.statusText);
      // If rate limited, wait and retry once
      if (response.status === 429) {
        console.log('[geocodeAddress] Rate limited, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Retry once
        const retryResponse = await fetch(url, {
          headers: {
            'User-Agent': 'SoloWipe/1.0'
          }
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData && retryData.length > 0 && retryData[0].lat && retryData[0].lon) {
            return {
              lat: parseFloat(retryData[0].lat),
              lon: parseFloat(retryData[0].lon)
            };
          }
        }
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
      console.log(`[geocodeAddress] Successfully geocoded "${address}" to (${result.lat}, ${result.lon})`);
      return result;
    }
    
    console.warn(`[geocodeAddress] No results found for "${address}"`);
    return null;
  } catch (error) {
    console.error(`[geocodeAddress] Error geocoding "${address}":`, error);
    return null;
  }
};

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

// Nearest neighbor algorithm for route optimization
const optimizeRoute = (
  jobs: JobWithCustomer[], 
  startLat: number, 
  startLon: number
): JobWithCustomer[] => {
  // Separate jobs with and without coordinates
  const jobsWithCoords = jobs.filter(j => j.customer.latitude && j.customer.longitude);
  const jobsWithoutCoords = jobs.filter(j => !j.customer.latitude || !j.customer.longitude);
  
  if (jobsWithCoords.length === 0) {
    console.warn('[optimizeRoute] No jobs with coordinates to optimize');
    return jobs;
  }
  
  if (jobsWithCoords.length === 1) {
    // Only one job with coordinates, return as-is
    return [...jobsWithCoords, ...jobsWithoutCoords];
  }
  
  const result: JobWithCustomer[] = [];
  const remaining = [...jobsWithCoords];
  let currentLat = startLat;
  let currentLon = startLon;
  
  console.log(`[optimizeRoute] Optimizing ${remaining.length} jobs starting from (${currentLat}, ${currentLon})`);
  
  // Nearest neighbor algorithm: always pick the closest unvisited job
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    // Find the nearest job to current position
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
    
    // Move to the nearest job
    const nearest = remaining.splice(nearestIdx, 1)[0];
    result.push(nearest);
    currentLat = nearest.customer.latitude!;
    currentLon = nearest.customer.longitude!;
    
    console.log(`[optimizeRoute] Selected: ${nearest.customer.name} at ${nearest.customer.address} (${nearestDist.toFixed(2)}km away)`);
  }
  
  console.log(`[optimizeRoute] Final order: ${result.map(j => j.customer.name).join(' → ')}`);
  
  // Add jobs without coordinates at the end (in original order)
  return [...result, ...jobsWithoutCoords];
};

export const OptimizeRouteButton = ({ jobs, onReorder }: OptimizeRouteButtonProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();
  const { updateJobOrder } = useSupabaseData();
  const { user } = useAuth();

  if (jobs.length < 2) return null;

  // Save geocoded coordinates to database
  const saveCoordinatesToDatabase = async (customerId: string, latitude: number, longitude: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({ latitude, longitude })
        .eq('id', customerId)
        .eq('profile_id', user.id); // Security: ensure user owns the customer
      
      if (error) {
        console.error(`[saveCoordinates] Failed to save coordinates for customer ${customerId}:`, error);
        // Don't throw - non-critical error, coordinates are still in memory
      }
    } catch (err) {
      console.error(`[saveCoordinates] Error saving coordinates:`, err);
      // Don't throw - non-critical error
    }
  };

  const handleOptimize = async () => {
    console.log('Optimizing...'); // DEBUG: Log at start
    setIsOptimizing(true);
    
    try {
      let latitude: number;
      let longitude: number;
      let startPoint: string;
      
      console.log('Starting optimization for', jobs.length, 'jobs'); // DEBUG
      
      // Attempt to get current location
      try {
        console.log('Attempting to get current location...'); // DEBUG
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        startPoint = 'your current location';
        console.log('Got location:', latitude, longitude); // DEBUG
      } catch (locationError) {
        console.log('Location denied/failed, using first job as start point'); // DEBUG
        // Location denied or failed - use first job's address as origin
        if (jobs.length === 0 || !jobs[0].customer.address) {
          console.error('No jobs available to optimize'); // DEBUG
          toast({
            title: 'Could not optimize',
            description: 'No jobs available to optimize.',
            variant: 'destructive',
          });
          setIsOptimizing(false);
          return;
        }
        
        const firstJob = jobs[0];
        startPoint = firstJob.customer.address;
        
        // If first job has coordinates, use them as start point
        if (firstJob.customer.latitude && firstJob.customer.longitude) {
          latitude = firstJob.customer.latitude;
          longitude = firstJob.customer.longitude;
          console.log('Using first job coordinates:', latitude, longitude); // DEBUG
        } else {
          console.log('No coordinates available, geocoding addresses...'); // DEBUG
          // No coordinates available - geocode addresses to get coordinates
          
          // Geocode all addresses that don't have coordinates
          // Rate limit: Nominatim requires max 1 request per second
          const jobsToGeocode = jobs.filter(j => !j.customer.latitude || !j.customer.longitude);
          console.log(`[handleOptimize] Geocoding ${jobsToGeocode.length} addresses...`);
          
          if (jobsToGeocode.length > 0) {
            setGeocodingProgress({ current: 0, total: jobsToGeocode.length });
            toast({
              title: 'Geocoding addresses...',
              description: `Getting coordinates for ${jobsToGeocode.length} address${jobsToGeocode.length > 1 ? 'es' : ''}. This may take a moment.`,
            });
          }
          
          let geocodedCount = 0;
          for (let i = 0; i < jobsToGeocode.length; i++) {
            const job = jobsToGeocode[i];
            if (job.customer.address) {
              setGeocodingProgress({ current: i + 1, total: jobsToGeocode.length });
              
              const coords = await geocodeAddress(job.customer.address);
              if (coords) {
                // Update the job with geocoded coordinates (in memory)
                job.customer.latitude = coords.lat;
                job.customer.longitude = coords.lon;
                geocodedCount++;
                console.log(`[handleOptimize] Geocoded ${job.customer.name} (${job.customer.address}):`, coords);
                
                // Save coordinates to database (fire and forget - don't wait)
                saveCoordinatesToDatabase(job.customer.id, coords.lat, coords.lon).catch(err => {
                  console.warn(`[handleOptimize] Failed to save coordinates for ${job.customer.name}:`, err);
                });
              } else {
                console.warn(`[handleOptimize] Failed to geocode ${job.customer.name} (${job.customer.address})`);
              }
            }
            
            // Rate limit: wait 1.1 seconds between requests (Nominatim requires max 1 req/sec)
            if (i < jobsToGeocode.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1100));
            }
          }
          
          if (geocodedCount > 0) {
            console.log(`[handleOptimize] Successfully geocoded ${geocodedCount}/${jobsToGeocode.length} addresses`);
          }
          
          // Check if we now have at least one job with coordinates
          const jobsWithCoords = jobs.filter(j => j.customer.latitude && j.customer.longitude);
          
          if (jobsWithCoords.length === 0) {
            console.log('Geocoding failed for all addresses, using alphabetical fallback');
            // All geocoding failed - use alphabetical fallback
            const sortedByAddress = [...jobs].sort((a, b) => {
              const addrA = (a.customer?.address || '').toLowerCase();
              const addrB = (b.customer?.address || '').toLowerCase();
              return addrA.localeCompare(addrB);
            });
            
            if (onReorder) {
              onReorder(sortedByAddress);
            }
            setIsOptimized(true);
            setIsOptimizing(false);
            setGeocodingProgress({ current: 0, total: 0 });
            
            try {
              const jobOrders = sortedByAddress.map((job, index) => ({
                id: job.id,
                order_index: index,
              }));
              await updateJobOrder(jobOrders);
              console.log('[handleOptimize] Saved alphabetical fallback order to database');
            } catch (err) {
              console.error('Error saving fallback order:', err);
            }
            
            toast({
              title: 'Route sorted alphabetically',
              description: 'Could not get coordinates from addresses. Sorted by address name.',
              variant: 'destructive',
            });
            return;
          }
          
          // Use first job's coordinates as start point
          latitude = jobsWithCoords[0].customer.latitude!;
          longitude = jobsWithCoords[0].customer.longitude!;
          startPoint = jobsWithCoords[0].customer.address;
          console.log('Using first geocoded job coordinates:', latitude, longitude);
          
          if (geocodedCount < jobsToGeocode.length) {
            // Some addresses failed to geocode - inform user but continue
            toast({
              title: 'Partial geocoding success',
              description: `Got coordinates for ${geocodedCount} of ${jobsToGeocode.length} addresses. Optimizing with available data.`,
            });
          }
        }
      }
      
      // Reset geocoding progress
      setGeocodingProgress({ current: 0, total: 0 });
      
      // Optimize route using the start point (either user location or first job)
      console.log('[handleOptimize] Running optimization algorithm...');
      console.log('[handleOptimize] Start point:', { lat: latitude, lon: longitude, description: startPoint });
      console.log('[handleOptimize] Jobs to optimize:', jobs.map(j => ({ 
        id: j.id,
        name: j.customer.name, 
        address: j.customer.address,
        hasCoords: !!(j.customer.latitude && j.customer.longitude),
        coords: j.customer.latitude && j.customer.longitude ? 
          { lat: j.customer.latitude, lon: j.customer.longitude } : null
      })));
      
      const optimized = optimizeRoute(jobs, latitude, longitude);
      
      console.log('[handleOptimize] Optimization complete!');
      console.log('[handleOptimize] Original order:', jobs.map(j => j.customer.name));
      console.log('[handleOptimize] Optimized order:', optimized.map(j => j.customer.name));
      console.log('[handleOptimize] Job IDs:', optimized.map(j => j.id));
      
      // Update UI immediately with new order
      if (onReorder) {
        console.log('Calling onReorder callback...'); // DEBUG
        onReorder(optimized);
      } else {
        console.warn('onReorder callback not provided!'); // DEBUG
      }
      
      // Save order to database
      try {
        const jobOrders = optimized.map((job, index) => ({
          id: job.id,
          order_index: index,
        }));
        
        console.log('Saving order to database...', jobOrders); // DEBUG
        await updateJobOrder(jobOrders);
        console.log('Order saved to database successfully'); // DEBUG
      } catch (dbError) {
        console.error('Error saving job order to database:', dbError);
        // Don't fail the entire operation if DB save fails - UI is already updated
        toast({
          title: 'Route optimized',
          description: 'Order updated locally, but failed to save to database.',
          variant: 'destructive',
        });
        setIsOptimizing(false);
        return;
      }
      
      setIsOptimized(true);
      setGeocodingProgress({ current: 0, total: 0 });
      console.log('Optimization complete!'); // DEBUG
      
      // Count how many jobs were optimized vs those without coordinates
      const optimizedCount = optimized.filter(j => j.customer.latitude && j.customer.longitude).length;
      const unoptimizedCount = optimized.length - optimizedCount;
      
      let description = `Optimized ${optimizedCount} job${optimizedCount !== 1 ? 's' : ''} by proximity`;
      if (unoptimizedCount > 0) {
        description += `. ${unoptimizedCount} job${unoptimizedCount !== 1 ? 's' : ''} without coordinates added at the end.`;
      }
      description += ` Starting from ${startPoint}.`;
      
      toast({
        title: 'Route Optimized!',
        description,
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      setGeocodingProgress({ current: 0, total: 0 });
      toast({
        title: 'Could not optimize',
        description: error instanceof Error ? error.message : 'An error occurred while optimizing the route.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
      setGeocodingProgress({ current: 0, total: 0 });
      console.log('Optimization finished, loading state cleared'); // DEBUG
    }
  };

  const openInMaps = () => {
    // Build Google Maps directions URL with waypoints
    const jobsWithCoords = jobs.filter(j => j.customer.latitude && j.customer.longitude);
    
    if (jobsWithCoords.length === 0) {
      // Use addresses instead
      const addresses = jobs.map(j => encodeURIComponent(j.customer.address));
      
      if (addresses.length === 0) {
        return; // No addresses to navigate to
      }
      
      const destination = addresses[addresses.length - 1];
      const waypoints = addresses.slice(0, -1);
      
      // Only add waypoints if there are multiple stops
      const url = waypoints.length > 0
        ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints.join('|')}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      
      window.open(url, '_blank');
      return;
    }
    
    // Use coordinates
    const destination = `${jobsWithCoords[jobsWithCoords.length - 1].customer.latitude},${jobsWithCoords[jobsWithCoords.length - 1].customer.longitude}`;
    const waypoints = jobsWithCoords.slice(0, -1)
      .map(j => `${j.customer.latitude},${j.customer.longitude}`);
    
    // Only add waypoints if there are multiple stops
    const url = waypoints.length > 0
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints.join('|')}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    
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
        onClick={(e) => {
          console.log('Button clicked!', { isOptimizing, jobsCount: jobs.length }); // DEBUG
          e.preventDefault();
          e.stopPropagation();
          handleOptimize();
        }}
        disabled={isOptimizing}
        type="button"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {geocodingProgress.total > 0 
              ? `Geocoding ${geocodingProgress.current}/${geocodingProgress.total}...`
              : 'Calculating...'}
          </>
        ) : (
          <>
            <Route className="w-4 h-4" />
            {isOptimized ? 'Re-optimize' : 'Optimize Route'}
          </>
        )}
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
