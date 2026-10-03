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

    let lastDrawnLayer = null;

    // الطبقات المكانية الحقيقية
    let ghiLayer = null;
    let demLayer = null;
    let windLayer = null;

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
            panelCount: "عدد الألواح:",
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
            panelCount: "Panel Count:",
            estPower: "Expected Capacity:",
            btnExport: "Export Report",
            btnCalc: "Load Calculator",
            developerName: "Designed & Developed by Shahd Saif"
        }
    };

    function sanitizeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (match) {
            const escapeChars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
            return escapeChars[match];
        });
    }

    function initMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // 1. تهيئة الخريطة العالمية بدون قيود حدودية
            map = L.map('map', {
                center: [15.5007, 32.5599],
                zoom: 13,
                maxZoom: 22,
                zoomControl: false
            });

            L.control.zoom({ position: 'bottomleft' }).addTo(map);

            // 2. خريطة الأقمار الاصطناعية العالمية فائق الجودة
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 19,
                maxZoom: 22,
                attribution: 'Tiles &copy; Esri WorldImagery'
            }).addTo(map);

            // 3. طبقة الأسماء والمدن والحدود العالمية
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 19,
                maxZoom: 22
            }).addTo(map);

            // --- إعداد الطبقات المكانية التفاعلية ---

            // طبقة الإشعاع الشمسي (GHI Overlay)
            ghiLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NAEarth/GHI_Solar_Radiation/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 18,
                maxZoom: 22,
                opacity: 0.5
            });

            // طبقة التضاريس والارتفاعات (DEM / Hillshade)
            demLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 18,
                maxZoom: 22,
                opacity: 0.45
            });

            // طبقة حركة الرياح والضغط (Wind)
            windLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/Soil_Survey_Map/MapServer/tile/{z}/{y}/{x}', {
                maxNativeZoom: 18,
                maxZoom: 22,
                opacity: 0.4
            });

            // إضافة الطبقة الافتراضية
            ghiLayer.addTo(map);

            // 4. أداة الرسم المكانية
            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            polygonDrawer = new L.Draw.Polygon(map);

            const drawControl = new L.Control.Draw({
                position: 'bottomleft',
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
                lastDrawnLayer = layer;
                calculateAreaAndPanels(layer);
            });

            setupLayerToggleListeners();

        } catch (error) {
            console.error("خطأ أثناء تهيئة الخريطة:", error);
        }
    }

    /**
     * ربط خيارات الطبقات بإظهارها وإخفائها فوراً
     */
    function setupLayerToggleListeners() {
        const chkGhi = document.getElementById('chk-ghi');
        const chkDem = document.getElementById('chk-dem');
        const chkWind = document.getElementById('chk-wind');

        if (chkGhi) {
            chkGhi.addEventListener('change', function () {
                if (this.checked) map.addLayer(ghiLayer);
                else map.removeLayer(ghiLayer);
            });
        }

        if (chkDem) {
            chkDem.addEventListener('change', function () {
                if (this.checked) map.addLayer(demLayer);
                else map.removeLayer(demLayer);
            });
        }

        if (chkWind) {
            chkWind.addEventListener('change', function () {
                if (this.checked) map.addLayer(windLayer);
                else map.removeLayer(windLayer);
            });
        }
    }

    window.startPolygonDraw = function () {
        if (polygonDrawer) polygonDrawer.enable();
        else if (map) new L.Draw.Polygon(map).enable();
    };

    window.recalculateCurrentPolygon = function () {
        if (lastDrawnLayer) {
            calculateAreaAndPanels(lastDrawnLayer);
        }
    };

    /**
     * حساب المساحة، عدد الألواح بواتية مخصصة، وزاوية التعامد الشمسية
     */
    function calculateAreaAndPanels(layer) {
        try {
            const latLngs = layer.getLatLngs()[0];
            let areaInMeters = L.GeometryUtil ? L.GeometryUtil.geodesicArea(latLngs) : 0;
           
            if (areaInMeters <= 0) return;

            // أخذ قدرة اللوح المحددة من المدخل
            const panelWattInput = parseFloat(document.getElementById('input-panel-watt').value) || 550;
           
            // حساب المساحة التقريبية لكل لوح بناءً على قدرته
            const areaPerPanel = (panelWattInput >= 500) ? 2.6 : 2.0;
            const panelCount = Math.floor(areaInMeters / areaPerPanel);
            const totalCapacityKWp = ((panelCount * panelWattInput) / 1000).toFixed(2);

            // حساب زاوية الميل والتعامد الشمسية بناءً على دائرة العرض
            const centerLat = latLngs[0].lat;
            const centerLng = latLngs[0].lng;
            const optimalTiltAngle = Math.abs(centerLat * 0.9 + 2.5).toFixed(1);
            const orientationText = (centerLat >= 0) ? `Tilt: ${optimalTiltAngle}° South (جنوباً)` : `Tilt: ${optimalTiltAngle}° North (شمالاً)`;

            // تحديث عناصر الواجهة
            document.getElementById('val-area').innerText = sanitizeHTML(areaInMeters.toFixed(2) + ' m²');
            document.getElementById('val-panels').innerText = sanitizeHTML(panelCount + ' ' + (currentLanguage === 'ar' ? 'لوح' : 'Panels'));
            document.getElementById('val-tilt-angle').innerText = sanitizeHTML(`${optimalTiltAngle}°`);
            document.getElementById('val-power').innerText = sanitizeHTML(totalCapacityKWp + ' kWp');

            const locationBadge = document.getElementById('val-location-text');
            if (locationBadge) {
                locationBadge.innerHTML = sanitizeHTML(`<i class="fa-solid fa-location-dot"></i> [${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}] | زاوية التعامد: ${optimalTiltAngle}°`);
            }

            // تحديث بيانات التقرير الفني
            document.getElementById('rep-area').innerText = areaInMeters.toFixed(2) + ' m²';
            document.getElementById('rep-panel-watt').innerText = panelWattInput + ' W';
            document.getElementById('rep-panels').innerText = panelCount + ' لوح';
            document.getElementById('rep-kwp').innerText = totalCapacityKWp + ' kWp';
            document.getElementById('rep-tilt').innerText = orientationText;
            document.getElementById('rep-coords').innerText = `[${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}]`;

            // إظهار نافذة التأكيد زر OK
            const popupContent = `
                <div style="text-align:center; font-family:sans-serif; padding:6px; color:#0f172a; min-width:170px;">
                    <h4 style="margin:0 0 6px 0; color:#0284c7; font-size:13px; font-weight:bold;">📐 نتائج الموقع والتوجيه</h4>
                    <p style="margin:2px 0; font-size:12px;"><strong>المساحة:</strong> ${areaInMeters.toFixed(2)} m²</p>
                    <p style="margin:2px 0; font-size:12px;"><strong>القدرة:</strong> ${totalCapacityKWp} kWp (${panelCount} لوح)</p>
                    <p style="margin:2px 0; font-size:11px; color:#eab308; font-weight:bold;">☀️ زاوية التعامد: ${optimalTiltAngle}°</p>
                    <button id="btn-ok-confirm" style="margin-top:8px; background:#059669; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px; width:100%;">
                        موافق / OK 👍
                    </button>
                </div>
            `;

            layer.bindPopup(popupContent, { closeButton: false }).openPopup();

            setTimeout(() => {
                const okBtn = document.getElementById('btn-ok-confirm');
                if (okBtn) {
                    okBtn.onclick = function () {
                        layer.closePopup();
                        layer.bindTooltip(`<b>${areaInMeters.toFixed(2)} m²</b> | ${totalCapacityKWp} kWp <br><small>☀️ Tilt: ${optimalTiltAngle}°</small>`, {
                            permanent: true,
                            direction: 'center',
                            className: 'polygon-area-label'
                        }).openTooltip();
                    };
                }
            }, 150);

        } catch (err) {
            console.error("خطأ في حساب المساحة والتعامد:", err);
        }
    }

    // --- دوال فتح وإغلاق النوافذ المنبثقة وحساب الأحمال ---
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

        document.getElementById('rep-load').innerText = kw + ' kW';


        document.getElementById('rep-inverter').innerText = inverterKw + ' kW';
        document.getElementById('rep-battery').innerText = batteryKwh + ' kWh (48V / ' + batteryAh + 'Ah)';
        alert('تم حساب الأحمال وتحديث التقرير الهندسي بنجاح! ✅');
        window.closeSizingModal();
    };

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
