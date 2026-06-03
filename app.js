// 註冊 PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker 已就緒'))
        .catch(err => console.error('PWA 註冊失敗', err));
    });
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const targetEl = document.getElementById("card-target");
    const overlayEl = document.getElementById("magic-card-overlay");
    const statusEl = document.getElementById("magic-status");
    const shutterBtn = document.getElementById("shutter-btn");
  
    let isMagicActive = true; // 起始狀態：顯示覆蓋物（黑桃A）
    let lostTimestamp = 0;
  
    // 1. 當手遮擋住撲克牌時，AR 追蹤斷開，記錄時間
    targetEl.addEventListener("targetLost", () => {
      lostTimestamp = Date.now();
    });
  
    // 2. 當手離開、撲克牌重新出現時，計算時間差
    targetEl.addEventListener("targetFound", () => {
      if (lostTimestamp > 0) {
        const duration = Date.now() - lostTimestamp;
        
        // 計算遮擋時間：
        // 如果手是「快速揮過」，遮擋時間大約會落在 150 毫秒至 900 毫秒之間。
        // 如果是整張牌移開再移回來，通常會大於 1 秒。
        if (duration >= 150 && duration <= 900) {
          toggleMagic();
        }
        lostTimestamp = 0; // 重置計時器
      }
    });
  
    // 3. 切換「魔法狀態」與「原狀」
    function toggleMagic() {
      isMagicActive = !isMagicActive;
      
      // 控制虛擬圖片的顯示/隱藏。當 visible 為 false 時，觀眾會看到螢幕上回復成原來的實體牌
      overlayEl.setAttribute("visible", isMagicActive ? "true" : "false");
      
      // 更新 iOS UI 上的狀態提示
      if (isMagicActive) {
        statusEl.textContent = "MAGIC ACTIVE";
        statusEl.style.color = "#FFD700"; // 黃色
      } else {
        statusEl.textContent = "NORMAL MODE";
        statusEl.style.color = "#8E8E93"; // 灰色
      }
  
      // 觸覺回饋（短震動），提示魔術師切換成功（此功能主要支援 Android Chrome，iOS 尚待規範）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  
    // 4. iOS 拍照閃白效果
    shutterBtn.addEventListener("click", () => {
      const flashDiv = document.createElement("div");
      flashDiv.style.position = "absolute";
      flashDiv.style.top = "0";
      flashDiv.style.left = "0";
      flashDiv.style.width = "100%";
      flashDiv.style.height = "100%";
      flashDiv.style.background = "#fff";
      flashDiv.style.zIndex = "999";
      flashDiv.style.pointerEvents = "none";
      document.body.appendChild(flashDiv);
  
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
  
      setTimeout(() => {
        flashDiv.style.transition = "opacity 0.4s ease";
        flashDiv.style.opacity = "0";
        setTimeout(() => flashDiv.remove(), 400);
      }, 50);
    });
        // 在 app.js 最下方加入此段偵錯碼
    const sceneEl = document.querySelector('a-scene');

    // 監聽 MindAR 啟動成功的事件
    sceneEl.addEventListener('arReady', (event) => {
    console.log("MindAR 引擎與相機已順利啟動！");
    });

    // 監聽 MindAR 啟動失敗的事件
    sceneEl.addEventListener('arError', (event) => {
    console.error("MindAR 啟動失敗：", event);
    
    // 彈出錯誤提示
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("【錯誤】WebAR 必須在 HTTPS 安全連線下才能使用相機。請部署至 HTTPS 伺服器再測試。");
    } else {
        alert("【錯誤】無法啟動相機。請檢查是否已在瀏覽器設定中「允許」此網站存取相機。");
    }
    });
  });