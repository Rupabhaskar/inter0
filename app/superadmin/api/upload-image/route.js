import { NextResponse } from "next/server";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

// Super Admin uses a separate Google Sheet for ImageCache
// Set GOOGLE_SHEET_ID_SUPERADMIN in .env.local (e.g. from your shared sheet)
const SUPERADMIN_SHEET_ID =
  process.env.GOOGLE_SHEET_ID_SUPERADMIN ||
  "1nakqXqLhqfrCDCGH2jcW5bqAEu6lXmLMre80T03QTTI";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

async function uploadToCloudinary(fileBuffer, fileName, questionId, optionNumber, imageType) {
  return new Promise((resolve, reject) => {
    const folderPath = `question-images/${questionId}`;
    const publicId = `${folderPath}/${imageType}${optionNumber !== null ? `_option${optionNumber}` : ""}_${Date.now()}`;

    const uploadOptions = {
      folder: folderPath,
      public_id: publicId,
      resource_type: "image",
      overwrite: false,
    };

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            assetId: result.asset_id,
          });
      })
      .end(fileBuffer);
  });
}

async function deleteFromCloudinary(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

function createCacheKey(questionId, imageType, optionNumber) {
  const qId = (questionId || "").toString().trim();
  const type = (imageType || "").toString().trim();
  const optNum =
    optionNumber !== null && optionNumber !== undefined && optionNumber !== ""
      ? optionNumber.toString().trim()
      : "";
  return `${qId}|${type}|${optNum}`;
}

async function ensureCacheSheet(sheets, spreadsheetId) {
  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });

  let sheetExists = false;
  let sheetId = null;

  for (const sheet of sheetMetadata.data.sheets) {
    if (sheet.properties.title === "ImageCache") {
      sheetExists = true;
      sheetId = sheet.properties.sheetId;
      break;
    }
  }

  if (!sheetExists) {
    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "ImageCache" } } }],
      },
    });
    sheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
  }

  try {
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A1:D1",
    });

    const headers = headerCheck.data.values?.[0] || [];
    const expectedHeaders = ["Question ID", "Option Number", "Image Type", "Image URL"];

    if (headers.length !== 4 || headers[0] !== expectedHeaders[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "ImageCache!A1:D1",
        valueInputOption: "RAW",
        requestBody: { values: [expectedHeaders] },
      });
    }
  } catch {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "ImageCache!A1:D1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["Question ID", "Option Number", "Image Type", "Image URL"]],
      },
    });
  }

  return sheetId;
}

async function checkExistsInCache(sheets, spreadsheetId, questionId, imageType, optionNumber) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A2:D",
    });

    const rows = response.data.values || [];
    const targetKey = createCacheKey(questionId, imageType, optionNumber);

    for (const row of rows) {
      const rowKey = createCacheKey(row[0], row[2], row[1] || null);
      if (rowKey === targetKey) {
        return { exists: true, url: row[3], rowIndex: rows.indexOf(row) + 2 };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function storeInSheets(questionId, optionNumber, imageUrl, imageType) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = SUPERADMIN_SHEET_ID;

  try {
    await ensureCacheSheet(sheets, spreadsheetId);

    const existing = await checkExistsInCache(
      sheets,
      spreadsheetId,
      questionId,
      imageType,
      optionNumber
    );

    if (existing.exists) {
      if (existing.url !== imageUrl) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `ImageCache!A${existing.rowIndex}:D${existing.rowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                questionId,
                optionNumber !== null ? optionNumber.toString() : "",
                imageType,
                imageUrl,
              ],
            ],
          },
        });
      }
      return;
    }

    const row = [
      questionId,
      optionNumber !== null ? optionNumber.toString() : "",
      imageType,
      imageUrl,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "ImageCache!A:D",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (error) {
    console.error("Error storing in sheets (superadmin):", error);
    throw error;
  }
}

async function deleteFromSheets(questionId, optionNumber, imageType) {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = SUPERADMIN_SHEET_ID;

    const targetKey = createCacheKey(questionId, imageType, optionNumber);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A2:D",
    });

    const rows = response.data.values || [];
    const rowIndexesToDelete = [];

    rows.forEach((row, index) => {
      const rowKey = createCacheKey(row[0], row[2], row[1] || null);
      if (rowKey === targetKey) rowIndexesToDelete.push(index + 2);
    });

    if (rowIndexesToDelete.length > 0) {
      const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
      const cacheSheet = sheetMetadata.data.sheets.find(
        (s) => s.properties.title === "ImageCache"
      );

      if (cacheSheet) {
        const sheetId = cacheSheet.properties.sheetId;
        const requests = rowIndexesToDelete
          .sort((a, b) => b - a)
          .map((rowIndex) => ({
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          }));

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests },
        });
      }
    }
  } catch (error) {
    console.error("Error deleting from sheets (superadmin):", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const questionId = formData.get("questionId");
    const optionNumber = formData.get("optionNumber");
    const imageType = formData.get("imageType");
    const action = formData.get("action");

    if (action === "delete") {
      let publicId = formData.get("publicId");
      const imageUrl = formData.get("imageUrl");

      if (!publicId && imageUrl) {
        const urlMatch = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (urlMatch) publicId = urlMatch[1];
      }

      const deletePromises = [];

      if (publicId) {
        deletePromises.push(
          deleteFromCloudinary(publicId).catch((err) =>
            console.error("Error deleting from Cloudinary:", err)
          )
        );
      }

      if (questionId) {
        deletePromises.push(
          deleteFromSheets(
            questionId,
            optionNumber ? parseInt(optionNumber) : null,
            imageType
          ).catch((err) => console.error("Error deleting from Sheets:", err))
        );
      }

      await Promise.all(deletePromises);
      return NextResponse.json({ success: true });
    }

    if (!file || !questionId || !imageType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToCloudinary(
      buffer,
      file.name,
      questionId,
      optionNumber ? parseInt(optionNumber) : null,
      imageType
    );

    storeInSheets(
      questionId,
      optionNumber ? parseInt(optionNumber) : null,
      uploadResult.url,
      imageType
    ).catch((err) => console.error("Background sheets store error (superadmin):", err));

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      assetId: uploadResult.assetId,
    });
  } catch (error) {
    console.error("Upload error (superadmin):", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
