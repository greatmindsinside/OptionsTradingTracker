/**
 * OptionsCalculator Component
 * A comprehensive options calculator with strategy selection and real-time calculations
 */

import { useState, useCallback, useMemo } from 'react';
import { CalculatorCard } from '@/components/CalculatorCard';
import { StrategySelector, type StrategyType } from '@/components/StrategySelector';
import { InputGroup } from '@/components/InputGroup';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import {
  CoveredCall,
  CashSecuredPut,
  LongCall,
  type CoveredCallInputs,
  type CashSecuredPutInputs,
  type LongCallInputs,
} from '@/modules/calc/index';
import styles from './OptionsCalculator.module.css';

interface CalculatorState {
  // Common inputs
  strike: string;
  premium: string;
  expiration: string;
  fees: string;

  // Covered Call specific
  sharePrice: string;
  shareBasis: string;
  shareQty: string;

  // Cash-Secured Put specific
  cashSecured: string;
  currentPrice: string;

  // Long Call specific
  currentPremium: string;
}

const initialState: CalculatorState = {
  strike: '100',
  premium: '2.50',
  expiration: '2025-12-19',
  fees: '0.65',
  sharePrice: '98',
  shareBasis: '95',
  shareQty: '100',
  cashSecured: '9500',
  currentPrice: '98',
  currentPremium: '5.20',
};

