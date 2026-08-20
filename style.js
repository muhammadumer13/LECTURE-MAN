// const loginScreen = document.getElementById("loginScreen");
// const adminApp = document.getElementById("adminApp");
// const loginForm = document.getElementById("loginForm");
// const adminEmail = document.getElementById("adminEmail");
// const adminPassword = document.getElementById("adminPassword");
// const loginError = document.getElementById("loginError");

// async function showAdmin(){
//   loginScreen.style.display="none";
//   adminApp.style.display="block";
//   if(typeof loadData === "function") await loadData();
// }

// (async function initAuth(){
//   const {data:{session}} = await supabase.auth.getSession();
//   if(session) showAdmin();
// })();

// supabase.auth.onAuthStateChange((_event, session)=>{
//   if(session) showAdmin();
//   else { loginScreen.style.display="flex"; adminApp.style.display="none"; }
// });

// loginForm.addEventListener("submit", async function(e){
//   e.preventDefault();
//   loginError.textContent="";
//   const button=loginForm.querySelector("button"); button.disabled=true;
//   try {
//     const {error}=await supabase.auth.signInWithPassword({email:adminEmail.value.trim(),password:adminPassword.value});
//     if(error) throw error;
//   } catch(err){
//     loginError.textContent=err.message||"Unable to login.";
//     adminPassword.value="";
//     adminPassword.focus();
//   } finally { button.disabled=false; }
// });
