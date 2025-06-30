const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const jiraUpdate = require("./routes/jiraUpdate");
app.use("/jira-update", jiraUpdate);

app.get("/", (req, res) => {
  res.send("Jira Backend is running!");
});

app.post("/jira-auth", async (req, res) => {
  const { email, token, jiraDomain } = req.body;

  try {
    const response = await axios.get(
      `https://${jiraDomain}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
            "base64"
          )}`,
          Accept: "application/json",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Jira authentication failed",
      error: err.message,
    });
  }
});

app.post("/jira-tasks", async (req, res) => {
  const { email, token, jiraDomain } = req.body;

  const encoded = Buffer.from(`${email}:${token}`).toString("base64");
  const apiURL = `https://${jiraDomain}/rest/api/3/search?jql=assignee=currentUser()`;

  try {
    const response = await axios.get(apiURL, {
      headers: {
        Authorization: `Basic ${encoded}`,
        Accept: "application/json",
      },
    });

    /*console.log(
      "📦 Jira Issues Fetched is as follows:",
      response.data.issues.length
    );
    console.log(JSON.stringify(response.data.issues.slice(0, 2), null, 2));
    */

    const issues = response.data.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name || "Medium",
      project: issue.fields.project.name,
      sprint: issue.fields.customfield_10020?.[0]?.name || "Backlog",
    }));

    res.json({ success: true, issues });
  } catch (err) {
    console.error("Jira Task Fetch Failed:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/jira-transitions", async (req, res) => {
  const { email, token, jiraDomain, issueKey } = req.body;
  console.log("Update request received:", req.body);
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  try {
    const response = await axios.get(
      `https://${jiraDomain}/rest/api/3/issue/${issueKey}/transitions`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );

    res.json({ success: true, transitions: response.data.transitions });
  } catch (err) {
    console.error(
      "Failed to fetch transitions:",
      err.response?.data || err.message
    );
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
