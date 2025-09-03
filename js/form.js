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

    CLOUDINARY_CONFIG: {
      CLOUD_NAME: 'dxq1xqypx',
      UPLOAD_PRESET: 'unsigned_preset',
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
        outfit: '振袖',
        rentalType: '自前',
        outfitMemo: '',
        hairMakeStaff: ''
      },
      // 当日スケジュール
      toujitsu: {
        schedule: [
          { id: 1, type: 'hair', start: '', end: '' },
          { id: 2, type: 'kitsuke', start: '', end: '' }
        ],
        note: ''
      },
      imagePreviews: [], // 画面表示用のプレビューURL
      imageFiles: [],    // アップロード用のFileオブジェクト
      meetings: [],
      maedoriStatus: 'あり',
      maedori: null,
      estimate: {
        receiptDate: ''
      }
    },

    // --- 初期化 ---
    async init() {
      const params = new URLSearchParams(window.location.search);
      // URLからyearパラメータを取得し、なければ現在の年をデフォルト値にする
      const yearFromUrl = params.get('year');
      this.selectedYear = yearFromUrl ? parseInt(yearFromUrl) : new Date().getFullYear();

      const groupId = params.get('group');
      this.currentGroupId = groupId;

      if (groupId) {
        // 編集モード：既存データを読み込む
        await this.loadFormData(groupId);
      } else {
        // 新規登録モード：初期データを設定
        this.updateCustomerList();
      }
    },

    async loadFormData(groupId) {
      const url = new URL(window.location.href);
      url.searchParams.set('year', this.selectedYear);
      window.history.pushState({}, '', url);
      try {
        const collectionName = `${this.selectedYear}_seijinshiki`;
        const docRef = doc(db, collectionName, groupId);
        const docSnap = await getDoc(docRef);

      } catch (error) {
        console.error("データ取得エラー: ", error);
        alert('データの読み込みに失敗しました。');
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
      this.estimateItems.push({ name: "", fixed: false, toujitsu: false, maedori: false, price: null });
    },

    calcPrice(item) {
      if (item.name === "着付け") {
        if (this.formData.basic.outfit === "振袖") {
          if (item.toujitsu && item.maedori) return PRICE.FURISODE.KITSUKE.BOTH;
          if (item.toujitsu) return PRICE.FURISODE.KITSUKE.TOUJITSU;
          if (item.maedori) return PRICE.FURISODE.KITSUKE.MAEDORI;
        } else if (this.formData.basic.outfit === "袴") {
          return PRICE.HAKAMA.KITSUKE;
        }
      }
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

    // 画像選択時の処理。プレビューURLとFileオブジェクトの両方を保存する
    handleImageUpload(event, customerIndex) {
      const files = event.target.files;
      if (!files) return;

      // 既存のプレビューURLを解放
      this.customers[customerIndex].imagePreviews.forEach(url => URL.revokeObjectURL(url));

      const newPreviews = [];
      const newFiles = []; // Fileオブジェクトを格納する配列
      for (const file of files) {
        newPreviews.push(URL.createObjectURL(file));
        newFiles.push(file); // Fileオブジェクトを保存
      }
      this.customers[customerIndex].imagePreviews = newPreviews;
      this.customers[customerIndex].imageFiles = newFiles; // Fileオブジェクトをstateに保存
    },

    /**
     * Cloudinaryに画像をアップロードする
     * @param {File} file - アップロードするファイル
     * @param {string} folderName - 保存先のフォルダ名
     * @returns {Promise<string>} アップロードされた画像のURL
     */
    async uploadImageToCloudinary(file, folderName) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.CLOUDINARY_CONFIG.UPLOAD_PRESET);
      formData.append('folder', folderName);

      const url = `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Cloudinaryへの画像アップロードに失敗しました。');
      }

      const data = await response.json();
      return data.secure_url;
    },

    async submitForm() {
      // 1. 動的な名前を決定
      const folderName = `${this.selectedYear}_seijinshiki`;
      const collectionName = `${this.selectedYear}_seijinshiki`;

      // 2. 顧客データ内の画像URLを準備
      const processedCustomers = await Promise.all(this.customers.map(async (customer) => {
        // 新しい画像ファイルがある場合のみ、アップロード処理を実行
        if (customer.imageFiles && customer.imageFiles.length > 0) {
          const newImageUrls = await Promise.all(
            customer.imageFiles.map(file => this.uploadImageToCloudinary(file, folderName))
          );

          // Firestoreに保存する用の新しい顧客オブジェクトを作成
          const customerData = { ...customer };
          delete customerData.imageFiles;
          delete customerData.imagePreviews;
          // 既存のURLを新しいURLで完全に置き換える
          customerData.imageUrls = newImageUrls;
          return customerData;
        } else {
          // 新しい画像ファイルがない場合は、既存のデータをそのまま返す
          const customerData = { ...customer };
          delete customerData.imageFiles;
          delete customerData.imagePreviews;
          return customerData;
        }
      }));

      // 3. Firestoreに保存する最終的なデータを作成
    },

    async deleteForm() {
      if (!confirm('本当にこのカルテを削除しますか？')) {
        return; // ユーザーがキャンセルした場合
      }
      try {
        const collectionName = `${this.selectedYear}_seijinshiki`;
        const docRef = doc(db, collectionName, this.currentGroupId);
        await deleteDoc(docRef);

        alert('カルテを削除しました。');
        window.location.href = './schedule.html'; // 削除後、受付管理ページへ遷移
      } catch (error) {
        console.error("削除エラー: ", error);
        alert(`削除中にエラーが発生しました。\n${error.message}`);
      }
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
      if (!value || isNaN(value)) return "—";
      return value.toLocaleString('ja-JP') + "円";
    },

    swapSchedule() {
      const arr = this.formData.toujitsu.schedule;
      if (arr.length === 2) {
        [arr[0], arr[1]] = [arr[1], arr[0]];
        this.formData.toujitsu.schedule = [...arr];
      }
    }

  }))
});