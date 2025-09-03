import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOMtAoCObyoalTk6_nVpGlsnLcGSw4Jzc",
  authDomain: "kimono-coordinate.firebaseapp.com",
  databaseURL: "https://kimono-coordinate-default-rtdb.firebaseio.com",
  projectId: "kimono-coordinate",
  storageBucket: "kimono-coordinate.firebasestorage.app",
  messagingSenderId: "399031825104",
  appId: "1:399031825104:web:5ea4da3fb129cf935724d5",
  measurementId: "G-VVTT0QVXQQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 時間・分・秒にフォーマット
const formatTime = minutes => {
  if (minutes === null) return null;
  const totalSec = Math.round(minutes * 60);

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) {
    return `${h}時間${m}分${s}秒`;
  } else if (m > 0) {
    return `${m}分${s}秒`;
  } else {
    return `${s}秒`;
  }
};

// 時刻を HH:MM に整形
const formatTimestamp = ts => {
  if (!ts) return null;
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

document.addEventListener('alpine:init', () => {
  Alpine.data('statisticsPage', () => ({
    // --- ヘッダー関連 ---
    selectedYear: new Date().getFullYear(),
    get yearOptions() {
      const currentYear = new Date().getFullYear();
      return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    },

    customerStats: [],
    femaleAvg: null, maleAvg: null,
    femaleMin: null, femaleMax: null,
    maleMin: null, maleMax: null,

    async init() {
      const params = new URLSearchParams(window.location.search);
      const yearFromUrl = params.get('year');
      this.selectedYear = yearFromUrl ? parseInt(yearFromUrl) : new Date().getFullYear();
      await this.loadStatistics();
    },

    async loadStatistics() {
      const url = new URL(window.location.href);
      url.searchParams.set('year', this.selectedYear);
      window.history.pushState({}, '', url);

      this.customerStats = [];
      this.femaleAvg = this.maleAvg = null;
      this.femaleMin = this.femaleMax = null;
      this.maleMin = this.maleMax = null;

      const colRef = collection(db, `${this.selectedYear}_seijinshiki`);
      const snapshot = await getDocs(colRef);

      const stats = [];
      const femaleRecords = [];
      const maleRecords = [];

      if (snapshot.empty) {
        // データが無い → ここで空のまま終了
        this.customerStats = [];
        return;
      }

      snapshot.forEach(doc => {
        const group = doc.data();
        if (!group.customers) return;
        // キャンセル済みグループは除外
        if (group.representative?.isCanceled) return;
        group.customers.forEach(cust => {
          const ts = cust.statusTimestamps || {};
          const reception = ts.receptionCompletedAt;
          const guidance = ts.guidanceCompletedAt;
          const dressing = ts.dressingCompletedAt;
          const sendoff = ts.sendOffCompletedAt;

          const guideToDress = (guidance && dressing) ? (dressing.toDate() - guidance.toDate()) / 60000 : null;
          const total = (reception && sendoff) ? (sendoff.toDate() - reception.toDate()) / 60000 : null;

          const record = {
            id: `${doc.id}_${cust.id}`,
            representative: (group.representative?.lastName || '') + (group.representative?.firstName || ''),
            name: (cust.lastName || '') + (cust.firstName || ''),
            gender: cust.gender || '--',
            staff: cust.staff || [],
            reception: reception ? formatTimestamp(reception) : null,
            guidance: guidance ? formatTimestamp(guidance) : null,
            dressing: dressing ? formatTimestamp(dressing) : null,
            sendoff: sendoff ? formatTimestamp(sendoff) : null,
            guideToDress: guideToDress ? formatTime(guideToDress) : null,
            total: total ? formatTime(total) : null,
            guideRaw: guideToDress,
            receptionDate: reception ? reception.toDate() : null
          };

          stats.push(record);

          // 男女別配列に積む（案内→着付け時間がある人のみ）
          if (record.guideRaw != null) {
            if (record.gender === 'female') femaleRecords.push(record);
            if (record.gender === 'male') maleRecords.push(record);
          }
        });
      });

      // 受付完了時刻順にソート
      this.customerStats = stats.sort((a, b) => {
        if (!a.receptionDate) return 1;
        if (!b.receptionDate) return -1;
        return a.receptionDate - b.receptionDate;
      });

      // 平均時間
      const avg = arr => arr.length ? formatTime(arr.reduce((acc, c) => acc + c.guideRaw, 0) / arr.length) : null;
      this.femaleAvg = avg(femaleRecords);
      this.maleAvg = avg(maleRecords);

      // 最短 & 最長
      const minBy = arr => arr.reduce((p, c) => p.guideRaw < c.guideRaw ? p : c);
      const maxBy = arr => arr.reduce((p, c) => p.guideRaw > c.guideRaw ? p : c);

      if (femaleRecords.length) {
        const minR = minBy(femaleRecords), maxR = maxBy(femaleRecords);
        this.femaleMin = { time: formatTime(minR.guideRaw), name: minR.name, staff: minR.staff.join(', ') };
        this.femaleMax = { time: formatTime(maxR.guideRaw), name: maxR.name, staff: maxR.staff.join(', ') };
      }
      if (maleRecords.length) {
        const minR = minBy(maleRecords), maxR = maxBy(maleRecords);
        this.maleMin = { time: formatTime(minR.guideRaw), name: minR.name, staff: minR.staff.join(', ') };
        this.maleMax = { time: formatTime(maxR.guideRaw), name: maxR.name, staff: maxR.staff.join(', ') };
      }
    }
  }));
});
// cSpell:ignore firestore