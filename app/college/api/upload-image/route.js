import { NextResponse } from "next/server";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Google APIs for Sheets
function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return auth;
}

// Upload image to Cloudinary
async function uploadToCloudinary(fileBuffer, fileName, questionId, optionNumber, imageType) {
  return new Promise((resolve, reject) => {
    // Create a unique folder path
    const folderPath = `question-images/${questionId}`;
    const publicId = `${folderPath}/${imageType}${optionNumber !== null ? `_option${optionNumber}` : ''}_${Date.now()}`;

    const uploadOptions = {
      folder: folderPath,
      public_id: publicId,
      resource_type: "image",
      overwrite: false,
    };

    // Upload to Cloudinary
    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            assetId: result.asset_id,
          });
        }
      }
    ).end(fileBuffer);
  });
}

// Delete image from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

// Create unique cache key
function createCacheKey(questionId, imageType, optionNumber) {
  const qId = (questionId || "").toString().trim();
  const type = (imageType || "").toString().trim();
  const optNum = optionNumber !== null && optionNumber !== undefined && optionNumber !== ""
    ? optionNumber.toString().trim()
    : "";
  return `${qId}|${type}|${optNum}`;
}

// Ensure ImageCache sheet exists with proper headers starting from A1
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
    // Create new sheet
    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "ImageCache" } } }],
      },
    });
    sheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
  }

  // Check if headers exist in A1
  try {
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A1:D1",
    });
    
    const headers = headerCheck.data.values?.[0] || [];
    const expectedHeaders = ["Question ID", "Option Number", "Image Type", "Image URL"];
    
    // If headers don't match, set them
    if (headers.length !== 4 || headers[0] !== expectedHeaders[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "ImageCache!A1:D1",
        valueInputOption: "RAW",
        requestBody: {
          values: [expectedHeaders],
        },
      });
    }
  } catch {
    // Headers don't exist, create them
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

// Check if image already exists in cache
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

// Store image URL in Google Sheets (ImageCache) - starting from column A
async function storeInSheets(questionId, optionNumber, imageUrl, imageType) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    await ensureCacheSheet(sheets, spreadsheetId);

    // Check if already exists
    const existing = await checkExistsInCache(sheets, spreadsheetId, questionId, imageType, optionNumber);
    
    if (existing.exists) {
      // Update existing row if URL is different
      if (existing.url !== imageUrl) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `ImageCache!A${existing.rowIndex}:D${existing.rowIndex}`,
          valueInputOption: "RAW",
          requestBody: { 
            values: [[
              questionId,
              optionNumber !== null ? optionNumber.toString() : "",
              imageType,
              imageUrl,
            ]] 
          },
        });
      }
      return; // Already exists, don't add duplicate
    }

    // Add new row - explicitly specify columns A:D
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
    console.error("Error storing in sheets:", error);
    throw error;
  }
}

// Delete from Google Sheets (ImageCache)
async function deleteFromSheets(questionId, optionNumber, imageType) {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const targetKey = createCacheKey(questionId, imageType, optionNumber);

    // Get all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A2:D",
    });

    const rows = response.data.values || [];
    const rowIndexesToDelete = [];

    rows.forEach((row, index) => {
      const rowKey = createCacheKey(row[0], row[2], row[1] || null);
      if (rowKey === targetKey) {
        rowIndexesToDelete.push(index + 2);
      }
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
                sheetId: sheetId,
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
    console.error("Error deleting from sheets:", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const questionId = formData.get("questionId");
    const optionNumber = formData.get("optionNumber");
    const imageType = formData.get("imageType"); // "question" or "option"
    const action = formData.get("action"); // "upload" or "delete"

    if (action === "delete") {
      let publicId = formData.get("publicId");
      const imageUrl = formData.get("imageUrl");

      // If publicId not provided, try to extract from Cloudinary URL
      if (!publicId && imageUrl) {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{ext}
        const urlMatch = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (urlMatch) {
          publicId = urlMatch[1];
        }
      }

      // Delete from Cloudinary and Sheets in parallel
      const deletePromises = [];
      
      if (publicId) {
        deletePromises.push(
          deleteFromCloudinary(publicId)
            .catch(err => console.error("Error deleting from Cloudinary:", err))
        );
      }
      
      if (questionId) {
        deletePromises.push(
          deleteFromSheets(
            questionId,
            optionNumber ? parseInt(optionNumber) : null,
            imageType
          ).catch(err => console.error("Error deleting from Sheets:", err))
        );
      }

      await Promise.all(deletePromises);
      return NextResponse.json({ success: true });
    }

    // Upload action
    if (!file || !questionId || !imageType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      buffer,
      file.name,
      questionId,
      optionNumber ? parseInt(optionNumber) : null,
      imageType
    );

    // Store in Google Sheets in background (don't wait)
    storeInSheets(
      questionId,
      optionNumber ? parseInt(optionNumber) : null,
      uploadResult.url,
      imageType
    ).catch(err => console.error("Background sheets store error:", err));

    // Return immediately after Cloudinary upload
    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      assetId: uploadResult.assetId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
