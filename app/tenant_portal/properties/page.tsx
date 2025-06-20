'use client'

import '../style.css'
import Loading from '../../components/loading'
import { useEffect, useState } from 'react'
import { db, auth } from '../../../lib/firebase'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  increment
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { FaBuilding, FaMapMarked, FaSignOutAlt } from 'react-icons/fa'

export default function TenantDashboard() {
  const [user, setUser] = useState(null)
  const [availableProperties, setAvailableProperties] = useState([])
  const [joinedProperties, setJoinedProperties] = useState([])
  const [activeTab, setActiveTab] = useState<'available' | 'joined'>('available')
  const [availableSearch, setAvailableSearch] = useState('')
  const [joinedSearch, setJoinedSearch] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joinRequestedMap, setJoinRequestedMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (!currentUser) return
      fetchProperties(currentUser.email)

      getDoc(doc(db, 'users', currentUser.uid)).then((doc) => {
        setDisplayName(doc.data()?.displayName || '')
      })
    })
    return () => unsubscribe()
  }, [])

  const fetchProperties = async (email: string) => {
    setLoading(true)
    const q = query(collection(db, 'properties'))
    const snapshot = await getDocs(q)
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const joined = all.filter((prop: any) =>
      (prop.tenants || []).some((t: any) => t.email === email)
    )

    const notJoined = all.filter((prop: any) =>
      !(prop.tenants || []).some((t: any) => t.email === email) &&
      (prop.tenants?.length || 0) < (prop.rooms || 0) // <-- exclude full properties
    )

    setJoinedProperties(joined)
    setAvailableProperties(notJoined)

    // Check join requests for notJoined properties
    const joinMap = {}
    for (const prop of notJoined) {
      const requestRef = collection(doc(db, 'properties', prop.id), 'joinRequests')
      const requestSnap = await getDocs(requestRef)
      joinMap[prop.id] = requestSnap.docs.some(d => d.data().email === email)
    }

    setJoinRequestedMap(joinMap)
    setLoading(false)
  }

  const handleJoin = async (propertyId: string) => {
    if (!user?.email) return

    try {
      const requestRef = doc(db, 'properties', propertyId)
      const requestsCol = collection(requestRef, 'joinRequests')

      const existingRequests = await getDocs(requestsCol)
      const alreadyRequested = existingRequests.docs.some(
        (doc) => doc.data().email === user.email
      )

      if (alreadyRequested || joinRequestedMap[propertyId]) {
        alert('You have already requested to join this property.')
        return
      }

      const propertyDoc = await getDoc(requestRef)
      const landlordUid = propertyDoc.data()?.createdBy

      const newRequest = {
        name: displayName || 'Unknown',
        email: user.email,
        photoURL: user.photoURL || '',
        requestedAt: new Date()
      }

      await addDoc(requestsCol, newRequest)

      if (landlordUid) {
        await updateDoc(doc(db, 'notifications', landlordUid), {
          joinRequestCount: increment(1)
        }).catch(() => { }) // Avoid crashing if doc doesn't exist
      }

      setJoinRequestedMap(prev => ({
        ...prev,
        [propertyId]: true
      }))

      alert('Join request sent to landlord!')
      fetchProperties(user.email)
    } catch (err) {
      console.error('Error sending join request:', err)
      alert('Failed to send join request.')
    }
  }

  const handleLeave = async (propertyId: string) => {
    if (!user?.email) return
    if (!confirm('Are you sure you want to leave this property?')) return

    const prop = joinedProperties.find(p => p.id === propertyId)
    const updatedTenants = (prop.tenants || []).filter((t: any) => t.email !== user.email)

    await updateDoc(doc(db, 'properties', propertyId), {
      tenants: updatedTenants
    })

    fetchProperties(user.email)
    alert('You left the property.')
  }

  const filterProperties = (list, search) => {
    const s = search.toLowerCase()
    return list.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.location.toLowerCase().includes(s) ||
      (p.ownerName || '').toLowerCase().includes(s)
    )
  }

  const filteredAvailable = filterProperties(availableProperties, availableSearch)
  const filteredJoined = filterProperties(joinedProperties, joinedSearch)

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Properties</h2>
        <p className="heading-p">Here you can join available properties</p>
      </section>
      
      <section className="tab-nav">
        <button
          className={activeTab === 'available' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('available')}
        >
          Available Properties
        </button>
        <button
          className={activeTab === 'joined' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('joined')}
        >
          Joined Properties
        </button>
      </section>

      {activeTab === 'available' && (
        <section>
          <input
            type="text"
            className="search-bar"
            placeholder="Search available properties..."
            value={availableSearch}
            onChange={(e) => setAvailableSearch(e.target.value)}
          />

          {filteredAvailable.length > 0 ? (
            <ul className="join-property-list">
              {filteredAvailable.map((property: any) => (
                <li key={property.id} className="black-box">
                  <div className="join-header">
                    <FaBuilding />
                    <h3>{property.name}</h3>
                  </div>
                  <div className="join-details">
                    <span><FaMapMarked /> {property.location}</span>
                    <span>Owner: {property.ownerName}</span>
                    <span>
                      Rooms: {(property.tenants?.length || 0)} / {property.rooms || 0}
                    </span>
                    <button
                      className="join-btn"
                      onClick={() => handleJoin(property.id)}
                    >
                      {joinRequestedMap[property.id] ? 'Requested' : 'Request to Join'}
                    </button>
                  </div>
                  {property.description && <p className='join-description'><strong>Description: </strong>{property.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-property">No properties found.</p>
          )}
        </section>
      )}

      {activeTab === 'joined' && (
        <section>
          <input
            type="text"
            className="search-bar"
            placeholder="Search joined properties..."
            value={joinedSearch}
            onChange={(e) => setJoinedSearch(e.target.value)}
          />

          {filteredJoined.length > 0 ? (
            <ul className="join-property-list">
              {filteredJoined.map((property: any) => (
                <li key={property.id} className="black-box joined">
                  <div className="join-header">
                    <FaBuilding />
                    <h3>{property.name}</h3>
                  </div>
                  <div className="join-details">
                    <span><FaMapMarked /> {property.location}</span>
                    <span>Owner: {property.ownerName}</span>
                    <button
                      className="leave-btn"
                      onClick={() => handleLeave(property.id)}
                    >
                      <FaSignOutAlt /> Leave
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-property">No properties joined.</p>
          )}
        </section>
      )}
    </div>
  )
}
