import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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

document.addEventListener('alpine:init', () => {
  Alpine.data('schedulePage', () => ({
    groups: [],
    boothOptionsFemale: ['A1', 'A2', 'B1', 'B2'],
    boothOptionsMale: ['C1', 'C2', 'B1', 'B2'],
    staffOptions: ['佐藤', '鈴木', '松本'],

    statusCycle: {
      '受付完了': '案内完了',
      '案内完了': '着付完了',
      '着付完了': '見送り完了',
      '見送り完了': '対応完了',
    },

    statusTimestampKeys: {
      '受付完了': 'receptionCompletedAt',
      '案内完了': 'guidanceCompletedAt',
      '着付完了': 'dressingCompletedAt',
      '見送り完了': 'sendOffCompletedAt',
    },

    selectedYear: new Date().getFullYear(),
    get yearOptions() {
      const currentYear = new Date().getFullYear();
      return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    },

    init() {
      const params = new URLSearchParams(window.location.search);
      // URLからyearパラメータを取得し、なければ現在の年をデフォルト値にする
      const yearFromUrl = params.get('year');
      this.selectedYear = yearFromUrl ? parseInt(yearFromUrl) : new Date().getFullYear();
      this.fetchSchedule();
    },

    async fetchSchedule() {
      const url = new URL(window.location.href);
      url.searchParams.set('year', this.selectedYear);
      window.history.pushState({}, '', url);
      this.groups = [];
      const collectionName = `${this.selectedYear}_seijinshiki`;
      try {
        const colRef = collection(db, collectionName);
        const querySnapshot = await getDocs(colRef);
        const fetchedGroups = [];
        querySnapshot.forEach((doc) => {
          fetchedGroups.push({
            groupId: doc.id,
            ...doc.data()
          });
        });
        fetchedGroups.sort((a, b) => {
          // キャンセル済みかどうかでソート
          if (a.representative.isCanceled && !b.representative.isCanceled) {
            return 1; // aがキャンセル済みで、bが未キャンセルなら、aを後ろに
          }
          if (!a.representative.isCanceled && b.representative.isCanceled) {
            return -1; // aが未キャンセルで、bがキャンセル済みなら、aを前に
          }
          // キャンセル状態が同じ場合は、来店予定時間でソート
          if (a.representative.visitTime < b.representative.visitTime) return -1;
          if (a.representative.visitTime > b.representative.visitTime) return 1;
          return 0;
        });
        this.groups = fetchedGroups;
      } catch (error) {
        console.error("Error fetching schedule: ", error);
        alert("データの取得に失敗しました。");
      }
    },

    // updateCustomerField 関数のシグネチャを変更
    async updateCustomerField(groupId, customerId, field, value, checked) {
      try {
        const collectionName = `${this.selectedYear}_seijinshiki`;
        const docRef = doc(db, collectionName, groupId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Document not found");

        const customers = docSnap.data().customers;
        const customerIndex = customers.findIndex(customerData => customerData.id === customerId);
        if (customerIndex === -1) throw new Error("Customer not found");

        if (field === 'staff') {
          let currentStaff = customers[customerIndex].staff || [];
          // checked引数を使って、追加するか削除するかを判断
          if (checked) {
            // チェックが入った場合、配列に追加（重複は避ける）
            if (!currentStaff.includes(value)) {
              currentStaff.push(value);
            }
          } else {
            // チェックが外れた場合、配列から削除
            const valueIndex = currentStaff.indexOf(value);
            if (valueIndex > -1) {
              currentStaff.splice(valueIndex, 1);
            }
          }
          customers[customerIndex].staff = currentStaff;
        } else {
          customers[customerIndex][field] = value;
        }

        await updateDoc(docRef, { customers: customers });
        console.log("Updated successfully!");
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        alert(`${field}の更新に失敗しました。`);
      }
    },

    async updateStatus(group, customerId) {
      try {
        // ドキュメントへの参照を作成
        const collectionName = `${this.selectedYear}_seijinshiki`;
        const docRef = doc(db, collectionName, group.groupId);

        // データの取得と更新対象の特定
        const customers = group.customers;
        const customerIndex = customers.findIndex(c => c.id === customerId);
        const customer = customers[customerIndex];

        // ステータスの判定と次のステータスの決定
        const currentStatus = customer.status || '受付完了';
        const nextStatus = this.statusCycle[currentStatus];

        if (nextStatus === currentStatus) {
          // 最終ステータスに達した場合は何もしない
          return;
        }
        // ステータスとタイムスタンプを更新
        customer.status = nextStatus;
        const timestampKey = this.statusTimestampKeys[currentStatus];
        customer.statusTimestamps[timestampKey] = new Date();
        // Firestoreにデータを更新
        await updateDoc(docRef, { customers: customers });
        console.log("Status and timestamp updated successfully!");
      } catch (error) {
        console.error("Error updating status:", error);
        alert("ステータス更新に失敗しました。");
        this.fetchSchedule();
      }
    },

    getStatusClass(status) {
      const currentStatus = status || '受付完了';
      const classMap = {
        '受付完了': 'status-received',
        '案内完了': 'status-guided',
        '着付完了': 'status-dressing-done',
        '見送り完了': 'status-sent-off',
        '対応完了': 'status-completed',
      };
      return classMap[currentStatus] || 'status-received';
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return '--:--';
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    },
  }));
});
// cspell:ignore Firestore