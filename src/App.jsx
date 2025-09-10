import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// === 配置 ===
const SHEET_ID = "1uIprOcVA6H49PGNNo_od5qkpvSwZdvGSUmtFCGQj1WU";
const SHEET_GID = "0";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${SHEET_GID}`;
const PASSCODE = "0520";

// 解析 GViz JSON（优先 cell.f）
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

function toNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/，/g, ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// 日期标准化
function formatDate(val) {
  if (!val) return "";
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const m = typeof val === "string" && val.match(/^Date\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const dt = new Date(val);
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (typeof val === "number") {
    const ms = Date.UTC(1899, 11, 30) + Math.round(val * 86400000);
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
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
  if (!unlocked) return <div style={{ padding: 20 }}>未授权访问</div>;

  // —— 正式逻辑 ——
  const [rows, setRows] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");

  // 音频控制
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null); // { name, city, url, playing }

  useEffect(() => {
    try {
      // eslint-disable-next-line no-underscore-dangle
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (map) return;
    const m = L.map("map", { worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    m.setView([20, 0], 2);
    setMap(m);
  }, [map]);

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
          status: r.status,
          lat: toNum(r.lat),
          lon: toNum(r.lon),
          image_url: r.image_url,
          video_url: r.video_url,
          music_url: r.music_url, // 🆕 每个地点的音乐直链（mp3）
          date: formatDate(r.date),
          notes: r.notes,
        }));
        setRows(parsed);
      } catch (e) {
        console.error("Google Sheet fetch/parse failed:", e);
      }
    })();
  }, []);

  const list = useMemo(() => {
    return rows.filter(
      (r) => (!city || r.city === city) && (!status || r.status === status)
    );
  }, [rows, city, status]);

  useEffect(() => {
    if (!map) return;

    // 清空旧标记
    markers.forEach((mk) => map.removeLayer(mk));

    const ms = [];
    const bounds = [];

    list.forEach((p) => {
      if (p.lat == null || p.lon == null) return;

      // 媒体：优先视频，其次图片
      const media = p.video_url
        ? `<video src="${p.video_url}" controls style="width:100%;height:140px;border-radius:8px;background:#000;object-fit:cover"></video>`
        : `<img src="${p.image_url || ""}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:#f2f2f2"/>`;

      // 🆕 查看大图链接（只有有 image_url 时显示）
      const viewLink = p.image_url
        ? `<div style="margin-top:6px"><a href="${p.image_url}" target="_blank" rel="noopener noreferrer">查看大图</a></div>`
        : "";

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
          ${viewLink}
        </div>
      `;

      const mk = L.marker([p.lat, p.lon]).addTo(map).bindPopup(popupHtml);

      // 🆕 点击标记时，播放该地点音乐
      mk.on("click", async () => {
        if (!p.music_url || !audioRef.current) return;
        try {
          if (audioRef.current.src !== p.music_url) {
            audioRef.current.src = p.music_url;
          }
          await audioRef.current.play();
          setCurrentTrack({ name: p.name || "", city: p.city || "", url: p.music_url, playing: true });
        } catch (err) {
          console.warn("Autoplay blocked or play failed:", err);
          // 某些设备需要用户再点一次播放按钮
          setCurrentTrack({ name: p.name || "", city: p.city || "", url: p.music_url, playing: false });
        }
      });

      ms.push(mk);
      bounds.push([p.lat, p.lon]);
    });

    setMarkers(ms);

    if (bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
    } else {
      map.setView([20, 0], 2);
    }
  }, [map, list]);

  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city))).filter(Boolean).sort(),
    [rows]
  );

  // 播放/暂停按钮
  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setCurrentTrack((t) => t ? { ...t, playing: true } : t);
      } else {
        audioRef.current.pause();
        setCurrentTrack((t) => t ? { ...t, playing: false } : t);
      }
    } catch (e) {
      console.warn("toggle play failed:", e);
    }
  };

  return (
    <div className="page">
      {/* 🆕 顶部右侧的迷你播放器 */}
      <div style={{
        position: "absolute", right: 10, top: 10, zIndex: 1000,
        background: "rgba(255,255,255,.92)", border: "1px solid rgba(0,0,0,.05)",
        borderRadius: 12, padding: "8px 10px", boxShadow: "0 2px 10px rgba(0,0,0,.05)",
        display: "flex", gap: 8, alignItems: "center"
      }}>
        <button onClick={togglePlay} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #eee", background: "#fff", cursor: "pointer" }}>
          {currentTrack?.playing ? "⏸︎ 暂停" : "▶︎ 播放"}
        </button>
        <div style={{ fontSize: 12, color: "#333", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentTrack ? `正在播放：${currentTrack.name} · ${currentTrack.city}` : "未选择音乐"}
        </div>
        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} loop />
      </div>

      <header className="topbar">
        <h1 className="title">雨也在想你♥</h1>
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
            <option value="others">其他</option>
          </select>
        </div>
      </header>

      <div id="map" className="map-full" />
    </div>
  );
}
