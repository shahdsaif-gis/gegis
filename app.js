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
    if (!user) {
      if (!window.location.href.includes("login.html")) {
        window.location.href = "login.html";
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
    let currentLang = 'ar';

    // ==================== 2. زر القائمة الجانبية (Sidebar Toggle للموبايل) ====================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // ==================== 3. نظام تبديل اللغة (AR / EN) الشامل ====================
    const langBtn = document.getElementById('langBtn');

    function applyLanguage() {
        if (!langBtn) return;
      
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLang;
        langBtn.textContent = currentLang === 'ar' ? 'EN' : 'AR';

        // العنوان الفرعي
        const subtitle = document.querySelector('.header-title span');
        if (subtitle) {
            subtitle.textContent = currentLang === 'ar' ? 'تقييم الملائمة المكانية والمنظومة' : 'Spatial Suitability & System Evaluation';
        }

        // عناوين البطاقات الجانبية
        const cards = document.querySelectorAll('.sidebar .card h3');
        if (cards.length >= 4) {
            if (currentLang === 'en') {
                cards[0].innerHTML = '<i class="fa-solid fa-layer-group"></i> Spatial & Climatic Analysis';
                cards[1].innerHTML = '<i class="fa-solid fa-ruler-combined"></i> Area & Layout Assessment';
                cards[2].innerHTML = '<i class="fa-solid fa-bolt"></i> Load & System Components';
                cards[3].innerHTML = '<i class="fa-solid fa-solar-panel"></i> Solar Panel Specifications';
            } else {
                cards[0].innerHTML = '<i class="fa-solid fa-layer-group"></i> الطبقات المكانية المتاحة';
                cards[1].innerHTML = '<i class="fa-solid fa-ruler-combined"></i> المساحة والألواح الشمسية';
                cards[2].innerHTML = '<i class="fa-solid fa-bolt"></i> أحمال الأجهزة';
                cards[3].innerHTML = '<i class="fa-solid fa-solar-panel"></i> مواصفات الألواح الشمسية';
            }
        }

        // أزرار الرسم والتراجع
        const drawBtn = document.getElementById('drawPolyBtn');
        const undoBtn = document.getElementById('undoBtn');
        if (drawBtn) {
            drawBtn.innerHTML = currentLang === 'ar' ? '<i class="fa-solid fa-draw-polygon"></i> رسم المضلع' : '<i class="fa-solid fa-draw-polygon"></i> Draw Polygon';
        }
        if (undoBtn) {
            undoBtn.innerHTML = currentLang === 'ar' ? '<i class="fa-solid fa-rotate-left"></i> تراجع' : '<i class="fa-solid fa-rotate-left"></i> Undo';
        }

        // الأزرار السفلية
        const calcLoadBtn = document.getElementById('calcLoadBtn');
        const exportReportBtn = document.getElementById('exportReportBtn');
        if (calcLoadBtn) calcLoadBtn.textContent = currentLang === 'ar' ? 'حاسبة الأحمال' : 'Load Calculator';
        if (exportReportBtn) exportReportBtn.textContent = currentLang === 'ar' ? 'تصدير التقرير الهندسي' : 'Export Engineering Report';

        if (typeof updateCalculations === 'function') {
            updateCalculations();
        }
    }

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            applyLanguage();
        });
    }

    // ==================== 4. تهيئة الخريطة (Google Hybrid) ====================
    const map = L.map('map', { maxZoom: 21, zoomControl: true }).setView([15.5007, 32.5599], 13);

    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        attribution: 'Google Maps Hybrid'
    }).addTo(map);

    setTimeout(() => {
        map.invalidateSize();
    }, 200);

    // ==================== 5. أدوات الرسم والقياس ====================
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    let edgeMarkers = [];
    let drawnAreaSquareMeters = 19.91;
    let activePolygonLayer = null;

    const polygonDrawer = new L.Draw.Polygon(map, {
        showArea: true,
        metric: true,
        shapeOptions: { color: '#f59e0b', weight: 3 }
    });

    const drawPolyBtn = document.getElementById('drawPolyBtn');
    const undoBtn = document.getElementById('undoBtn');

    if (drawPolyBtn) {
        drawPolyBtn.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
            polygonDrawer.enable();
        });
    }

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            drawnItems.clearLayers();
            clearEdgeTooltips();
            drawnAreaSquareMeters = 19.91;
            document.getElementById('areaCalc').textContent = '19.91 m²';
            updateCalculations();
        });
    }

    function clearEdgeTooltips() {
        edgeMarkers.forEach(m => map.removeLayer(m));
        edgeMarkers = [];
    }

    map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        clearEdgeTooltips();
        drawnItems.addLayer(layer);
        activePolygonLayer = layer;

        const latlngs = layer.getLatLngs()[0];
        let dimensionsSummary = [];
        for (let i = 0; i < latlngs.length; i++) {
            let p1 = latlngs[i];
            let p2 = latlngs[(i + 1) % latlngs.length];
            let dist = p1.distanceTo(p2).toFixed(1);
            dimensionsSummary.push(`${dist}m`);

            let midLat = (p1.lat + p2.lat) / 2;
            let midLng = (p1.lng + p2.lng) / 2;

            let tooltip = L.tooltip({
                permanent: true,
                direction: 'center',
                className: 'edge-tooltip'
            }).setContent(`${dist} m`).setLatLng([midLat, midLng]);

            tooltip.addTo(map);
            edgeMarkers.push(tooltip);
        }

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
        document.getElementById('areaCalc').textContent = `${area.toFixed(2)} m²`;
        updateCalculations();

        const center = layer.getBounds().getCenter();
        const popupContent = document.createElement('div');
        popupContent.style.cssText = "text-align: right; font-family: 'Cairo', sans-serif; padding: 5px;";
        popupContent.innerHTML = `
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #0d1b2a;">${currentLang === 'ar' ? '📊 نتائج قياس المضلع' : '📊 Polygon Measurement'}</p>
            <p style="margin: 0 0 3px 0; font-size: 12px;">${currentLang === 'ar' ? 'المساحة:' : 'Area:'} <strong>${area.toFixed(2)} m²</strong></p>
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #555;">${currentLang === 'ar' ? 'الأطوال:' : 'Sides:'} ${dimensionsSummary.join(' - ')}</p>
            <button id="mapPopupOkBtn" style="background:#f39c12; color:#fff; border:none; padding:4px 14px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">OK</button>
        `;

        const popup = L.popup({ closeOnClick: false, autoClose: false })
            .setLatLng(center)
            .setContent(popupContent)
            .openOn(map);

        setTimeout(() => {
            const okBtn = document.getElementById('mapPopupOkBtn');
            if (okBtn) {
                okBtn.onclick = () => {
                    map.closePopup(popup);
                    if (sidebar && window.innerWidth <= 768) {
                        sidebar.classList.add('active');
                    }
                };
            }
        }, 100);
    });

    // ==================== 6. النقر على الخريطة للإشعاع والزاوية ====================
    let currentMarker = null;
    let selectedLat = 15.5007;
    let selectedLng = 32.5599;

    map.on('click', async (e) => {
        if (polygonDrawer._enabled) return;

        selectedLat = e.latlng.lat;
        selectedLng = e.latlng.lng;

        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.marker([selectedLat, selectedLng]).addTo(map);

        const optimalTilt = Math.abs(selectedLat).toFixed(1);
        document.getElementById('tiltVal').textContent = optimalTilt + '°';

        try {
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLat.toFixed(4)}&longitude=${selectedLng.toFixed(4)}&daily=shortwave_radiation_sum,wind_speed_10m_max&timezone=auto`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (data && data.daily) {
                const avgRadMJ = data.daily.shortwave_radiation_sum.reduce((a, b) => a + b, 0) / data.daily.shortwave_radiation_sum.length;
                const avgSolarKWh = (avgRadMJ / 3.6).toFixed(3);
                const avgWind = (data.daily.wind_speed_10m_max.reduce((a, b) => a + b, 0) / data.daily.wind_speed_10m_max.length).toFixed(0);

                document.getElementById('solarVal').innerHTML = `${avgSolarKWh} <small>kWh/m²/yr</small>`;
                document.getElementById('elevWindVal').textContent = `380m | ${avgWind}km/h`;
            }
        } catch (err) {
            console.error("API Error:", err);
        }
    });

    // ==================== 7. حاسبة الألواح ====================
    const reqCapInput = document.getElementById('reqCap');
    const panelCapInput = document.getElementById('panelCap');

    function updateCalculations() {
        const reqKW = parseFloat(reqCapInput.value) || 3.60;
        const panelW = parseFloat(panelCapInput.value) || 400;

        if (panelW > 0) {
            const count = Math.ceil((reqKW * 1000) / panelW);
            document.getElementById('panelCount').textContent = `${count} ${currentLang === 'ar' ? 'لوح' : 'Panels'}`;
        }
    }

    if (reqCapInput) reqCapInput.addEventListener('input', updateCalculations);
    if (panelCapInput) panelCapInput.addEventListener('input', updateCalculations);

    // ==================== 8. النوافذ والتقارير ====================
    const loadModal = document.getElementById('loadModal');
    const reportModal = document.getElementById('reportModal');

    const calcLoadBtn = document.getElementById('calcLoadBtn');
    const closeLoadBtn = document.getElementById('closeLoadBtn');
    const saveLoadBtn = document.getElementById('saveLoadBtn');

    if (calcLoadBtn && loadModal) {
        calcLoadBtn.addEventListener('click', () => { loadModal.style.display = 'flex'; });
    }
    if (closeLoadBtn && loadModal) {
        closeLoadBtn.addEventListener('click', () => { loadModal.style.display = 'none'; });
    }
    if (saveLoadBtn && loadModal) {
        saveLoadBtn.addEventListener('click', () => {
            const watt = parseFloat(document.getElementById('loadWattInput').value) || 31000;
            if (reqCapInput) {
                reqCapInput.value = (watt / 1000).toFixed(2);
                updateCalculations();
            }
            loadModal.style.display = 'none';
        });
    }

    const exportReportBtn = document.getElementById('exportReportBtn');
    const closeReportBtn = document.getElementById('closeReportBtn');
    const printReportBtn = document.getElementById('printReportBtn');

    if (exportReportBtn && reportModal) {
        exportReportBtn.addEventListener('click', () => {
            const totalWatt = parseFloat(document.getElementById('loadWattInput') ? document.getElementById('loadWattInput'].value : 31000) || 31000;
            const totalKW = (totalWatt / 1000).toFixed(2);
            const panelW = panelCapInput ? panelCapInput.value : 400;
            const count = Math.ceil(totalWatt / panelW);
            const inverterKW = (totalKW * 1.25).toFixed(2);
            const battKWh = ((totalKW * 14) / 10).toFixed(1);

            document.getElementById('repCoords').textContent = `[${selectedLng.toFixed(4)}, ${selectedLat.toFixed(4)}]`;
            document.getElementById('repAreaVal').textContent = document.getElementById('areaCalc').textContent;
            document.getElementById('repPanelWattTag').textContent = `${panelW}W`;
            document.getElementById('repPanelCountVal').textContent = `${count} ${currentLang === 'ar' ? 'لوح' : 'Panels'}`;
            document.getElementById('repTiltAngleVal').textContent = document.getElementById('tiltVal').textContent;
            document.getElementById('repTotalKWp').textContent = `${totalKW} kWp`;

            document.getElementById('tbTotalLoad').textContent = `kW ${totalKW}`;
            document.getElementById('tbInverter').textContent = `kW ${inverterKW}`;
            document.getElementById('tbBattery').textContent = `kWh (48V / 904Ah) ${battKWh}`;

            reportModal.style.display = 'flex';
        });
    }

    if (closeReportBtn && reportModal) {
        closeReportBtn.addEventListener('click', () => { reportModal.style.display = 'none'; });
    }
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => { window.print(); });
    }

    updateCalculations();
});

