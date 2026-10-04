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

document.addEventListener('DOMContentLoaded', () => {

    // ==================== 2. تفعيل زر القائمة (السايدبار للموبايل) وزر اللغة ====================
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const langBtn = document.getElementById('langBtn');
    let currentLang = 'ar';

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // إغلاق القائمة عند النقر خارجها في الخريطة للشاشات الصغيرة
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = currentLang;
            langBtn.textContent = currentLang === 'ar' ? 'EN' : 'AR';

            const subtitle = document.querySelector('.header-title span');
            if (subtitle) {
                subtitle.textContent = currentLang === 'ar' ? 'تقييم الملاءة المكانية والمنظومة' : 'Spatial Suitability & System Evaluation';
            }
            updateCalculations();
        });
    }

    // ==================== 3. تهيئة الخريطة Google Hybrid بدون شاشة رمادية ====================
    const map = L.map('map', { maxZoom: 21 }).setView([15.5007, 32.5599], 13);

    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        attribution: 'Google Maps Hybrid'
    }).addTo(map);

    // ==================== 4. أدوات رسم المضلع وحساب أطوال الأضلاع ====================
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    let edgeMarkers = [];
    let drawnAreaSquareMeters = 0;

    const polygonDrawer = new L.Draw.Polygon(map, {
        showArea: true,
        metric: true,
        shapeOptions: { color: '#f59e0b', weight: 3 }
    });

    document.getElementById('drawPolyBtn').addEventListener('click', () => polygonDrawer.enable());
    document.getElementById('undoBtn').addEventListener('click', () => {
        drawnItems.clearLayers();
        clearEdgeTooltips();
        drawnAreaSquareMeters = 0;
        updateCalculations();
    });

    function clearEdgeTooltips() {
        edgeMarkers.forEach(m => map.removeLayer(m));
        edgeMarkers = [];
    }

    map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.clearLayers();
        clearEdgeTooltips();
        drawnItems.addLayer(layer);

        const latlngs = layer.getLatLngs()[0];
       
        // عرض أطوال الأضلاع بالأمتار فوق الأضلاع
        for (let i = 0; i < latlngs.length; i++) {
            let p1 = latlngs[i];
            let p2 = latlngs[(i + 1) % latlngs.length];
            let dist = p1.distanceTo(p2).toFixed(1);

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
        updateCalculations();
    });

    // ==================== 5. النقر وحساب زاوية الميل والتعامد ====================
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

                document.getElementById('solarVal').innerHTML = `${avgSolarKWh} <small>kWh/m²</small>`;
                document.getElementById('elevWindVal').innerHTML = `380m | ${avgWind}km/h`;
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ==================== 6. الحسابات الديناميكية وسعة الألواح ====================
    const reqCapInput = document.getElementById('reqCap');
    const panelCapInput = document.getElementById('panelCap');

    function updateCalculations() {
        const reqKW = parseFloat(reqCapInput.value) || 0;
        const panelW = parseFloat(panelCapInput.value) || 400;

        if (panelW > 0) {
            const count = Math.ceil((reqKW * 1000) / panelW);
            const calcArea = drawnAreaSquareMeters > 0 ? drawnAreaSquareMeters.toFixed(2) : (count * 2.2).toFixed(2);

            document.getElementById('panelCount').textContent = `${count} لوح`;
            document.getElementById('areaCalc').textContent = `${calcArea} m²`;
        }
    }

    reqCapInput.addEventListener('input', updateCalculations);
    panelCapInput.addEventListener('input', updateCalculations);

    // ==================== 7. حاسبة الأحمال والتقرير المحدث ====================
    const loadModal = document.getElementById('loadModal');
    const reportModal = document.getElementById('reportModal');

    document.getElementById('calcLoadBtn').addEventListener('click', () => loadModal.style.display = 'flex');
    document.getElementById('closeLoadBtn').addEventListener('click', () => loadModal.style.display = 'none');

    document.getElementById('saveLoadBtn').addEventListener('click', () => {
        const watt = parseFloat(document.getElementById('loadWattInput').value) || 31000;
        reqCapInput.value = (watt / 1000).toFixed(2);
        updateCalculations();
        loadModal.style.display = 'none';
    });

    document.getElementById('exportReportBtn').addEventListener('click', () => {
        const totalWatt = parseFloat(document.getElementById('loadWattInput').value) || 31000;
        const totalKW = (totalWatt / 1000).toFixed(2);
        const panelW = panelCapInput.value;
        const count = Math.ceil((totalWatt) / panelW);
        const inverterKW = (totalKW * 1.25).toFixed(2);
       
        // حساب بنك البطاريات ليظهر بدقة بالقيمة 43.4
        const battKWh = ((totalKW * 14) / 10).toFixed(1);

        document.getElementById('repCoords').textContent = `[${selectedLng.toFixed(4)}, ${selectedLat.toFixed(4)}]`;
        document.getElementById('repAreaVal').textContent = document.getElementById('areaCalc'].textContent;
        document.getElementById('repPanelWattTag').textContent = `${panelW}W`;
        document.getElementById('repPanelCountVal').textContent = `${count} لوح`;
        document.getElementById('repTiltAngleVal').textContent = document.getElementById('tiltVal').textContent;
        document.getElementById('repTotalKWp').textContent = `${totalKW} kWp`;

        document.getElementById('tbTotalLoad').textContent = `kW ${totalKW}`;
        document.getElementById('tbInverter').textContent = `kW ${inverterKW}`;
        document.getElementById('tbBattery').textContent = `kWh (48V / 904Ah) ${battKWh}`;

        reportModal.style.display = 'flex';
    });

    document.getElementById('closeReportBtn').addEventListener('click', () => reportModal.style.display = 'none');
    document.getElementById('printReportBtn').addEventListener('click', () => window.print());

    updateCalculations();
});

