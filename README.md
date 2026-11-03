# Imagist.

Client-side image processing utility for resizing, dimensional cropping, file size optimization, and format conversion.

Live Application: [https://vladanila.github.io/imagist/](https://vladanila.github.io/imagist/)

---

## Overview

Imagist is a lightweight, privacy-focused web tool engineered to handle strict image dimension and file size requirements commonly enforced by application forms, official portals, and document upload systems.

All computations and image manipulations are executed entirely within the client's web browser using the HTML5 Canvas API. No images, photographs, or document scans are ever transmitted across a network, uploaded to external servers, or stored remotely.

---

## Key Features

### 1. Dimension and Aspect Ratio Control
- Pixel and Centimeter Modes: Define output dimensions in exact pixels or physical centimeters (scaled to standard 200 DPI print density).
- Interactive Cropper: Precision framing with support for 90-degree rotations, horizontal mirroring, and aspect ratio locking.

### 2. File Size Convergence Engine
- Boundary Enforcement: Specify minimum and maximum file size thresholds (e.g., maintain strictly between 20 KB and 50 KB).
- Binary Search Compression: Dynamically calibrates encoder quality parameters through iterative binary search to satisfy exact kilobyte targets without excessive compression artifacts.
- Intelligent Scaling Fallback: Progressively scales canvas dimensions if the requested maximum file size cannot be achieved by quantization adjustments alone.

### 3. Document and Signature Cleanup
- Adaptive Thresholding: Eliminates shadows, ambient glare, and uneven paper backgrounds from photographically captured signatures, rendering crisp dark ink on pure white.
- Auto Enhancement: Optimizes dynamic range, contrast, and exposure levels for portrait photos.
- Monochrome Filtering: Generates clean grayscale reproductions for portals with strict black-and-white specifications.

### 4. Official Identification Stamping
- Candidate Name and Capture Date (DOPO): Generates an integrated banner at the base of the image containing candidate identity and capture timestamps in compliance with official examination standards.

### 5. Multi-Format Converter
- Direct, zero-distortion conversion between major formats:
  - Input: JPEG, PNG, WebP, BMP, GIF
  - Output: JPEG, PNG, WebP, PDF
- PDF Export: Embeds processed images into standardized single-page PDF documents sized to the image geometry.

---

## Privacy and Security Architecture

- Client-Side Sandbox: All image decoding, matrix transformations, pixel alterations, and binary encodings occur strictly within the browser thread via the Canvas 2D Rendering Context.
- Zero Network Transmission: Network requests are neither dispatched nor accepted for file handling. Assets exist ephemerally in volatile memory and are cleared when the tab closes or a new file is loaded.
- Zero Analytics: The application contains no tracking scripts, telemetry beacons, or third-party cookies.

---

## Technical Specifications

| Component | Technology |
| :--- | :--- |
| Core Language | Vanilla JavaScript (ECMAScript 2022 Modules) |
| Layout and Styles | Tailwind CSS, Custom Dark Mode Architecture |
| Canvas Cropping | Cropper.js |
| Vector Graphics | Lucide Icons |
| Document Export | jsPDF |
| Hosting | GitHub Pages (Static Deployment) |

---

## Local Development

Because Imagist requires no build compilation or external dependencies, it can be served using any static HTTP server.

```bash
# Clone the repository
git clone https://github.com/vladanila/imagist.git
cd imagist

# Start a local static server using Python
python -m http.server 3000
```

Once started, navigate to `http://localhost:3000` in your browser.

---

## Deployment

This repository is pre-configured for static deployment on GitHub Pages:

1. Navigate to repository Settings > Pages.
2. Under "Build and deployment", set Source to "Deploy from a branch".
3. Select the `main` branch with the root `/` folder.
4. Save the configuration.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for complete details.
