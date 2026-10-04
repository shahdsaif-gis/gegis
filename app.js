// ==================== 1. نظام الحماية وتسجيل الدخول ====================
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

// ==================== 2. قاموس الترجمة الشامل ====================
const translations = {
  ar: {
    title: "GEGIS Analytics",
    subtitle: "تقييم الملاءة المكانية والمنظومة",
    layersTitle: "الطبقات المكانية المتاحة",
    layerGHI: "إشعاع (GHI)",
    layerDEM: "تضاريس (DEM)",
    layerWind: "سرعة الرياح",
    solarRad: "الإشعاع الشمسي",
    elevWind: "الارتفاع / الرياح",
    suitability: "درجة الملاءة",
    solarAreaTitle: "المساحة والألواح الشمسية",
    drawPoly: "رسم المضلع",
    undo: "تراجع",
    reqCap: "القدرة المطلوبة:",
    panelCap: "قدرة اللوح:",
    panelCountLabel: "عدد الألواح:",
    tiltValLabel: "زاوية التعامد:",
    areaCalcLabel: "المساحة الكلية / المطلوبة:",
    calcLoad: "حاسبة الأحمال",
    exportReport: "تصدير التقرير",
    langBtn: "EN",
    unitPanels: "لوح",
    unitReq: "مطلوبة"
  },
  en: {
    title: "GEGIS Analytics",
    subtitle: "Spatial Suitability & System Evaluation",
    layersTitle: "Available Spatial Layers",
    layerGHI: "Solar Radiation (GHI)",
    layerDEM: "Elevation (DEM)",
    layerWind: "Wind Speed",
    solarRad: "Solar Radiation",
    elevWind: "Elevation / Wind",
    suitability: "Suitability Score",
    solarAreaTitle: "Area & Solar Panels",
    drawPoly: "Draw Polygon",
    undo: "Undo",
    reqCap: "Required Cap:",
    panelCap: "Panel Cap:",
    panelCountLabel: "Panels Count:",
    tiltValLabel: "Tilt Angle:",
    areaCalcLabel: "Total / Required Area:",
    calcLoad: "Load Calculator",
    exportReport: "Export Report",
    langBtn: "AR",
    unitPanels: "Panels",
    unitReq: "required"
  }
};

let currentLang = 'ar';

