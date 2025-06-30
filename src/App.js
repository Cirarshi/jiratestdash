import "./App.css";
import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jiraCreds, setJiraCreds] = useState({
    email: "",
    token: "",
    jiraDomain: "",
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("jiraEmail");
    const savedToken = localStorage.getItem("jiraToken");
    const savedDomain = localStorage.getItem("jiraDomain");
    const savedLoginTime = localStorage.getItem("jiraLoginTime");

    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour for timeout

    if (
      savedEmail &&
      savedToken &&
      savedDomain &&
      savedLoginTime &&
      now - parseInt(savedLoginTime) < maxAge
    ) {
      setIsLoggedIn(true);
      setJiraCreds({
        email: savedEmail,
        token: savedToken,
        jiraDomain: savedDomain,
      });
    } else {
      localStorage.removeItem("jiraEmail");
      localStorage.removeItem("jiraToken");
      localStorage.removeItem("jiraDomain");
      localStorage.removeItem("jiraLoginTime");
    }
  }, []);

  const handleLogin = async (email, password, token, jiraDomain) => {
    const { default: users } = await import("./data/users.json");
    localStorage.setItem("jiraLoginTime", Date.now());
    const matchedUser = users.find(
      (user) => user.email === email && user.password === password
    );

    if (!matchedUser) {
      return alert("Local user validation failed");
    }

    try {
      const response = await fetch("http://localhost:5000/jira-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, jiraDomain }),
      });

      const result = await response.json();

      if (result.success) {
        //console.log("Jira Auth Success:", result.data);
        localStorage.setItem("jiraEmail", email);
        localStorage.setItem("jiraToken", token);
        localStorage.setItem("jiraDomain", jiraDomain);

        setIsLoggedIn(true);
        setJiraCreds({ email, token, jiraDomain });
      } else {
        alert("Jira authentication failed");
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jiraEmail");
    localStorage.removeItem("jiraToken");
    localStorage.removeItem("jiraDomain");

    setIsLoggedIn(false);
    setJiraCreds({ email: "", token: "", jiraDomain: "" });
  };

  return (
    <>
      {isLoggedIn ? (
        <Dashboard
          email={jiraCreds.email}
          token={jiraCreds.token}
          jiraDomain={jiraCreds.jiraDomain}
          onLogout={handleLogout}
        />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
