import React, { useEffect, useState } from "react";

const priorityMap = {
  Highest: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Lowest: 1,
};

const projectPriorityMap = {
  "Nokia Project": 3,
  "SABIC Project": 2,
  "My Test Project": 1,
};

const Dashboard = ({ email, token, jiraDomain, onLogout }) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("http://localhost:5000/jira-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token, jiraDomain }),
        });

        const data = await res.json();
        if (data.success) {
          const transformedTasks = data.issues.map((task) => ({
            ...task,
            priorityScore: priorityMap[task.priority] || 0,
            projectPriorityScore: projectPriorityMap[task.project] || 0,
          }));
          setTasks(transformedTasks);
          console.log("Tasks from backend:", transformedTasks);
        } else {
          alert("Failed to fetch tasks");
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching tasks");
      }
    };

    fetchTasks();
  }, [email, token, jiraDomain]);

  const [sortOption, setSortOption] = useState("");
  const [editingSummary, setEditingSummary] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [transitionsMap, setTransitionsMap] = useState({});

  const sortedTasks = sortOption
    ? [...tasks].sort((a, b) => {
        if (sortOption === "projectThenTask") {
          if (b.projectPriorityScore === a.projectPriorityScore) {
            return b.priorityScore - a.priorityScore;
          }
          return b.projectPriorityScore - a.projectPriorityScore;
        } else {
          return b.priorityScore - a.priorityScore;
        }
      })
    : tasks;

  const saveChanges = async (field, value, task) => {
    console.log(
      "🛠 Saving field:",
      field,
      "with value:",
      value,
      "for issue:",
      task.key
    );
    try {
      const response = await fetch("http://localhost:5000/jira-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          jiraDomain,
          issueKey: task.key,
          field,
          value,
        }),
      });

      const result = await response.json();
      console.log("Response from backend:", result);
      if (!result.success) {
        alert("Failed to update Jira");
      } else {
        console.log(`✅ ${field} updated for issue ${task.key}`);
      }
    } catch (err) {
      console.error("Error updating Jira:", err);
      alert("Backend error while updating Jira");
    }

    setEditingSummary(null);
    setEditingStatus(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <button
        onClick={onLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        {" "}
        Logout
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jira Task Dashboard</h1>

        <div className="flex justify-end mb-4">
          <label className="mr-2 font-medium">Sort by:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value=""></option>
            <option value="projectThenTask">Project → Task Priority</option>
            <option value="taskOnly">Task Priority Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTasks.map((task) => (
          <div key={task.key} className="border p-4 rounded shadow bg-white">
            <h2 className="text-lg font-semibold">{task.summary}</h2>
            <p>
              <strong>Project:</strong> {task.project}
            </p>
            <h2 className="text-lg font-semibold">
              {editingSummary === task.key ? (
                <input
                  type="text"
                  value={task.summary}
                  onChange={(e) => {
                    const updated = [...tasks];
                    const index = updated.findIndex((t) => t.key === task.key);
                    updated[index].summary = e.target.value;
                    setTasks(updated);
                  }}
                  onBlur={() => saveChanges("summary", task.summary, task)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      saveChanges("summary", task.summary, task);
                  }}
                  className="border rounded px-2 py-1 w-full"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => setEditingSummary(task.key)}
                  className="cursor-pointer"
                >
                  ✏️ {task.summary}
                </span>
              )}
            </h2>

            <p>
              <strong>Key:</strong> {task.key}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {editingStatus === task.key ? (
                <select
                  value={task.status}
                  onChange={(e) => {
                    const updated = [...tasks];
                    const index = updated.findIndex((t) => t.key === task.key);
                    updated[index].status = e.target.value;
                    setTasks(updated);
                    saveChanges("status", e.target.value, task);
                  }}
                  className="border rounded px-2 py-1"
                >
                  {transitionsMap[task.key]?.map((transition) => (
                    <option key={transition.id} value={transition.to.name}>
                      {transition.to.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={async () => {
                    setEditingStatus(task.key);
                    if (!transitionsMap[task.key]) {
                      try {
                        const response = await fetch(
                          "http://localhost:5000/jira-transitions",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email,
                              token,
                              jiraDomain,
                              issueKey: task.key,
                            }),
                          }
                        );
                        const data = await response.json();
                        if (data.success) {
                          setTransitionsMap((prev) => ({
                            ...prev,
                            [task.key]: data.transitions,
                          }));
                        }
                      } catch (err) {
                        console.error("Failed to fetch transitions:", err);
                      }
                    }
                  }}
                  className="cursor-pointer"
                >
                  📝 {task.status}
                </span>
              )}
            </p>

            <p>
              <strong>Priority:</strong> {task.priority}
            </p>
            <p>
              <strong>Sprint:</strong> {task.sprint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