export function OptionsCalculator() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('covered-call');
  const [inputs, setInputs] = useState<CalculatorState>(initialState);

  const updateInput = useCallback((field: keyof CalculatorState, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  // Calculate results based on current strategy
  const calculationResults = useMemo(() => {
    try {
      switch (selectedStrategy) {
        case 'covered-call': {
          const ccInputs: CoveredCallInputs = {
            sharePrice: parseFloat(inputs.sharePrice) || 0,
            shareBasis: parseFloat(inputs.shareBasis) || 0,
            shareQty: parseInt(inputs.shareQty) || 0,
            strike: parseFloat(inputs.strike) || 0,
            premium: parseFloat(inputs.premium) * 100, // Convert to cents
            expiration: new Date(inputs.expiration),
            fees: parseFloat(inputs.fees) || 0,
          };

          const calculator = new CoveredCall(ccInputs);
          const metrics = calculator.getAllMetrics();
          const risks = calculator.analyzeRisks();

          return {
            metrics: [
              { label: 'Breakeven', value: metrics.breakeven, format: 'currency' as const },
              {
                label: 'Max Profit',
                value: metrics.maxProfit,
                format: 'currency' as const,
                subtitle: `${(metrics.annualizedROO * 100).toFixed(2)}% annualized ROO`,
              },
              { label: 'Max Loss', value: metrics.maxLoss, format: 'currency' as const },
              {
                label: 'Days to Expiration',
                value: metrics.daysToExpiration,
                format: 'days' as const,
              },
            ],
            risks,
            greeks: {
              delta: metrics.currentDelta,
              theta: metrics.currentTheta,
            },
          };
        }

        case 'cash-secured-put': {
          const cspInputs: CashSecuredPutInputs = {
            strike: parseFloat(inputs.strike) || 0,
            premium: parseFloat(inputs.premium) * 100, // Convert to cents
            expiration: new Date(inputs.expiration),
            fees: parseFloat(inputs.fees) || 0,
            cashSecured: parseFloat(inputs.cashSecured) || 0,
            currentPrice: parseFloat(inputs.currentPrice) || 0,
          };

          const calculator = new CashSecuredPut(cspInputs);
          const metrics = calculator.getAllMetrics();
          const risks = calculator.analyzeRisks();

          return {
            metrics: [
              { label: 'Breakeven', value: metrics.breakeven, format: 'currency' as const },
              {
                label: 'Max Profit',
                value: metrics.maxProfit,
                format: 'currency' as const,
                subtitle: `${(metrics.annualizedROO * 100).toFixed(2)}% annualized ROO`,
              },
              {
                label: 'Effective Basis',
                value: metrics.effectiveBasis,
                format: 'currency' as const,
                subtitle: 'if assigned',
              },
              {
                label: 'Days to Expiration',
                value: metrics.daysToExpiration,
                format: 'days' as const,
              },
            ],
            risks,
            greeks: {
              delta: metrics.currentDelta,
              theta: metrics.currentTheta,
            },
          };
        }

        case 'long-call': {
          const lcInputs: LongCallInputs = {
            strike: parseFloat(inputs.strike) || 0,
            premium: parseFloat(inputs.premium) * 100, // Convert to cents
            expiration: new Date(inputs.expiration),
            fees: parseFloat(inputs.fees) || 0,
            currentPrice: parseFloat(inputs.currentPrice) || 0,
            currentPremium: parseFloat(inputs.currentPremium) * 100, // Convert to cents
          };

          const calculator = new LongCall(lcInputs);
          const metrics = calculator.getAllMetrics();
          const risks = calculator.analyzeRisks();

          return {
            metrics: [
              { label: 'Breakeven', value: metrics.breakeven, format: 'currency' as const },
              {
                label: 'Unrealized P&L',
                value: metrics.unrealizedPnL,
                format: 'currency' as const,
              },
              {
                label: 'Intrinsic Value',
                value: metrics.intrinsicValue,
                format: 'currency' as const,
              },
              { label: 'Time Value', value: metrics.timeValue, format: 'currency' as const },
            ],
            risks,
            greeks: {
              delta: metrics.currentDelta,
              theta: metrics.currentTheta,
            },
          };
        }

        default:
          return { metrics: [], risks: [] };
      }
    } catch (error) {
      console.error('Calculation error:', error);
      return {
        metrics: [],
        risks: [
          {
            severity: 'critical' as const,
            message: 'Invalid inputs - please check your values',
            category: 'price' as const,
          },
        ],
      };
    }
  }, [selectedStrategy, inputs]);

  const renderInputForm = () => {
    switch (selectedStrategy) {
      case 'covered-call':
        return (
          <div className={styles.inputForm}>
            <div className={styles.inputRow}>
              <InputGroup
                label="Share Price"
                type="number"
                value={inputs.sharePrice}
                onChange={value => updateInput('sharePrice', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Share Basis"
                type="number"
                value={inputs.shareBasis}
                onChange={value => updateInput('shareBasis', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Share Quantity"
                type="number"
                value={inputs.shareQty}
                onChange={value => updateInput('shareQty', value)}
                step="1"
                min="1"
              />
              <InputGroup
                label="Strike Price"
                type="number"
                value={inputs.strike}
                onChange={value => updateInput('strike', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Premium Received"
                type="number"
                value={inputs.premium}
                onChange={value => updateInput('premium', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Expiration Date"
                type="date"
                value={inputs.expiration}
                onChange={value => updateInput('expiration', value)}
              />
            </div>
            <InputGroup
              label="Fees"
              type="number"
              value={inputs.fees}
              onChange={value => updateInput('fees', value)}
              prefix="$"
              step="0.01"
              min="0"
            />
          </div>
        );

      case 'cash-secured-put':
        return (
          <div className={styles.inputForm}>
            <div className={styles.inputRow}>
              <InputGroup
                label="Strike Price"
                type="number"
                value={inputs.strike}
                onChange={value => updateInput('strike', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Premium Received"
                type="number"
                value={inputs.premium}
                onChange={value => updateInput('premium', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Cash Secured"
                type="number"
                value={inputs.cashSecured}
                onChange={value => updateInput('cashSecured', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Current Stock Price"
                type="number"
                value={inputs.currentPrice}
                onChange={value => updateInput('currentPrice', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Expiration Date"
                type="date"
                value={inputs.expiration}
                onChange={value => updateInput('expiration', value)}
              />
              <InputGroup
                label="Fees"
                type="number"
                value={inputs.fees}
                onChange={value => updateInput('fees', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        );

      case 'long-call':
        return (
          <div className={styles.inputForm}>
            <div className={styles.inputRow}>
              <InputGroup
                label="Strike Price"
                type="number"
                value={inputs.strike}
                onChange={value => updateInput('strike', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Premium Paid"
                type="number"
                value={inputs.premium}
                onChange={value => updateInput('premium', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Current Stock Price"
                type="number"
                value={inputs.currentPrice}
                onChange={value => updateInput('currentPrice', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
              <InputGroup
                label="Current Premium"
                type="number"
                value={inputs.currentPremium}
                onChange={value => updateInput('currentPremium', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputRow}>
              <InputGroup
                label="Expiration Date"
                type="date"
                value={inputs.expiration}
                onChange={value => updateInput('expiration', value)}
              />
              <InputGroup
                label="Fees"
                type="number"
                value={inputs.fees}
                onChange={value => updateInput('fees', value)}
                prefix="$"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.calculator}>
      <StrategySelector
        selectedStrategy={selectedStrategy}
        onStrategyChange={setSelectedStrategy}
      />

      <div className={styles.calculatorGrid}>
        <CalculatorCard title="Strategy Inputs" description="Enter your position details" icon="📊">
          {renderInputForm()}
        </CalculatorCard>

        <CalculatorCard
          title="Calculation Results"
          description="Live metrics and risk analysis"
          icon="📈"
        >
          <ResultsDisplay
            metrics={calculationResults.metrics}
            risks={calculationResults.risks}
            greeks={calculationResults.greeks}
          />
        </CalculatorCard>
      </div>
    </div>
  );
}
