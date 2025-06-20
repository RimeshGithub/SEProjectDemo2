// Import Font Awesome icons
import {  
  FaUsers, 
  FaDollarSign, 
  FaHammer,
  FaBuilding,
  FaPercentage
} from 'react-icons/fa'

export default function Home() {
  return (
    <>
      <section>
        <h2 className='heading-h2'>Dashboard</h2>
        <p className='heading-p'>Here's an overview of your tenants, properties and recent activities</p>
      </section>

      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Revenue <FaDollarSign /></div>
          <div className="metric-value">$12,500</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Tenants <FaUsers /></div>
          <div className="metric-value">18</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Properties <FaBuilding /></div>
          <div className="metric-value">6</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Occupancy Rate <FaPercentage /></div>
          <div className="metric-value">94%</div>
        </div>
      </section>

      <section className="tenant-activity-wrapper">
        <section className="tenant-section">
          <h3>Tenants</h3>
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Rent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="name">
                  <img src="/avatar.jpeg" alt="Profile Pic" className="avatar" />
                  Jane Doe
                </td>
                <td>101A</td>
                <td>$1,200</td>
                <td><span className="status paid">Paid</span></td>
              </tr>
              <tr>
                <td className="name">
                  <img src="/avatar.jpeg" alt="Profile Pic" className="avatar" />
                  Mike Smith
                </td>
                <td>202B</td>
                <td>$1,050</td>
                <td><span className="status overdue">Overdue</span></td>
              </tr>
              <tr>
                <td className="name">
                  <img src="/avatar.jpeg" alt="Profile Pic" className="avatar" />
                  Linda Lee
                </td>
                <td>303C</td>
                <td>$1,300</td>
                <td><span className="status paid">Paid</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="recent-activities">
            <h3>Recent Activities</h3>
            <div className="activity-list">
                <div className="activity-item">
                    <div className="activity-icon"><FaDollarSign /></div>
                    <div className="activity-content">
                        <div className="description">Sarah Johnson paid rent <span className="amount">$1,200</span></div>
                        <div className="time">2 hours ago</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon"><FaHammer /></div>
                    <div className="activity-content">
                        <div className="description">New maintenance request</div>
                        <div className="location">Oak Street #3</div>
                        <div className="time">4 hours ago</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon"><FaUsers /></div>
                    <div className="activity-content">
                        <div className="description">New tenant application</div>
                        <div className="location">Downtown Loft #8</div>
                        <div className="time">1 day ago</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon"><FaDollarSign /></div>
                    <div className="activity-content">
                        <div className="description">Emily Davis paid rent <span className="amount">$2,200</span></div>
                        <div className="time">2 days ago</div>
                    </div>
                </div>
            </div>
        </section>
      </section>

      <section className="property-section">
        <h3>Properties Overview</h3>
        <div className="property-cards">
          <div className="property-card">
            <div className="property-title">Sunset Apartments</div>
            <div>Units: 10</div>
            <div>Occupied: 9</div>
            <div>Revenue: $8,500</div>
          </div>
          <div className="property-card">
            <div className="property-title">Lakeside Villas</div>
            <div>Units: 8</div>
            <div>Occupied: 7</div>
            <div>Revenue: $4,000</div>
          </div>
        </div>
      </section>
    </>
  )
}
