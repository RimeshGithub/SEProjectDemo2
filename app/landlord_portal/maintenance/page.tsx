'use client'

import '../style.css'
import Loading from '../../components/loading'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function MaintenancePage() {
  const [user, setUser] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMaintenanceRequests = async (uid) => {
    const q = query(collection(db, 'properties'), where('createdBy', '==', uid))
    const snapshot = await getDocs(q)

    const allRequests = []

    for (const propDoc of snapshot.docs) {
      const propId = propDoc.id
      const propName = propDoc.data().name

      const reqSnap = await getDocs(collection(db, 'properties', propId, 'maintenanceRequests'))

      reqSnap.forEach(req => {
        allRequests.push({
          id: req.id,
          propertyId: propId,
          propertyName: propName,
          ...req.data()
        })
      })
    }

    setRequests(allRequests)
    setLoading(false)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return
      setUser(currentUser)
      await fetchMaintenanceRequests(currentUser.uid)
    })

    return () => unsubscribe()
  }, [])

  const handleDelete = async (requestId: string, propertyId: string) => {
    const confirmed = confirm('Delete this maintenance request?')
    if (!confirmed || !user) return

    await deleteDoc(doc(db, 'properties', propertyId, 'maintenanceRequests', requestId))

    const notifRef = doc(db, 'notifications', user.uid)
    const notifSnap = await getDocs(query(collection(db, 'notifications'), where('__name__', '==', user.uid)))

    if (!notifSnap.empty) {
      const notifData = notifSnap.docs[0].data()
      const currentCount = notifData.maintenanceCount ?? 0

      if (currentCount > 0) {
        await updateDoc(notifRef, {
          maintenanceCount: increment(-1),
          updatedAt: new Date()
        })
      } else {
        await updateDoc(notifRef, {
          updatedAt: new Date()
        })
      }
    }

    setRequests(prev => prev.filter(req => req.id !== requestId))
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Maintenance Requests</h2>
        <p className="heading-p">View all tenant maintenance requests across your properties</p>

        {requests.length > 0 ? (
          <ul className="maintenance-request-list">
            {requests.map((req, idx) => (
              <li key={idx} className="black-blue-box">
                <div className="maintenance-request-header">
                  <div>Maintenance Request for <strong>{req.propertyName}</strong></div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(req.id, req.propertyId)}
                  >
                    Delete
                  </button>
                </div>
                <div className="maintenance-request-body">
                  <p><strong>Tenant: </strong>{req.tenantName}</p>
                  <p><strong>Email: </strong>{req.tenantEmail}</p>
                  <p>
                    <strong>Submitted: </strong> 
                    {new Date(req.createdAt?.toDate()).toUTCString().split(' ', 4).join(' ')} - {new Date(req.createdAt?.toDate()).toLocaleTimeString()}
                  </p>
                  <p><strong>Request: </strong>{req.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="heading-p">No maintenance requests found.</p>
        )}
      </section>
    </div>
  )
}
