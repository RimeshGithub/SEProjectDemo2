'use client'

import Loading from '../../components/loading'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth } from '../../../lib/firebase'
import {
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { FaBuilding, FaHammer, FaComment } from 'react-icons/fa'

export default function Notifications() {
  const router = useRouter()
  const [joinRequestCount, setJoinRequestCount] = useState(0)
  const [maintenanceCount, setMaintenanceCount] = useState(0)
  const [suggestionCount, setSuggestionCount] = useState(0)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return
      setUser(currentUser)

      try {
        const notifRef = doc(db, 'landlord_notifications', currentUser.uid)
        const notifSnap = await getDoc(notifRef)

        if (notifSnap.exists()) {
          const data = notifSnap.data()
          setJoinRequestCount(data.joinRequestCount || 0)
          setMaintenanceCount(data.maintenanceCount || 0)
          setSuggestionCount(data.suggestionCount || 0)
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleView = async (section: string) => {
    if (!user) return

    const notifRef = doc(db, 'landlord_notifications', user.uid)

    if (section === 'properties') {
      localStorage.setItem('landlordTab', 'requests')
    } else if (section === 'maintenance') {
      setMaintenanceCount(0)
      await updateDoc(notifRef, {
        maintenanceCount: 0,
        updatedAt: new Date()
      })
    } else if (section === 'suggestions') {
      setSuggestionCount(0)
      await updateDoc(notifRef, {
        suggestionCount: 0,
        updatedAt: new Date()
      })
    }

    router.push(`/landlord_portal/${section}`)
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <div className="notification-header">
          <h2 className="heading-h2">Notifications</h2>
          <button className="blue-btn" onClick={() => router.back()}>Close</button>
        </div>

        <p className="heading-p">
          Property join requests, maintenance, suggestions, and payment notifications appear here
        </p>
      </section>

      <section>
        {joinRequestCount > 0 && (
          <div className="black-blue-box">
            <h3 className="notification-title"><FaBuilding /> Property Join Requests</h3>
            <p>{joinRequestCount} property join request{joinRequestCount > 1 ? 's' : ''} submitted by tenants</p>
            <button onClick={() => handleView('properties')} className="blue-btn">View</button>
          </div>
        )}

        {maintenanceCount > 0 && (
          <div className="black-blue-box">
            <h3 className="notification-title"><FaHammer /> Maintenance Requests</h3>
            <p>{maintenanceCount} new maintenance request{maintenanceCount > 1 ? 's' : ''} submitted by tenants</p>
            <button onClick={() => handleView('maintenance')} className="blue-btn">View</button>
          </div>
        )}

        {suggestionCount > 0 && (
          <div className="black-blue-box">
            <h3 className="notification-title"><FaComment /> Suggestions</h3>
            <p>{suggestionCount} new tenant suggestion{suggestionCount > 1 ? 's' : ''} pending review</p>
            <button onClick={() => handleView('suggestions')} className="blue-btn">View</button>
          </div>
        )}

        {joinRequestCount + maintenanceCount + suggestionCount === 0 && (
          <p className="no-notifications">You're all caught up. No new notifications.</p>
        )}
      </section>
    </div>
  )
}
