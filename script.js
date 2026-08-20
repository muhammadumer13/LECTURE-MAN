const SUPABASE_URL = "https://vujdddbwrsrhbonvzhxk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_i7Mgxy5g7wj5hRBexwymIA_uVlKaBZR";

// Create Supabase client with a unique variable name
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const FILE_BUCKET = "course-files";

let data = {
  courseTitle: "My Course Lectures",
  lectures: [],
  assignments: []
};

let loading = false;

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function weeks() {
  return Array.from({ length: 15 }, (_, i) => i + 1);
}

function openView(id) {
  document.querySelectorAll(".view").forEach(x =>
    x.classList.remove("active")
  );

  const view = document.getElementById(id);
  if (view) view.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(x =>
    x.classList.toggle("active", x.dataset.view === id)
  );
}

document.querySelectorAll(".nav-btn").forEach(b => {
  b.onclick = () => openView(b.dataset.view);
});

function fillWeeks() {
  const weekElement = document.getElementById("lectureWeek");

  if (!weekElement) return;

  weekElement.innerHTML = weeks()
    .map(w =>
      `<option value="${w}">Week ${String(w).padStart(2, "0")}</option>`
    )
    .join("");
}


// ======================================================
// LOAD DATA
// ======================================================

async function loadData() {
  loading = true;

  try {
    const [
      { data: lectures, error: le },
      { data: assignments, error: ae }
    ] = await Promise.all([
      supabaseClient
        .from("lectures")
        .select("*")
        .order("week", { ascending: true })
        .order("created_at", { ascending: true }),

      supabaseClient
        .from("assignments")
        .select("*")
        .order("no", { ascending: true })
    ]);

    if (le) throw le;
    if (ae) throw ae;

    data.lectures = lectures || [];
    data.assignments = assignments || [];

    renderAll();

  } catch (err) {
    console.error("Database load error:", err);
    toast(
      "Database error: " +
      (err.message || "Unable to load data")
    );
  } finally {
    loading = false;
  }
}


// ======================================================
// SUPABASE AUTHENTICATION
// ======================================================

async function initAuth() {

  const loginScreen = document.getElementById("loginScreen");
  const adminApp = document.getElementById("adminApp");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  // student.html does not have admin login
  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
      document.getElementById("adminEmail").value.trim();

    const password =
      document.getElementById("adminPassword").value;

    const btn =
      loginForm.querySelector("button[type='submit']") ||
      loginForm.querySelector("button.login-btn");

    loginError.textContent = "";

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Signing in...";
    }

    try {

      const {
        data: authData,
        error
      } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!authData.session) {
        throw new Error(
          "Login succeeded but no session was created."
        );
      }

      loginScreen.style.display = "none";
      adminApp.style.display = "block";

      await loadData();

    } catch (err) {

      console.error("Login error:", err);

      loginError.textContent =
        err.message || "Unable to login.";

    } finally {

      if (btn) {
        btn.disabled = false;
        btn.textContent = "Login";
      }
    }
  });


  // ====================================================
  // CHECK EXISTING SESSION
  // ====================================================

  try {

    const {
      data: sessionData,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    const session = sessionData?.session;

    if (session) {

      loginScreen.style.display = "none";
      adminApp.style.display = "block";

      await loadData();

    } else {

      loginScreen.style.display = "flex";
      adminApp.style.display = "none";
    }

  } catch (err) {

    console.error("Session check error:", err);

    loginScreen.style.display = "flex";
    adminApp.style.display = "none";
  }


  // ====================================================
  // AUTH STATE CHANGE
  // ====================================================

  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {

      if (session) {

        loginScreen.style.display = "none";
        adminApp.style.display = "block";

      } else {

        loginScreen.style.display = "flex";
        adminApp.style.display = "none";
      }
    }
  );
}


// ======================================================
// REQUIRE LOGIN SESSION
// ======================================================

async function requireSession() {

  try {

    const {
      data: sessionData,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      toast("Authentication error");
      return false;
    }

    if (!sessionData?.session) {
      toast("Please login first");
      return false;
    }

    return true;

  } catch (err) {

    console.error("requireSession error:", err);
    toast("Please login again");
    return false;
  }
}


