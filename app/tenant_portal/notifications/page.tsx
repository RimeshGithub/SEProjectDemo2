'use client'

import '../style.css'
import { useRouter } from 'next/navigation'

export default function Notifications() {
  const router = useRouter()

  return (
    <div>
      <section>
        <div className="notification-header">
          <h2 className="heading-h2">Notifications</h2>
          <button className="blue-btn" onClick={() => router.back()}>Close</button>
        </div>

        <p className="heading-p">
          Notifications appear here
        </p>
      </section>
    </div>
  )
}
