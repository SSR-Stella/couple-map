:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}

body { margin: 0; min-width: 320px; min-height: 100vh; }
h1 { font-size: 1.5em; margin: 0; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 10px 16px;
  background: rgba(255,255,255,0.92);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  backdrop-filter: saturate(140%) blur(6px);
}
.filters { display: flex; gap: 8px; }
.filters select {
  min-height: 36px; padding: 6px 10px; border-radius: 10px;
  border: 1px solid #eaeaea; background: #fff;
}

.map-full { height: calc(100vh - 72px); }

/* 悬浮播放器：右下角，单行布局为主 */
.floating-player {
  position: fixed;
  right: 16px; bottom: 16px; z-index: 2000;
  background: #fff; border: 1px solid #eee; border-radius: 12px;
  padding: 10px 12px; box-shadow: 0 4px 12px rgba(0,0,0,.1);
  max-width: 760px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; /* 小屏自动换行 */
}

.row { display: flex; align-items: center; gap: 8px; }

.player-btn {
  padding: 6px 10px;
  border-radius: 999px; border: 1px solid #eee;
  background: #fff; cursor: pointer; font-size: 12px;
}

.one-line {
  font-size: 12px; color: #333;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 260px;
}

.player-progress { display: flex; align-items: center; gap: 8px; }
.player-progress .time { font-size: 12px; color: #666; width: 42px; text-align: center; }

/* range 样式 */
.seek { -webkit-appearance: none; appearance: none; width: 220px; height: 4px; background: #e5e7eb; border-radius: 999px; outline: none; }
.seek::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #4f46e5; cursor: pointer; border: 0; box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
.seek::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #4f46e5; border: 0; cursor: pointer; }

@media (max-width: 640px) {
  .floating-player {
    left: 50%; transform: translateX(-50%);
    right: auto; bottom: 12px; max-width: 92%;
    gap: 8px; padding: 8px 10px;
  }
  .one-line { max-width: 100%; }
  .seek { width: 150px; }
}