// ======================================================
// FILE URL
// ======================================================

function fileUrl(path) {

  if (!path) return "";

  const {
    data: publicData
  } = supabaseClient.storage
    .from(FILE_BUCKET)
    .getPublicUrl(path);

  return publicData?.publicUrl || "";
}


// ======================================================
// UPLOAD FILE
// ======================================================

async function uploadFile(file, folder) {

  if (!file) return null;

  const ext =
    (file.name.split(".").pop() || "bin").toLowerCase();

  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const path =
    `${folder}/${crypto.randomUUID()}-${safeName}`;

  const {
    data: uploaded,
    error
  } = await supabaseClient.storage
    .from(FILE_BUCKET)
    .upload(path, file, {
      contentType:
        file.type || "application/octet-stream",
      upsert: false
    });

  if (error) {
    throw error;
  }

  return {
    path: uploaded.path,
    name: file.name,
    type: file.type || `application/${ext}`
  };
}


// ======================================================
// REMOVE FILE
// ======================================================

async function removeFile(path) {

  if (!path) return;

  const {
    error
  } = await supabaseClient.storage
    .from(FILE_BUCKET)
    .remove([path]);

  if (error) {
    console.warn(
      "Could not remove old file",
      error
    );
  }
}


// ======================================================
// LECTURE MODAL
// ======================================================

function openLectureModal(id = null) {

  fillWeeks();

  lectureForm.reset();

  lectureId.value = "";

  lectureModalTitle.textContent =
    id ? "Edit Lecture" : "Add Lecture";

  if (id) {

    const x =
      data.lectures.find(a => a.id === id);

    if (!x) return;

    lectureId.value = x.id;
    lectureWeek.value = x.week;
    lectureTitle.value = x.title;
    lectureDescription.value =
      x.description || "";

    lectureFileInfo.textContent =
      x.file_name
        ? "Current file: " + x.file_name
        : "No file uploaded";

    lecturePublished.checked =
      !!x.published;

  } else {

    lectureFileInfo.textContent =
      "Optional · PDF, PPT, DOC, ZIP and common document/image files";
  }

  document
    .getElementById("lectureModal")
    .classList.add("open");
}


// ======================================================
// ASSIGNMENT MODAL
// ======================================================

function openAssignmentModal(id = null) {

  assignmentForm.reset();

  assignmentId.value = "";

  assignmentModalTitle.textContent =
    id ? "Edit Assignment" : "Add Assignment";

  if (id) {

    const x =
      data.assignments.find(a => a.id === id);

    if (!x) return;

    assignmentId.value = x.id;
    assignmentNo.value = x.no;
    assignmentTitle.value = x.title;
    assignmentDue.value = x.due || "";
    assignmentDescription.value =
      x.description || "";

    assignmentFileInfo.textContent =
      x.file_name
        ? "Current file: " + x.file_name
        : "No file uploaded";

    assignmentPublished.checked =
      !!x.published;

  } else {

    assignmentFileInfo.textContent =
      "Optional · Assignment document or ZIP";
  }

  assignmentModal.classList.add("open");
}


function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.remove("open");
  }
}


// ======================================================
// SAVE LECTURE
// ======================================================

