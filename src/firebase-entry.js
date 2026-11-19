// Point d'entrée regroupé dans public/vendor/firebase.js (commande : npm run build)
export { initializeApp } from 'firebase/app';
export {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail, EmailAuthProvider,
  reauthenticateWithCredential, deleteUser, connectAuthEmulator,
  setPersistence, browserLocalPersistence
} from 'firebase/auth';
export {
  getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, writeBatch, connectFirestoreEmulator
} from 'firebase/firestore';
