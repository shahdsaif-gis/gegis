/**
* GEGIS - Solar Power Site Suitability & System Sizing
* Designed & Developed by Shahd Saif
*/

'use strict';

(function () {
   
    let map = null;
    let drawnItems = null;
    let polygonDrawer = null;
    let currentLanguage = 'ar';

    const translations = {
        ar: {
            appTitle: "GEGIS Analytics ☀️",
            appSubtitle: "تقييم الملاءة المكانية والمنظومة",
            layersTitle: "الطبقات المكانية المتاحة",
            layerGhi: "إشعاع (GHI)",
            layerDem: "تضاريس (DEM)",
            layerWind: "الرياح",
            statGhi: "الإشعاع الشمسي",
            statElev: "الارتفاع / الرياح",
            statSuitability: "درجة الملاءة",
            areaTitle: "المساحة والألواح الشمسية",
            btnDraw: "رسم المضلع",
            totalArea: "المساحة الكلية:",
            panelCount: "عدد الألواح (400W):",
            estPower: "القدرة الإنتاجية المتوقعة:",
            btnExport: "تصدير التقرير",
            btnCalc: "حاسبة الأحمال",
            developerName: "Designed & Developed by Shahd Saif"
        },
        en: {
            appTitle: "GEGIS Analytics ☀️",
            appSubtitle: "Spatial Suitability & Sizing",
            layersTitle: "Available Spatial Layers",
            layerGhi: "Radiation (GHI)",
            layerDem: "Terrain (DEM)",
            layerWind: "Wind Speed",
            statGhi: "Solar Radiation",
            statElev: "Elevation / Wind",
            statSuitability: "Suitability Score",
            areaTitle: "Area & Solar Panels",
            btnDraw: "Draw Polygon",
            totalArea: "Total Area:",
            panelCount: "Panel Count (400W):",
            estPower: "Expected Capacity:",
            btnExport: "Export Report",
            btnCalc: "Load Calculator",
            developerName: "Designed & Developed by Shahd Saif"
        }
    };

    /**
     * دالة تطهير النصوص لمنع هجمات XSS
     */
    function sanitizeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (match) {
            const escapeChars = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return escapeChars[match];
        });
    }

    /**
     * تهيئة الخريطة مع تفعيل التكبير الرقمي العميق
     */
    function initMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // 1. تهيئة الخريطة مع رفع حد التكبير الكلي لرؤية المباني والصغائر (4x4m)
            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 14,
                maxZoom: 22,
                zoomControl: true
            });

            // 2. خريطة الأقمار الاصطناعية (Esri Satellite) مع التكبير الرقمي
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 19,
                maxZoom: 22,
                attribution: 'Tiles &copy; Esri'
            }).addTo(map);

            // 3. طبقة التضاريس والظلال
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 19,
                maxZoom: 22,
                opacity: 0.35,
                attribution: 'Esri Hillshade'
            }).addTo(map);

            // 4. طبقة الأسماء والحدود الشفافة فوق القمر الاصطناعي
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 19,
                maxZoom: 22
            }).addTo(map);

            // 5. طبقة الرسم وأداة المضلع
            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            polygonDrawer = new L.Draw.Polygon(map);

            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: true,
                    polyline: false,
                    rectangle: true,
                    circle: false,
                    marker: false,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, function (event) {
                const layer = event.layer;
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
                calculateAreaAndPanels(layer);
            });

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    /**
     * تفعيل زر رسم المضلع المباشر
     */
    window.startPolygonDraw = function () {
        if (polygonDrawer) {
            polygonDrawer.enable();
        } else if (map) {
            new L.Draw.Polygon(map).enable();
        }
    };

    /**
     * حساب المساحة والألواح وعرض زر OK والملصق الثابت فوق الرسم
     */
    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            const areaPerPanel = 2.2;
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * 400) / 1000).toFixed(2);

            // تحديث القيم في القائمة الجانبية
            const valArea = document.getElementById('val-area');
            const valPanels = document.getElementById('val-panels');
            const valPower = document.getElementById('val-power');

            if (valArea) valArea.innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            if (valPanels) valPanels.innerText = sanitizeHTML(panelCount + ' ' + (currentLanguage === 'ar' ? 'لوح' : 'Panels'));
            if (valPower) valPower.innerText = sanitizeHTML(totalCapacityKWp + ' kWp');

            // تحديث القيم في التقرير الفني
            const repArea = document.getElementById('rep-area');
            const repPanels = document.getElementById('rep-panels');
            const repKwp = document.getElementById('rep-kwp');

            if (repArea) repArea.innerText = areaInMeters.toFixed(2) + ' m²';
            if (repPanels) repPanels.innerText = panelCount + ' لوح';
            if (repKwp) repKwp.innerText = totalCapacityKWp + ' kWp';

            // إنشاء نافذة منبثقة فوق المضلع تحتوي على النتائج وزر OK
            const popupContent = `
                <div style="text-align:center; font-family:sans-serif; padding:6px; color:#0f172a; min-width:160px;">
                    <h4 style="margin:0 0 6px 0; color:#0284c7; font-size:13px; font-weight:bold;">📐 نتائج المساحة</h4>
                    <p style="margin:2px 0; font-size:12px;"><strong>المساحة:</strong> ${areaInMeters.toFixed(2)} m²</p>
                    <p style="margin:2px 0; font-size:12px;"><strong>القدرة:</strong> ${totalCapacityKWp} kWp</p>
                    <p style="margin:2px 0; font-size:11px; color:#475569;">(${panelCount} لوح شمسى)</p>
                    <button id="btn-ok-confirm" style="margin-top:8px; background:#059669; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px; width:100%;">
                        موافق / OK 👍
                    </button>
                </div>
            `;

            layer.bindPopup(popupContent, { closeButton: false }).openPopup();

            // عند الضغط على زر OK يتم تثبيت ملصق دائم فوق المضلع دون الحاجة للرجوع للقائمة
            setTimeout(() => {
                const okBtn = document.getElementById('btn-ok-confirm');
                if (okBtn) {
                    okBtn.onclick = function () {
                        layer.closePopup();
                        layer.bindTooltip(`<b>${areaInMeters.toFixed(2)} m²</b> | ${totalCapacityKWp} kWp`, {
                            permanent: true,
                            direction: 'center',
                            className: 'polygon-area-label'
                        }).openTooltip();
                    };
                }
            }, 150);

        } catch (err) {
            console.error("خطأ في حساب المساحة:", err);
        }
    }

    // --- دوال التحكم بالنوافذ المنبثقة (الأحمال والتقرير) ---
    window.openSizingModal = function () {
        const modal = document.getElementById('sizing-modal');
        if (modal) modal.style.display = 'flex';
    };

    window.closeSizingModal = function () {
        const modal = document.getElementById('sizing-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openReportModal = function () {
        const modal = document.getElementById('report-modal');
        if (modal) modal.style.display = 'flex';
    };

    window.closeReportModal = function () {
        const modal = document.getElementById('report-modal');
        if (modal) modal.style.display = 'none';
    };

    window.calculateSystemSizing = function () {
        const watts = parseFloat(document.getElementById('load-watts').value) || 5000;
        const nightHours = parseFloat(document.getElementById('night-hours').value) || 8;

        const kw = (watts / 1000).toFixed(2);
        const inverterKw = (kw * 1.25).toFixed(2);
        const batteryKwh = (kw * nightHours).toFixed(1);
        const batteryAh = Math.round((batteryKwh * 1000) / 48);

        const repLoad = document.getElementById('rep-load');
        const repInverter = document.getElementById('rep-inverter');
        const repBattery = document.getElementById('rep-battery');

        if (repLoad) repLoad.innerText = kw + ' kW';
        if (repInverter) repInverter.innerText = inverterKw + ' kW';
        if (repBattery) repBattery.innerText = batteryKwh + ' kWh (48V / ' + batteryAh + 'Ah)';

        alert('تم حساب الأحمال وتحديث التقرير الهندسي بنجاح! ✅');
        window.closeSizingModal();
    };

    /**
     * دالة تبديل اللغة
     */
    window.toggleLanguage = function () {
        currentLanguage = (currentLanguage === 'ar') ? 'en' : 'ar';
        const t = translations[currentLanguage];

        document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
       
        const langBtn = document.getElementById('lang-btn');
        if (langBtn) langBtn.innerText = (currentLanguage === 'ar') ? 'EN' : 'AR';
       
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        setText('txt-app-title', t.appTitle);
        setText('txt-app-subtitle', t.appSubtitle);
        setText('txt-layers-title', t.layersTitle);
        setText('txt-layer-ghi', t.layerGhi);
        setText('txt-layer-dem', t.layerDem);
        setText('txt-layer-wind', t.layerWind);
        setText('txt-stat-ghi-title', t.statGhi);
        setText('txt-stat-elev-title', t.statElev);
        setText('txt-stat-suitability-title', t.statSuitability);
        setText('txt-area-title', t.areaTitle);
        setText('txt-btn-draw', t.btnDraw);
        setText('txt-total-area', t.totalArea);
        setText('txt-panel-count', t.panelCount);
        setText('txt-est-power', t.estPower);
        setText('txt-btn-export', t.btnExport);
        setText('txt-btn-calc', t.btnCalc);
        setText('txt-developer-name', t.developerName);
    };

    document.addEventListener('DOMContentLoaded', initMap);

})();
