/**
 * Tax Lot Management Dashboard Component
 *
 * Provides comprehensive interface for tax lot tracking, wash sale monitoring,
 * and tax optimization recommendations for options trading portfolios.
 */

import { useState, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Download,
  Settings,
} from 'lucide-react';
import { TaxLotManager, TaxLotMethod, WashSaleStatus } from '../modules/tax/tax-lots';
import type { TaxLot, TaxOptimization } from '../modules/tax/tax-lots';

interface TaxLotDashboardProps {
  portfolioId: string;
  taxLots: TaxLot[];
  currentPrices: Record<string, number>;
  onLotMethodChange?: (symbol: string, method: TaxLotMethod) => void;
  onExportTaxData?: () => void;
  className?: string;
}

interface TaxSummary {
  totalCostBasis: number;
  totalUnrealized: number;
  shortTermUnrealized: number;
  longTermUnrealized: number;
  washSaleLosses: number;
  potentialTaxSavings: number;
}

export function TaxLotDashboard({
  taxLots,
  currentPrices,
  onExportTaxData,
  className = '',
}: TaxLotDashboardProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<TaxLotMethod | 'all'>('all');

  const handleSettings = () => {
    console.log('Opening tax settings...');
    alert('Tax settings panel coming soon!');
  };
  const [showWashSalesOnly, setShowWashSalesOnly] = useState(false);
  const [taxLotManager] = useState(() => new TaxLotManager());

  // Get unique symbols
  const symbols = useMemo(() => {
    const uniqueSymbols = [...new Set(taxLots.map(lot => lot.symbol))];
    return uniqueSymbols.sort();
  }, [taxLots]);

  // Filter lots based on current selections
  const filteredLots = useMemo(() => {
    return taxLots.filter(lot => {
      if (selectedSymbol !== 'all' && lot.symbol !== selectedSymbol) return false;
      if (showWashSalesOnly && lot.washSaleStatus === WashSaleStatus.NONE) return false;
      return true;
    });
  }, [taxLots, selectedSymbol, showWashSalesOnly]);

  // Calculate tax summary
  const taxSummary = useMemo((): TaxSummary => {
    const symbolGroups = filteredLots.reduce(
      (groups, lot) => {
        if (!groups[lot.symbol]) groups[lot.symbol] = [];
        groups[lot.symbol].push(lot);
        return groups;
      },
      {} as Record<string, TaxLot[]>
    );

    let totalCostBasis = 0;
    let totalUnrealized = 0;
    let shortTermUnrealized = 0;
    let longTermUnrealized = 0;
    let washSaleLosses = 0;
    let potentialTaxSavings = 0;

    Object.entries(symbolGroups).forEach(([symbol, lots]) => {
      const currentPrice = currentPrices[symbol] || 0;

      // Cost basis
      totalCostBasis += taxLotManager.calculateTotalCostBasis(lots, symbol);

      // Unrealized P&L
      const unrealizedPnL = taxLotManager.calculateUnrealizedPnL(lots, symbol, currentPrice);
      totalUnrealized += unrealizedPnL.totalUnrealized;
      shortTermUnrealized += unrealizedPnL.shortTermUnrealized;
      longTermUnrealized += unrealizedPnL.longTermUnrealized;

      // Wash sale losses
      washSaleLosses += lots
        .filter(lot => lot.washSaleStatus === WashSaleStatus.WASH_SALE)
        .reduce((sum, lot) => sum + lot.washSaleAdjustment, 0);

      // Tax optimization recommendations
      const recommendations = taxLotManager.generateTaxOptimizations(lots, symbol, currentPrice);
      potentialTaxSavings += recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    });

    return {
      totalCostBasis,
      totalUnrealized,
      shortTermUnrealized,
      longTermUnrealized,
      washSaleLosses,
      potentialTaxSavings,
    };
  }, [filteredLots, currentPrices, taxLotManager]);

  // Generate tax optimizations for selected symbol or all
  const taxOptimizations = useMemo((): TaxOptimization[] => {
    if (selectedSymbol === 'all') {
      const allRecommendations: TaxOptimization[] = [];
      symbols.forEach(symbol => {
        const symbolLots = taxLots.filter(lot => lot.symbol === symbol);
        const currentPrice = currentPrices[symbol] || 0;
        const recommendations = taxLotManager.generateTaxOptimizations(
          symbolLots,
          symbol,
          currentPrice
        );
        allRecommendations.push(...recommendations);
      });
      return allRecommendations.slice(0, 5); // Top 5 recommendations
    } else {
      const symbolLots = taxLots.filter(lot => lot.symbol === selectedSymbol);
      const currentPrice = currentPrices[selectedSymbol] || 0;
      return taxLotManager.generateTaxOptimizations(symbolLots, selectedSymbol, currentPrice);
    }
  }, [selectedSymbol, symbols, taxLots, currentPrices, taxLotManager]);

  return (
    <div className={`tax-lot-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Lot Management</h1>
            <p className="text-gray-600">
              Track cost basis, wash sales, and tax optimization opportunities
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onExportTaxData}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Tax Data</span>
          </button>
          <button
            onClick={handleSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost Basis</p>
              <p className="text-2xl font-bold text-gray-900">
                ${taxSummary.totalCostBasis.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unrealized P&L</p>
              <p
                className={`text-2xl font-bold ${taxSummary.totalUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ${taxSummary.totalUnrealized >= 0 ? '+' : ''}
                {taxSummary.totalUnrealized.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                ST: ${taxSummary.shortTermUnrealized.toLocaleString()} | LT: $
                {taxSummary.longTermUnrealized.toLocaleString()}
              </p>
            </div>
            {taxSummary.totalUnrealized >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wash Sale Losses</p>
              <p className="text-2xl font-bold text-orange-600">
                ${taxSummary.washSaleLosses.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Disallowed losses</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tax Savings Potential</p>
              <p className="text-2xl font-bold text-purple-600">
                ${taxSummary.potentialTaxSavings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">From optimizations</p>
            </div>
            <Calculator className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Symbols</option>
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lot Method</label>
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value as TaxLotMethod | 'all')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Methods</option>
              <option value={TaxLotMethod.FIFO}>FIFO</option>
              <option value={TaxLotMethod.LIFO}>LIFO</option>
              <option value={TaxLotMethod.HIFO}>HIFO</option>
              <option value={TaxLotMethod.LOFO}>LOFO</option>
              <option value={TaxLotMethod.SPECIFIC}>Specific ID</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showWashSalesOnly}
                onChange={e => setShowWashSalesOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Wash Sales Only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tax Lots Table */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Tax Lots</h3>
              <p className="text-sm text-gray-600">{filteredLots.length} lots</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cost Basis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unrealized P&L
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acquired
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLots.map(lot => {
                    const currentPrice = currentPrices[lot.symbol] || 0;
                    const currentValue = lot.quantity * currentPrice;
                    const unrealizedPnL = currentValue - lot.totalCostBasis;
                    const holdingDays = Math.floor(
                      (new Date().getTime() - new Date(lot.acquisitionDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr key={lot.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {lot.symbol}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{lot.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          ${lot.costBasisPerShare.toFixed(2)}
                          <div className="text-xs text-gray-400">
                            Total: ${lot.totalCostBasis.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          ${currentPrice.toFixed(2)}
                          <div className="text-xs text-gray-400">
                            Total: ${currentValue.toLocaleString()}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          ${unrealizedPnL >= 0 ? '+' : ''}
                          {unrealizedPnL.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(lot.acquisitionDate).toLocaleDateString()}
                          <div className="text-xs text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {holdingDays}d {holdingDays > 365 ? '(LT)' : '(ST)'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {lot.washSaleStatus === WashSaleStatus.WASH_SALE && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Wash Sale
                            </span>
                          )}
                          {lot.washSaleStatus === WashSaleStatus.POTENTIAL && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Potential
                            </span>
                          )}
                          {lot.washSaleStatus === WashSaleStatus.NONE && lot.isOpen && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tax Optimization Recommendations */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Tax Optimizations</h3>
              <p className="text-sm text-gray-600">Recommendations</p>
            </div>
            <div className="p-6 space-y-4">
              {taxOptimizations.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No optimization opportunities found</p>
                </div>
              ) : (
                taxOptimizations.map((rec, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {rec.strategy.replace('_', ' ')}
                      </h4>
                      <span className="text-sm font-medium text-green-600">
                        ${rec.potentialSavings.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>

                    <div className="space-y-2">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Actions:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {rec.recommendedActions.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-start">
                              <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 mr-2 shrink-0"></span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rec.riskFactors.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Risks:
                          </h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {rec.riskFactors.slice(0, 2).map((risk, riskIndex) => (
                              <li key={riskIndex} className="flex items-start">
                                <span className="w-1 h-1 bg-orange-500 rounded-full mt-2 mr-2 shrink-0"></span>
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.deadline && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          Deadline: {rec.deadline}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxLotDashboard;
