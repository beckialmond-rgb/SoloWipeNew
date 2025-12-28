import { useState, useEffect, useMemo } from 'react';
import { JobWithCustomer } from '@/types/database';

// Haversine formula to calculate distance between two coordinates
// Exported from OptimizeRouteButton.tsx logic
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

// Sort jobs by distance from user location
const sortJobsByRoute = (
  jobs: JobWithCustomer[],
  userLocation: { lat: number; lon: number } | null
): JobWithCustomer[] => {
  if (!userLocation) {
    // Fallback: sort by scheduled_date
    return [...jobs].sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
  }
  
  // Calculate distance for each job
  const jobsWithDistance = jobs.map(job => {
    if (!job.customer.latitude || !job.customer.longitude) {
      return { job, distance: Infinity }; // No coordinates = end of list
    }
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lon,
      job.customer.latitude,
      job.customer.longitude
    );
    
    return { job, distance };
  });
  
  // Sort by distance (ascending)
  jobsWithDistance.sort((a, b) => a.distance - b.distance);
  
  return jobsWithDistance.map(({ job }) => job);
};

/**
 * Hook to sort jobs by route (distance from user location)
 * Falls back to date sorting if location is unavailable
 */
export function useRouteSorting(jobs: JobWithCustomer[]) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Get user location on mount (only once)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setLocationError(null);
      },
      (error) => {
        // Silently handle geolocation errors - this is expected behavior
        // User may deny permission, which is fine - we'll use date sorting
        // Changed from console.warn to console.log to reduce noise
        console.log('[useRouteSorting] Location not available, using date sorting:', error.message);
        setLocationError(error.message);
        // Continue without location - will use date sorting
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  }, []);
  
  // Sort jobs by route (memoized for performance)
  const sortedJobs = useMemo(() => {
    try {
      return sortJobsByRoute(jobs, userLocation);
    } catch (error) {
      // Fallback to date sorting if route sorting fails
      console.error('[useRouteSorting] Error sorting jobs:', error);
      return [...jobs].sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      );
    }
  }, [jobs, userLocation]);
  
  return {
    sortedJobs,
    userLocation,
    locationError,
    isLocationAvailable: !!userLocation
  };
}


