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
        lineType: '',
        address: '',
        furisodeType: '',
        furisodeMemo: '',
        height: '',
        footSize: ''
      },
      meetings: [],
      maedori: null,
      estimate: {
        receiptDate: ''
      }
    },

    // ===== 打ち合わせ・預かり =====
    meetingModalVisible: false,
    meetingForm: { type:'預かり', date:'', place:'', note:'' },
    meetingEditIndex: null,

    openMeetingModal() {
      this.meetingForm = { type:'預かり', date:'', place:'', note:'' };
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
      this.formData.meetings.splice(index, 1);
    },
    get sortedMeetings() {
      return [...this.formData.meetings].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === '預かり' ? -1 : 1;
        }
        return new Date(a.date) - new Date(b.date);
      });
    },

    // ===== 前撮り =====
    maedoriModalVisible: false,
    maedoriForm: { type:'スタジオ', camera:'', date:'', hairStart:'', hairEnd:'', kitsukeStart:'', kitsukeEnd:'', shootStart:'', shootEnd:'', place:'', hmStaff:'', note:'' },
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
      this.maedoriForm = { type:'スタジオ', camera:'', date:'', hairStart:'', hairEnd:'', kitsukeStart:'', kitsukeEnd:'', shootStart:'', shootEnd:'', place:'', hmStaff:'', note:'' };
    },

    // ===== 見積もり =====
    estimateItems: [
      { name:"着付け", fixed:true, toujitsu:false, maedori:false },
      { name:"ヘア・メイク", fixed:true, toujitsu:false, maedori:false }
    ],
    addOption() {
      this.estimateItems.push({ name:"", fixed:false, toujitsu:false, maedori:false, price:0 });
    },
    calcPrice(item) {
      if (item.name === "着付け") {
        if (item.toujitsu && item.maedori) return 10000;
        if (item.toujitsu) return 8000;
        if (item.maedori) return 6000;
      }
      if (item.name === "ヘア・メイク") {
        if (item.toujitsu && item.maedori) return 4000;
        if (item.toujitsu) return 3000;
        if (item.maedori) return 2000;
      }
      return 0;
    },
    get totalAmount() {
      return this.estimateItems.reduce((sum, it) => {
        if (it.fixed) return sum + this.calcPrice(it);
        return sum + (it.price || 0);
      }, 0);
    },

    // ===== 共通ユーティリティ =====
    getWeekday(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return ["日","月","火","水","木","金","土"][d.getDay()];
    },
    formatDisplayDate(dateStr) {
      if (!dateStr) return '';
      const dt = new Date(dateStr);
      return dt.getFullYear() + "年" +
             String(dt.getMonth() + 1).padStart(2,"0") + "月" +
             String(dt.getDate()).padStart(2,"0") + "日" +
             "(" + this.getWeekday(dateStr) + ")" +
             String(dt.getHours()).padStart(2,"0") + ":" +
             String(dt.getMinutes()).padStart(2,"0");
    }
  }))
});