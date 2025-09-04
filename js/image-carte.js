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
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    customers: [],
    openAccordions: JSON.parse(localStorage.getItem('openAccordions') || '[]'),
    searchQuery: localStorage.getItem('searchQuery') || "",
    suggestions: [],

    async init() {
      const snapshot = await getDocs(collection(db, `${new Date().getFullYear()}_seijinshiki`));
      this.customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },

    isOpen(id) {
      return this.openAccordions.includes(id);
    },

    toggleAccordion(id) {
      if (this.isOpen(id)) {
        this.openAccordions = this.openAccordions.filter(item => item !== id);
      } else {
        this.openAccordions.push(id);
      }
      localStorage.setItem('openAccordions', JSON.stringify(this.openAccordions));
    },

    // 検索
    searchCustomers() {
      const query = this.searchQuery.replace(/\s/g, ""); // スペース無視
      localStorage.setItem('searchQuery', this.searchQuery);

      if (!query) {
        this.suggestions = [];
        return;
      }
      this.suggestions = this.customers.filter(c => {
        const kana = (c.basic?.kana || "").replace(/\s/g,"");
        const name = (c.basic?.name || "").replace(/\s/g,"");
        return kana.includes(query) || name.includes(query);
      });
    },

    selectCustomer(customer) {
      // 該当顧客だけ表示するようフィルタ
      this.suggestions = [];
      this.searchQuery = customer.basic.name;
      localStorage.setItem('searchQuery', this.searchQuery);
      this.openAccordions = [customer.id]; // その顧客IDだけ開いた状態に
      localStorage.setItem('openAccordions', JSON.stringify(this.openAccordions));
    },

    get filteredCustomers() {
      if (!this.searchQuery) return this.customers;
      const query = this.searchQuery.replace(/\s/g,"");
      return this.customers.filter(c => {
        const kana = (c.basic?.kana || "").replace(/\s/g,"");
        const name = (c.basic?.name || "").replace(/\s/g,"");
        return kana === query || name === query;
      });
    }
  }));
});