lectureForm.onsubmit = async e => {

  e.preventDefault();

  if (!(await requireSession())) {
    return;
  }

  const button = e.submitter;

  button.disabled = true;

  try {

    const id = lectureId.value;

    const existing =
      id
        ? data.lectures.find(x => x.id === id)
        : null;

    const file =
      lectureFile.files[0];

    let file_path =
      existing?.file_path || null;

    let file_name =
      existing?.file_name || null;

    let file_type =
      existing?.file_type || null;


    if (file) {

      if (file.size > 50 * 1024 * 1024) {

        toast(
          "Lecture file must be 50 MB or smaller"
        );

        return;
      }

      const uploaded =
        await uploadFile(
          file,
          `lectures/week-${String(
            +lectureWeek.value
          ).padStart(2, "0")}`
        );

      file_path = uploaded.path;
      file_name = uploaded.name;
      file_type = uploaded.type;
    }


    const obj = {

      week: +lectureWeek.value,

      title:
        lectureTitle.value.trim(),

      description:
        lectureDescription.value.trim(),

      file_path,

      file_name,

      file_type,

      published:
        lecturePublished.checked
    };


    let result;

    if (id) {

      result =
        await supabaseClient
          .from("lectures")
          .update(obj)
          .eq("id", id)
          .select()
          .single();

    } else {

      result =
        await supabaseClient
          .from("lectures")
          .insert(obj)
          .select()
          .single();
    }


    if (result.error) {
      throw result.error;
    }


    if (
      file &&
      existing?.file_path &&
      existing.file_path !== file_path
    ) {

      await removeFile(
        existing.file_path
      );
    }


    closeModal("lectureModal");

    toast("Lecture saved to Supabase");

    await loadData();

  } catch (err) {

    console.error(err);

    toast(
      err.message ||
      "Unable to save lecture"
    );

  } finally {

    button.disabled = false;
  }
};


// ======================================================
// SAVE ASSIGNMENT
// ======================================================

assignmentForm.onsubmit = async e => {

  e.preventDefault();

  if (!(await requireSession())) {
    return;
  }

  const button = e.submitter;

  button.disabled = true;

  try {

    const id = assignmentId.value;

    const existing =
      id
        ? data.assignments.find(x => x.id === id)
        : null;

    const file =
      assignmentFile.files[0];

    let file_path =
      existing?.file_path || null;

    let file_name =
      existing?.file_name || null;

    let file_type =
      existing?.file_type || null;


    if (file) {

      if (file.size > 50 * 1024 * 1024) {

        toast(
          "Assignment file must be 50 MB or smaller"
        );

        return;
      }

      const uploaded =
        await uploadFile(
          file,
          "assignments"
        );

      file_path = uploaded.path;
      file_name = uploaded.name;
      file_type = uploaded.type;
    }


    const obj = {

      no: +assignmentNo.value,

      title:
        assignmentTitle.value.trim(),

      due:
        assignmentDue.value || null,

      description:
        assignmentDescription.value.trim(),

      file_path,

      file_name,

      file_type,

      published:
        assignmentPublished.checked
    };


    let result;

    if (id) {

      result =
        await supabaseClient
          .from("assignments")
          .update(obj)
          .eq("id", id)
          .select()
          .single();

    } else {

      result =
        await supabaseClient
          .from("assignments")
          .upsert(
            obj,
            { onConflict: "no" }
          )
          .select()
          .single();
    }


    if (result.error) {
      throw result.error;
    }


    if (
      file &&
      existing?.file_path &&
      existing.file_path !== file_path
    ) {

      await removeFile(
        existing.file_path
      );
    }


    closeModal("assignmentModal");

    toast("Assignment saved to Supabase");

    await loadData();

  } catch (err) {

    console.error(err);

    toast(
      err.message ||
      "Unable to save assignment"
    );

  } finally {

    button.disabled = false;
  }
};


// ======================================================
// DELETE LECTURE
// ======================================================

async function delLecture(id) {

  if (!confirm("Delete this lecture?")) {
    return;
  }

  if (!(await requireSession())) {
    return;
  }

  try {

    const x =
      data.lectures.find(
        a => a.id === id
      );

    const {
      error
    } = await supabaseClient
      .from("lectures")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    if (x?.file_path) {
      await removeFile(x.file_path);
    }

    await loadData();

    toast("Lecture deleted");

  } catch (err) {

    console.error(err);

    toast(
      err.message ||
      "Unable to delete lecture"
    );
  }
}


// ======================================================
// DELETE ASSIGNMENT
// ======================================================

