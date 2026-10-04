عدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyBj0y6uQxMGyWFOMREuUjoTPyvqOUqA_JM",
  authDomain: "gegis-f43ca.firebaseapp.com",
  projectId: "gegis-f43ca",
  storageBucket: "gegis-f43ca.firebasestorage.app",
  messagingSenderId: "881667164944",
  appId: "1:881667164944:web:fbf51f6ba7043602b9b395",
  measurementId: "G-SRLKPPQCFH"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// حالة وضع النموذج: true تعني تسجيل دخول، false تعني إنشاء حساب جديد
let isLoginMode = true;

// التبديل تلقائياً للصفحة الرئيسية إذا كان مسجلاً
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

// عناصر الصفحة
const authForm = document.getElementById('authForm');
const errorMessage = document.getElementById('errorMessage');
const formTitle = document.getElementById('formTitle');
const btnText = document.getElementById('btnText');
const btnIcon = document.getElementById('btnIcon');
const toggleAuth = document.getElementById('toggleAuth');
const togglePrompt = document.getElementById('togglePrompt');

// زر التبديل بين تسجيل الدخول وإنشاء الحساب
toggleAuth.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  errorMessage.style.display = 'none';

  if (isLoginMode) {
    formTitle.textContent = 'تسجيل الدخول';
    btnText.textContent = 'تسجيل الدخول';
    btnIcon.className = 'fa-solid fa-right-to-bracket';
    togglePrompt.childNodes[0].textContent = 'ليس لديك حساب؟ ';
    toggleAuth.textContent = 'إنشاء حساب جديد';
  } else {
    formTitle.textContent = 'إنشاء حساب جديد';
    btnText.textContent = 'إنشاء الحساب';
    btnIcon.className = 'fa-solid fa-user-plus';
    togglePrompt.childNodes[0].textContent = 'لديك حساب بالفعل؟ ';
    toggleAuth.textContent = 'تسجيل الدخول';
  }
});

// التعامل مع تقديم النموذج
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
 
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
 
  errorMessage.style.display = 'none';

  if (isLoginMode) {
    // عملية تسجيل الدخول
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        errorMessage.style.display = 'block';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        } else {
          errorMessage.textContent = 'حدث خطأ: ' + error.message;
        }
      });
  } else {
    // عملية إنشاء حساب جديد
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        errorMessage.style.display = 'block';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage.textContent = 'هذا البريد الإلكتروني مستخدم بالفعل.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage.textContent = 'كلمة المرور ضعيفة. يجب أن تتكون من 6 رموز على الأقل.';
        } else {
          errorMessage.textContent = 'حدث خطأ أثناء التجسيل: ' + error.message;
        }
      });
  }
});

