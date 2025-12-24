# JobShowcase Component

A React component for generating before/after job showcase images optimized for social media sharing (Instagram 4:5 aspect ratio).

## Features

- ✅ Side-by-side before/after image display
- ✅ Watermark footer with branding (text, logo placeholder, phone number)
- ✅ HTML2Canvas integration for image generation
- ✅ Native share API support (falls back to download)
- ✅ Instagram-optimized 4:5 aspect ratio
- ✅ High-quality image output (2x scale)

## Usage

```tsx
import { JobShowcaseGenerator } from '@/components/JobShowcase';

function MyComponent() {
  const beforeImage = 'https://example.com/before.jpg';
  const afterImage = 'https://example.com/after.jpg';

  return (
    <JobShowcaseGenerator 
      beforeImage={beforeImage} 
      afterImage={afterImage} 
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `beforeImage` | `string` | Yes | URL of the "before" image |
| `afterImage` | `string` | Yes | URL of the "after" image |

## How It Works

1. **Preview Display**: Shows both images side-by-side with labels ("Before" / "After")
2. **Watermark Footer**: Displays "Cleaned by SoloWipe", logo placeholder, and phone number
3. **Generate & Share**: 
   - Uses `html2canvas` to capture the entire preview container
   - Attempts to use native `navigator.share()` API if available
   - Falls back to downloading the image if sharing is not supported
   - Outputs a high-quality JPG file

## Styling

The component uses Tailwind CSS and includes:
- 4:5 aspect ratio container (Instagram optimized)
- Gradient footer overlay for watermark visibility
- Responsive design
- Error handling for broken images (shows placeholder)

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers with share API support
- ✅ Fallback to download on unsupported browsers

## Dependencies

- `html2canvas` - for canvas generation
- `lucide-react` - for icons
- Tailwind CSS - for styling

