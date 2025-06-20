import { initializeApp } from "firebase/app"
import { getAuth } from 'firebase/auth'
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD0APTZ6o07VF_AXNoFQSFLctlpMQkHkeQ",
  authDomain: "seproject2061.firebaseapp.com",
  projectId: "seproject2061",
  storageBucket: "seproject2061.firebasestorage.app",
  messagingSenderId: "84060211781",
  appId: "1:84060211781:web:5e57b53b67ee29da5e712c"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
