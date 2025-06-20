'use client'

import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth'
import { auth, db } from '../../lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const provider = new GoogleAuthProvider()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(userRef)

        // Register if new user
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            displayName: user.displayName || '',
            role: '',
            email: user.email || '',
            createdAt: new Date()
          })
          router.push('/role')
        } else {
          const userData = docSnap.data()

          if (userData.role === 'landlord') {
            router.push('/landlord_portal')
          } else if (userData.role === 'tenant') {
            router.push('/tenant_portal')
          } else {
            router.push('/role')
          }
        }
      }
    })
    return () => unsubscribe()
  }, [])

  function authSignInWithGoogle() {
    signInWithPopup(auth, provider)
      .then(() => console.log("Signed in with Google"))
      .catch((error) => {
        console.error(error.message)
        alert(error.message)
      })
  }

  function authSignInWithEmail() {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => clearAuthFields())
      .catch((error) => {
        console.error(error.message)
        alert(error.message)
      })
  }

  function authCreateAccountWithEmail() {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => clearAuthFields())
      .catch((error) => {
        console.error(error.message)
        alert(error.message)
      })
  }

  function clearAuthFields() {
    setEmail("")
    setPassword("")
  }

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <h2 className="login-form-title">RentAssist</h2>
        <form className="login-form">
          <input
            type="email"
            className="login-form-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="login-form-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="login-form-btn" type="button" onClick={authSignInWithEmail}>
            Login
          </button>
          <button className="login-form-btn" type="button" onClick={authCreateAccountWithEmail}>
            Create Account
          </button>
        </form>
        <div className="login-divider">or</div>
        <button className="google-btn" onClick={authSignInWithGoogle}>
          <Image src="/google.png" alt="Google" width={20} height={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
