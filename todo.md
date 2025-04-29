# 🏃 RacePhotoRunner — Master To-Do List

---

## ✅ Completed (Stable Features)
- [x] Website with multiple tabs (UI)
- [x] Admin dashboard to manage events, photos, and stats
- [x] View per event with access to associated pictures
- [x] Watermarking of images
- [x] View and download full-size images

---

## 🛠️ To Do

### 🔧 Core Functionality
- [ ] Replace YOLO + OCR with Gemini-based bib detection
  - Use `gem.md` as reference
  - Extract and tag bib numbers from each image
- [ ] Use CLIP to embed people/faces in each picture      https://github.com/openai/CLIP
  - Store multiple vectors per image in DB
  - Handle multiple subjects per photo
- [ ] Asynchronous background pipeline for embedding photos (face, CLIP, etc.)
- [ ] Resize and optimize all uploaded images for thumbnails, web, and HD

---

### 🔍 Search & Discovery
- [ ] Link "Search" tab to the database
  - [ ] Search by bib number
  - [ ] Search by uploading selfie (CLIP similarity)
  - [ ] Search by text outfit description (CLIP text-to-image match)
- [ ] On each image, allow user to click "Not me"
  - Remove incorrect bib tags
  - Handle images with multiple bibs
- [ ] Add pagination to photo browsing UI
- [ ] Replace full image open in new tab with lightbox viewer
- [ ] Add social share buttons for individual photos and albums

---

### 👥 User Roles & Permissions
- [ ] On signup, user selects role: `Photographer` or `Athlete`
  - Athlete:
    - Can browse, buy, download photos
  - Photographer:
    - Can create events
    - Can upload images
    - Can delete their own photos and events only
- [ ] Implement "Forgot password" + password reset flow
- [ ] Email verification on sign-up

---

### 💰 Payments & Pricing
- [ ] On upload, photographer sets:
  - Price per individual photo
  - Bundle price per bib (all photos)
- [ ] Integrate Stripe payments:
  - Handle checkout flow
  - Respect single and bundle pricing
- [ ] After payment, send email with:
  - Zip file or download links for HD pictures
- [ ] On signup as Photographer:
  - Create Stripe Connect Express account
  - Enable payout flow to photographer

---

### 🧪 Tests & QA
- [ ] Write tests for:
  - Photo upload
  - Role-based access control
  - Search (bib, CLIP, text)
  - Stripe checkout
  - Email confirmation and delivery
- [ ] Ensure all image cards in gallery have fixed dimensions

---

### 🛡️ Security & Abuse Prevention
- [ ] Add rate limiting on uploads and search queries
- [ ] Protect against image scraping (e.g., signed URLs, watermark enforcement)
- [ ] CSRF + XSS protection on forms and APIs

---

### 📈 Analytics & Monitoring
- [ ] Track photo views, shares, and purchases per event/photo
- [ ] Dashboard for photographers to see revenue & engagement stats
- [ ] Error tracking (e.g., Sentry) and uptime monitoring
- [ ] Logging for image pipeline (e.g., success/fail per model stage)

---

### 📦 Image Processing & Storage
- [ ] Generate and store CLIP/face embeddings asynchronously
- [ ] Clean up unused or orphaned files from S3
- [ ] Generate thumbnails and mobile/web-optimized versions of images

---

### 🌍 Internationalization / Localization
- [ ] Support for multi-language UI (EN/FR at minimum)
- [ ] Localized emails and currency formatting (CAD, EUR, USD)

---

### 📱 Mobile / PWA Support
- [ ] Ensure mobile responsiveness
- [ ] PWA installability ("Add to home screen")
- [ ] Optimize photo viewer for mobile swiping experience

---

## 🕶️ Invisible Watermarking for HD Photos

### [ ] Integrate Invisible Watermarking
- [ ] Add invisible watermarking to HD photos before user download.
- [ ] Encode traceable metadata directly into the image:
  - Photo ID
  - Photographer ID
  - Buyer user ID or email
  - Purchase timestamp

#### 🧰 Commercial Options:
- [ ] **Digimarc** — Industry-grade invisible watermarking and copyright tracking.
- [ ] **Imatag** — SaaS for imperceptible watermarking used by photo agencies.

#### 🧪 Open-Source Options:
- [ ] [`invisible-watermark`](https://github.com/guofei9987/invisible-watermark) — Python, supports DCT/DFT-based embedding.
- [ ] Explore simple `steganography` libraries (note: easier to reverse or remove).

### [ ] Create Decode Script
- [ ] Utility to extract and verify watermark from images for traceability in case of leaks.

----

### 🔁 User Feedback & Support
- [ ] Add "Report photo" feature
- [ ] Photographer + athlete FAQ / support pages
- [ ] Contact/support form

---

### 🧩 Growth & SEO
- [ ] SEO for event pages and photo content (OpenGraph + Schema.org)
- [ ] Public albums shareable and optionally indexable
- [ ] Photographer or organizer referral system
- [ ] Change the name from RacePhotoRunner to RacePhoto

