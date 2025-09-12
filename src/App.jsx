import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

/* ===================== 配置 ===================== */
const SHEET_ID = "1uIprOcVA6H49PGNNo_od5qkpvSwZdvGSUmtFCGQj1WU";
const SHEET_GID = "0";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*&gid=${SHEET_GID}`;
const PASSCODE = "0520";

// 背景 BGM 直链
const BGM_URL = "https://raw.githubusercontent.com/SSR-Stella/couple-map/main/music/%E9%9B%A8%E4%B9%9F%E5%9C%A8%E6%83%B3%E4%BD%A0-%E5%AD%9F%E6%85%A7%E5%9C%86%232sa0kL.mp3";

/* ===================== 每日便签 ===================== */
const DAILY_NOTES = [
  "自分らしくのんびりに頑張ろうね",
  "穿越逆境 抵达繁星",
  "愿你的人生重拥抱自由和力量",
  "无论今天如何 你依然是我心里的光",
  "想念是每天都会更新的日程",
  "再小的日子 有你也闪亮",
  "世界拥挤 但心只为你留空",
  "风再大 也吹不散我的信念",
  "遇到难过时 记得你已走过远路",
  "别害怕 星星总会在夜晚出现",
  "最亮的光 常来自最深的黑暗",
  "喝水啊 别忘了照顾自己",
  "睡前给自己一个拥抱",
  "拍一张天空的照片送给我",
  "慢慢来 你已经很好了",
  "把微笑留给生活 真心留给爱",
  "我们还要一起看很多次日落",
  "未来很远 但我知道你在那儿",
  "抵达之前 我的心已经先到",
  "星星和月亮都在等我们",
  "黑夜再长 也会等到天明",
  "在平凡的日子里 你让我特别",
  "记得抬头看看天空 有思念飘过",
  "每一步都算数 每一天都值得",
  "和你相关的回忆都在发光",
  "愿你走过山河 依然觉得人间值得",
  "哪怕远隔千里 心依然靠近",
  "未来的路 我们会并肩走",
  "今天的风里 也有我的想你",
  "旅行的记忆 都是幸福的密码",
  "答案早已在心里",
  "想到你 心就不会冷",
  "温柔的人会得到温柔的世界",
  "离别只是下一次相遇的序章",
  "月亮今天也在想你",
  "笑容是最温暖的礼物",
  "夜空再黑 也挡不住心里的光",
  "风会替我轻轻拥抱你",
  "名字是心底最柔软的词",
  "等你的人 永远不会离开",
  "我的世界因为你辽阔",
  "思念会跨越一切距离",
  "遇见你是最美的意外",
  "孤单时想起你 就不孤单",
  "在我心里 你永远有位置",
  "我们是彼此的星辰与大海",
  "未来多远 我也愿意等你",
  "遇见你之后 才懂什么是心安",
  "你让我相信了浪漫",
  "风声里都藏着你的名字",
  "时间流转 爱一直在",
  "未来有你 才完整",
  "星辰会替我守护你",
  "下次见面 我要讲很多故事给你听",
  "抬头就能看到我的思念",
  "山高路远 也阻挡不了心意",
  "温柔能融化寒冬",
  "即使沉默 心也在交谈",
  "我的心 永远朝向你",
  "就算未来未知 我也不怕",
  "遇见是礼物 相伴是奇迹",
  "思念是没有边界的信号",
  "回忆是最亮的星光",
  "未来每一页 都写着我们的名字",
  "期待总会开花",
  "我的心里住着一束光 那是你",
  "越过黑暗 就会遇见繁星",
  "走过四季 你一直在",
  "心里的温柔 只为你保存",
  "爱会穿越时间和距离",
  "下一次重逢 一定更美好",
  "你让我看见辽阔的未来",
  "远方并不遥远 因为我在等你",
  "风和雨都值得 因为最后是你",
  "有些梦 会带我走向你",
  "岁月因你温柔",
  "每个日出都在说 想你",
  "时光流转 思念不变",
  "我的答案只有你",
  "路再长 都要和你一起走",
  "等到重逢的时候 我一定微笑",
  "心底的光 一直点亮你的位置",
  "生活因为有你 才完整",
  "跨越山海 只为靠近你",
  "人间的美好 因你才值得",
  "笑容会穿越时空传到你那里",
  "我的世界因你变得辽阔",
  "心的方向 一直没变",
  "思念是最执着的信仰",
  "距离只是数字 温柔是真实",
  "未来注定有我们的位置",
  "黑暗只是星光的舞台",
  "愿你永远被温柔以待",
  "心底的爱 永远滚烫",
  "穿越所有风雨 也要奔向你",
  "星辰和海浪 都在低语想你",
  "答案是爱 爱就是答案",
  "今日的风景 也是为你准备的",
  "纵使前路未知 我依然坚定",
  "这一生最美的遇见 是你"
];

/* ===================== 工具函数 ===================== */
function pickRandomNote(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 解析 GViz JSON（优先 cell.f）
function parseGViz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("GViz response malformed");
  const json = JSON.parse(text.slice(start, end + 1));
  const cols = json.table.cols.map((c) => c.label || c.id);
  const rows = json.table.rows.map((r) =>
    Object.fromEntries(r.c.map((cell, i) => [cols[i], cell ? (cell.f ?? cell.v ?? "") : ""]))
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

// 线性音量渐变（淡入淡出）
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

/* ===================== 组件 ===================== */
export default function App() {
  /* —— 入口暗号门 —— */
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

  /* —— 页面状态 —— */
  const [rows, setRows] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");

  // 顶部天数 & 便签
  const [days] = useState(daysSince("2018-04-01"));
  const [showNote, setShowNote] = useState(false);
  const [note] = useState(() => pickRandomNote(DAILY_NOTES));

  // 播放器
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null); // { name, city, url, playing, muted, cur, dur, seeking }
  const lastNonZeroVol = useRef(1);

  // 背景 BGM
  const bgmRef = useRef(null);
  const bgmReady = useRef(false);

  /* —— Leaflet 默认图标修复 —— */
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

  /* —— 初始化地图 —— */
  useEffect(() => {
    if (map) return;
    const m = L.map("map", { worldCopyJump: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
      opacity: 0.9,
    }).addTo(m);
    m.setView([20, 0], 2);
    setMap(m);
    setTimeout(() => m.invalidateSize(), 0);

    const onResize = () => m.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  /* —— 拉取 Google Sheet —— */
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
          status: r.status, // visited / want / others
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

  /* —— 过滤 —— */
  const list = useMemo(() => {
    return rows.filter((r) => (!city || r.city === city) && (!status || r.status === status));
  }, [rows, city, status]);

  /* —— 背景 BGM 控制 —— */
  const playBGM = async () => {
    const b = bgmRef.current;
    if (!b || !BGM_URL) return;
    try {
      if (b.src !== BGM_URL) b.src = BGM_URL;
      b.volume = 0.4;
      await b.play();
      bgmReady.current = true;
    } catch {
      bgmReady.current = false;
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

  useEffect(() => {
    playBGM();
    // 首次用户交互再尝试一次
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

  /* —— 切歌（带淡入淡出） —— */
  const playTrack = async (url, meta) => {
    const a = audioRef.current;
    if (!a || !url) return;

    await fadePauseBGM(); // 先淡出 BGM

    try {
      if (!a.paused && !a.muted && a.volume > 0) {
        await fadeTo(a, 0, 200);
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
      await fadeTo(a, lastNonZeroVol.current || 1, 200);

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

  /* —— 渲染标记 —— */
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

  /* —— 播放器控制 —— */
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) {
        await fadePauseBGM();
        if (!a.muted) {
          if (a.volume > 0) lastNonZeroVol.current = a.volume;
          a.volume = 0;
          await a.play();
          await fadeTo(a, lastNonZeroVol.current || 1, 200);
        } else {
          await a.play();
        }
        setCurrentTrack((t) => (t ? { ...t, playing: true } : t));
      } else {
        if (!a.muted) {
          await fadeTo(a, 0, 200);
          a.pause();
          a.volume = lastNonZeroVol.current || 1;
        } else {
          a.pause();
        }
        setCurrentTrack((t) => (t ? { ...t, playing: false } : t));
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
    setCurrentTrack((t) => (t ? { ...t, muted: a.muted } : t));
  };

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTrack((t) => (t ? { ...t, dur: Number.isFinite(a.duration) ? a.duration : 0 } : t));
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTrack((t) => {
      if (!t || t.seeking) return t;
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
    setCurrentTrack((t) => (t ? { ...t, cur: v, seeking: false } : t));
  };
  const onSeekStart = () => setCurrentTrack((t) => (t ? { ...t, seeking: true } : t));
  const onSeekEnd = (e) => onSeek(e);

  /* ===================== UI ===================== */
  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.city))).filter(Boolean).sort(),
    [rows]
  );

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
              <option key={c} value={c}>
                {c}
              </option>
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

      {/* 地图包一层，作为定位参考 */}
      <div className="map-wrap">
        <div id="map" className="map-full" />

        {/* 🏷️ 标签按钮：现在在 map 容器里，定位一致 */}
        <button
          className={"note-toggle" + (showNote ? " active" : "")}
          aria-label={showNote ? "关闭便签" : "打开便签"}
          onClick={() => setShowNote(v => !v)}
          title="每日便签"
        >
          🏷️
        </button>

        {/* 便签浮窗 */}
        {showNote && (
          <div className="sticky-note note-animate-in">
            <button
              className="note-close"
              aria-label="关闭"
              title="关闭"
              onClick={() => setShowNote(false)}
            >×</button>
            <div className="pin" />
            <div className="note-text">{note}</div>
          </div>
        )}
      </div>

      {/* 悬浮播放器 */}
      <div className="floating-player">
        <button onClick={togglePlay} className="player-btn">
          {currentTrack?.playing ? "⏸︎ 暂停" : "▶︎ 播放"}
        </button>
        <button onClick={toggleMute} className="player-btn">
          {currentTrack?.muted ? "🔇 静音" : "🔊 声音"}
        </button>

        <div className="one-line">
          {currentTrack
            ? `正在播放：${currentTrack.name} · ${currentTrack.city}`
            : "未选择音乐"}
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
