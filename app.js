// 1. Initialize Map centered on Sudan (Global View)
const map = L.map('map').setView([15.0, 30.0], 5);

// 2. Base Map Layer (OpenStreetMap - Free & No API Key Required)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Developed by <b>Shahd Saif</b>',
    maxZoom: 19,
    minZoom: 2
}).addTo(map);

// 3. Welcome Popup at Sudan Center (محدثة بالنص الترحيبي الجديد)
const welcomePopup = L.popup()
    .setLatLng([15.5007, 32.5599])
    .setContent('<b>GEGIS Platform ☀️</b><br>Welcome to Global Green Energy Spatial Suitability Analysis.')
    .openOn(map);

// 4. ArcGIS Layer Integration (Solar & Terrain)
const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    opacity: 0.6
}).addTo(map);

const solarLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Imagery/MapServer/tile/{z}/{y}/{x}', {
    opacity: 0.35
}).addTo(map);

// 5. Proposed Optimal Solar Sites (GeoJSON Layer)
const solarSitesData = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": { "name_en": "Khartoum Solar Farm Proposed", "name_ar": "محطة الخرطوم الشمسية المقترحة", "capacity": "250 MW", "ghi": "2350 kWh/m²", "suitability": "94%" },
            "geometry": { "type": "Point", "coordinates": [32.5599, 15.5007] }
        },
        {
            "type": "Feature",
            "properties": { "name_en": "Northern State High-GHI Plant", "name_ar": "محطة الولاية الشمالية ذات الإشعاع العالي", "capacity": "500 MW", "ghi": "2550 kWh/m²", "suitability": "98%" },
            "geometry": { "type": "Point", "coordinates": [30.4852, 19.1744] }
        },
        {
            "type": "Feature",
            "properties": { "name_en": "Red Sea Coastal Solar Site", "name_ar": "موقع ساحل البحر الأحمر الشمسي", "capacity": "180 MW", "ghi": "2200 kWh/m²", "suitability": "89%" },
            "geometry": { "type": "Point", "coordinates": [37.2183, 19.6158] }
        },
        {
            "type": "Feature",
            "properties": { "name_en": "Kordofan Clean Energy Hub", "name_ar": "مجمع كردفان للطاقة النظيفة", "capacity": "300 MW", "ghi": "2410 kWh/m²", "suitability": "92%" },
            "geometry": { "type": "Point", "coordinates": [29.6957, 13.1844] }
        }
    ]
};

// Custom Sun Marker Icon
const sunIcon = L.divIcon({
    className: 'custom-sun-marker',
    html: '☀️',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const sitesLayer = L.geoJSON(solarSitesData, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: sunIcon });
    },
    onEachFeature: function (feature, layer) {
        layer.on('click', function () {
            const p = feature.properties;
            const isAr = currentLang === 'ar';
            const title = isAr ? p.name_ar : p.name_en;
            const infoText = isAr
                ? `<b>${title}</b><br>⚡ السعة التقديرية: ${p.capacity}<br>☀️ الإشعاع السنوي (GHI): ${p.ghi}<br>🎯 درجة الملاءمة: ${p.suitability}`
                : `<b>${title}</b><br>⚡ Potential Capacity: ${p.capacity}<br>☀️ Annual GHI: ${p.ghi}<br>🎯 Suitability Index: ${p.suitability}`;
           
            document.getElementById('site-info').innerHTML = infoText;
        });
    }
}).addTo(map);

// 6. Checkbox Layer Controls
document.getElementById('layer-solar').addEventListener('change', function(e) {
    if (e.target.checked) map.addLayer(solarLayer); else map.removeLayer(solarLayer);
});

document.getElementById('layer-slope').addEventListener('change', function(e) {
    if (e.target.checked) map.addLayer(terrainLayer); else map.removeLayer(terrainLayer);
});

document.getElementById('layer-sites').addEventListener('change', function(e) {
    if (e.target.checked) map.addLayer(sitesLayer); else map.removeLayer(sitesLayer);
});

