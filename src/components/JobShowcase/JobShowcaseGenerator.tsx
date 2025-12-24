import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface JobShowcaseGeneratorProps {
  beforeImage: string;
  afterImage: string;
}

export function JobShowcaseGenerator({ beforeImage, afterImage }: JobShowcaseGeneratorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateAndShare = async () => {
    if (!previewRef.current) {
      toast({
        title: 'Error',
        description: 'Preview container not found',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Capture the preview container as canvas
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality for sharing
        logging: false,
        useCORS: true,
        allowTaint: false,
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to generate image blob');
        }

        // Create file object for sharing
        const file = new File([blob], `solowipe-showcase-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        // Try to use native share API if available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Cleaned by SoloWipe',
              text: 'Check out this transformation!',
              files: [file],
            });
            toast({
              title: 'Shared successfully!',
              description: 'Your showcase image has been shared.',
            });
          } catch (error: any) {
            // User cancelled or share failed, fall back to download
            if (error.name !== 'AbortError') {
              console.error('Share error:', error);
            }
            downloadImage(canvas);
          }
        } else {
          // Fallback to download
          downloadImage(canvas);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Generation failed',
        description: 'Failed to generate showcase image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    // Create download link
    const link = document.createElement('a');
    link.download = `solowipe-showcase-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Downloaded!',
      description: 'Your showcase image has been downloaded.',
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Preview Container - 4:5 aspect ratio (Instagram optimized) */}
      <div
        ref={previewRef}
        className="relative w-full bg-white rounded-xl overflow-hidden shadow-lg"
        style={{ aspectRatio: '4/5' }}
      >
        {/* Images Container */}
        <div className="absolute inset-0 flex">
          {/* Before Image */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium z-10">
              Before
            </div>
            <img
              src={beforeImage}
              alt="Before"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="500"%3E%3Crect fill="%23f3f4f6" width="400" height="500"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EBefore Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* Divider */}
          <div className="w-0.5 bg-white" />

          {/* After Image */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium z-10">
              After
            </div>
            <img
              src={afterImage}
              alt="After"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="500"%3E%3Crect fill="%23f3f4f6" width="400" height="500"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EAfter Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>

        {/* Watermark Footer Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo placeholder + Text */}
            <div className="flex items-center gap-3">
              {/* Logo - Try to load actual logo, fallback to placeholder */}
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/30 overflow-hidden">
                <img 
                  src="/SoloLogo.jpg" 
                  alt="SoloWipe" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    // Fallback to text if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-white font-bold text-lg">SW</span>';
                    }
                  }}
                />
              </div>
              
              {/* Text */}
              <div>
                <p className="text-white font-bold text-sm">Cleaned by SoloWipe</p>
                <p className="text-white/80 text-xs">07700 900000</p>
              </div>
            </div>

            {/* Right: Optional decorative element */}
            <div className="text-white/60 text-xs">
              ✨
            </div>
          </div>
        </div>
      </div>

      {/* Generate & Share Button */}
      <Button
        onClick={handleGenerateAndShare}
        disabled={isGenerating}
        className="w-full h-14 text-lg font-semibold"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Share2 className="w-5 h-5 mr-2" />
            Generate & Share
          </>
        )}
      </Button>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground text-center">
        Perfect for sharing on Instagram and social media
      </p>
    </div>
  );
}

