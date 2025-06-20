'use client'

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

export default function SuggestionPage() {
  const [user, setUser] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = async (uid) => {
    setLoading(true)

    const q = query(collection(db, 'suggestions'), where('landlordUid', '==', uid))
    const snapshot = await getDocs(q)

    const allSuggestions = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      createdAt: docSnap.data().createdAt,
      ...docSnap.data()
    }))

    setSuggestions(allSuggestions.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()))
    setLoading(false)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return
      setUser(currentUser)
      await fetchSuggestions(currentUser.uid)
    })

    return () => unsubscribe()
  }, [])

  const handleDelete = async (suggestionId: string) => {
    const confirmed = confirm('Delete this suggestion?')
    if (!confirmed || !user) return

    try {
      await deleteDoc(doc(db, 'suggestions', suggestionId))

      const notifRef = doc(db, 'notifications', user.uid)
      const notifSnap = await getDocs(query(collection(db, 'notifications'), where('__name__', '==', user.uid)))

      if (!notifSnap.empty) {
        const notifData = notifSnap.docs[0].data()
        const currentCount = notifData.suggestionCount || 0

        if (currentCount > 0) {
          await updateDoc(notifRef, {
            suggestionCount: increment(-1),
            updatedAt: new Date()
          })
        }
      }

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch (error) {
      console.error('Failed to delete suggestion:', error)
      alert('An error occurred while deleting the suggestion.')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <section>
        <h2 className="heading-h2">Suggestions</h2>
        <p className="heading-p">View all suggestions submitted by your tenants</p>

        {suggestions.length > 0 ? (
          <ul className="suggestions-list">
            {suggestions.map((sug, idx) => (
              <li key={idx} className="black-blue-box">
                <div className="suggestions-header">
                  <div>Suggestion #{idx + 1}</div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(sug.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="suggestions-body">
                  <p><strong>Tenant: </strong>{sug.tenantName}</p>
                  <p><strong>Email: </strong>{sug.tenantEmail}</p>
                  <p>
                    <strong>Submitted: </strong> 
                    {new Date(sug.createdAt?.toDate()).toUTCString().split(' ', 4).join(' ')} - {new Date(sug.createdAt?.toDate()).toLocaleTimeString()}
                  </p>
                  <p><strong>Suggestion: </strong>{sug.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="heading-p">No suggestions submitted yet.</p>
        )}
      </section>
    </div>
  )
}
