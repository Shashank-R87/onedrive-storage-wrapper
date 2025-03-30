import axios from "axios";
import qs from "qs";

const CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ONEDRIVE_REFRESH_TOKEN;
const REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI;
const DRIVE_ID = process.env.ONEDRIVE_DRIVE_ID;

export const getAccessToken = async () => {
  const requestData = qs.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
    redirect_uri: REDIRECT_URI,
  });

  const response = await axios.post(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    requestData,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return response.data.access_token;
};

export const uploadToOneDrive = async (file, path, filename, onProgress) => {
  try {
    const accessToken = await getAccessToken();

    const uploadSessionUrl = path
      ? `https://graph.microsoft.com/v1.0/me/drive/root:/${path}/${filename || file.name}:/createUploadSession`
      : `https://graph.microsoft.com/v1.0/me/drive/root:/${file.name}:/createUploadSession`;

    const sessionResponse = await axios.post(uploadSessionUrl, {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sessionResponse.data.uploadUrl) {
      console.error("Failed to create an upload session:", sessionResponse.data);
      throw new Error("Upload session creation failed");
    }

    const uploadUrl = sessionResponse.data.uploadUrl;

    const fileSize = file.size;
    const chunkSize = 20 * 1024 * 1024;
    let uploadedSize = 0;

    for (let start = 0; start < fileSize; start += chunkSize) {
      const chunk = file.slice(start, start + chunkSize);
      const end = Math.min(start + chunkSize, fileSize) - 1;

      await axios.put(uploadUrl, chunk, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        },
        onUploadProgress: (progressEvent) => {
          uploadedSize = start + progressEvent.loaded;
          const percentage = Math.round((uploadedSize * 100) / fileSize);
          if (onProgress) {
            onProgress(percentage);
          }
        },
      });
    }

    console.log("File uploaded successfully:", file.name);
    return { success: true, message: "File uploaded successfully" };
  } catch (error) {
    console.error("Upload Error:", error.response?.data || error.message);
    throw new Error("Failed to upload file");
  }
};

export const getVideosFromOneDrive = async () => {
  const accessToken = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/me/drive/root/children`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data.value.map((file) => ({
    id: file.id,
    name: file.name,
    downloadUrl: file["@microsoft.graph.downloadUrl"],
  }));
};