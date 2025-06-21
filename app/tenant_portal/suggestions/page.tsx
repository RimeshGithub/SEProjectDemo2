'use client'

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
  increment,
  where
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function SuggestionPage() {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [joinedProperties, setJoinedProperties] = useState([])
  const [suggestionText, setSuggestionText] = useState('')
  const [activeTab, setActiveTab] = useState<'addSuggestion' | 'suggestionList'>('addSuggestion')
  const [mySuggestions, setMySuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggestionLoading, setSuggestionLoading] = useState(false)

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

  const fetchMySuggestions = async () => {
    if (!user) return
    setSuggestionLoading(true)

    const q = query(collection(db, 'suggestions'), where('tenantEmail', '==', user.email))
    const snapshot = await getDocs(q)

    const all = snapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate(),
      message: doc.data().message,
      landlordUid: doc.data().landlordUid
    }))

    setMySuggestions(all.sort((a, b) => b.createdAt - a.createdAt))
    setSuggestionLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'suggestionList') {
      fetchMySuggestions()
    }
  }, [activeTab, user])

  const handleSubmit = async () => {
    if (!suggestionText.trim()) {
      alert('Enter your suggestion.')
      return
    }

    const landlordUid = joinedProperties[0]?.createdBy
    if (!landlordUid) {
      alert('You are not associated with any property.')
      return
    }

    await addDoc(collection(db, 'suggestions'), {
      tenantEmail: user.email,
      tenantName: displayName,
      message: suggestionText.trim(),
      createdAt: new Date(),
      landlordUid
    })

    await updateDoc(doc(db, 'landlord_notifications', landlordUid), {
      suggestionCount: increment(1),
      updatedAt: new Date()
    })

    alert('Suggestion submitted.')
    setSuggestionText('')
  }

  const handleDelete = async (id: string, landlordUid: string) => {
    const confirmDelete = confirm('Delete this suggestion?')
    if (!confirmDelete) return

    try {
      await deleteDoc(doc(db, 'suggestions', id))

      const notifRef = doc(db, 'landlord_notifications', landlordUid)
      const notifSnap = await getDoc(notifRef)
      const currentCount = notifSnap.data()?.suggestionCount || 0

      if (currentCount > 0) {
        await updateDoc(notifRef, {
          suggestionCount: increment(-1),
          updatedAt: new Date()
        })
      } else {
        await updateDoc(notifRef, {
          updatedAt: new Date()
        })
      }

      fetchMySuggestions()
    } catch (err) {
      console.error('Failed to delete suggestion:', err)
      alert('Something went wrong while deleting.')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Suggestions</h2>
        <p className="heading-p">Submit your suggestions here</p>
      </section>

      <section className="tab-nav">
        <button
          className={activeTab === 'addSuggestion' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('addSuggestion')}
        >
          Add Suggestion
        </button>
        <button
          className={activeTab === 'suggestionList' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('suggestionList')}
        >
          Your Suggestions
        </button>
      </section>

      {activeTab === 'addSuggestion' && (
        <section>
          {joinedProperties.length > 0 ? (
            <div className="suggestions-form">
              <label>Suggestion Details:</label>
              <textarea
                className="textarea"
                rows={4}
                value={suggestionText}
                onChange={e => setSuggestionText(e.target.value)}
                placeholder="Write your suggestion here..."
              />
              <button onClick={handleSubmit} className="blue-btn">Submit Suggestion</button>
            </div>
          ) : (
            <p className="heading-p">You haven’t joined any property yet.</p>
          )}
        </section>
      )}

      {activeTab === 'suggestionList' && (
        <section>
          {suggestionLoading ? (
            <Loading />
          ) : mySuggestions.length > 0 ? (
            <ul className="suggestions-list">
              {mySuggestions.map((sug, idx) => (
                <li key={idx} className="black-blue-box">
                  <div className="suggestions-header">
                    <strong>Suggestion #{idx + 1}</strong>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(sug.id, sug.landlordUid)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="suggestions-body">
                    <p>
                      <strong>Submitted: </strong>
                      {sug.createdAt.toUTCString().split(' ', 4).join(' ')} - {sug.createdAt.toLocaleTimeString()}
                    </p>
                    <p><strong>Suggestion: </strong>{sug.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="heading-p">You have not submitted any suggestions.</p>
          )}
        </section>
      )}
    </div>
  )
}
