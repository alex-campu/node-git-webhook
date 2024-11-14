require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { exec } = require("child_process");

const app = express();
const port = process.env.PORT || 3000;

const secret = process.env.GIT_WEBHOOK_SECRET;

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Verify the GitHub webhook signature
function verifySignature(req, res, buf) {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(buf)
    .digest("hex")}`;

  if (req.headers["x-hub-signature-256"] !== signature) {
    res.status(401).send("Signature mismatch");
    return false;
  }
  return true;
}

// Endpoint to receive the webhook
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res) => {
    console.log("validating signature:")
    if (!verifySignature(req, res, req.body)) return;

    console.log("authenticated");

    res.status(200).send("Webhook received");

    const createStatusFile = `echo "{\"lastCommit\": \"$(git log -1 --pretty=%B | sed 's/"/\\\\"/g')\"}" > status.json`;
    exec(
      `cd ${process.env.PROJECT_DIR} ; git pull ; ${createStatusFile} ; sudo systemctl restart nginx`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      }
    );
  }
);

app.get("/test", (req, res) => {
  console.log(`Request received from IP: ${req.ip}`);
  res.json({ status: "ok" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
