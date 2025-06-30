const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, token, jiraDomain, issueKey, field, value } = req.body;
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  try {
    if (field === "status") {
      // 🔁 1. Get all transitions
      const transitionsRes = await axios.get(
        `https://${jiraDomain}/rest/api/3/issue/${issueKey}/transitions`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
        }
      );

      const transitions = transitionsRes.data.transitions;

      // 🔍 2. Find the right transition
      const matchingTransition = transitions.find(
        (t) => t.to.name.toLowerCase() === value.toLowerCase()
      );

      if (!matchingTransition) {
        return res.status(400).json({
          success: false,
          message: `No transition found for status '${value}'`,
        });
      }

      // ✅ 3. Perform the transition
      await axios.post(
        `https://${jiraDomain}/rest/api/3/issue/${issueKey}/transitions`,
        {
          transition: { id: matchingTransition.id },
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({ success: true, message: "Status updated" });
    }

    // ✏️ For other fields like summary
    const payload = {
      fields: {
        [field]: value,
      },
    };

    await axios.put(
      `https://${jiraDomain}/rest/api/3/issue/${issueKey}`,
      payload,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true, message: `${field} updated successfully` });
  } catch (err) {
    console.error("🔥 Jira Update Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
