/**
 * Phase 4 Calculations Demo Component
 * Interactive demonstration of our options calculation engine
 */

import { useState } from 'react';
import {
  CoveredCall,
  CashSecuredPut,
  LongCall,
  formatPercent,
  type CoveredCallInputs,
  type CashSecuredPutInputs,
  type LongCallInputs,
  type RiskFlag,
} from '@/modules/calc/index';

export function Phase4Demo() {
  const [activeStrategy, setActiveStrategy] = useState<
    'covered-call' | 'cash-secured-put' | 'long-call'
  >('covered-call');

  // Sample data for demonstrations (using future dates)
  const sampleCoveredCall: CoveredCallInputs = {
    sharePrice: 98,
    shareBasis: 95,
    shareQty: 100,
    strike: 100,
    premium: 250,
    expiration: new Date('2025-12-19'), // Updated to future date
    fees: 0.65,
  };

  const sampleCashSecuredPut: CashSecuredPutInputs = {
    strike: 95,
    premium: 300,
    expiration: new Date('2025-12-19'), // Updated to future date
    fees: 0.65,
    cashSecured: 9500,
    currentPrice: 98,
  };

  const sampleLongCall: LongCallInputs = {
    strike: 100,
    premium: 450,
    expiration: new Date('2025-12-19'), // Updated to future date
    fees: 0.65,
    currentPrice: 103,
    currentPremium: 520,
  };

  const renderRiskFlags = (risks: RiskFlag[]) => {
    if (risks.length === 0) {
      return <div className="risk-flag risk-none">✅ No risk flags</div>;
    }

    return (
      <div className="risk-flags">
        {risks.map((risk, index) => (
          <div key={index} className={`risk-flag risk-${risk.severity}`}>
            <strong>{risk.severity.toUpperCase()}:</strong> {risk.message}
          </div>
        ))}
      </div>
    );
  };

  const renderCoveredCallDemo = () => {
    const cc = new CoveredCall(sampleCoveredCall);
    const metrics = cc.getAllMetrics();
    const risks = cc.analyzeRisks();

    return (
      <div className="strategy-demo">
        <h3>📈 Covered Call Example</h3>
        <div className="position-summary">
          <p>
            <strong>Position:</strong> Own 100 shares @ $95, sold $100 call for $2.50
          </p>
          <p>
            <strong>Current Stock Price:</strong> $98
          </p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Breakeven</h4>
            <div className="metric-value">${metrics.breakeven}</div>
          </div>
          <div className="metric-card">
            <h4>Max Profit</h4>
            <div className="metric-value">${metrics.maxProfit}</div>
            <div className="metric-sub">
              ({formatPercent(metrics.annualizedROO)} annualized ROO)
            </div>
          </div>
          <div className="metric-card">
            <h4>Max Loss</h4>
            <div className="metric-value">${metrics.maxLoss}</div>
          </div>
          <div className="metric-card">
            <h4>Days to Expiration</h4>
            <div className="metric-value">{metrics.daysToExpiration}</div>
          </div>
        </div>

        <div className="greeks-section">
          <h4>📊 Greeks (Educational)</h4>
          <p>
            <strong>Delta:</strong> {metrics.currentDelta.toFixed(3)}
          </p>
          <p>
            <strong>Theta:</strong> ${metrics.currentTheta.toFixed(2)} per day
          </p>
        </div>

        <div className="risk-section">
          <h4>⚠️ Risk Analysis</h4>
          {renderRiskFlags(risks)}
        </div>
      </div>
    );
  };

  const renderCashSecuredPutDemo = () => {
    const csp = new CashSecuredPut(sampleCashSecuredPut);
    const metrics = csp.getAllMetrics();
    const risks = csp.analyzeRisks();

    return (
      <div className="strategy-demo">
        <h3>📉 Cash-Secured Put Example</h3>
        <div className="position-summary">
          <p>
            <strong>Position:</strong> Sold $95 put for $3.00, secured $9,500 cash
          </p>
          <p>
            <strong>Current Stock Price:</strong> $98
          </p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Breakeven</h4>
            <div className="metric-value">${metrics.breakeven}</div>
          </div>
          <div className="metric-card">
            <h4>Max Profit</h4>
            <div className="metric-value">${metrics.maxProfit}</div>
            <div className="metric-sub">
              ({formatPercent(metrics.annualizedROO)} annualized ROO)
            </div>
          </div>
          <div className="metric-card">
            <h4>Effective Basis</h4>
            <div className="metric-value">${metrics.effectiveBasis}</div>
            <div className="metric-sub">(if assigned)</div>
          </div>
          <div className="metric-card">
            <h4>Days to Expiration</h4>
            <div className="metric-value">{metrics.daysToExpiration}</div>
          </div>
        </div>

        <div className="assignment-section">
          <h4>📋 Assignment Analysis</h4>
          <p>
            <strong>Likely Assignment:</strong> {csp.isLikelyAssignment() ? '❌ Yes' : '✅ No'}
          </p>
          <p>
            <strong>Status:</strong> {csp.isInTheMoney() ? 'In-The-Money' : 'Out-Of-The-Money'}
          </p>
        </div>

        <div className="risk-section">
          <h4>⚠️ Risk Analysis</h4>
          {renderRiskFlags(risks)}
        </div>
      </div>
    );
  };

  const renderLongCallDemo = () => {
    const lc = new LongCall(sampleLongCall);
    const metrics = lc.getAllMetrics();
    const risks = lc.analyzeRisks();

    return (
      <div className="strategy-demo">
        <h3>📞 Long Call Example</h3>
        <div className="position-summary">
          <p>
            <strong>Position:</strong> Bought $100 call for $4.50
          </p>
          <p>
            <strong>Current:</strong> Stock $103, Option $5.20
          </p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Breakeven</h4>
            <div className="metric-value">${metrics.breakeven}</div>
          </div>
          <div className="metric-card">
            <h4>Unrealized P&L</h4>
            <div className="metric-value">${metrics.unrealizedPnL}</div>
            <div className="metric-sub">({formatPercent(metrics.percentageGain)})</div>
          </div>
          <div className="metric-card">
            <h4>Intrinsic Value</h4>
            <div className="metric-value">${metrics.intrinsicValue}</div>
          </div>
          <div className="metric-card">
            <h4>Time Value</h4>
            <div className="metric-value">${metrics.timeValue}</div>
          </div>
        </div>

        <div className="option-analysis">
          <h4>📈 Option Analysis</h4>
          <p>
            <strong>Classification:</strong> {lc.getClassification()}
          </p>
          <p>
            <strong>Moneyness:</strong> {lc.moneyness().toFixed(2)}%
          </p>
          <p>
            <strong>Probability ITM:</strong> {lc.probabilityITM()}%
          </p>
        </div>

        <div className="risk-section">
          <h4>⚠️ Risk Analysis</h4>
          {renderRiskFlags(risks)}
        </div>
      </div>
    );
  };

  return (
    <div className="phase4-demo">
      <div className="demo-header">
        <h2>🚀 Phase 4: Options Calculations Engine</h2>
        <p>Interactive demonstration of our comprehensive options calculation system</p>
      </div>

      <div className="strategy-selector">
        <button
          className={`strategy-btn ${activeStrategy === 'covered-call' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('covered-call')}
        >
          Covered Call
        </button>
        <button
          className={`strategy-btn ${activeStrategy === 'cash-secured-put' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('cash-secured-put')}
        >
          Cash-Secured Put
        </button>
        <button
          className={`strategy-btn ${activeStrategy === 'long-call' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('long-call')}
        >
          Long Call
        </button>
      </div>

      <div className="demo-content">
        {activeStrategy === 'covered-call' && renderCoveredCallDemo()}
        {activeStrategy === 'cash-secured-put' && renderCashSecuredPutDemo()}
        {activeStrategy === 'long-call' && renderLongCallDemo()}
      </div>

      <div className="demo-footer">
        <div className="feature-summary">
          <h3>✅ Phase 4 Features Implemented:</h3>
          <ul>
            <li>Three core options strategies with full calculations</li>
            <li>Risk analysis system with severity levels</li>
            <li>Greeks approximations for educational purposes</li>
            <li>P&L scenarios and payoff modeling</li>
            <li>Comprehensive validation and error handling</li>
            <li>31 unit tests with 100% pass rate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// CSS styles (would normally be in a separate file)
const styles = `
.phase4-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
}

.demo-header h2 {
  color: #2563eb;
  margin-bottom: 10px;
}

.strategy-selector {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.strategy-btn {
  padding: 12px 24px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.strategy-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.strategy-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.strategy-demo {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
}

.position-summary {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  border-left: 4px solid #3b82f6;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.metric-card h4 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 4px;
}

.metric-sub {
  font-size: 12px;
  color: #6b7280;
}

.greeks-section, .assignment-section, .option-analysis {
  background: #f0f9ff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #0ea5e9;
}

.risk-section {
  background: #fefce8;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #eab308;
}

.risk-flags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-flag {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.risk-none {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.risk-low {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.risk-medium {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.risk-high {
  background: #fecaca;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.risk-critical {
  background: #fce7f3;
  color: #be185d;
  border: 1px solid #f9a8d4;
}

.demo-footer {
  margin-top: 40px;
  background: #f8fafc;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.feature-summary h3 {
  color: #059669;
  margin-bottom: 16px;
}

.feature-summary ul {
  list-style: none;
  padding: 0;
}

.feature-summary li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
}

.feature-summary li:before {
  content: "✅";
  position: absolute;
  left: 0;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