async function delAssignment(id) {

  if (!confirm("Delete this assignment?")) {
    return;
  }

  if (!(await requireSession())) {
    return;
  }

  try {

    const x =
      data.assignments.find(
        a => a.id === id
      );

    const {
      error
    } = await supabaseClient
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    if (x?.file_path) {
      await removeFile(x.file_path);
    }

    await loadData();

    toast("Assignment deleted");

  } catch (err) {

    console.error(err);

    toast(
      err.message ||
      "Unable to delete assignment"
    );
  }
}


// ======================================================
// DASHBOARD
// ======================================================

function renderDashboard() {

  statLectures.textContent =
    data.lectures.length;

  statWeeks.textContent =
    `${new Set(
      data.lectures.map(x => x.week)
    ).size}/15`;

  statAssignments.textContent =
    `${data.assignments.length}/3`;

  statPublished.textContent =
    data.lectures.filter(
      x => x.published
    ).length;


  weekGrid.innerHTML =
    weeks()
      .map(w => {

        const arr =
          data.lectures.filter(
            x => x.week === w
          );

        const pub =
          arr.filter(
            x => x.published
          ).length;

        return `
          <div class="week" onclick="filterWeek(${w})">
            <b>Week ${String(w).padStart(2, "0")}</b>
            <small>
              ${arr.length}
              lecture${arr.length !== 1 ? "s" : ""}
              · ${pub} published
            </small>
          </div>
        `;
      })
      .join("");
}


// ======================================================
// LECTURES
// ======================================================

function filterWeek(w) {

  openView("lectures");

  lectureSearch.value = "";

  lectureFilter.value = "all";

  renderLectures(w);
}


function renderLectures(forceWeek = null) {

  const q =
    (lectureSearch.value || "")
      .toLowerCase();

  const f =
    lectureFilter.value || "all";


  let arr =
    data.lectures.filter(x =>

      (forceWeek
        ? x.week === forceWeek
        : true)

      &&

      (
        x.title
          .toLowerCase()
          .includes(q)

        ||

        (x.description || "")
          .toLowerCase()
          .includes(q)
      )

      &&

      (
        f === "all"

        ||

        (f === "published" &&
          x.published)

        ||

        (f === "draft" &&
          !x.published)
      )
    );


  arr.sort(
    (a, b) => a.week - b.week
  );


  lectureList.innerHTML =
    arr.length

      ?

      arr.map(x => `

        <div class="card">

          <div>

            <span class="tag ${x.published ? "" : "draft"}">

              ${x.published
                ? "Published"
                : "Draft"}

              · Week
              ${String(x.week).padStart(2, "0")}

            </span>

            <h3>
              ${esc(x.title)}
            </h3>

            <p>
              ${esc(
                x.description ||
                "No description"
              )}
            </p>

            ${
              x.file_name

              ?

              `<div class="meta">
                📎 ${esc(x.file_name)}
              </div>`

              :

              `<div class="meta">
                No file uploaded
              </div>`
            }

          </div>

          <div class="actions">

            <button
              class="secondary"
              onclick="openLectureModal('${x.id}')">
              Edit
            </button>

            <button
              class="danger"
              onclick="delLecture('${x.id}')">
              Delete
            </button>

          </div>

        </div>

      `).join("")

      :

      `
        <div class="card">
          <p>
            No lectures found.
            Add your first lecture.
          </p>
        </div>
      `;
}


// ======================================================
// ASSIGNMENTS
// ======================================================

function renderAssignments() {

  assignmentList.innerHTML =
    [1, 2, 3]
      .map(no => {

        const x =
          data.assignments.find(
            a => a.no === no
          );


        return x

          ?

          `
            <div class="card">

              <div>

                <span class="tag ${x.published ? "" : "draft"}">

                  Assignment ${no}

                  ·

                  ${x.published
                    ? "Published"
                    : "Draft"}

                </span>

                <h3>
                  ${esc(x.title)}
                </h3>

                <p>
                  ${esc(
                    x.description ||
                    "No instructions"
                  )}

                  ${
                    x.due
                      ? ` · Due ${esc(x.due)}`
                      : ""
                  }
                </p>

                ${
                  x.file_name
                    ? `
                      <div class="meta">
                        📎 ${esc(x.file_name)}
                      </div>
                    `
                    : ""
                }

              </div>

              <div class="actions">

                <button
                  class="secondary"
                  onclick="openAssignmentModal('${x.id}')">
                  Edit
                </button>

                <button
                  class="danger"
                  onclick="delAssignment('${x.id}')">
                  Delete
                </button>

              </div>

            </div>
          `

          :

          `
            <div class="card">

              <div>

                <span class="tag">
                  Assignment ${no}
                </span>

                <h3>
                  Not added yet
                </h3>

                <p>
                  Add assignment ${no}
                  for students.
                </p>

              </div>

              <button
                class="primary"
                onclick="openAssignmentModal()">
                + Add
              </button>

            </div>
          `;
      })
      .join("");
}


