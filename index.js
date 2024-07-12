import "dotenv/config";
import express from "express";
import https from "https";
import cors from "cors"; // npm i --save-dev @types/cors
import { AccessToken, WebhookReceiver } from "livekit-server-sdk";

const SERVER_PORT = process.env.SERVER_PORT || 6080;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/webhook+json" }));

// Sessions
const sessions = {};

// AWS Health Check response
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/token", async (req, res) => {
  const roomName = req.body.roomName;
  const participantName = req.body.participantName;
  const isSeller = req.body.isSeller;

  if (!roomName || !participantName) {
    res
      .status(400)
      .json({ errorMessage: "roomName and participantName are required" });
    return;
  }

  // Generate a unique session number
  let sessionNumber = sessions[roomName] ? sessions[roomName] + 1 : 1;
  sessions[roomName] = sessionNumber;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
  });
  // at.metadata = { isSeller: isSeller, sessionNumber: sessionNumber };

  // at.addGrant({ roomJoin: true, room: roomName });
  // isSeller 여부에 따라 권한 부여
  if (isSeller) {
    at.addGrant({ roomCreate: true, roomJoin: true, room: roomName });
  } else {
    at.addGrant({ roomJoin: true, room: roomName });
  }

  const token = await at.toJwt();

  console.log(
    "Generated token:",
    token + " for room: " + roomName + " and participant: " + participantName
  );

  res.json({ token });
});

const webhookReceiver = new WebhookReceiver(
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

app.post("/webhook", async (req, res) => {
  try {
    const event = await webhookReceiver.receive(
      req.body,
      req.get("Authorization")
    );
    console.log("Received webhook event", event);

    if (event.event === "participant_joined") {
    } else if (event.event === "participant_left") {
    }

    res.status(200).send();
  } catch (error) {
    console.error("Error validating webhook event", error);
  }
});

app.listen(SERVER_PORT, () => {
  console.log("Server started on port:", SERVER_PORT);
});
