// إعدادات Firebase الخاصة بمشروعك
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

// ضبط نوع الجلسة لتكون مرتبطة بفتح المتصفح/التبويب فقط (تنتهي بإغلاقه لتظهر نافذة الدخول في كل زيارة جديدة)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// حالة وضع النموذج: true تعني تسجيل دخول، false تعني إنشاء حساب جديد
let isLoginMode = true;

// التبديل تلقائياً للصفحة الرئيسية إذا كانت الجلسة نشطة
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

// انتظار تحميل عناصر DOM بالكامل
document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('authForm') || document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');
  const formTitle = document.getElementById('formTitle');
  const btnText = document.getElementById('btnText');
  const btnIcon = document.getElementById('btnIcon');
  const toggleAuth = document.getElementById('toggleAuth');
  const togglePrompt = document.getElementById('togglePrompt');

  // زر التبديل بين تسجيل الدخول وإنشاء الحساب
  if (toggleAuth) {
    toggleAuth.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      if (errorMessage) errorMessage.style.display = 'none';

      if (isLoginMode) {
        if (formTitle) formTitle.textContent = 'تسجيل الدخول';
        if (btnText) btnText.textContent = 'تسجيل الدخول';
        if (btnIcon) btnIcon.className = 'fa-solid fa-right-to-bracket';
        if (togglePrompt) togglePrompt.childNodes[0].textContent = 'ليس لديك حساب؟ ';
        if (toggleAuth) toggleAuth.textContent = 'إنشاء حساب جديد';
      } else {
        if (formTitle) formTitle.textContent = 'إنشاء حساب جديد';
        if (btnText) btnText.textContent = 'إنشاء الحساب';
        if (btnIcon) btnIcon.className = 'fa-solid fa-user-plus';
        if (togglePrompt) togglePrompt.childNodes[0].textContent = 'لديك حساب بالفعل؟ ';
        if (toggleAuth) toggleAuth.textContent = 'تسجيل الدخول';
      }
    });
  }

  // التعامل مع تقديم النموذج
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
    
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
    
      if (errorMessage) errorMessage.style.display = 'none';

      if (isLoginMode) {
        // تسجيل الدخول
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {
            window.location.href = "index.html";
          })
          .catch((error) => {
            if (errorMessage) {
              errorMessage.style.display = 'block';
              if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
              } else {
                errorMessage.textContent = 'حدث خطأ: ' + error.message;
              }
            }
          });
      } else {
        // إنشاء حساب جديد
        auth.createUserWithEmailAndPassword(email, password)
          .then(() => {
            window.location.href = "index.html";
          })
          .catch((error) => {
            if (errorMessage) {
              errorMessage.style.display = 'block';
              if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'هذا البريد الإلكتروني مستخدم بالفعل.';
              } else if (error.code === 'auth/weak-password') {
                errorMessage.textContent = 'كلمة المرور ضعيفة. يجب أن تتكون من 6 رموز على الأقل.';
              } else {
                errorMessage.textContent = 'حدث خطأ أثناء التسجيل: ' + error.message;
              }
            }
          });
      }
    });
  }
});

