// Sample events data
export const EVENTS = [
  { 
    id: '1', 
    name: 'Boston Marathon 2024', 
    date: 'April 15, 2024', 
    location: 'Boston, MA',
    description: 'The 128th Boston Marathon featuring elite runners from around the world.',
    photoCount: 2500,
    coverImage: '/boston-marathon.jpg'
  },
  { 
    id: '2', 
    name: 'NYC Half Marathon', 
    date: 'March 17, 2024', 
    location: 'New York, NY',
    description: 'A 13.1-mile race through the streets of Manhattan.',
    photoCount: 1800,
    coverImage: '/nyc-half.jpg'
  },
];

// Helper to determine good text color based on background
function getTextColor(bgColor: string): string {
  // Dark colors get white text, light colors get black text
  const darkColors = ['red', 'blue', 'green', 'purple', 'black'];
  return darkColors.includes(bgColor) ? 'white' : 'black';
}

// Generate consistent color-based image based on ID
function getPlaceholderImage(eventId: string, photoId: string, bibNumber: number | null, color: string) {
  const textColor = getTextColor(color);
  const displayText = bibNumber ? `#${bibNumber}` : 'RUNNER';
  
  // Create an SVG with colored background and number overlay
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='${color}' /%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='40' font-weight='bold' fill='${textColor}'%3E${displayText}%3C/text%3E%3C/svg%3E`;
}

// Define the photo type for better type checking
export interface Photo {
  id: string;
  timestamp: string;
  location: string;
  outfitColor: string;
  runnerName: string | null;
  bibNumber: number | null;
  imageUrl: string;
}

// Generate mock photos for an event
export function generateMockPhotos(eventId: string, count = 20): Photo[] {
  const photos: Photo[] = [];
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'black', 'white'];
  const names = [
    'John Smith', 'Emily Johnson', 'Michael Brown', 'Sarah Davis', 
    'David Wilson', 'Jessica Martinez', 'James Taylor', 'Jennifer Anderson'
  ];

  for (let i = 1; i <= count; i++) {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomName = Math.random() > 0.3 ? names[Math.floor(Math.random() * names.length)] : null;
    const hasBib = Math.random() > 0.2;
    const bibNumber = hasBib ? Math.floor(Math.random() * 9000) + 1000 : null;
    const photoId = `${eventId}-${i}`;
    
    photos.push({
      id: photoId,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
      location: `Mile ${Math.floor(Math.random() * 26) + 1}`,
      outfitColor: randomColor,
      runnerName: randomName,
      bibNumber: bibNumber,
      imageUrl: getPlaceholderImage(eventId, photoId, bibNumber, randomColor),
    });
  }

  return photos;
} 