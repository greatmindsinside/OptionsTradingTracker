// Simple test component to debug the blank page issue
export default function WheelTrackerMock() {
  return (
    <div
      style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Wheel Tracker Test</h1>
      <p>If you can see this text, the component is rendering correctly.</p>
      <div
        style={{
          marginTop: '20px',
          padding: '10px',
          border: '1px solid #333',
          borderRadius: '8px',
        }}
      >
        <h2>Test Section</h2>
        <p>This is a test to make sure React components are working.</p>
        <button onClick={() => alert('Button clicked!')}>Test Button</button>
      </div>
    </div>
  );
}
