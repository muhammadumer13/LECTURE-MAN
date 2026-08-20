const KEY="lecturehub_v1";
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{
  courseTitle:"My Course Lectures",
  lectures:[],
  assignments:[]
};
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function weeks(){return Array.from({length:15},(_,i)=>i+1)}
function openView(id){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.view===id))}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>openView(b.dataset.view));
function fillWeeks(){lectureWeek.innerHTML=weeks().map(w=>`<option value="${w}">Week ${String(w).padStart(2,"0")}</option>`).join("")}
function openLectureModal(id=null){
  fillWeeks(); lectureForm.reset(); lectureId.value=""; lectureModalTitle.textContent=id?"Edit Lecture":"Add Lecture";
  if(id){let x=data.lectures.find(a=>a.id===id);if(!x)return;lectureId.value=x.id;lectureWeek.value=x.week;lectureTitle.value=x.title;lectureDescription.value=x.description||"";lectureFileInfo.textContent=x.fileName?("Current file: "+x.fileName):"No file uploaded";lecturePublished.checked=x.published}
  else lectureFileInfo.textContent="Optional · PDF, PPT, DOC, ZIP and common document/image files";
  document.getElementById("lectureModal").classList.add("open")
}
function openAssignmentModal(id=null){
  assignmentForm.reset();assignmentId.value="";assignmentModalTitle.textContent=id?"Edit Assignment":"Add Assignment";
  if(id){let x=data.assignments.find(a=>a.id===id);if(!x)return;assignmentId.value=x.id;assignmentNo.value=x.no;assignmentTitle.value=x.title;assignmentDue.value=x.due||"";assignmentDescription.value=x.description||"";assignmentUrl.value=x.url||"";assignmentPublished.checked=x.published}
  assignmentModal.classList.add("open")
}
function closeModal(id){document.getElementById(id).classList.remove("open")}
lectureForm.onsubmit=async e=>{
  e.preventDefault();
  let id=lectureId.value;
  let existing=id?data.lectures.find(x=>x.id===id):null;
  let file=lectureFile.files[0];
  let fileData=existing?.fileData||"";
  let fileName=existing?.fileName||"";
  let fileType=existing?.fileType||"";
  if(file){
    if(file.size>15*1024*1024){toast("Lecture file must be 15 MB or smaller");return}
    fileData=await fileToDataURL(file); fileName=file.name; fileType=file.type;
  }
  let obj={id:id||crypto.randomUUID(),week:+lectureWeek.value,title:lectureTitle.value.trim(),description:lectureDescription.value.trim(),fileData,fileName,fileType,published:lecturePublished.checked};
  if(id)data.lectures=data.lectures.map(x=>x.id===id?obj:x);else data.lectures.push(obj);
  closeModal("lectureModal");toast("Lecture saved");save()
}
assignmentForm.onsubmit=async e=>{
  e.preventDefault();
  let id=assignmentId.value;
  let existing=id?data.assignments.find(x=>x.id===id):null;
  let file=assignmentFile.files[0];
  let fileData=existing?.fileData||"";
  let fileName=existing?.fileName||"";
  let fileType=existing?.fileType||"";
  if(file){
    if(file.size>15*1024*1024){toast("Assignment file must be 15 MB or smaller");return}
    fileData=await fileToDataURL(file); fileName=file.name; fileType=file.type;
  }
  let obj={id:id||crypto.randomUUID(),no:+assignmentNo.value,title:assignmentTitle.value.trim(),due:assignmentDue.value,description:assignmentDescription.value.trim(),fileData,fileName,fileType,published:assignmentPublished.checked};
  if(id)data.assignments=data.assignments.map(x=>x.id===id?obj:x);else{if(data.assignments.length>=3&&!id){toast("Maximum 3 assignments allowed");return}data.assignments=data.assignments.filter(x=>x.no!==obj.no);data.assignments.push(obj)}
  closeModal("assignmentModal");toast("Assignment saved");save()
}
function delLecture(id){if(confirm("Delete this lecture?")){data.lectures=data.lectures.filter(x=>x.id!==id);save();toast("Lecture deleted")}}
function delAssignment(id){if(confirm("Delete this assignment?")){data.assignments=data.assignments.filter(x=>x.id!==id);save();toast("Assignment deleted")}}
function renderDashboard(){
  statLectures.textContent=data.lectures.length;statWeeks.textContent=`${new Set(data.lectures.map(x=>x.week)).size}/15`;statAssignments.textContent=`${data.assignments.length}/3`;statPublished.textContent=data.lectures.filter(x=>x.published).length;
  weekGrid.innerHTML=weeks().map(w=>{let arr=data.lectures.filter(x=>x.week===w),pub=arr.filter(x=>x.published).length;return `<div class="week" onclick="filterWeek(${w})"><b>Week ${String(w).padStart(2,"0")}</b><small>${arr.length} lecture${arr.length!==1?"s":""} · ${pub} published</small></div>`}).join("")
}
function filterWeek(w){openView("lectures");lectureSearch.value="";lectureFilter.value="all";renderLectures(w)}
function renderLectures(forceWeek=null){
 let q=(lectureSearch.value||"").toLowerCase(),f=lectureFilter.value||"all";
 let arr=data.lectures.filter(x=>(forceWeek?x.week===forceWeek:true)&&(x.title.toLowerCase().includes(q)||x.description.toLowerCase().includes(q))&&(f==="all"||(f==="published"&&x.published)||(f==="draft"&&!x.published)));
 arr.sort((a,b)=>a.week-b.week);
 lectureList.innerHTML=arr.length?arr.map(x=>`<div class="card"><div><span class="tag ${x.published?"":"draft"}">${x.published?"Published":"Draft"} · Week ${String(x.week).padStart(2,"0")}</span><h3>${esc(x.title)}</h3><p>${esc(x.description||"No description")}</p>${x.fileName?`<div class="meta">📎 ${esc(x.fileName)}</div>`:`<div class="meta">No file uploaded</div>`}</div><div class="actions"><button class="secondary" onclick="openLectureModal('${x.id}')">Edit</button><button class="danger" onclick="delLecture('${x.id}')">Delete</button></div></div>`).join(""):`<div class="card"><p>No lectures found. Add your first lecture.</p></div>`
}
function renderAssignments(){
 assignmentList.innerHTML=[1,2,3].map(no=>{let x=data.assignments.find(a=>a.no===no);return x?`<div class="card"><div><span class="tag ${x.published?"":"draft"}">Assignment ${no} · ${x.published?"Published":"Draft"}</span><h3>${esc(x.title)}</h3><p>${esc(x.description||"No instructions")}${x.due?` · Due ${esc(x.due)}`:""}</p>${x.fileName?`<div class="meta">📎 ${esc(x.fileName)}</div>`:""}</div><div class="actions"><button class="secondary" onclick="openAssignmentModal('${x.id}')">Edit</button><button class="danger" onclick="delAssignment('${x.id}')">Delete</button></div></div>`:`<div class="card"><div><span class="tag">Assignment ${no}</span><h3>Not added yet</h3><p>Add assignment ${no} for students.</p></div><button class="primary" onclick="openAssignmentModal()">+ Add</button></div>`}).join("")
}
function renderStudent(){
 studentCourseTitle.textContent=data.courseTitle;
 let weeksHtml=weeks().map(w=>{let arr=data.lectures.filter(x=>x.week===w&&x.published);if(!arr.length)return"";return `<div class="student-week"><h3>Week ${String(w).padStart(2,"0")}</h3>${arr.map(x=>`<div class="student-item"><div><b>${esc(x.title)}</b><div class="meta">${esc(x.description||"Lecture material")}</div></div>${x.fileData?`<a class="download" href="${x.fileData}" download="${esc(x.fileName||"lecture-file")}">Download ↓</a>`:`<span class="meta">No file</span>`}</div>`).join("")}</div>`}).join("");
 let as=data.assignments.filter(x=>x.published).sort((a,b)=>a.no-b.no).map(x=>`<div class="assignment-row"><b>Assignment ${x.no}: ${esc(x.title)}</b><div class="meta">${esc(x.description||"")}${x.due?` · Due ${esc(x.due)}`:""}</div>${x.fileData?`<a class="download" href="${x.fileData}" download="${esc(x.fileName||"assignment-file")}">Download ↓</a>`:""}</div>`).join("");
 studentContent.innerHTML=(weeksHtml||`<div class="student-week"><p class="muted">No published lectures yet.</p></div>`)+(as?`<div class="student-week"><h3>Assignments</h3>${as}</div>`:"")
}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function renderAll(){renderDashboard();renderLectures();renderAssignments();renderStudent()}
function toast(msg){let t=document.getElementById("toast");t.textContent=msg;t.style.display="block";clearTimeout(window._toast);window._toast=setTimeout(()=>t.style.display="none",2200)}
function copyStudentLink(){navigator.clipboard?.writeText(location.href.replace(/[^/]*$/,"student.html")).then(()=>toast("Student page link copied")).catch(()=>toast("Copy student.html link manually"))}
fillWeeks();renderAll();

function adminLogout(){
  sessionStorage.removeItem("lecturehub_admin_session");
  location.href="index.html";
}
