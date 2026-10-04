// ==================== 1. نظام الحماية وتسجيل الدخول عبر Firebase ====================
const firebaseConfig = {
  apiKey: "AIzaSyBj0y6uQxMGyWFOMREuUjoTPyvqOUqA_JM",
  authDomain: "gegis-f43ca.firebaseapp.com",
  projectId: "gegis-f43ca",
  storageBucket: "gegis-f43ca.firebasestorage.app",
  messagingSenderId: "881667164944",
  appId: "1:881667164944:web:fbf51f6ba7043602b9b395",
  measurementId: "G-SRLKPPQCFH"
};

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html"; // تحويل المستخدم لصفحة الدخول إذا لم يكن مسجلاً
    }
  });
}

// ==================== 2. تهيئة الخريطة والعناصر الرئيسية ====================
document.addEventListener('DOMContentLoaded', () => {
    // إنشاء الخريطة وتحديد المركز والزوم
    const map = L.map('map').setView([15.5007, 32.5599], 6); // المركز الافتراضي: الخرطوم

    // إضافة طبقة الخريطة (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let currentMarker = null;

    // عناصر الواجهة
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const latSpan = document.getElementById('latVal');
    const lngSpan = document.getElementById('lngVal');
    const solarSpan = document.getElementById('solarVal');
    const windSpan = document.getElementById('windVal');
    const areaInput = document.getElementById('areaInput');
    const calcBtn = document.getElementById('calcBtn');
    const reportSection = document.getElementById('reportSection');

    // عناصر التقرير الهندي
    const rCapSpan = document.getElementById('rCapacity');
    const rPanelsSpan = document.getElementById('rPanels');
    const rGenSpan = document.getElementById('rGen');
    const rOffsetSpan = document.getElementById('rOffset');

    // تفعيل وإغلاق القائمة الجانبية للشاشات الصغيرة
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // ==================== 3. حدث النقر على الخريطة وجلب البيانات المناخية ====================
    map.on('click', async (e) => {
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);

        // إظهار الإحداثيات في اللوحة الجانبية
        if (latSpan) latSpan.textContent = lat;
        if (lngSpan) lngSpan.textContent = lng;

        // وضع علامة (Marker) على الخريطة
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        currentMarker = L.marker([lat, lng]).addTo(map);

        // إظهار حالة الجلب
        if (solarSpan) solarSpan.textContent = 'جاري التحميل...';
        if (windSpan) windSpan.textContent = 'جاري التحميل...';

        try {
            // جلب البيانات من Open-Meteo API
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=shortwave_radiation_sum,wind_speed_10m_max&timezone=auto`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data && data.daily) {
                // حساب متوسط الإشعاع الشمسي (MJ/m²) وتحويله إلى kWh/m²/day
                const radArray = data.daily.shortwave_radiation_sum || [];
                const avgRadMJ = radArray.reduce((a, b) => a + b, 0) / (radArray.length || 1);
                const avgSolarKWh = (avgRadMJ / 3.6).toFixed(2); // التحويل لـ kWh/m²

                // حساب متوسط أقصى سرعة للرياح (km/h)
                const windArray = data.daily.wind_speed_10m_max || [];
                const avgWind = (windArray.reduce((a, b) => a + b, 0) / (windArray.length || 1)).toFixed(2);

                if (solarSpan) solarSpan.textContent = avgSolarKWh;
                if (windSpan) windSpan.textContent = avgWind;

                // التمرير والتكبير الخفيف لنقطة المدى
                currentMarker.bindPopup(`<b>الموقع المحدد:</b><br>خط العرض: ${lat}<br>خط الطول: ${lng}<br>الإشعاع الشمسي: ${avgSolarKWh} kWh/m²/day`).openPopup();
            }
        } catch (error) {
            console.error("خطأ في جلب البيانات المناخية:", error);
            if (solarSpan) solarSpan.textContent = 'غير متوفر';
            if (windSpan) windSpan.textContent = 'غير متوفر';
        }
    });

    // ==================== 4. الحسابات الهندسيّة وإنشاء التقرير ====================
    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            const area = parseFloat(areaInput.value);
            const solarVal = parseFloat(solarSpan.textContent);

            if (isNaN(area) || area <= 0) {
                alert('الرجاء إدخال مساحة صالحة بالمتر المربع.');
                return;
            }

            if (isNaN(solarVal)) {
                alert('الرجاء تحديد موقع على الخريطة أولاً لجلب بيانات الإشعاع الشمسي.');
                return;
            }

            // فرضيات الحساب الهندسي:
            // - متوسط قدرة اللوح الشمسي الواحد = 550 واط (0.55 كيلوواط) بمساحة تقريبية 2.5 م²
            // - استغلال المساحة (Ground Coverage Ratio) = 60%
            const usableArea = area * 0.6;
            const panelArea = 2.5; // م²
            const numPanels = Math.floor(usableArea / panelArea);
            const capacityKW = (numPanels * 0.55).toFixed(1); // القدرة الكلية بالكيلوواط

            // الإنتاج السنوي المتوقع (kWh) = القدرة (kW) * الإشعاع الشمسي اليومي * 365 * كفاءة النظام (80%)
            const annualGen = Math.round(capacityKW * solarVal * 365 * 0.8);
           
            // خفض الانبعاثات الكربونية التقديري (0.55 كجم كربون لكل كيلوواط ساعة)
            const co2Offset = (annualGen * 0.00055).toFixed(1); // بالطن سنوياً

            // عرض النتائج في التقرير
            if (rCapSpan) rCapSpan.textContent = capacityKW + ' kW';
            if (rPanelsSpan) rPanelsSpan.textContent = numPanels.toLocaleString('ar-EG') + ' لوح';
            if (rGenSpan) rGenSpan.textContent = annualGen.toLocaleString('ar-EG') + ' kWh/سنة';
            if (rOffsetSpan) rOffsetSpan.textContent = co2Offset + ' طن سنوياً';

            // إظهار قسم التقرير
            if (reportSection) reportSection.style.display = 'block';
        });
    }
});

