import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, RotateCcw, Check, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoUrl: string) => void;
  jobId?: string;
}

export const PhotoCaptureModal = ({ isOpen, onClose, onCapture, jobId }: PhotoCaptureModalProps) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Generate unique filename
      const filename = `${jobId || 'temp'}-${Date.now()}.jpg`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(data.path);

      onCapture(publicUrl);
      handleClose();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <h2 className="text-white font-semibold">Photo Evidence</h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center p-6">
              <Camera className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 mb-6">Take a photo of the completed work</p>
              <div className="flex flex-col gap-3">
                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                <Button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-primary hover:bg-primary/90 h-14"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  className="border-white/30 text-white hover:bg-white/10 h-14"
                >
                  <ImagePlus className="w-5 h-5 mr-2" />
                  Choose from Library
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls - always visible at bottom */}
        {capturedImage && (
          <div className="p-4 pb-24 bg-black/50 safe-bottom">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 border-white/30 text-white hover:bg-white/10"
                onClick={retake}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retake
              </Button>
              <Button
                className="flex-1 h-14 bg-green-600 hover:bg-green-700"
                onClick={uploadPhoto}
                disabled={isUploading}
              >
                {isUploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Use Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
