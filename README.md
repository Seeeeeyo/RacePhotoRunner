# RacePhotoRunner

A race photo management platform that lets runners find their race photos by bib number, appearance, or event.

## Project Structure

The project consists of two main parts:

1. **Backend API** (FastAPI): Located in the `/api` directory
2. **Frontend** (Next.js): Located in the `/racephotorunner` directory

## Setup and Installation

### Backend (API)

1. Navigate to the API directory:
   ```bash
   cd api
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the API server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at http://localhost:8000

### Frontend (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd racephotorunner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following content:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at http://localhost:3000

## Features

- Browse race events
- Search photos by bib number
- View photos by event
- Admin dashboard for event management
- Photo upload for administrators
- User authentication

## API Endpoints

The FastAPI backend provides the following key endpoints:

- `/api/events` - List and create events
- `/api/events/{event_id}/photos` - Get photos for a specific event
- `/api/photos/search` - Search photos by bib number
- `/api/photos/upload` - Upload new photos (admin only)
- `/api/auth/token` - Get authentication token
- `/api/auth/register` - Register new user

For full API documentation, visit http://localhost:8000/docs when the API is running.

## Development Notes

- The frontend and backend must both be running for the application to work properly
- Make sure to run the backend first before starting the frontend
- Admin features require authentication

## Development Milestones

### Phase 1
- Local photo upload
- Manual bib tagging
- Bib search
- Basic user accounts
- Stripe checkout
- Basic admin dashboard

### Phase 2
- Add automatic Tesseract OCR
- Face matching (upload selfie search)
- Better search UX

### Phase 3
- Implement CLIP search
- Text-based outfit search
- Mobile-first optimizations

### Phase 4
- Multi-language support (EN/FR)
- Full analytics dashboard
- PWA mobile optimizations 






commands 

cd /Users/selimgilon/Desktop/SportBoost/RacePhotoRunner/api && source venv/bin/activate && python -m uvicorn app.main:app --reload


cd /Users/selimgilon/Desktop/SportBoost/RacePhotoRunner/racephotorunner && nvm use 18.18.0 && npm run dev