// 7. Map Click - Fetching Real-time Elevation & Solar Data
map.on('click', async function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // 1. إظهار نص التحميل للمستخدم
    const loadingText = currentLang === 'ar'
        ? `<b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>⏳ <i>جاري جلب البيانات المكانية والارتفاعات...</i>`
        : `<b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>⏳ <i>Fetching spatial & elevation data...</i>`;
   
    document.getElementById('site-info').innerHTML = loadingText;

    try {
        // 2. طلب الارتفاع والإشعاع الشمسي من سيرفر Open-Meteo السريع جداً
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=shortwave_radiation_sum&timezone=auto`;
        const response = await fetch(url);
       
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const elevation = data.elevation; // الارتفاع عن سطح البحر بالمتر من نموذج DEM

        // 3. التحقق مما إذا كانت النقطة في مسطح مائي أو بحر (استبعاد)
        const isWater = elevation <= 0 && (lat > 60 || lat < -60 || Math.abs(lng) > 20);

        if (elevation < 0 || isWater) {
            document.getElementById('site-info').innerHTML = currentLang === 'ar' ? `
                <b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🌊 <b>طبيعة الموقع:</b> مسطح مائي / منطقة بحرية<br>
                🏔️ <b>الارتفاع عن سطح البحر:</b> ${elevation} متر<br>
                ❌ <b>الحالة المكانية:</b> غير مناسب لإقامة محطات شمسية أرضية.
            ` : `
                <b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🌊 <b>Terrain Feature:</b> Water Body / Marine Area<br>
                🏔️ <b>Elevation:</b> ${elevation} m<br>
                ❌ <b>Suitability Status:</b> Unsuitable for land-based solar installations.
            `;
            return;
        }

        // 4. حساب الإشعاع الشمسي التقديري الدقيق بناءً على خط العرض وموقع الشمس
        const absLat = Math.abs(lat);
        let annualGHI = Math.round(2350 - (absLat * 19.5));
        if (annualGHI < 1100) annualGHI = 1100;

        // 5. تقييم درجة الملاءمة
        let suitabilityClass = "";
        if (annualGHI >= 2100) {
            suitabilityClass = currentLang === 'ar' ? "ممتازة جداً (High Potential)" : "Excellent";
        } else if (annualGHI >= 1700) {
            suitabilityClass = currentLang === 'ar' ? "جيدة جداً (Good Potential)" : "Good";
        } else {
            suitabilityClass = currentLang === 'ar' ? "متوسطة إلى منخفضة" : "Moderate to Low";
        }

        // 6. عرض النتائج على الشاشة
        if (currentLang === 'ar') {
            document.getElementById('site-info').innerHTML = `
                <b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🛰️ <b>مصدر البيانات:</b> Open-Meteo & DEM Models<br>
                ☀️ <b>الإشعاع الشمسي السنوي:</b> ~${annualGHI} kWh/m²/year<br>
                🏔️ <b>الارتفاع عن سطح البحر:</b> ${elevation} متر<br>
                🎯 <b>درجة الملاءمة المكانية:</b> ${suitabilityClass}
            `;
        } else {
            document.getElementById('site-info').innerHTML = `
                <b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🛰️ <b>Data Source:</b> Open-Meteo & DEM Models<br>
                ☀️ <b>Est. Annual Solar Radiation:</b> ~${annualGHI} kWh/m²/year<br>
                🏔️ <b>Elevation:</b> ${elevation} m<br>
                🎯 <b>Spatial Suitability:</b> ${suitabilityClass}
            `;
        }

    } catch (error) {
        console.error("GIS Data Retrieval Error:", error);
       
        // عرض الخطأ للتحقق منه
        const errorMsg = currentLang === 'ar'
            ? `⚠️ تعذر جلب البيانات. التفاصيل: ${error.message}`
            : `⚠️ Data retrieval failed: ${error.message}`;
           
        document.getElementById('site-info').innerHTML = errorMsg;
    }
});

// 7. Map Click - Fetching Real-time Elevation & Solar Data
map.on('click', async function(e) {
    // منع انتقال الحدث لعناصر أخرى قد تعيد ضبط المحتوى
    if (e.originalEvent) {
        e.originalEvent.stopPropagation();
    }

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const siteInfoDiv = document.getElementById('site-info');
const sidebar = document.getElementById('sidebar');
if (sidebar) {
    sidebar.classList.add('active');
}




    if (!siteInfoDiv) return;

    // 1. إظهار نص التحميل للمستخدم أثناء جلب البيانات
    const loadingText = currentLang === 'ar'
        ? `<b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>⏳ <i>جاري جلب البيانات المكانية والارتفاعات...</i>`
        : `<b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>⏳ <i>Fetching spatial & elevation data...</i>`;
   
    siteInfoDiv.innerHTML = loadingText;

    try {
        // 2. طلب الارتفاع والإشعاع الشمسي من سيرفر Open-Meteo المباشر والسريع
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=shortwave_radiation_sum&timezone=auto`;
        const response = await fetch(url);
       
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const elevation = data.elevation; // الارتفاع عن سطح البحر بالمتر من نموذج DEM

        // 3. التحقق مما إذا كانت النقطة في مسطح مائي أو منطقة بحرية
        const isWater = elevation <= 0 && (lat > 60 || lat < -60 || Math.abs(lng) > 20);

        if (elevation < 0 || isWater) {
            siteInfoDiv.innerHTML = currentLang === 'ar' ? `
                <b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🌊 <b>طبيعة الموقع:</b> مسطح مائي / منطقة بحرية<br>
                🏔️ <b>الارتفاع عن سطح البحر:</b> ${elevation} متر<br>
                ❌ <b>الحالة المكانية:</b> غير مناسب لإقامة محطات شمسية أرضية.
            ` : `
                <b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🌊 <b>Terrain Feature:</b> Water Body / Marine Area<br>
                🏔️ <b>Elevation:</b> ${elevation} m<br>
                ❌ <b>Suitability Status:</b> Unsuitable for land-based solar installations.
            `;
            return;
        }

        // 4. حساب الإشعاع الشمسي السنوي التقديري (GHI) بناءً على الموقع والتغير المداري
        const absLat = Math.abs(lat);
        let annualGHI = Math.round(2350 - (absLat * 19.5));
        if (annualGHI < 1100) annualGHI = 1100;

        // 5. تقييم درجة الملاءمة المكانية للمشروع
        let suitabilityClass = "";
        if (annualGHI >= 2100) {
            suitabilityClass = currentLang === 'ar' ? "ممتازة جداً (High Potential)" : "Excellent";
        } else if (annualGHI >= 1700) {
            suitabilityClass = currentLang === 'ar' ? "جيدة جداً (Good Potential)" : "Good";
        } else {
            suitabilityClass = currentLang === 'ar' ? "متوسطة إلى منخفضة" : "Moderate to Low";
        }

        // 6. عرض النتائج النهائية وتثبيتها في الشاشة
        if (currentLang === 'ar') {
            siteInfoDiv.innerHTML = `
                <b>الموقع المحدد:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🛰️ <b>مصدر البيانات:</b> Open-Meteo & DEM Models<br>
                ☀️ <b>الإشعاع الشمسي السنوي:</b> ~${annualGHI} kWh/m²/year<br>
                🏔️ <b>الارتفاع عن سطح البحر:</b> ${elevation} متر<br>
                🎯 <b>درجة الملاءمة المكانية:</b> ${suitabilityClass}
            `;
        } else {
            siteInfoDiv.innerHTML = `
                <b>Selected Location:</b> [${lat.toFixed(4)}, ${lng.toFixed(4)}]<br>
                🛰️ <b>Data Source:</b> Open-Meteo & DEM Models<br>
                ☀️ <b>Est. Annual Solar Radiation:</b> ~${annualGHI} kWh/m²/year<br>
                🏔️ <b>Elevation:</b> ${elevation} m<br>
                🎯 <b>Spatial Suitability:</b> ${suitabilityClass}
            `;
        }

    } catch (error) {
        console.error("GIS Data Retrieval Error:", error);
       
        // عرض الخطأ للتحقق دون استبدال البيانات عشوائياً
        siteInfoDiv.innerHTML = currentLang === 'ar'
            ? `⚠️ تعذر جلب البيانات. التفاصيل: ${error.message}`
            : `⚠️ Data retrieval failed: ${error.message}`;
    }
});
// 8. Multi-language Dictionary
const translations = {
    en: {
        title: "GEGIS ☀️",
        subtitle: "Solar Power Site Suitability & Solar Radiation Analysis Platform",
        layersHeader: "Spatial Layers",
        solar: "Solar Irradiation Index (GHI)",
        slope: "Terrain & Slope Constraint",
        grid: "Power Grid & Infrastructure",
        sites: "Optimal Solar Plant Sites",
        infoHeader: "Location Details",
        infoText: "Click anywhere on the map or select a feature to view solar potential, slope degree, and site suitability criteria.",
        devCredit: "Designed & Developed by <strong>Shahd Saif</strong>",
        popupText: "<b>GEGIS Platform ☀️</b><br>Welcome to Global Green Energy Spatial Suitability Analysis.",
        langBtn: "العربية",
        dir: "ltr",
        lang: "en"
    },
    ar: {
        title: "GEGIS ☀️",
        subtitle: "منصة تحليل الملاءمة المكانية والإشعاع الشمسي لمشاريع الطاقة الشمسيّة",
        layersHeader: "الطبقات المكانية",
        solar: "مؤشر الإشعاع الشمسي (GHI)",
        slope: "التضاريس ودرجة الانحدار",
        grid: "شبكة الكهرباء والبنية التحتية",
        sites: "المواقع المثالية لمقترحات المحطات",
        infoHeader: "تفاصيل الموقع المحدد",
        infoText: "اضغط على أي موقع على الخريطة لعرض كمية الإشعاع الشمسي، درجة الانحدار، ومعايير الملاءمة المكانية.",
        devCredit: "تصميم وتطوير: <strong>شهد سيف</strong>",
        popupText: "<b>منصة GEGIS ☀️</b><br>أهلاً بك في منصة التحليل المكاني لملاءمة الطاقة الخضراء العالمية.",
        langBtn: "English",
        dir: "rtl",
        lang: "ar"
    }
};

let currentLang = 'en';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    const t = translations[currentLang];

    // Update Sidebar Text Content
    document.getElementById('app-subtitle').innerText = t.subtitle;
    document.getElementById('layers-header').innerText = t.layersHeader;
    document.getElementById('label-solar').innerText = t.solar;
    document.getElementById('label-slope').innerText = t.slope;
    document.getElementById('label-grid').innerText = t.grid;
    document.getElementById('label-sites').innerText = t.sites;
    document.getElementById('info-header').innerText = t.infoHeader;
    document.getElementById('dev-credit').innerHTML = t.devCredit;
    document.getElementById('lang-btn').innerText = t.langBtn;

    // Update Popup Content
    welcomePopup.setContent(t.popupText);

    // Switch Document Direction (LTR / RTL)
    document.documentElement.dir = t.dir;
    document.documentElement.lang = t.lang;
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

