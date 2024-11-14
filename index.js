require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { exec } = require("child_process");

const app = express();
const port = process.env.PORT || 3000;

const secret = process.env.GIT_WEBHOOK_SECRET;

// Middleware to parse JSON payloads
app.use(express.raw({ type: "application/json" }));

// Verify the GitHub webhook signature
const verifySignature = (body, signature, secret) => {
  const hmac = crypto.createHmac("sha256", secret);

  hmac.update(body);

  const computedSignature = "sha256=" + hmac.digest("hex"); 

  const isValid = computedSignature === signature;
  if (!isValid){
    console.log("Invalid signature")
  } 
  return computedSignature === signature; 
};

// Endpoint to receive the webhook
app.post(
  "/webhook",
  (req, res) => {
    console.log("validating signature:")
    const signature = req.headers["x-hub-signature-256"];
    if(!signature) return
    const secret = process.env.GIT_WEBHOOK_SECRET
    // if (!verifySignature(req.body, signature, secret)) {
    //     res.status(401).send("Invalid signature");
    //     return;
    // }

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
