**RacePhotoRunner — Project Technical Overview**

---

**Objective:**  
Develop a race photo platform allowing runners to easily find, view, and purchase/download photos from events via bib number detection, face recognition, and full-body (CLIP-based) matching.

---

**Core Features:**

1. **Photo Upload & Storage**
   - Mass upload of race photos (drag and drop, or FTP ingestion).
   - Photos stored locally in a structured directory.
   - Metadata attached to each photo (event ID, timestamp, bib numbers, face embeddings, body embeddings).

2. **Bib Number Detection**
   - Use Tesseract OCR for initial bib detection.
   - Fine-tuning Tesseract OCR model to improve race-specific results.
   - No external API dependencies.

3. **Face Recognition Matching**
   - Detect faces using MTCNN or RetinaFace.
   - Extract face embeddings using ArcFace.
   - Store embeddings in local FAISS (vector DB).
   - Search by uploading a selfie.

4. **Full-body Matching (CLIP Search)**
   - Encode full photos with OpenAI’s CLIP model.
   - Store embeddings locally in FAISS.
   - Search by uploading a selfie (captures outfit) or describing the outfit via text query.

5. **Photo Search Page**
   - Bib number search input.
   - Upload a selfie search.
   - Text description search (CLIP-powered).
   - Fast, paginated photo gallery.

6. **User Accounts and Purchases**
   - Local authentication system initially (email/password via JWTs).
   - Payment processing via Stripe.
   - Free watermarked downloads or paid high-resolution downloads.
   - Photo package bundling options.

7. **Admin Dashboard**
   - Event creation and photo management.
   - Manual tagging tools.
   - Basic sales and download reports.

8. **Event Landing Pages**
   - Public page for each event.
   - Event description, search bar, featured photos.
   - SEO and social media optimized.

---

**Technology Stack:**

| Layer | Stack |
|:------|:-----|
| Frontend | Next.js 14, TailwindCSS, shadcn/ui |
| Backend API | Python FastAPI |
| Database | PostgreSQL (user/event/photo metadata) |
| File Storage | Local filesystem (for initial development) |
| Authentication | Custom JWT authentication |
| Payment | Stripe |
| Machine Learning (bib, face, clip) | Python services (OCR, ArcFace, CLIP models) |
| Search | FAISS (vector DB for face/body search) + PostgreSQL full-text search for bib numbers |
| Hosting (dev) | Local Docker-based hosting |

---

**AI/ML Infrastructure:**
- All inference runs locally.
- Models served with FastAPI endpoints.
- Async task queue (Celery + Redis) for OCR and embedding generation pipelines.

---

**Milestone Plan:**

| Phase | Deliverables |
|:------|:------------|
| Phase 1  | Local photo upload, manual bib tagging, bib search, basic user accounts, Stripe checkout, basic admin dashboard. |
| Phase 2  | Add automatic Tesseract OCR, face matching (upload selfie search), better search UX. |
| Phase 3 | Implement CLIP search, text-based outfit search, mobile-first optimizations. |
| Phase 4  | Multi-language support (EN/FR), full analytics dashboard, PWA mobile optimizations. |

---

**Additional Notes:**
- Local image compression and resizing for web optimization.
- Focus on sub-second photo search results.
- Minimal external API reliance (fully self-hosted initially).
- Prepare future transition to cloud hosting (S3, AWS EC2) but not implemented yet.

---

**Agents & Automation (Cursor Use):**
- Agents will scaffold local API endpoints for upload, search, and Stripe session creation.
- Agents will build local file upload handlers.
- Agents will deploy and monitor OCR, face detection, and CLIP endpoints using FastAPI locally.
- Agents will create automated integration tests from upload to search to purchase.

---


**RacePhotoRunner — Empowering Every Runner to Find Their Story.**

