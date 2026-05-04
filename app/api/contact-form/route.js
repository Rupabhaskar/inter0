export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebaseAdmin";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizePayload(body) {
  return {
    type: String(body?.type || "student").trim().toLowerCase() === "college" ? "college" : "student",
    name: String(body?.name || "").trim(),
    email: String(body?.email || "").trim().toLowerCase(),
    phone: String(body?.phone || "").trim(),
    collegeName: String(body?.collegeName || "").trim(),
    courseOrClass: String(body?.courseOrClass || "").trim(),
    message: String(body?.message || "").trim(),
  };
}

function validate(payload) {
  const errors = {};
  const phoneDigits = payload.phone.replace(/\D/g, "");

  if (!payload.name) errors.name = "Name is required";
  if (!isValidEmail(payload.email)) errors.email = "Valid email is required";
  if (phoneDigits.length < 10) errors.phone = "Valid phone number is required";
  if (!payload.message) errors.message = "Message is required";
  if (payload.type === "college" && !payload.collegeName) errors.collegeName = "College name is required";
  if (payload.type === "student" && !payload.courseOrClass) errors.courseOrClass = "Class/Course is required";

  return errors;
}

function buildThankYouHtml(payload) {
  const typeLabel = payload.type === "college" ? "College" : "Student";
  const extraLabel = payload.type === "college" ? "College Name" : "Class / Course";
  const extraValue = payload.type === "college" ? payload.collegeName : payload.courseOrClass;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Thank you for contacting RankSprint</h2>
      <p>We have received your contact form submission successfully.</p>
      <p>Our team will respond within <strong>24 hours</strong>.</p>
      <h3 style="margin-top: 20px; margin-bottom: 8px;">Your submitted details</h3>
      <ul style="padding-left: 18px;">
        <li><strong>Type:</strong> ${typeLabel}</li>
        <li><strong>Name:</strong> ${payload.name}</li>
        <li><strong>Email:</strong> ${payload.email}</li>
        <li><strong>Phone:</strong> ${payload.phone}</li>
        <li><strong>${extraLabel}:</strong> ${extraValue || "-"}</li>
        <li><strong>Message:</strong> ${payload.message}</li>
      </ul>
      <p style="margin-top: 18px;">Regards,<br/>RankSprint Team</p>
    </div>
  `;
}

function buildAdminHtml(payload) {
  const typeLabel = payload.type === "college" ? "College" : "Student";
  const extraLabel = payload.type === "college" ? "College Name" : "Class / Course";
  const extraValue = payload.type === "college" ? payload.collegeName : payload.courseOrClass;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>New Contact Form Submission</h2>
      <ul style="padding-left: 18px;">
        <li><strong>Type:</strong> ${typeLabel}</li>
        <li><strong>Name:</strong> ${payload.name}</li>
        <li><strong>Email:</strong> ${payload.email}</li>
        <li><strong>Phone:</strong> ${payload.phone}</li>
        <li><strong>${extraLabel}:</strong> ${extraValue || "-"}</li>
        <li><strong>Message:</strong> ${payload.message}</li>
      </ul>
    </div>
  `;
}

function getTransportConfig() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS || "";
  const configuredHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST || "";
  const host = configuredHost || (user.endsWith("@gmail.com") ? "smtp.gmail.com" : "");
  const configuredPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT || "";
  const port = Number(configuredPort || (host === "smtp.gmail.com" ? 587 : 587));
  const secureRaw = process.env.SMTP_SECURE || process.env.EMAIL_SECURE || process.env.MAIL_SECURE || "";
  const secure = secureRaw
    ? String(secureRaw).toLowerCase() === "true"
    : port === 465;
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.MAIL_FROM ||
    user;
  const adminTo =
    process.env.CONTACT_ADMIN_TO ||
    process.env.ADMIN_EMAIL ||
    user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
    adminTo,
  };
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { stringValue: String(value) };
}

function toFirestoreFields(payload) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

async function saveContactFallback(payload) {
  const projectId = process.env.FIREBASE_PROJECT_ID || "interjee-mains";
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_WEB_API_KEY ||
    "AIzaSyAqRJ2G5kMLiii1tzoZNE_BDinm_YPz1_Q";

  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/contactForms?key=${apiKey}`;
  const body = {
    fields: toFirestoreFields({
      ...payload,
      createdAtIso: new Date().toISOString(),
    }),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Fallback Firestore write failed: ${response.status} ${errorBody}`);
  }
}

function shouldUseAdminFirestore() {
  return String(process.env.CONTACT_USE_ADMIN_FIRESTORE || "false").toLowerCase() === "true";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = normalizePayload(body);
    const errors = validate(payload);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    // Save every valid submission in Firestore.
    const firestoreDoc = {
      ...payload,
      status: "new",
      source: "blog-navbar-contact-form",
      createdAt: new Date(),
    };

    try {
      if (shouldUseAdminFirestore()) {
        await adminDb.collection("contactForms").add(firestoreDoc);
      } else {
        await saveContactFallback({
          ...payload,
          status: "new",
          source: "blog-navbar-contact-form",
        });
      }
    } catch (adminWriteError) {
      console.warn("Primary Firestore save failed. Trying fallback save path.", adminWriteError);
      await saveContactFallback({
        ...payload,
        status: "new",
        source: "blog-navbar-contact-form",
      });
    }

    const transportConfig = getTransportConfig();
    if (!transportConfig) {
      return NextResponse.json(
        {
          success: true,
          mailSent: false,
          message:
            "Form saved in Firestore, but SMTP is not configured. Add SMTP_USER and SMTP_PASS (plus host/port if not Gmail).",
        },
        { status: 200 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      auth: transportConfig.auth,
    });

    await Promise.all([
      transporter.sendMail({
        from: transportConfig.from,
        to: payload.email,
        subject: "Thank you for contacting RankSprint",
        html: buildThankYouHtml(payload),
      }),
      transporter.sendMail({
        from: transportConfig.from,
        to: transportConfig.adminTo,
        subject: `New Contact Form Submission - ${payload.type === "college" ? "College" : "Student"}`,
        html: buildAdminHtml(payload),
      }),
    ]);

    return NextResponse.json({ success: true, mailSent: true }, { status: 200 });
  } catch (error) {
    console.error("Contact form submit error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit contact form" },
      { status: 500 }
    );
  }
}
