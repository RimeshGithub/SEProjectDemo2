'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../../lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Loading from '../../components/loading'

export default function Notifications() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return
      setUser(currentUser)
      await fetchNotifications(currentUser.email)
    })

    return () => unsubscribe()
  }, [])

  const fetchNotifications = async (email: string) => {
    setLoading(true)

    const q = query(
      collection(db, 'tenant_notifications'),
      where('tenantEmail', '==', email)
    )
    const snapshot = await getDocs(q)

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data().createdAt,
      ...doc.data()
    }))

    setNotifications(data.sort((a, b) =>
      b.createdAt?.toDate?.() - a.createdAt?.toDate?.()
    ))
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'tenant_notifications', id))
    if (user?.email) fetchNotifications(user.email)
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <div className="notification-header">
          <h2 className="heading-h2">Notifications</h2>
          <button className="blue-btn" onClick={() => router.back()}>Close</button>
        </div>
      </section>

      <section>
        {notifications.length === 0 ? (
          <p className="heading-p">Notifications will appear here</p>
        ) : (
          <ul className="notification-list">
            {notifications.map((notif, idx) => (
              <li key={idx} className="black-blue-box">
                  <p>
                    Your join request for <strong>{notif.propertyName}</strong> has been 
                      <strong style={{ color: notif.status === 'Accepted' ? '#10b981' : '#ef4444' }}>
                        {` ${notif.status}`}
                      </strong>
                  </p>
                  <button className="delete-btn" onClick={() => handleDelete(notif.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
