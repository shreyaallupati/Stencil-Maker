## Stencil Maker

This project is a full-stack solution designed to bridge the gap between digital art and large-scale physical murals. It allows users to upload images and automatically convert them into a series of printable **A4-sized stencils**, making it easy to trace complex designs onto large walls with precision.

The ecosystem consists of a **FastAPI** backend for image processing, a **React** web dashboard, and a mobile-friendly **Expo** application for on-site reference and quick uploads.

---

### Key Features

* **Image-to-Stencil Conversion:** High-contrast edge detection to transform photos into clean outlines.
* **Intelligent Tiling:** Automatically splits large designs into a grid of A4 sheets with alignment markers.
* **Custom Scaling:** Define the final mural dimensions to determine how many sheets are required.
* **PDF Generation:** Instant download of a multi-page PDF ready for printing.
* **Cross-Platform Access:** Use the web app for detailed configuration or the Expo app for mobility.

---

### Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Python, FastAPI, OpenCV (Image Processing), ReportLab (PDF generation) |
| **Web Frontend** | React, Tailwind CSS, Axios |
| **Mobile** | React Native, Expo, Expo Image Picker |

---

### Project Structure

```text
├── backend/            # FastAPI server & image processing logic
├── web-app/            # React frontend for desktop users
└── mobile-app/         # Expo/React Native application
```

---

### Getting Started

#### 1. Backend Setup
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Start the server: `uvicorn main:app --reload`.

#### 2. Web App Setup
1. Navigate to `/web-app`.
2. Install dependencies: `npm install`.
3. Run the development server: `npm start`.

#### 3. Expo App Setup
1. Navigate to `/mobile-app`.
2. Install dependencies: `npm install`.
3. Start the Expo Go environment: `npx expo start`.

---

### Usage Flow

1.  **Upload:** Select an image via the web or mobile interface.
2.  **Configure:** Set the desired physical width/height of the final mural.
3.  **Process:** The backend calculates the aspect ratio and segments the image into $N$ number of A4 pages.
4.  **Print:** Download the generated PDF, print the sheets, and tape them together to create your full-scale stencil template.
