import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

// Initialize Google APIs
function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  return auth;
}

export async function POST(req) {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_DRIVE_FOLDER_ID is not set in environment variables",
      }, { status: 400 });
    }

    const results = {
      folderAccess: null,
      folderInfo: null,
      isSharedDrive: false,
      uploadTest: null,
      permissions: null,
      errors: [],
    };

    // Step 1: Check if we can access the folder
    try {
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, driveId, shared, permissions, owners",
        supportsAllDrives: true,
      });

      results.folderAccess = "✅ Success";
      results.folderInfo = {
        id: folderInfo.data.id,
        name: folderInfo.data.name,
        mimeType: folderInfo.data.mimeType,
        driveId: folderInfo.data.driveId,
        shared: folderInfo.data.shared,
      };

      results.isSharedDrive = !!folderInfo.data.driveId;

      // Check permissions
      if (folderInfo.data.permissions) {
        results.permissions = folderInfo.data.permissions.map(p => ({
          role: p.role,
          type: p.type,
          emailAddress: p.emailAddress,
        }));
      }

      // Step 2: Try to upload a test file
      const testFileName = `test_upload_${Date.now()}.txt`;
      const testContent = "This is a test file to verify Google Drive access.";
      const testBuffer = Buffer.from(testContent);

      const fileMetadata = {
        name: testFileName,
        parents: [folderId],
      };

      if (results.isSharedDrive) {
        fileMetadata.driveId = folderInfo.data.driveId;
      }

      const media = {
        mimeType: "text/plain",
        body: Readable.from(testBuffer),
      };

      try {
        const uploadResult = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id, name, webViewLink",
          supportsAllDrives: results.isSharedDrive,
        });

        results.uploadTest = {
          success: true,
          fileId: uploadResult.data.id,
          fileName: uploadResult.data.name,
          message: "✅ Test file uploaded successfully!",
        };

        // Try to delete the test file
        try {
          await drive.files.delete({
            fileId: uploadResult.data.id,
            supportsAllDrives: results.isSharedDrive,
          });
          results.uploadTest.cleanedUp = true;
        } catch (deleteError) {
          results.uploadTest.cleanedUp = false;
          results.uploadTest.cleanupError = deleteError.message;
        }
      } catch (uploadError) {
        results.uploadTest = {
          success: false,
          error: uploadError.message,
          code: uploadError.code,
          details: uploadError.response?.data,
        };
        results.errors.push(`Upload failed: ${uploadError.message}`);
      }
    } catch (error) {
      results.folderAccess = "❌ Failed";
      results.errors.push(`Folder access failed: ${error.message}`);
      results.errors.push(`Error code: ${error.code}`);
      if (error.response?.data) {
        results.errors.push(`Details: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Step 3: Check if folder is in a Shared Drive
    if (results.isSharedDrive) {
      try {
        const driveInfo = await drive.drives.get({
          driveId: results.folderInfo.driveId,
        });
        results.driveInfo = {
          name: driveInfo.data.name,
          id: driveInfo.data.id,
        };
      } catch (error) {
        results.errors.push(`Could not get drive info: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: results.uploadTest?.success || false,
      results,
      recommendations: getRecommendations(results),
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Test failed",
        details: error.response?.data || error.code,
      },
      { status: 500 }
    );
  }
}

function getRecommendations(results) {
  const recommendations = [];

  if (!results.folderAccess || results.folderAccess.includes("❌")) {
    recommendations.push({
      priority: "HIGH",
      message: "Cannot access folder. Please share the folder with the service account email: " + process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    });
  }

  if (!results.isSharedDrive && results.uploadTest && !results.uploadTest.success) {
    recommendations.push({
      priority: "HIGH",
      message: "Regular Google Drive folders don't work with service accounts. You need to use a Shared Drive (Google Workspace feature).",
      steps: [
        "1. Create a Shared Drive in Google Drive",
        "2. Add the service account (" + process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL + ") as a Manager",
        "3. Create a folder inside the Shared Drive",
        "4. Use that folder ID in GOOGLE_DRIVE_FOLDER_ID",
      ],
    });
  }

  if (results.isSharedDrive && results.uploadTest && !results.uploadTest.success) {
    recommendations.push({
      priority: "MEDIUM",
      message: "Shared Drive detected but upload failed. Check service account permissions.",
      steps: [
        "1. Verify the service account is added to the Shared Drive as Manager",
        "2. Check that the folder is inside the Shared Drive",
      ],
    });
  }

  if (results.uploadTest?.success) {
    recommendations.push({
      priority: "INFO",
      message: "✅ Everything is working! You can now upload images.",
    });
  }

  return recommendations;
}
