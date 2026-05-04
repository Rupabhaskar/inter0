import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_NAME = "ImageCache";

// Initialize Google APIs for Sheets
function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
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

// Ensure cache sheet exists with proper headers starting from A1
async function ensureCacheSheet(sheets, spreadsheetId) {
  try {
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });

    let sheetExists = false;
    for (const sheet of sheetMetadata.data.sheets) {
      if (sheet.properties.title === "ImageCache") {
        sheetExists = true;
        break;
      }
    }

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: "ImageCache" } } }],
        },
      });
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
          requestBody: { values: [expectedHeaders] },
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
  } catch (error) {
    console.error("Error ensuring cache sheet exists:", error);
    throw error;
  }
}

// Get all cached images from sheet
async function getCachedImages(sheets, spreadsheetId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "ImageCache!A2:D",
    });

    const rows = response.data.values || [];
    const cacheMap = new Map();

    rows.forEach((row) => {
      const questionId = (row[0] || "").trim();
      const optionNumber = (row[1] || "").trim();
      const imageType = (row[2] || "").trim();
      const imageUrl = (row[3] || "").trim();

      if (questionId && imageType && imageUrl) {
        const key = createCacheKey(questionId, imageType, optionNumber || null);
        // Only keep first occurrence (prevent duplicates)
        if (!cacheMap.has(key)) {
          cacheMap.set(key, imageUrl);
        }
      }
    });

    return cacheMap;
  } catch (error) {
    console.log("Cache sheet not found or empty");
    return new Map();
  }
}

// Add images to cache (batch) - starting from column A
async function addToCache(sheets, spreadsheetId, images) {
  if (images.length === 0) return;

  const rows = images.map((img) => [
    img.questionId,
    img.optionNumber !== null && img.optionNumber !== undefined ? img.optionNumber.toString() : "",
    img.imageType,
    img.imageUrl,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "ImageCache!A:D",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// POST: Check cache and store missing images
export async function POST(req) {
  try {
    const { questions } = await req.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions array required" },
        { status: 400 }
      );
    }

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Ensure cache sheet exists
    await ensureCacheSheet(sheets, spreadsheetId);

    // Get existing cached images
    const cachedImages = await getCachedImages(sheets, spreadsheetId);

    const imagesToCache = [];
    const cacheHits = [];
    const cacheMisses = [];
    const processedKeys = new Set();

    for (const q of questions) {
      if (!q.id) continue;

      // Check question image
      if (q.imageUrl && q.imageUrl.includes("cloudinary.com")) {
        const key = createCacheKey(q.id, "question", null);
        
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        const cachedUrl = cachedImages.get(key);

        if (cachedUrl) {
          // Cache HIT - image exists in sheet
          cacheHits.push({
            questionId: q.id,
            imageType: "question",
            optionNumber: null,
            cachedUrl,
            sourceUrl: q.imageUrl,
          });
        } else {
          // Cache MISS - need to store in sheet
          imagesToCache.push({
            questionId: q.id,
            optionNumber: null,
            imageType: "question",
            imageUrl: q.imageUrl.trim(),
          });
          cacheMisses.push({
            questionId: q.id,
            imageType: "question",
            optionNumber: null,
          });
        }
      }

      // Check option images
      if (q.optionImages && Array.isArray(q.optionImages)) {
        q.optionImages.forEach((imgUrl, idx) => {
          if (imgUrl && imgUrl.includes("cloudinary.com")) {
            const key = createCacheKey(q.id, "option", idx);
            
            if (processedKeys.has(key)) return;
            processedKeys.add(key);

            const cachedUrl = cachedImages.get(key);

            if (cachedUrl) {
              // Cache HIT
              cacheHits.push({
                questionId: q.id,
                imageType: "option",
                optionNumber: idx,
                cachedUrl,
                sourceUrl: imgUrl,
              });
            } else {
              // Cache MISS - store in sheet
              imagesToCache.push({
                questionId: q.id,
                optionNumber: idx,
                imageType: "option",
                imageUrl: imgUrl.trim(),
              });
              cacheMisses.push({
                questionId: q.id,
                imageType: "option",
                optionNumber: idx,
              });
            }
          }
        });
      }
    }

    // Store missing images in cache
    if (imagesToCache.length > 0) {
      await addToCache(sheets, spreadsheetId, imagesToCache);
    }

    return NextResponse.json({
      success: true,
      cacheHits: cacheHits.length,
      cacheMisses: cacheMisses.length,
      stored: imagesToCache.length,
      details: {
        hits: cacheHits,
        misses: cacheMisses,
      },
    });
  } catch (error) {
    console.error("Cache error:", error);
    return NextResponse.json(
      { error: error.message || "Cache operation failed" },
      { status: 500 }
    );
  }
}

// GET: Fetch cached images for question IDs
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const questionIds = searchParams.get("questionIds")?.split(",") || [];

    if (questionIds.length === 0) {
      return NextResponse.json(
        { error: "questionIds parameter required" },
        { status: 400 }
      );
    }

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get cached images
    const cachedImages = await getCachedImages(sheets, spreadsheetId);

    // Filter by requested question IDs
    const result = {};
    const questionIdSet = new Set(questionIds.map(id => id.trim()));

    cachedImages.forEach((url, key) => {
      const [qId, type, optNum] = key.split("|");
      if (questionIdSet.has(qId)) {
        if (!result[qId]) {
          result[qId] = { questionImage: null, optionImages: {} };
        }
        if (type === "question") {
          result[qId].questionImage = url;
        } else if (type === "option") {
          result[qId].optionImages[optNum] = url;
        }
      }
    });

    return NextResponse.json({
      success: true,
      cached: result,
    });
  } catch (error) {
    console.error("Cache fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Cache fetch failed" },
      { status: 500 }
    );
  }
}
