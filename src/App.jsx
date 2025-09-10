import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// === 配置 ===
const SHEET_ID = "1uIprOcVA6H49PGNNo_od5qkpvSwZdvGSUmtFCGQj1WU";
const SHEET_GID = "0";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${SHEET_GID}`;
const PASSCODE = "0520";

// ✅ 背景 BGM 直链（替换成你的 mp3 直链）
const BGM_URL = "https://raw.githubusercontent.com/SSR-Stella/couple-map/main/music/%E9%9B%A8%E4%B9%9F%E5%9C%A8%E6%83%B3%E4%BD%A0-%E5%AD%9F%E6%85%A7%E5%9C%86%232sa0kL.mp3";

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
function daysSince(dateString) {
  const start = new Date(dateString);
  const now = new Date();
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
function toNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(/，/g, ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
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
function fmt(t) {
  if (!Number.isFinite(t) || t < 0) return "00:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 线性音量渐变（淡入淡出 200ms）
async function fadeTo(audio, target = 1, duration = 200) {
  if (!audio) return;
  const start = audio.volume;
  const diff = target - start;
  if (Math.abs(diff) < 0.001 || duration <= 0) {
    audio.volume = target;
    return;
  }
  const startTime = performance.now();
  await new Promise((resolve) => {
    function step(now) {
      const p = Math.min(1, (now - startTime) / duration);
      audio.volume = start + diff * p;
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
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

  // 主播放器
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null); // { name, city, url, playing, muted, cur, dur, seeking }
  const lastNonZeroVol = useRef(1);

  // 背景 BGM
  const bgmRef = useRef(null);
  const bgmReady = useRef(false);

  // 修复默认 marker 图标
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

  // 初始化地图 + 尺寸刷新
  useEffect(() => {
    if (map) return;
    const m = L.map("map", { worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
      opacity: 0.9,       // 让地图微透明
    }).addTo(m);
    m.setView([20, 0], 2);
    setMap(m);
    setTimeout(() => m.invalidateSize(), 0);
    const onResize = () => m.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
          status: r.status,
          lat: toNum(r.lat),
          lon: toNum(r.lon),
          image_url: r.image_url,
          video_url: r.video_url,
          music_url: r.music_url,
          date: formatDate(r.date),
          notes: r.notes,
        }));
        setRows(parsed);
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

  // 背景 BGM 控制
  const playBGM = async () => {
    const b = bgmRef.current;
    if (!b || !BGM_URL) return;
    try {
      if (b.src !== BGM_URL) b.src = BGM_URL;
      b.volume = 0.4; // 默认稍微小一点
      await b.play();
      bgmReady.current = true;
    } catch (e) {
      // 移动端可能被策略拦截，等用户第一次交互后才会放
      bgmReady.current = false;
      // console.warn("BGM autoplay blocked:", e);
    }
  };
  const fadePauseBGM = async () => {
    const b = bgmRef.current;
    if (!b) return;
    try {
      await fadeTo(b, 0, 200);
      b.pause();
      b.volume = 0.4;
    } catch {}
  };
  const fadeResumeBGM = async () => {
    const b = bgmRef.current;
    if (!b || !BGM_URL) return;
    try {
      if (b.paused) await b.play();
      await fadeTo(b, 0.4, 200);
    } catch {}
  };

  // 页面加载尝试播放 BGM（被阻止也没关系）
  useEffect(() => {
    playBGM();
    // 第一次用户点击页面时再尝试一次
    const once = () => {
      if (!bgmReady.current) playBGM();
      window.removeEventListener("click", once);
      window.removeEventListener("touchstart", once);
    };
    window.addEventListener("click", once, { passive: true });
    window.addEventListener("touchstart", once, { passive: true });
    return () => {
      window.removeEventListener("click", once);
      window.removeEventListener("touchstart", once);
    };
  }, []);

  // 切歌（带淡入淡出）+ 暂停 BGM
  const playTrack = async (url, meta) => {
    const a = audioRef.current;
    if (!a || !url) return;

    // 先淡出并暂停 BGM
    await fadePauseBGM();

    try {
      if (!a.paused && !a.muted && a.volume > 0) {
        await fadeTo(a, 0, 200); // 淡出
      }
      if (a.src !== url) a.src = url;

      if (a.muted) {
        await a.play().catch(() => {});
        setCurrentTrack((t) => ({
          ...(t || {}),
          ...meta,
          url,
          playing: !a.paused,
          muted: true,
          cur: a.currentTime || 0,
          dur: Number.isFinite(a.duration) ? a.duration : 0,
          seeking: false,
        }));
        return;
      }

      if (a.volume > 0) lastNonZeroVol.current = a.volume;
      a.volume = 0;
      await a.play();
      await fadeTo(a, lastNonZeroVol.current || 1, 200); // 淡入

      setCurrentTrack((t) => ({
        ...(t || {}),
        ...meta,
        url,
        playing: true,
        muted: false,
        cur: a.currentTime || 0,
        dur: Number.isFinite(a.duration) ? a.duration : 0,
        seeking: false,
      }));
    } catch (err) {
      console.warn("Autoplay blocked or play failed:", err);
      setCurrentTrack((t) => ({
        ...(t || {}),
        ...meta,
        url,
        playing: false,
        cur: a?.currentTime || 0,
        dur: Number.isFinite(a?.duration) ? a.duration : 0,
        seeking: false,
      }));
    }
  };

  // 渲染标记
  useEffect(() => {
    if (!map) return;

    markers.forEach((mk) => map.removeLayer(mk));
    const ms = [];
    const bounds = [];

    list.forEach((p) => {
      if (p.lat == null || p.lon == null) return;

      const media = p.video_url
        ? `<video src="${p.video_url}" controls style="width:100%;height:140px;border-radius:8px;background:#000;object-fit:cover"></video>`
        : `<img src="${p.image_url || ""}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:#f2f2f2"/>`;

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

      mk.on("click", () => {
        if (!p.music_url) return;
        playTrack(p.music_url, { name: p.name || "", city: p.city || "" });
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
  }, [map, list]); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city))).filter(Boolean).sort(),
    [rows]
  );

  // 控制：播放/暂停、静音、进度
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) {
        // 播主曲目 → 要暂停 BGM
        await fadePauseBGM();
        if (!a.muted) {
          if (a.volume > 0) lastNonZeroVol.current = a.volume;
          a.volume = 0;
          await a.play();
          await fadeTo(a, lastNonZeroVol.current || 1, 200);
        } else {
          await a.play();
        }
        setCurrentTrack((t) => t ? { ...t, playing: true } : t);
      } else {
        // 暂停主曲目 → 恢复 BGM
        if (!a.muted) {
          await fadeTo(a, 0, 200);
          a.pause();
          a.volume = lastNonZeroVol.current || 1;
        } else {
          a.pause();
        }
        setCurrentTrack((t) => t ? { ...t, playing: false } : t);
        // 让 BGM 回来
        await fadeResumeBGM();
      }
    } catch (e) {
      console.warn("toggle play failed:", e);
    }
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.muted) {
      a.muted = false;
      a.volume = lastNonZeroVol.current || 1;
    } else {
      if (a.volume > 0) lastNonZeroVol.current = a.volume;
      a.muted = true;
    }
    setCurrentTrack((t) => t ? { ...t, muted: a.muted } : t);
  };

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTrack((t) => t ? { ...t, dur: Number.isFinite(a.duration) ? a.duration : 0 } : t);
  };
  const [days, setDays] = useState(daysSince("2018-04-01"));
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTrack((t) => {
      if (!t || t.seeking) return t;
      // 蓝色进度条填充
      const el = document.querySelector(".seek");
      if (el && t.dur) {
        const p = Math.min(1, a.currentTime / t.dur);
        el.style.backgroundSize = `${p * 100}% 100%`;
      }
      return { ...t, cur: a.currentTime };
    });
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    a.currentTime = v;
    setCurrentTrack((t) => t ? { ...t, cur: v, seeking: false } : t);
  };
  const onSeekStart = () => setCurrentTrack((t) => t ? { ...t, seeking: true } : t);
  const onSeekEnd = (e) => onSeek(e);

  return (
    <div className="page">
    <header className="topbar">
      {/* 左侧：标题 */}
      <div className="top-left">
        <div className="title-wrap">
          <h1 className="title-main">雨在想你</h1>
          <div className="title-sub">我也在想你❤</div>
        </div>
      </div>

      {/* 中间：居中显示天数 */}
      <div className="top-center">
        今天是遇到姐姐的第 <strong>{days}</strong> 天，今天也要开心哦 🥰
      </div>

      {/* 右侧：筛选 */}
      <div className="top-right filters">
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

      {/* 悬浮播放器（同一行展示，窄屏自动换行） */}
      <div className="floating-player">
        <button onClick={togglePlay} className="player-btn">
          {currentTrack?.playing ? "⏸︎ 暂停" : "▶︎ 播放"}
        </button>
        <button onClick={toggleMute} className="player-btn">
          {currentTrack?.muted ? "🔇 静音" : "🔊 声音"}
        </button>

        <div className="one-line">
          {currentTrack ? `正在播放：${currentTrack.name} · ${currentTrack.city}` : "未选择音乐"}
        </div>

        <div className="player-progress">
          <span className="time">{fmt(currentTrack?.cur ?? 0)}</span>
          <input
            className="seek"
            type="range"
            min={0}
            max={Math.max(1, Math.floor(currentTrack?.dur ?? 0))}
            value={Math.floor(currentTrack?.cur ?? 0)}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={onSeek}
            onMouseUp={onSeekEnd}
            onTouchEnd={onSeekEnd}
          />
          <span className="time">{fmt(currentTrack?.dur ?? 0)}</span>
        </div>

        {/* 主音频（地点音乐） */}
        <audio
          ref={audioRef}
          loop
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
        />

        {/* 背景 BGM（自动播放、循环，必要时会被暂停） */}
        <audio ref={bgmRef} src={BGM_URL} loop style={{ display: "none" }} />
      </div>
    </div>
  );
}