document.addEventListener('DOMContentLoaded', () => {

    // ==================== 3. زر القائمة للهواتف وزر اللغات ====================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const langBtn = document.getElementById('langBtn');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = currentLang;
            langBtn.textContent = translations[currentLang].langBtn;

            document.querySelectorAll('[data-i18n]').forEach(elem => {
                const key = elem.getAttribute('data-i18n');
                if (translations[currentLang][key]) {
                    elem.textContent = translations[currentLang][key];
                }
            });

            updateCalculations();
        });
    }

    // ==================== 4. تهيئة الخريطة بوضوح عالي جداً ====================
    const map = L.map('map', { maxZoom: 22 }).setView([15.5007, 32.5599], 13);

    // طبقة الخريطة الرئيسية
    const satelliteImg = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite',
        maxNativeZoom: 18,
        maxZoom: 22
    }).addTo(map);

    const labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Labels',
        maxNativeZoom: 18,
        maxZoom: 22
    }).addTo(map);

    // طبقات مخصصة للتحليل المكاني
    const ghiLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.3 });
    const demLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { opacity: 0.4 });
    const windLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { opacity: 0.3 });

    // ربط الـ Checkboxes بالتفعيل
    document.getElementById('layerGHI').addEventListener('change', (e) => e.target.checked ? ghiLayer.addTo(map) : map.removeLayer(ghiLayer));
    document.getElementById('layerDEM').addEventListener('change', (e) => e.target.checked ? demLayer.addTo(map) : map.removeLayer(demLayer));
    document.getElementById('layerWind').addEventListener('change', (e) => e.target.checked ? windLayer.addTo(map) : map.removeLayer(windLayer));

    // ==================== 5. أدوات الرسم وإظهار أطوال الأضلاع ====================
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    let drawnAreaSquareMeters = 0;

    // إعداد أداة الرسم مع إظهار أطوال الأضلاع أثناء الرسم
    const polygonDrawer = new L.Draw.Polygon(map, {
        showArea: true,
        metric: true,
        feet: false,
        shapeOptions: { color: '#f59e0b', weight: 3 }
    });

    document.getElementById('drawPolyBtn').addEventListener('click', () => polygonDrawer.enable());
    document.getElementById('undoBtn').addEventListener('click', () => {
        drawnItems.clearLayers();
        drawnAreaSquareMeters = 0;
        updateCalculations();
    });

    map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);

        const latlngs = layer.getLatLngs()[0];
        let area = 0;
        if (latlngs.length > 2) {
            for (let i = 0; i < latlngs.length; i++) {
                let p1 = latlngs[i];
                let p2 = latlngs[(i + 1) % latlngs.length];
                area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
            }
            area = Math.abs(area * 6378137 * 6378137 * Math.PI / 360);
        }
        drawnAreaSquareMeters = area;
        updateCalculations();
    });

    // ==================== 6. النقر لحساب زاوية الميل والمناخ ====================
    let currentMarker = null;

    map.on('click', async (e) => {
        if (polygonDrawer._enabled) return;

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.marker([lat, lng]).addTo(map);

        // حساب زاوية الميل والتعامد المثالية للوح بناءً على خط العرض
        const optimalTilt = Math.abs(lat).toFixed(1);
        document.getElementById('tiltVal').textContent = optimalTilt + '°';

        document.getElementById('solarVal').innerHTML = 'جاري...';

        try {
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&daily=shortwave_radiation_sum,wind_speed_10m_max&timezone=auto`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (data && data.daily) {
                const avgRadMJ = data.daily.shortwave_radiation_sum.reduce((a, b) => a + b, 0) / data.daily.shortwave_radiation_sum.length;
                const avgSolarKWh = (avgRadMJ / 3.6).toFixed(3);
                const avgWind = (data.daily.wind_speed_10m_max.reduce((a, b) => a + b, 0) / data.daily.wind_speed_10m_max.length).toFixed(0);

                document.getElementById('solarVal').innerHTML = `${avgSolarKWh} <small>kWh/m²</small>`;
                document.getElementById('elevWindVal').innerHTML = `380m | ${avgWind}km/h`;
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ==================== 7. الحسابات التلقائية ====================
    const reqCapInput = document.getElementById('reqCap');
    const panelCapInput = document.getElementById('panelCap');

    function updateCalculations() {
        const reqKW = parseFloat(reqCapInput.value) || 0;
        const panelW = parseFloat(panelCapInput.value) || 590;
        const t = translations[currentLang];

        if (panelW > 0) {
            const count = Math.ceil((reqKW * 1000) / panelW);
            const reqArea = (count * 2.6).toFixed(2);

            document.getElementById('panelCount').textContent = `${count} ${t.unitPanels}`;

            if (drawnAreaSquareMeters > 0) {
                document.getElementById('areaCalc').textContent = `${drawnAreaSquareMeters.toFixed(2)} m² / ${reqArea} m²`;
            } else {
                document.getElementById('areaCalc').textContent = `${reqArea} m² (${t.unitReq})`;
            }
        }
    }

    reqCapInput.addEventListener('input', updateCalculations);
    panelCapInput.addEventListener('input', updateCalculations);

    // ==================== 8. نافذة التقرير وحاسبة الأحمال ====================
    const reportModal = document.getElementById('reportModal');
   
    document.getElementById('exportReportBtn').addEventListener('click', () => {
        document.getElementById('repCap').textContent = reqCapInput.value + ' kWp';
        document.getElementById('repPanels').textContent = document.getElementById('panelCount').textContent;
        document.getElementById('repTilt').textContent = document.getElementById('tiltVal').textContent;
        document.getElementById('repArea').textContent = document.getElementById('areaCalc').textContent;
        reportModal.style.display = 'flex';
    });

    document.getElementById('calcLoadBtn').addEventListener('click', () => {
        alert(currentLang === 'ar' ? 'حاسبة الأحمال الكهربائية: اجمالي الأحمال المقدرة ' + reqCapInput.value + ' kWp' : 'Load Calculator: Total Estimated Load ' + reqCapInput.value + ' kWp');
    });

    document.getElementById('closeReportBtn').addEventListener('click', () => reportModal.style.display = 'none');
    document.getElementById('printReportBtn').addEventListener('click', () => window.print());

    updateCalculations();
});

