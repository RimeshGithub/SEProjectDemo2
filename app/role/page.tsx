'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { auth, db } from '../../lib/firebase'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function Role() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setDisplayName(currentUser.displayName || '')
      if(currentUser === null) return
      getDoc(doc(db, 'users', currentUser?.uid)).then((doc) => {
        setRole(doc.data()?.role)
      })
    })

    return () => unsubscribe() // cleanup listener
  }, [])

  const uid = user?.uid

  const goToRole = async (route: string) => {
    if (!displayName.trim()) {
      alert('Enter a display name!')
      return
    }

    try {
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, {
        displayName,
        role: route.includes('landlord') ? 'landlord' : 'tenant'
      })

      if (route.includes('landlord')) {
        await setDoc(doc(db, 'landlord_notifications', uid), {
          joinRequestCount: 0,
          maintenanceCount: 0,
          suggestionCount: 0,
          updatedAt: new Date()
        })
      } 
      router.push(`/${route}`)
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('Could not update role. Please try again.')
    }
  }

  if(!user) return <p className="info-text">First sign in to set your role</p>

  if(role && user) return <p className="info-text">You have already set your role</p>

  if(!role && user) return (
    <div className="role-container">
      <h1>Display Name:</h1>
      <input
        className="display-name-input"
        type="text"
        placeholder="Enter your name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <h1>Choose your role:</h1>
      <div className="role-button-container">
        <button className="role-button" onClick={() => goToRole('landlord_portal')}>
          Landlord
        </button>
        <button className="role-button" onClick={() => goToRole('tenant_portal')}>
          Tenant
        </button>
      </div>
    </div>
  )
}
