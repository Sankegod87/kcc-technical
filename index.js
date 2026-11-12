const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const client = twilio(accountSid, authToken);

// Matches DB_DOC in your app: "stage-light-tracker/main"
const DB_DOC_PATH = "stage-light-tracker/main";

// Same key format as schedKey() in your app: YYYY-MM-DD, local date
function schedKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Converts a stored number like "403-555-0123" into E.164 format "+14035550123"
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

// Shared logic: find upcoming Sunday's schedule and text the assigned crew.
// Returns a summary object so both the scheduled job and the manual button
// can report back how many texts went out.
async function sendUpcomingScheduleSMS() {
  const db = admin.firestore();
  const docRef = db.doc(DB_DOC_PATH);
  const snap = await docRef.get();

  if (!snap.exists) {
    return { sent: 0, skipped: 0, message: "No data document found." };
  }

  const raw = snap.data();
  const appData = JSON.parse(raw.payload);

  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
  const key = schedKey(sunday);

  const entry = appData.schedules ? appData.schedules[key] : null;

  if (!entry || !entry.crew || !entry.crew.length) {
    return { sent: 0, skipped: 0, message: "No crew scheduled for " + key + "." };
  }

  const dateStr = sunday.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let sent = 0;
  let skipped = 0;

  const sendPromises = entry.crew.map(async (techId) => {
    const tech = (appData.technicians || []).find((x) => x.id === techId);
    if (!tech || !tech.phone) {
      skipped++;
      return;
    }

    const roleForDay = (entry.roles && entry.roles[techId]) || tech.role || "Crew";
    const phone = normalizePhone(tech.phone);
    const message = `Hi ${tech.name}, you're scheduled for ${dateStr} as ${roleForDay}. See you then!`;

    try {
      const result = await client.messages.create({ body: message, from: twilioNumber, to: phone });
      console.log(`SMS sent to ${tech.name} (${phone}): ${result.sid}`);
      sent++;
    } catch (err) {
      console.error(`Failed to text ${tech.name} (${phone}):`, err.message);
      skipped++;
    }
  });

  await Promise.all(sendPromises);
  return { sent, skipped, message: `Sent to ${sent} crew member(s) for ${dateStr}.` };
}

// Scheduled version: runs every Thursday 9am, same cadence as your email auto-send.
exports.weeklyScheduleSMS = functions.pubsub
  .schedule("0 9 * * 4")
  .timeZone("America/Edmonton")
  .onRun(async () => {
    const result = await sendUpcomingScheduleSMS();
    console.log(result.message);
    return null;
  });

// Callable version: triggered by the "Send SMS" button in your app.
// Mirrors manualSendScheduleEmail() but runs server-side so Twilio creds stay hidden.
exports.manualSendScheduleSMS = functions.https.onCall(async (data, context) => {
  // Optional: restrict to signed-in/admin users if you wire up Firebase Auth.
  // if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");

  const result = await sendUpcomingScheduleSMS();
  return result;
});
