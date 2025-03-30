# OneDrive Video Uploader

## Overview

This package allows you to upload videos to OneDrive using Microsoft Graph API. It handles authentication using OAuth2 and refresh tokens.

---

## Getting Started

### **Register an App in Azure Portal**

1. Go to the **[Microsoft Azure Portal](https://portal.azure.com/)**.
2. Navigate to **"Azure Active Directory"** from the left sidebar.
3. Click **"App registrations"** > **"New registration"**.
4. Enter a name (e.g., "OneDrive Video Uploader").
5. Choose **"Accounts in any organizational directory and personal Microsoft accounts"**.
6. Set **Redirect URI** as: `http://localhost:3000` (or your actual redirect URL).
7. Click **"Register"**.

### **Get the Client ID**

1. Go to **"Overview"**.
2. Copy the **"Application (client) ID"** – this is your `ONEDRIVE_CLIENT_ID`.

### **Generate a Client Secret**

1. Navigate to **"Certificates & secrets"**.
2. Click **"New client secret"**.
3. Set an expiration period (e.g., 1 year, 2 years, etc.).
4. Click **"Add"**, then copy the **Value** immediately – this is your `ONEDRIVE_CLIENT_SECRET`.

### **Set API Permissions**

1. Go to **"API Permissions"**.
2. Click **"Add a permission"** > Select **"Microsoft Graph"**.
3. Choose **"Delegated permissions"**, and add:
   - `Files.ReadWrite`
   - `offline_access`
4. Click **"Grant admin consent"**.

### **Obtain a Refresh Token**

1. Open your browser and visit:
   ```
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
   client_id=YOUR_CLIENT_ID&
   response_type=code&
   redirect_uri=YOUR_REDIRECT_URI&
   scope=offline_access Files.ReadWrite
   ```
2. Log in with your Microsoft account.
3. After authentication, you will be redirected to your `REDIRECT_URI` with a `code` in the URL.
4. Use this `code` to get a refresh token:
   ```sh
   curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \
   -d client_id=YOUR_CLIENT_ID \
   -d client_secret=YOUR_CLIENT_SECRET \
   -d code=YOUR_AUTHORIZATION_CODE \
   -d grant_type=authorization_code \
   -d redirect_uri=YOUR_REDIRECT_URI
   ```
5. Copy the `refresh_token` from the response – this is your `ONEDRIVE_REFRESH_TOKEN`.

### **(Optional) Get Your OneDrive Drive ID**

If needed, fetch the `drive_id`:

```sh
curl -X GET https://graph.microsoft.com/v1.0/me/drive \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Use the returned `id` as your `ONEDRIVE_DRIVE_ID`.

---

## Environment Variables

After obtaining the credentials, create a `.env.local` file in your Next.js project:

```env
ONEDRIVE_CLIENT_ID=your_client_id
ONEDRIVE_CLIENT_SECRET=your_client_secret
ONEDRIVE_REFRESH_TOKEN=your_refresh_token
ONEDRIVE_REDIRECT_URI=your_redirect_uri
ONEDRIVE_DRIVE_ID=your_drive_id  # (Optional)
```

You're now ready to use the OneDrive Video Uploader in your project!

## Use Case Example

Here’s how you can use this module in a Next.js frontend:

### Install the module:

```sh
npm install onedrive-video-uploader
```

### Next.js Route (/api/onedrive/upload/route.ts):

```tsx
import { NextResponse } from "next/server";
import { uploadToOneDrive } from "onedrive-video-storage";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const path = formData.get("path");
    const filename = formData.get("filename");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const result = await uploadToOneDrive(file, path, filename);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Next.js Component (UploadForm.tsx):

```tsx
"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [videos, setVideos] = useState<
    { id: string; name: string; downloadUrl: string }[]
  >([]);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", "/course1/");
    formData.append("filename", "File1.mp4");

    try {
      setProgress("Uploading...");
      const response = await axios.post("/api/onedrive/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProgress("Uploaded");
      setInterval(() => {
        setProgress(null);
      }, 5000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Upload error", error.response?.data || error.message);
      } else {
        console.error("Upload error", error);
      }
      alert("Failed to upload file.");
    }
  };

  const loadVideos = async () => {
    try {
      const response = await axios.get("/api/videos");
      setVideos(response.data);
    } catch (error) {
      console.error("Error fetching videos", error);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-5">
      <h1 className="text-xl">Video Uploader</h1>
      <input
        className="border text-base cursor-pointer border-dashed p-2 rounded-lg"
        type="file"
        accept="video/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
          }
        }}
      />
      <button
        className="border p-2 rounded-full text-sm px-10 cursor-pointer"
        onClick={handleUpload}
      >
        Upload
      </button>
      <p>Upload Progress: {progress}</p>

      <h2>Available Videos</h2>
      <button onClick={loadVideos}>Load Videos</button>
      {videos.map((video) => (
        <div key={video.id} className="flex flex-col items-center">
          <p>{video.name}</p>
          <video controls width="400">
            <source src={video.downloadUrl} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  );
}
```

Now, you can run your Next.js application and test the file upload to OneDrive.

---
