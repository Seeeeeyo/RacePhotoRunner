# RacePhotoRunner

A web application for runners to find and share their race photos.

## Features

- Browse race events
- Search for photos by bib number, runner name, or outfit color
- View photos from specific events
- Filter photos based on various criteria

## Getting Started

### Prerequisites

- Node.js 14.0 or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies
```bash
cd racephotorunner
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Adding Placeholder Images

The application uses placeholder images for race photos. You need to add these images to make the application work properly:

1. Create the following directory structure in the `public` folder:
```
public/
  placeholders/
    boston/
      runner1.jpg
      runner2.jpg
      ...
      runner10.jpg
    nyc/
      runner1.jpg
      runner2.jpg
      ...
      runner10.jpg
```

2. Add appropriate runner photos in each folder. You can use any free stock photos of runners.

3. If the placeholder images are missing, the application will fallback to colored blocks with bib numbers.

## Project Structure

- `app/` - Next.js app router files
- `app/page.tsx` - Home page
- `app/events/page.tsx` - Events listing page
- `app/events/[id]/page.tsx` - Individual event page
- `app/search/page.tsx` - Search page
- `components/` - Reusable UI components
- `lib/` - Utility functions and data
- `public/` - Static assets

## Technology Stack

- Next.js 13
- React 18
- TypeScript
- Tailwind CSS

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
