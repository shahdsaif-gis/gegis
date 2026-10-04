// نظام الحماية وتسجيل الدخول
const firebaseConfig = {
  apiKey: "AIzaSyBj0y6uQxMGyWFOMREuUjoTPyvqOUqA_JM",
  authDomain: "gegis-f43ca.firebaseapp.com",
  projectId: "gegis-f43ca",
  storageBucket: "gegis-f43ca.firebasestorage.app",
  messagingSenderId: "881667164944",
  appId: "1:881667164944:web:fbf51f6ba7043602b9b395"
};

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) window.location.href = "login.html";
  });
}

document.addEventListener('DOMContentLoaded', () => {
    // تفعيل إظهار وإخفاء السايدبار عند الضغط على الأزرار الثلاثة
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // تهيئة الخريطة
    const map = L.map('map').setView([15.5007, 32.5599], 13);

    // إضافة طبقة الأقمار الصناعية
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // حسابات الألواح والمساحة
    const reqCapInput = document.getElementById('reqCap');
    const panelCapInput = document.getElementById('panelCap');
    const panelCountSpan = document.getElementById('panelCount');
    const areaCalcSpan = document.getElementById('areaCalc');

    function updateCalculations() {
        const reqKW = parseFloat(reqCapInput.value) || 0;
        const panelW = parseFloat(panelCapInput.value) || 0;

        if (panelW > 0) {
            const count = Math.ceil((reqKW * 1000) / panelW);
            const reqArea = (count * 2.6).toFixed(2); // فرضية مساحة اللوح شاملة المسافات

            panelCountSpan.textContent = count + ' لوح';
            areaCalcSpan.textContent = reqArea + ' m² (مطلوبة)';
        }
    }

    if (reqCapInput && panelCapInput) {
        reqCapInput.addEventListener('input', updateCalculations);
        panelCapInput.addEventListener('input', updateCalculations);
    }
});
