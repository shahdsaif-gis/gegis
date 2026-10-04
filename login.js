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

// التحقق ممّا إذا كان المستخدم مسجلاً بالفعل
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "index.html"; // التوجيه للصفحة الرئيسية
  }
});

// التعامل مع نموذج الدخول
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
 
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
 
  errorMessage.style.display = 'none';

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      errorMessage.style.display = 'block';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else {
        errorMessage.textContent = 'حدث خطأ أثناء تسجيل الدخول: ' + error.message;
      }
    });
});
