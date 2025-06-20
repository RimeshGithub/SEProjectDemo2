import Link from 'next/link'

export default function Home() {
    return (
      <div className="home-container">
        <h1 className="home-title">RentAssist</h1>
        <p className="home-description">
          Simplifying property management for landlords and tenants. Track payments, handle maintenance, manage tenants — all in one platform
        </p>
        <Link href="/login">
          <button className="login-button">Login</button>
        </Link>
      </div>
    )
  }






