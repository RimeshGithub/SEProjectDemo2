'use client'

import Loading from '../../components/loading'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'
import defaultProfilePic from '../../../public/avatar.jpeg'
import { Tenant } from '../../types'

export default function TenantsPage() {
  const [tenantsMap, setTenantsMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchTenants(user.uid)
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchTenants = async (uid) => {
    setLoading(true)
    const q = query(collection(db, 'properties'), where('createdBy', '==', uid))
    const snapshot = await getDocs(q)

    const tempMap = {}

    for (const docSnap of snapshot.docs) {
      const property = docSnap.data()
      const propertyName = property.name || 'Unknown Property'
      const tenants = property.tenants || []

      tenants.forEach((tenant) => {
        if (!tempMap[tenant.email]) {
          tempMap[tenant.email] = {
            name: tenant.name,
            email: tenant.email,
            photoURL: tenant.photoURL || null,
            properties: [propertyName]
          }
        } else {
          tempMap[tenant.email].properties.push(propertyName)
        }
      })
    }

    setTenantsMap(tempMap)
    setLoading(false)
  }

  if (loading) return <Loading />

  return (
    <div>
      <section className="tenant-section">
        <h2 className="heading-h2">Tenants</h2>
        <p className="heading-p">Here's an overview of your tenants</p>
        <table className="tenant-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Properties Joined</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(tenantsMap).map((tenant : Tenant, idx) => (
              <tr key={idx}>
                <td className="name">
                  <Image
                    src={tenant.photoURL || defaultProfilePic}
                    alt="Profile Pic"
                    className="avatar"
                    width={35}
                    height={35}
                  />
                  {tenant.name}
                </td>
                <td>{tenant.email}</td>
                <td>{tenant.properties.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
