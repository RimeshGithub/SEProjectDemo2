'use client'

import Loading from '../../components/loading'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  increment
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'
import { FaUsers, FaBuilding, FaMapMarked, FaDoorOpen, FaInfoCircle } from 'react-icons/fa'
import defaultProfilePic from '../../../public/avatar.jpeg'

export default function Properties() {
  const [propertyName, setPropertyName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [rooms, setRooms] = useState('')
  const [properties, setProperties] = useState([])
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [visibleTenants, setVisibleTenants] = useState({})
  const [allJoinRequests, setAllJoinRequests] = useState([])
  const [activeTab, setActiveTab] = useState('properties')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (!currentUser) return

      const docSnap = await getDoc(doc(db, 'users', currentUser.uid))
      setDisplayName(docSnap.data()?.displayName || '')
      await fetchAll(currentUser.uid)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const tab = localStorage.getItem('landlordTab')
    if (tab === 'requests') setActiveTab('requests')
    localStorage.removeItem('landlordTab')
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)

    const q = query(collection(db, 'properties'), where('createdBy', '==', uid))
    const snapshot = await getDocs(q)

    const props = []
    const joinReqs = []

    for (const docSnap of snapshot.docs) {
      const property = { id: docSnap.id, name: docSnap.data().name, ...docSnap.data() }
      props.push(property)

      const joinSnap = await getDocs(collection(db, 'properties', docSnap.id, 'joinRequests'))
      joinSnap.forEach(req => {
        joinReqs.push({
          id: req.id,
          propertyId: docSnap.id,
          propertyName: property.name,
          ...req.data()
        })
      })
    }

    setProperties(props)
    setAllJoinRequests(joinReqs)
    setLoading(false)
  }

  const handleCreateProperty = async () => {
    if (!propertyName.trim() || !location.trim()) {
      alert('Property name and location are required.')
      return
    }

    const roomsNum = Number(rooms)

    if (!rooms.trim() || isNaN(roomsNum) || roomsNum <= 0 || !Number.isInteger(roomsNum)) {
      alert('Number of rooms is required and must be a positive integer.')
      return
    }

    await addDoc(collection(db, 'properties'), {
      name: propertyName.trim(),
      location: location.trim(),
      description: description.trim(),
      rooms: roomsNum,
      createdBy: user.uid,
      ownerName: displayName || '',
      createdAt: new Date(),
      tenants: []
    })

    setPropertyName('')
    setLocation('')
    setDescription('')
    setRooms('')
    alert('Property added successfully.')
    fetchAll(user.uid)
  }

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Delete this property?')) return
    await deleteDoc(doc(db, 'properties', propertyId))
    fetchAll(user.uid)
  }

  const handleRemoveTenant = async (propertyId: string, tenantEmail: string) => {
    if (!confirm(`Remove this tenant?`)) return
    const property = properties.find(p => p.id === propertyId)
    const updatedTenants = (property.tenants || []).filter((t: any) => t.email !== tenantEmail)
    await updateDoc(doc(db, 'properties', propertyId), { tenants: updatedTenants })
    fetchAll(user.uid)
  }

  const decrementJoinRequestCount = async () => {
    if (!user?.uid) return
    const notifRef = doc(db, 'landlord_notifications', user.uid)
    await updateDoc(notifRef, {
      joinRequestCount: increment(-1)
    }).catch(() => { })
  }

  const handleAcceptRequest = async (request) => {
    const property = properties.find(p => p.id === request.propertyId)

    if (!property) {
      alert('Property not found.')
      return
    }

    const currentTenants = property.tenants || []
    const maxRooms = property.rooms || 0

    if (currentTenants.length >= maxRooms) {
      alert('Cannot accept request. All rooms are already occupied.')
      return
    }

    const updatedTenants = [
      ...currentTenants,
      {
        name: request.name,
        email: request.email,
        photoURL: request.photoURL
      }
    ]

    const propertyRef = doc(db, 'properties', request.propertyId)
    await updateDoc(propertyRef, { tenants: updatedTenants })

    await addDoc(collection(db, 'tenant_notifications'), {
      tenantEmail: request.email,
      propertyId: request.propertyId,
      propertyName: request.propertyName,
      status: 'Accepted',
      createdAt: new Date()
    })

    await deleteDoc(doc(db, 'properties', request.propertyId, 'joinRequests', request.id))
    await decrementJoinRequestCount()
    fetchAll(user.uid)
  }

  const handleRejectRequest = async (request) => {
     await addDoc(collection(db, 'tenant_notifications'), {
      tenantEmail: request.email,
      propertyId: request.propertyId,
      propertyName: request.propertyName,
      status: 'Rejected',
      createdAt: new Date()
    })
    
    await deleteDoc(doc(db, 'properties', request.propertyId, 'joinRequests', request.id))
    await decrementJoinRequestCount()
    fetchAll(user.uid)
  }

  const toggleTenantsView = (propertyId: string) => {
    setVisibleTenants(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }))
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Properties</h2>
        <p className="heading-p">Add your properties and allow tenants to join them</p>
      </section>

      <section className="tab-nav">
        <button onClick={() => setActiveTab('properties')} className={activeTab === 'properties' ? 'tab-btn active' : 'tab-btn'}>
          Your Properties
        </button>
        <button onClick={() => setActiveTab('requests')} className={activeTab === 'requests' ? 'tab-btn active' : 'tab-btn'}>
          Join Requests
        </button>
        <button onClick={() => setActiveTab('add')} className={activeTab === 'add' ? 'tab-btn active' : 'tab-btn'}>
          Add Property
        </button>
      </section>

      {activeTab === 'properties' && (
        <section className="property-list-section">
          {properties.length > 0 ? (
            <ul className="property-list">
              {properties.map((property) => (
                <li key={property.id} className="property-item">
                  <div className="property-header">
                    <span className="span">
                      <FaBuilding />
                      <h3>{property.name}</h3>
                    </span>
                    <div className="property-actions">
                      <button className="blue-btn" onClick={() => toggleTenantsView(property.id)}>
                        {visibleTenants[property.id] ? 'Hide Tenants' : 'View Tenants'}
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteProperty(property.id)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="property-divider">
                    <span className="property-info span">
                      <FaMapMarked />
                      <h4>Location: {property.location}</h4>
                    </span>
                    <span className="property-info span">
                      <FaUsers />
                      <h4>Tenants: {property.tenants?.length || 0}</h4>
                    </span>
                    <span className="property-info span">
                      <FaDoorOpen />
                      <h4>Rooms: {property.tenants.length || 0} / {property.rooms || 0}</h4>
                    </span>
                  </div>

                  {property.description && (
                    <span className="property-info span">
                      <FaInfoCircle /><h4>Description: {property.description}</h4>
                    </span>
                  )}

                  {visibleTenants[property.id] && (
                    <div className="tenants-list">
                      <h4>Current Tenants</h4>
                      {property.tenants?.length > 0 ? (
                        <ul>
                          {property.tenants.map((tenant, idx) => (
                            <li key={idx} className="tenant-item">
                              <div className="tenant-info">
                                <Image src={tenant.photoURL || defaultProfilePic} alt="Profile Pic" className="avatar" width={40} height={40} />
                                <div>
                                  <strong>{tenant.name}</strong><br />
                                  <small>{tenant.email}</small>
                                </div>
                              </div>
                              <button
                                className="delete-btn"
                                onClick={() => handleRemoveTenant(property.id, tenant.email)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="no-tenants-text">No tenants yet.</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="no-property">No properties found.</p>}
        </section>
      )}

      {activeTab === 'requests' && (
        <section className="join-requests-section">
          {allJoinRequests.length > 0 ? (
            <ul className="join-requests-list">
              {allJoinRequests.map((req, idx) => (
                <li key={idx} className="join-request-item">
                  <div className="tenant-info">
                    <Image src={req.photoURL || defaultProfilePic} alt="Profile Pic" className="avatar" width={40} height={40} />
                    <div>
                      <strong>{req.name}</strong><br />
                      <small>{req.email}</small><br />
                      <small><strong>Property: </strong>{req.propertyName}</small><br />
                      <small><strong>Available Rooms: </strong>
                        {properties.find(p => p.id === req.propertyId)?.rooms - (properties.find(p => p.id === req.propertyId)?.tenants?.length || 0)}
                      </small>
                    </div>
                  </div>
                  <div>
                    <button onClick={() => handleAcceptRequest(req)} className="blue-btn">Accept</button>
                    <button onClick={() => handleRejectRequest(req)} className="reject-btn">Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="no-requests">No join requests found.</p>}
        </section>
      )}

      {activeTab === 'add' && (
        <section className="create-property-form">
          <input
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="Enter property name"
            className="property-input"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location"
            className="property-input"
          />
          <input
            type="number"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder="Enter number of rooms"
            className="property-input"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description of the property (optional)"
            className="property-textarea"
            rows={3}
          />
          <button onClick={handleCreateProperty} className="blue-btn">
            Add Property
          </button>
        </section>
      )}
    </div>
  )
}
