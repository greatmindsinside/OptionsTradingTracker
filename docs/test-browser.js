/**
 * Browser Console Test for Phase 4 Calculations
 * Run this in the browser console to verify our calculations work in the browser environment
 */

// Test script to run in browser console
const browserTest = `
// Import and test Phase 4 calculations
import { CoveredCall, CashSecuredPut, LongCall } from '/src/modules/calc/index.js';

console.log('🚀 Testing Phase 4 Calculations in Browser...');

// Test Covered Call
const ccInputs = {
  sharePrice: 98,
  shareBasis: 95, 
  shareQty: 100,
  strike: 100,
  premium: 250,
  expiration: new Date('2024-12-20'),
  fees: 0.65
};

try {
  const cc = new CoveredCall(ccInputs);
  const ccMetrics = cc.getAllMetrics();
  console.log('✅ Covered Call Test:', {
    breakeven: ccMetrics.breakeven,
    maxProfit: ccMetrics.maxProfit,
    annualizedROO: ccMetrics.annualizedROO
  });
} catch (e) {
  console.error('❌ Covered Call Error:', e);
}

// Test Cash-Secured Put  
const cspInputs = {
  strike: 95,
  premium: 300,
  expiration: new Date('2024-12-20'),
  fees: 0.65,
  cashSecured: 9500,
  currentPrice: 98
};

try {
  const csp = new CashSecuredPut(cspInputs);
  const cspMetrics = csp.getAllMetrics();
  console.log('✅ Cash-Secured Put Test:', {
    breakeven: cspMetrics.breakeven,
    maxProfit: cspMetrics.maxProfit,
    effectiveBasis: cspMetrics.effectiveBasis
  });
} catch (e) {
  console.error('❌ Cash-Secured Put Error:', e);
}

// Test Long Call
const lcInputs = {
  strike: 100,
  premium: 450, 
  expiration: new Date('2024-12-20'),
  fees: 0.65,
  currentPrice: 103,
  currentPremium: 520
};

try {
  const lc = new LongCall(lcInputs);
  const lcMetrics = lc.getAllMetrics();
  console.log('✅ Long Call Test:', {
    breakeven: lcMetrics.breakeven,
    unrealizedPnL: lcMetrics.unrealizedPnL,
    percentageGain: lcMetrics.percentageGain
  });
} catch (e) {
  console.error('❌ Long Call Error:', e);
}

console.log('🎉 Phase 4 Browser Test Complete!');
`;

console.log('Phase 4 Browser Test Script:');
console.log('Copy and paste the following into the browser console at http://localhost:5173/');
console.log('\n' + browserTest);
