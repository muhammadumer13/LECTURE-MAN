    // Admin authentication gate. Password is checked locally for this frontend-only version.
    const ADMIN_PASSWORD = "1338";
    const ADMIN_SESSION = "lecturehub_admin_session";
    const loginScreen = document.getElementById("loginScreen");
    const adminApp = document.getElementById("adminApp");
    const loginForm = document.getElementById("loginForm");
    const adminPassword = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");

    function showAdmin() {
      loginScreen.style.display = "none";
      adminApp.style.display = "block";
    }
    if (sessionStorage.getItem(ADMIN_SESSION) === "true") showAdmin();

    loginForm.addEventListener("submit", function(e) {
      e.preventDefault();
      if (adminPassword.value === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_SESSION, "true");
        showAdmin();
        if (typeof renderAll === "function") renderAll();
      } else {
        loginError.textContent = "Incorrect password.";
        adminPassword.value = "";
        adminPassword.focus();
      }
    });
