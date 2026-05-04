import { NextResponse } from "next/server";
import { google } from "googleapis";

// Initialize Google APIs
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

// Write test data to Google Sheets
async function writeToSheets(data) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not set in environment variables");
  }

  console.log("Attempting to write to spreadsheet:", spreadsheetId);
  console.log("Service account email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

  // Check if "TestData" sheet exists, create if not
  try {
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log("Successfully accessed spreadsheet. Sheets:", sheetMetadata.data.sheets.map(s => s.properties.title));

    let sheetExists = false;
    let sheetId = null;

    for (const sheet of sheetMetadata.data.sheets) {
      if (sheet.properties.title === "TestData") {
        sheetExists = true;
        sheetId = sheet.properties.sheetId;
        break;
      }
    }

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "TestData",
                },
              },
            },
          ],
        },
      });
      sheetId = createResponse.data.replies[0].addSheet.properties.sheetId;

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "TestData!A1:E1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["Timestamp", "Name", "Email", "Question", "Option"]],
        },
      });
    }

    // Append the new row
    const row = [
      new Date().toISOString(),
      data.name || "",
      data.email || "",
      data.question || "",
      data.option || "",
    ];

    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "TestData!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    console.log("Data appended successfully. Updated range:", appendResponse.data.updates?.updatedRange);
    console.log("Row data:", row);

    return { success: true, message: "Data written to Google Sheets successfully!" };
  } catch (error) {
    console.error("Error writing to sheets:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });
    
    // Provide more helpful error messages
    if (error.code === 403) {
      throw new Error(
        `Permission denied. Please share the Google Sheet with the service account email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL} and give it "Editor" access.`
      );
    }
    if (error.code === 404) {
      throw new Error(
        `Sheet not found. Please verify GOOGLE_SHEET_ID in .env.local is correct. Current ID: ${spreadsheetId}`
      );
    }
    throw error;
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Received data to write:", data);

    const result = await writeToSheets(data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test error:", error);
    const errorMessage = error.message || "Failed to write to Google Sheets";
    console.error("Full error:", error);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || error.code || "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET method to read data from sheets
export async function GET(req) {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "GOOGLE_SHEET_ID is not set in environment variables" },
        { status: 500 }
      );
    }

    // Read data from TestData sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "TestData!A2:E", // Skip header row
    });
    
    console.log("Read from sheets. Rows found:", response.data.values?.length || 0);

    const rows = response.data.values || [];
    
    // Format data
    const data = rows.map((row) => ({
      timestamp: row[0] || "",
      name: row[1] || "",
      email: row[2] || "",
      question: row[3] || "",
      option: row[4] || "",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Read error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to read from Google Sheets" },
      { status: 500 }
    );
  }
}
