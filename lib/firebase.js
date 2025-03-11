import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDWdq_uVHIFlxeXvmg2Va_DlFBObyrB8nA",
  authDomain: "cropai-1f3f7.firebaseapp.com",
  projectId: "cropai-1f3f7",
  storageBucket: "cropai-1f3f7.appspot.com",
  messagingSenderId: "829412701381",
  appId: "1:829412701381:web:6feef509416fdeee0b2cac",
  measurementId: "G-Z7YD29TM6S"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { auth };