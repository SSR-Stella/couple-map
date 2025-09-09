import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// === 配置 ===
const SHEET_ID = "1uIprOcVA6H49PGNNo_od5qkpvSwZdvGSUmtFCGQj1WU";
const SHEET_GID = "0";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${SHEET_GID}`;
// 简易口令（自己改）：输入正确后会记在 localStorage，下次自动放行
const PASSCODE = "0520";

// 解析 GViz JSON（⚠️ 优先使用 cell.f 的“显示文本”以避免时区偏移）
function parseGViz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("GViz response malformed");
  const json = JSON.parse(text.slice(start, end + 1));
  const cols = json.table.cols.map((c) => c.label || c.id);
  const rows = json.table.rows.map((r) =>
    Object.fromEntries(
      r.c.map((cell, i) => [cols[i], cell ? (cell.f ?? cell.v ?? "") : ""])
    )
  );
  return rows;
}

// 经纬度清洗
function toNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/，/g, ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// 日期标准化：尽量转成 YYYY-MM-DD；如果是自定义文本（如“8月”）则原样返回
function formatDate(val) {
  if (!val) return "";

  // 1) 已是 YYYY-MM-DD 这类易读格式：直接返回
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // 2) GViz 的 Date(...) 字符串
  const m = typeof val === "string" && val.match(/^Date\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // 3) ISO 字符串（按 UTC 取日，避免跨区-1天）
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const dt = new Date(val);
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // 4) Excel 序列号
  if (typeof val === "number") {
    const ms = Date.UTC(1899, 11, 30) + Math.round(val * 86400000);
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // 5) 其它自定义文本（如“8月”“夏天某天”）：原样返回
  return String(val);
}

export default function App() {
  // —— 入口暗号门 ——
  const [unlocked, setUnlocked] = useState(
    typeof window !== "undefined" && localStorage.getItem("gate_ok") === "1"
  );
  useEffect(() => {
    if (unlocked) return;
    const code = prompt("请输入暗号：");
    if (code === PASSCODE) {
      localStorage.setItem("gate_ok", "1");
      setUnlocked(true);
    } else {
      alert("暗号错误！");
    }
  }, [unlocked]);

  if (!unlocked) {
    return <div style={{ padding: 20 }}>未授权访问</div>;
  }

  // —— 正式逻辑 ——
  const [rows, setRows] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");

  // 修复 Leaflet 默认 marker 图标
  useEffect(() => {
    try {
      // eslint-disable-next-line no-underscore-dangle
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    } catch (e) {
      console.warn("Leaflet icon patch skipped:", e);
    }
  }, []);

  // 初始化世界地图
  useEffect(() => {
    if (map) return;
    try {
      const m = L.map("map", { worldCopyJump: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(m);
      m.setView([20, 0], 2); // 世界视角
      setMap(m);
    } catch (e) {
      console.error("Map init failed:", e);
    }
  }, [map]);

  // 拉取 Google Sheet
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GVIZ_URL + "&_=" + Date.now());
        const txt = await res.text();
        const parsed = parseGViz(txt).map((r) => ({
          id: r.id,
          city: r.city,
          name: r.name,
          category: r.category,
          status: r.status, // visited / want
          lat: toNum(r.lat),
          lon: toNum(r.lon),
          image_url: r.image_url,
          video_url: r.video_url, // 可选
          date: formatDate(r.date), // ← 使用修正后的日期
          notes: r.notes,
        }));
        setRows(parsed);
        console.log("Loaded rows:", parsed.length);
      } catch (e) {
        console.error("Google Sheet fetch/parse failed:", e);
      }
    })();
  }, []);

  // 过滤数据
  const list = useMemo(() => {
    return rows.filter(
      (r) => (!city || r.city === city) && (!status || r.status === status)
    );
  }, [rows, city, status]);

  // 渲染标记（点开弹窗显示 图片/视频 + 文本）
  useEffect(() => {
    if (!map) return;

    // 清空旧标记
    markers.forEach((mk) => map.removeLayer(mk));

    const ms = [];
    const bounds = [];

    list.forEach((p) => {
      if (p.lat != null && p.lon != null) {
        // 优先用视频；没有视频就用图片
        const media = p.video_url
          ? `<video src="${p.video_url}" controls style="width:100%;height:140px;border-radius:8px;background:#000;object-fit:cover"></video>`
          : `<img src="${p.image_url || ""}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:#f2f2f2"/>`;

        const popupHtml = `
          <div style="width:260px">
            ${media}
            <div style="margin-top:6px;font-weight:600">${p.name || ""}
              <span style="margin-left:6px;font-size:12px;background:#f2f4f7;padding:2px 6px;border-radius:999px">${p.city || ""}</span>
              <span style="margin-left:6px;font-size:12px;background:#eef6ff;padding:2px 6px;border-radius:999px">${p.category || ""}</span>
              <span style="margin-left:6px;font-size:12px;background:#eaf7ea;padding:2px 6px;border-radius:999px">${p.status === "visited" ? "去过" : "想去"}</span>
            </div>
            ${p.notes ? `<div style="color:#555;font-size:12px;margin-top:4px">${p.notes}</div>` : ""}
            ${p.date ? `<div style="color:#999;font-size:12px;margin-top:4px">${p.date}</div>` : ""}
          </div>
        `;
        const mk = L.marker([p.lat, p.lon]).addTo(map).bindPopup(popupHtml);
        ms.push(mk);
        bounds.push([p.lat, p.lon]);
      }
    });

    setMarkers(ms);

    if (bounds.length >= 1) {
      const b = L.latLngBounds(bounds);
      map.fitBounds(b, { padding: [40, 40], maxZoom: 12 });
    } else {
      map.setView([20, 0], 2);
    }
  }, [map, list]);

  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city))).filter(Boolean).sort(),
    [rows]
  );

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="title">雨也在想你</h1>
        <div className="filters">
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">全部城市</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="visited">去过</option>
            <option value="want">想去</option>
          </select>
        </div>
      </header>

      <div id="map" className="map-full" />
    </div>
  );
}
