import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
// ===== 定数定義 =====
const PRICE = {
  FURISODE: {
    KITSUKE: {
      MAEDORI: 13200,
      TOUJITSU: 16500,
      BOTH: 25300,
    },
    HAIR_MAKE: 10000,
    HAIR_ONLY: 6000,
  },
  HAKAMA: {
    KITSUKE: 8500
  }
};
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    // --- ヘッダー関連 ---
    selectedYear: new Date().getFullYear(),
    get yearOptions() {
      const currentYear = new Date().getFullYear();
      return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    },

    // DB登録に必要な内容まとめ
    formData: {
      basic: {
        reservationDate: '',
        name: '',
        kana: '',
        introducer: '',
        phone: '',
        address: '',
        lineType: '教室LINE',
        height: '',
        footSize: '',
        outfit: '振袖',          // "振袖" or "袴"
        rentalType: '自前',      // "自前" / "レンタル" / "一部レンタル"
        outfitMemo: '',      // 備考
        hairMakeStaff: ''          // 振袖のときだけ利用
      },
      // 当日スケジュール
      toujitsu: {
        kitsukeStart: '',
        kitsukeEnd: '',
        hairMakeStart: '',
        hairMakeEnd: '',
        note: ''
      },
      meetings: [],
      maedoriStatus: 'あり',
      maedori: null,
      estimate: {
        receiptDate: ''
      }
    },

    // ===== 打ち合わせ・お預かり =====
    meetingModalVisible: false,
    meetingForm: { type: '打ち合わせ', date: '', place: '', note: '' },
    meetingEditIndex: null,

    openMeetingModal() {
      this.meetingForm = { type: '打ち合わせ', date: '', place: '', note: '' };
      this.meetingEditIndex = null;
      this.meetingModalVisible = true;
    },
    closeMeetingModal() {
      this.meetingModalVisible = false;
    },
    saveMeeting() {
      if (this.meetingEditIndex !== null) {
        this.formData.meetings[this.meetingEditIndex] = { ...this.meetingForm };
      } else {
        this.formData.meetings.push({ ...this.meetingForm });
      }
      this.meetingModalVisible = false;
      this.meetingEditIndex = null;
    },
    editMeeting(index) {
      this.meetingForm = { ...this.formData.meetings[index] };
      this.meetingEditIndex = index;
      this.meetingModalVisible = true;
    },
    deleteMeeting(index) {
      if (confirm('この項目を削除しますか？')) {
        this.formData.meetings.splice(index, 1);
      }
    },
    get sortedMeetings() {
      return [...this.formData.meetings].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === '打ち合わせ' ? -1 : 1;
        }
        return new Date(a.date) - new Date(b.date);
      });
    },

    // ===== 前撮り =====
    maedoriModalVisible: false,
    maedoriForm: { type: 'スタジオ', camera: '', date: '', hairStart: '', hairEnd: '', kitsukeStart: '', kitsukeEnd: '', shootStart: '', shootEnd: '', place: '', note: '' },
    editMaedoriMode: false,

    openMaedoriModal() {
      this.resetMaedoriForm();
      this.editMaedoriMode = false;
      this.maedoriModalVisible = true;
    },
    editMaedori() {
      if (this.formData.maedori) {
        this.maedoriForm = { ...this.formData.maedori };
      }
      this.editMaedoriMode = true;
      this.maedoriModalVisible = true;
    },
    closeMaedoriModal() {
      this.maedoriModalVisible = false;
    },
    saveMaedori() {
      this.formData.maedori = { ...this.maedoriForm };
      this.maedoriModalVisible = false;
    },
    deleteMaedori() {
      if (confirm('本当に削除しますか？')) {
        this.formData.maedori = null;
      }
    },
    resetMaedoriForm() {
      this.maedoriForm = { type: 'スタジオ', camera: '', date: '', hairStart: '', hairEnd: '', kitsukeStart: '', kitsukeEnd: '', shootStart: '', shootEnd: '', place: '', note: '' };
    },

    // ===== 見積もり =====
    estimateItems: [
      { name: "着付け", fixed: true, toujitsu: false, maedori: false }, // index0
      { name: "ヘア", fixed: true, toujitsu: false, maedori: false, option: "none" } // index1
    ],

    addOption() {
      this.estimateItems.push({ name: "", fixed: false, toujitsu: false, maedori: false, price: 0 });
    },

    calcPrice(item) {
      // 着付け
      if (item.name === "着付け") {
        if (this.formData.basic.outfit === "振袖") {
          if (item.toujitsu && item.maedori) return PRICE.FURISODE.KITSUKE.BOTH;
          if (item.toujitsu) return PRICE.FURISODE.KITSUKE.TOUJITSU;
          if (item.maedori) return PRICE.FURISODE.KITSUKE.MAEDORI;
        } else if (this.formData.basic.outfit === "袴") {
          return PRICE.HAKAMA.KITSUKE;
        }
      }

      // ヘア (振袖のみ)
      if (item.name === "ヘア" && this.formData.basic.outfit === "振袖") {
        let unitPrice = 0;
        if (item.option === "hairMake") unitPrice = PRICE.FURISODE.HAIR_MAKE;
        if (item.option === "hairOnly") unitPrice = PRICE.FURISODE.HAIR_ONLY;
        let total = 0;
        if (item.toujitsu) total += unitPrice;
        if (item.maedori) total += unitPrice;
        return total;
      }

      return item.price ?? 0;
    },

    get totalAmount() {
      return this.estimateItems.reduce((sum, it) => sum + this.calcPrice(it), 0);
    },

    // ===== 共通ユーティリティ =====
    getWeekday(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    },

    formatDisplayDate(dateStr) {
      if (!dateStr) return '';
      const dt = new Date(dateStr);
      return dt.getFullYear() + "/" +
        String(dt.getMonth() + 1).padStart(2, "0") + "/" +
        String(dt.getDate()).padStart(2, "0") +
        "(" + this.getWeekday(dateStr) + ")" +
        String(dt.getHours()).padStart(2, "0") + ":" +
        String(dt.getMinutes()).padStart(2, "0");
    },

    formatYen(value) {
      if (!value || isNaN(value)) return "0円";
      return value.toLocaleString('ja-JP') + "円";
    }

  }))
});