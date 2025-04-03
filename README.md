# Axiom Image Click Downloader

This project allows you to **automatically download images from [https://axiom.trade/pulse](https://axiom.trade/pulse)** as **`.png`** files whenever you click on them, bypassing the default Google Lens behavior. The core components are:

1. A **local Flask server** that converts `.webp` images to `.png` using **FFmpeg** (to handle CORS and file format compatibility).  
2. A **Chrome Extension** that intercepts image-click events on `https://axiom.trade/pulse` to:
   - Prevent Google Lens.  
   - Send `.webp` images to the local server for conversion.  
   - Automatically trigger a **download** of the `.png` image to your computer.

## Table of Contents

1. [Overview](#overview)  
2. [Folder Structure](#folder-structure)  
3. [How It Works](#how-it-works)  
4. [Requirements](#requirements)  
5. [Installation & Setup](#installation--setup)  
    1. [Set Up the Python Server](#1-set-up-the-python-server)  
    2. [Build a Standalone Executable (Optional)](#2-build-a-standalone-executable-optional)  
    3. [Set Up the Chrome Extension](#3-set-up-the-chrome-extension)  
6. [Usage](#usage)  
7. [Additional Notes](#additional-notes)  
8. [License](#license)  

---

## Overview

- **Motivation**: The site [https://axiom.trade/pulse](https://axiom.trade/pulse) by default triggers Google Lens on image clicks, preventing direct downloads of `.webp` images.  
- **Solution**: A Chrome extension intercepts these clicks, fetches the `.webp` images, and sends them to a local Flask server that converts them to `.png`. The extension then downloads the resulting `.png` automatically to your default downloads folder.  
- **CORS**: Handling `.webp` files directly in a browser extension can trigger CORS limitations. By using a local server, we bypass CORS issues and safely convert images to `.png`.

---

## Folder Structure

Your repository should have **two main folders**:

```
.
├── axiom-image-converter-server
│   ├── helpers
│   │   └── ffmpeg
│   │       └── ffmpeg.exe
│   └── server.py
└── axiom-image-downloader-extension
    ├── background.js
    ├── content.js
    └── manifest.json
```

### 1. `axiom-image-converter-server`

- **`helpers/ffmpeg/ffmpeg.exe`**  
  The FFmpeg binary (for Windows). If you’re using another operating system, replace it with a compatible FFmpeg binary and update the references in `server.py` if necessary.

- **`server.py`**  
  A Flask server that listens on **`http://localhost:5000/convert`**. When it receives a `.webp` file via POST, it converts it to `.png` using FFmpeg and returns the `.png` file in the response.

### 2. `axiom-image-downloader-extension`

- **`background.js`**  
  A **service worker** script that listens for messages from the content script. When it receives a `downloadImage` action, it:
  1. Fetches the `.webp` image from the remote server.  
  2. Sends it (as `FormData`) to the local Python server’s `/convert` endpoint for conversion.  
  3. Receives the converted `.png` blob and triggers a Chrome download.

- **`content.js`**  
  Injects custom logic into [https://axiom.trade/pulse](https://axiom.trade/pulse):
  - Uses a **`MutationObserver`** to detect dynamically added image containers (`div.group/image`).  
  - Attaches click/hover listeners that **prevent** the default Google Lens behavior.  
  - Sends a message to `background.js` requesting the `.webp → .png` conversion.

- **`manifest.json`**  
  The **Chrome Extension Manifest V3** definition. It declares permissions, the extension name, description, and references to the scripts.

---

## How It Works

1. **Intercept Click**:  
   The **content script** detects a click on the image or the Google Lens button and calls `event.preventDefault()` to block the default action (Google Lens).

2. **Request to Background Script**:  
   The **content script** sends `{ action: "downloadImage", imageUrl, filename }` to `background.js`.

3. **Fetch + Convert**:  
   The **background script** fetches the `.webp` from the CDN, then sends it (via `FormData`) to the Flask server’s `/convert` route.

4. **Server Conversion**:  
   The **Flask server** (`server.py`) writes the `.webp` to a temporary file, invokes **FFmpeg** to convert `.webp → .png`, then reads the `.png` into memory and returns it as a downloadable file.

5. **Download the PNG**:  
   The **background script** receives the `.png` as a blob, converts it to a data URL, and finally calls `chrome.downloads.download` to save it (with `.png` extension) in your default downloads folder.

---

## Requirements

- **Python 3.x**  
- **Flask**: `pip install flask`  
- **PyInstaller** (if you plan to build an executable): `pip install pyinstaller`  
- **FFmpeg**: If you’re on Windows, you can use the included `ffmpeg.exe`. Otherwise, install a suitable FFmpeg version and adapt `server.py` if needed.  
- **Chrome** or a Chromium-based browser with extension support for Manifest V3.

---

## Installation & Setup

### 1. Set Up the Python Server

1. **Clone** or **download** this repository (or at least the `axiom-image-converter-server` folder).  
2. **Install dependencies**:
   ```bash
   pip install flask
   ```
3. **Confirm your FFmpeg path**:  
   - By default, the script expects `ffmpeg.exe` under `axiom-image-converter-server/helpers/ffmpeg`.  
   - If you’re on another OS, replace `ffmpeg.exe` with a suitable binary (e.g., `ffmpeg` on Linux) and update the `get_ffmpeg_path()` call in `server.py`.
4. **Run the server in development mode**:
   ```bash
   cd axiom-image-converter-server
   python server.py
   ```
   The server should start at `http://localhost:5000/`.

### 2. Build a Standalone Executable (Optional)

If you want to distribute the Flask server to someone **without** requiring Python or FFmpeg installation:

1. **Install PyInstaller** (if not already done):  
   ```bash
   pip install pyinstaller
   ```
2. **Navigate** to the folder containing `server.py` (i.e., `axiom-image-converter-server/`).  
3. **Run** the following command to build an executable:

   ```bash
   pyinstaller ^
     --onedir ^
     --name server ^
     --add-data "helpers/ffmpeg/ffmpeg.exe;helpers/ffmpeg" ^
     server.py
   ```

   - `--onedir` creates a folder (in `dist/server`) containing the executable and dependencies.  
   - `--add-data` ensures that `ffmpeg.exe` is bundled in the `helpers/ffmpeg` subdirectory within the executable’s distribution folder.  

4. After the process completes, you will find a `dist/server` folder containing `server.exe` and all necessary files to run the server.  
5. **Distribute** that folder to anyone who needs to run the server. No separate Python or FFmpeg install is required on their machine; they simply double-click `server.exe`.

### 3. Set Up the Chrome Extension

1. **Open Google Chrome** (or a Chromium-based browser) and go to:  
   `chrome://extensions/`  
2. **Enable Developer Mode** (usually a toggle in the top-right corner).  
3. **Click “Load unpacked”**, then select the `axiom-image-downloader-extension` folder. You should see the extension appear in your list.  
4. Make sure your **Python server** (or the standalone `server.exe`) is running on port **5000** before attempting to use the extension.  

---

## Usage

1. **Start the local server** (either `python server.py` or `server.exe`).  
2. **Open** `https://axiom.trade/pulse` in Chrome.  
3. **Hover/click** any image that normally shows Google Lens. The extension’s content script will:
   - Prevent Google Lens.  
   - Send the `.webp` URL to the background script.  
   - The background script sends it to your local server for `.png` conversion.  
   - A new **`.png`** file should appear in your **Downloads** folder.  

**Tip**: Check the “Console” in Chrome DevTools (F12) to see logs from the content script, or check the service worker logs (`chrome://extensions` → “Service Worker” link under this extension) for the background script.

---

## Additional Notes

- **Port Conflicts**: If port 5000 is already in use, edit `app.run(port=5000, debug=True)` in `server.py` to change the port. Then, update the fetch URL in `background.js` accordingly (`http://localhost:NEW_PORT/convert`).  
- **Linux / macOS**: The provided `ffmpeg.exe` is specific to Windows. Replace it with your platform’s FFmpeg binary and ensure you update the path in `get_ffmpeg_path()`.  
- **Distribution**: If you share the extension, remember that it depends on your local server being active. Without the server, the extension’s `.webp` to `.png` conversion won't work.  

---

## License

No specific open-source license is included. You may adapt and use it **as-is** for personal or educational use. If you plan to share or commercialize it, consider adding an appropriate open-source license (e.g., MIT, Apache 2.0, GPL).

---

### Enjoy!
You now have a working setup that intercepts clicks on images at `https://axiom.trade/pulse`, converts `.webp` images to `.png`, and downloads them instantly.