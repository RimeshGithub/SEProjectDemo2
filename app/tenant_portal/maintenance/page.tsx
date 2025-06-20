'use client'

import '../style.css'
import Loading from '../../components/loading'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function MaintenancePage() {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [joinedProperties, setJoinedProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [requestText, setRequestText] = useState('')
  const [activeTab, setActiveTab] = useState<'addRequest' | 'requestList'>('addRequest')
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return
      setUser(currentUser)

      const propQuery = query(collection(db, 'properties'))
      const snapshot = await getDocs(propQuery)

      const props = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data()
          const tenants = data.tenants || []
          const isTenant = tenants.some(t => t.email === currentUser.email)
          return isTenant ? { id: docSnap.id, name: data.name, location: data.location, createdBy: data.createdBy } : null
        })
        .filter(Boolean)

      setJoinedProperties(props)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid))
        setDisplayName(docSnap.data()?.displayName || '')
      }
    }
    fetchUserData()
  }, [user])

  const fetchMyRequests = async () => {
    if (!user || joinedProperties.length === 0) return

    setRequestsLoading(true)
    const allRequests = []

    for (const prop of joinedProperties) {
      const reqSnap = await getDocs(collection(db, 'properties', prop.id, 'maintenanceRequests'))
      reqSnap.forEach(req => {
        if (req.data().tenantEmail === user.email) {
          allRequests.push({
            id: req.id,
            propertyId: prop.id,
            propertyName: prop.name,
            location: prop.location,
            createdAt: req.data().createdAt?.toDate(),
            message: req.data().message
          })
        }
      })
    }

    setMyRequests(allRequests.sort((a, b) => b.createdAt - a.createdAt))
    setRequestsLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'requestList') {
      fetchMyRequests()
    }
  }, [activeTab, user, joinedProperties])

  const handleSubmit = async () => {
    if (!selectedProperty || !requestText.trim()) {
      alert('Select a property and enter request details.')
      return
    }

    const selectedProp = joinedProperties.find(p => p.id === selectedProperty)
    const landlordUid = selectedProp.createdBy

    await addDoc(collection(db, 'properties', selectedProperty, 'maintenanceRequests'), {
      tenantEmail: user.email,
      tenantName: displayName,
      message: requestText.trim(),
      createdAt: new Date()
    })

    await updateDoc(doc(db, 'notifications', landlordUid), {
      maintenanceCount: increment(1),
      updatedAt: new Date()
    })

    alert('Maintenance request submitted.')
    setRequestText('')
    setSelectedProperty('')
  }

  const handleDelete = async (propertyId: string, requestId: string) => {
    const confirmDelete = window.confirm('Delete this maintenance request?')
    if (!confirmDelete) return

    try {
      await deleteDoc(doc(db, 'properties', propertyId, 'maintenanceRequests', requestId))

      const property = joinedProperties.find(p => p.id === propertyId)
      if (property?.createdBy) {
        const notifRef = doc(db, 'notifications', property.createdBy)
        const notifSnap = await getDoc(notifRef)

        const currentCount = notifSnap.data()?.maintenanceCount || 0
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

      alert('Request deleted.')
      fetchMyRequests()
    } catch (error) {
      console.error('Failed to delete maintenance request:', error)
      alert('Something went wrong while deleting the request.')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Maintenance</h2>
        <p className="heading-p">Submit maintenance requests for your property</p>
      </section>

      <section className="tab-nav">
        <button
          className={activeTab === 'addRequest' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('addRequest')}
        >
          Add Request
        </button>
        <button
          className={activeTab === 'requestList' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('requestList')}
        >
          Your Requests
        </button>
      </section>

      {activeTab === 'addRequest' && (
        <section>
          {joinedProperties.length > 0 ? (
            <div className="maintenance-form">
              <label>Select Property:</label>
              <select
                value={selectedProperty}
                onChange={e => setSelectedProperty(e.target.value)}
                className="dropdown"
              >
                <option value="">-- Choose --</option>
                {joinedProperties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.name} - {prop.location}</option>
                ))}
              </select>

              <label>Request Details:</label>
              <textarea
                className="textarea"
                rows={4}
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
                placeholder="Describe your maintenance request..."
              />

              <button onClick={handleSubmit} className="blue-btn">Submit Request</button>
            </div>
          ) : (
            <p className="heading-p">You haven’t joined any property yet.</p>
          )}
        </section>
      )}

      {activeTab === 'requestList' && (
        <section>
          {requestsLoading ? (
            <Loading />
          ) : myRequests.length > 0 ? (
            <ul className="maintenance-request-list">
              {myRequests.map((req, idx) => (
                <li key={idx} className="black-blue-box">
                  <div className="maintenance-request-header">
                    <strong>{req.propertyName} - {req.location}</strong>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(req.propertyId, req.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="maintenance-request-body">
                    <p>
                      <strong>Submitted: </strong>
                      {req.createdAt.toUTCString().split(' ', 4).join(' ')} - {req.createdAt.toLocaleTimeString()}
                    </p>
                    <p><strong>Request: </strong>{req.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="heading-p">You have not submitted any maintenance requests.</p>
          )}
        </section>
      )}
    </div>
  )
}
