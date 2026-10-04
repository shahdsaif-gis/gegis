// ==================== 1. نظام الحماية عبر Firebase ====================
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

// ==================== 2. القاموس للتحويل بين العربي والإنكليزي ====================
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
    developedBy: "Designed & Developed by",
    langBtn: "EN"
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
    developedBy: "Designed & Developed by",
    langBtn: "AR"
  }
};

let currentLang = 'ar';

// ==================== 3. تهيئة الخريطة والبرمجيات ====================
document.addEventListener('DOMContentLoaded', () => {
   
    // تفعيل التبديل بين اللغات (AR / EN)
    const langBtn = document.querySelector('.lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = currentLang;
            langBtn.textContent = translations[currentLang].langBtn;
            applyTranslations();
        });
    }

    function applyTranslations() {
        const t = translations[currentLang];
       
        // تحديث النصوص
        const subtitle = document.querySelector('.header-title span');
        if (subtitle) subtitle.textContent = t.subtitle;

        const layersTitle = document.querySelector('.card h3');
        if (layersTitle) layersTitle.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${t.layersTitle}`;

        const solarRadLabel = document.querySelectorAll('.stat-label')[0];
        if (solarRadLabel) solarRadLabel.textContent = t.solarRad;

        const elevWindLabel = document.querySelectorAll('.stat-label')[1];
        if (elevWindLabel) elevWindLabel.textContent = t.elevWind;

        const suitabilityLabel = document.querySelectorAll('.stat-label')[2];
        if (suitabilityLabel) suitabilityLabel.textContent = t.suitability;

        const drawPolyBtn = document.getElementById('drawPolyBtn');
        if (drawPolyBtn) drawPolyBtn.innerHTML = `<i class="fa-solid fa-pen"></i> ${t.drawPoly}`;

        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${t.undo}`;

        const calcLoadBtn = document.getElementById('calcLoadBtn');
        if (calcLoadBtn) calcLoadBtn.innerHTML = `<i class="fa-solid fa-calculator"></i> ${t.calcLoad}`;

        const exportReportBtn = document.getElementById('exportReportBtn');
        if (exportReportBtn) exportReportBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${t.exportReport}`;
    }

    // تفعيل زر السايدبار للهواتف
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // إنشاء الخريطة والزوم
    const map = L.map('map', { maxZoom: 21 }).setView([15.5007, 32.5599], 12);

    const satelliteImg = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite',
        maxNativeZoom: 18,
        maxZoom: 21
    }).addTo(map);

    const labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Labels',
        maxNativeZoom: 18,
        maxZoom: 21
    }).addTo(map);

    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap',
        maxZoom: 19
    });

    const baseMaps = {
        "أقمار صناعية + مسميات": L.layerGroup([satelliteImg, labelsLayer]),
        "خريطة شوارع": streetMap
    };
    L.control.layers(baseMaps).addTo(map);

    // أدوات الرسم وحساب المساحات
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    let drawnAreaSquareMeters = 0;

    function calculateArea(latLngs) {
        let area = 0;
        if (latLngs.length > 2) {
            for (let i = 0; i < latLngs.length; i++) {
                let p1 = latLngs[i];
                let p2 = latLngs[(i + 1) % latLngs.length];
                area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
            }
            area = area * 6378137 * 6378137 * Math.PI / 360;
        }
        return Math.abs(area);
    }

    const drawPolyBtn = document.getElementById('drawPolyBtn');
    const undoBtn = document.getElementById('undoBtn');
    let polygonDrawer = new L.Draw.Polygon(map);

    if (drawPolyBtn) {
        drawPolyBtn.addEventListener('click', () => polygonDrawer.enable());
    }

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            drawnItems.clearLayers();
            drawnAreaSquareMeters = 0;
            updateCalculations();
        });
    }

    map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        const latlngs = layer.getLatLngs()[0];
        drawnAreaSquareMeters = calculateArea(latlngs);
        updateCalculations();
    });

    // النقر على الخريطة
    let currentMarker = null;
    map.on('click', async (e) => {
        if (polygonDrawer._enabled) return;
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);

        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.marker([lat, lng]).addTo(map);

        const solarValSpan = document.getElementById('solarVal');
        const elevWindValSpan = document.getElementById('elevWindVal');

        if (solarValSpan) solarValSpan.innerHTML = 'جاري التحميل...';

        try {
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=shortwave_radiation_sum,wind_speed_10m_max&timezone=auto`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (data && data.daily) {
                const avgRadMJ = data.daily.shortwave_radiation_sum.reduce((a, b) => a + b, 0) / data.daily.shortwave_radiation_sum.length;
                const avgSolarKWh = (avgRadMJ / 3.6).toFixed(3);
                const avgWind = (data.daily.wind_speed_10m_max.reduce((a, b) => a + b, 0) / data.daily.wind_speed_10m_max.length).toFixed(0);

                if (solarValSpan) solarValSpan.innerHTML = `${avgSolarKWh} <small>kWh/m²</small>`;
                if (elevWindValSpan) elevWindValSpan.innerHTML = `380m | ${avgWind}km/h`;
            }
        } catch (err) {
            console.error(err);
        }
    });

    // الحسابات
    const reqCapInput = document.getElementById('reqCap');
    const panelCapInput = document.getElementById('panelCap');
    const panelCountSpan = document.getElementById('panelCount');
    const areaCalcSpan = document.getElementById('areaCalc');

    function updateCalculations() {
        const reqKW = parseFloat(reqCapInput ? reqCapInput.value : 0) || 0;
        const panelW = parseFloat(panelCapInput ? panelCapInput.value : 0) || 590;

        if (panelW > 0) {
            const count = Math.ceil((reqKW * 1000) / panelW);
            const reqArea = (count * 2.6).toFixed(2);

            if (panelCountSpan) panelCountSpan.textContent = `${count} ${currentLang === 'ar' ? 'لوح' : 'Panels'}`;

            if (drawnAreaSquareMeters > 0) {
                areaCalcSpan.textContent = `${drawnAreaSquareMeters.toFixed(2)} m² / ${reqArea} m²`;
            } else {
                areaCalcSpan.textContent = `${reqArea} m² (${currentLang === 'ar' ? 'مطلوبة' : 'required'})`;
            }
        }
    }

    if (reqCapInput) reqCapInput.addEventListener('input', updateCalculations);
    if (panelCapInput) panelCapInput.addEventListener('input', updateCalculations);

    updateCalculations();
});

