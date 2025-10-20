export function HomePage() {
  return (
    <div className="page">
      <h1>Options Trading Dashboard</h1>
      <p>Welcome to your options trading tracker!</p>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Portfolio Value</h3>
          <p>Loading...</p>
        </div>

        <div className="card">
          <h3>Recent Activity</h3>
          <p>No trades imported yet</p>
        </div>

        <div className="card">
          <h3>P&L Summary</h3>
          <p>Loading...</p>
        </div>
      </div>
    </div>
  );
}