// ======================================================
// STUDENT VIEW
// ======================================================

function renderStudent() {

  studentCourseTitle.textContent =
    data.courseTitle;


  const weeksHtml =
    weeks()
      .map(w => {

        const arr =
          data.lectures.filter(
            x =>
              x.week === w &&
              x.published
          );


        if (!arr.length) {
          return "";
        }


        return `
          <div class="student-week">

            <h3>
              Week ${String(w).padStart(2, "0")}
            </h3>

            ${
              arr.map(x => `

                <div class="student-item">

                  <div>

                    <b>
                      ${esc(x.title)}
                    </b>

                    <div class="meta">
                      ${esc(
                        x.description ||
                        "Lecture material"
                      )}
                    </div>

                  </div>

                  ${
                    x.file_path

                    ?

                    `<a
                      class="download"
                      href="${fileUrl(x.file_path)}"
                      target="_blank"
                      rel="noopener">
                      Download ↓
                    </a>`

                    :

                    `<span class="meta">
                      No file
                    </span>`
                  }

                </div>

              `).join("")
            }

          </div>
        `;
      })
      .join("");


  const as =
    data.assignments
      .filter(x => x.published)
      .sort((a, b) => a.no - b.no)
      .map(x => `

        <div class="assignment-row">

          <b>
            Assignment ${x.no}:
            ${esc(x.title)}
          </b>

          <div class="meta">

            ${esc(x.description || "")}

            ${
              x.due
                ? ` · Due ${esc(x.due)}`
                : ""
            }

          </div>

          ${
            x.file_path

            ?

            `<a
              class="download"
              href="${fileUrl(x.file_path)}"
              target="_blank"
              rel="noopener">
              Download ↓
            </a>`

            :

            ""
          }

        </div>

      `)
      .join("");


  studentContent.innerHTML =

    (
      weeksHtml

      ||

      `
        <div class="student-week">
          <p class="muted">
            No published lectures yet.
          </p>
        </div>
      `
    )

    +

    (
      as

      ?

      `
        <div class="student-week">
          <h3>Assignments</h3>
          ${as}
        </div>
      `

      :

      ""
    );
}


// ======================================================
// RENDER ALL
// ======================================================

function renderAll() {

  renderDashboard();
  renderLectures();
  renderAssignments();
  renderStudent();
}


// ======================================================
// TOAST
// ======================================================

function toast(msg) {

  const t =
    document.getElementById("toast");

  if (!t) return;

  t.textContent = msg;

  t.style.display = "block";

  clearTimeout(window._toast);

  window._toast =
    setTimeout(
      () => {
        t.style.display = "none";
      },
      3000
    );
}


// ======================================================
// STUDENT LINK
// ======================================================

function copyStudentLink() {

  navigator.clipboard
    ?.writeText(
      location.href.replace(
        /[^/]*$/,
        "student.html"
      )
    )

    .then(() =>
      toast("Student page link copied")
    )

    .catch(() =>
      toast(
        "Copy student.html link manually"
      )
    );
}


// ======================================================
// INITIALIZE
// ======================================================

fillWeeks();

initAuth();


// ======================================================
// LOGOUT
// ======================================================

function adminLogout() {

  supabaseClient.auth
    .signOut()
    .finally(() => {
      location.href = "index.html";
    });
}