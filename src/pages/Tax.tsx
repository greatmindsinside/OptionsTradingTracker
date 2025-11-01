/**
 * Tax Management Page
 *
 * Comprehensive tax planning and lot management interface for options trading portfolios.
 * Includes tax lot tracking, wash sale monitoring, and optimization recommendations.
 */

import { useState, useEffect } from 'react';
import { Calculator, FileText, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { TaxLotDashboard } from '../modules/tax';
import type { TaxLot } from '../modules/tax';
import { WashSaleStatus } from '../modules/tax';

export function TaxPage() {
  const [taxLots, setTaxLots] = useState<TaxLot[]>([]);
  const [currentPrices] = useState<Record<string, number>>({
    AAPL: 175.5,
    MSFT: 345.75,
    TSLA: 225.8,
    SPY: 445.25,
    QQQ: 365.4,
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'lots' | 'wash_sales' | 'optimization'>(
    'overview'
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load sample tax lots for demonstration
  useEffect(() => {
    setIsLoading(true);

    // Sample data - in a real app, this would come from your database
    const sampleTaxLots: TaxLot[] = [
      {
        id: 'lot_1',
        symbol: 'AAPL',
        quantity: 100,
        costBasisPerShare: 165.5,
        totalCostBasis: 16550.0,
        acquisitionDate: '2023-01-15',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId: 'portfolio_1',
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2023-01-15T10:00:00Z',
      },
      {
        id: 'lot_2',
        symbol: 'AAPL',
        quantity: 50,
        costBasisPerShare: 180.25,
        totalCostBasis: 9012.5,
        acquisitionDate: '2023-03-10',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId: 'portfolio_1',
        createdAt: '2023-03-10T10:00:00Z',
        updatedAt: '2023-03-10T10:00:00Z',
      },
      {
        id: 'lot_3',
        symbol: 'MSFT',
        quantity: 75,
        costBasisPerShare: 320.0,
        totalCostBasis: 24000.0,
        acquisitionDate: '2023-02-20',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId: 'portfolio_1',
        createdAt: '2023-02-20T10:00:00Z',
        updatedAt: '2023-02-20T10:00:00Z',
      },
      {
        id: 'lot_4',
        symbol: 'TSLA',
        quantity: 30,
        costBasisPerShare: 240.75,
        totalCostBasis: 7222.5,
        acquisitionDate: '2023-05-15',
        isOpen: true,
        washSaleStatus: WashSaleStatus.WASH_SALE,
        washSaleAdjustment: 500.0,
        portfolioId: 'portfolio_1',
        createdAt: '2023-05-15T10:00:00Z',
        updatedAt: '2023-11-01T10:00:00Z',
      },
      {
        id: 'lot_5',
        symbol: 'SPY',
        quantity: 200,
        costBasisPerShare: 425.3,
        totalCostBasis: 85060.0,
        acquisitionDate: '2023-07-01',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId: 'portfolio_1',
        createdAt: '2023-07-01T10:00:00Z',
        updatedAt: '2023-07-01T10:00:00Z',
      },
    ];

    setTimeout(() => {
      setTaxLots(sampleTaxLots);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleExportTaxData = () => {
    // In a real app, this would generate and download tax reports
    const taxReport = {
      reportDate: new Date().toISOString(),
      taxLots: taxLots,
      currentPrices: currentPrices,
      summary: {
        totalPositions: taxLots.length,
        totalCostBasis: taxLots.reduce((sum, lot) => sum + lot.totalCostBasis, 0),
        washSaleLots: taxLots.filter(lot => lot.washSaleStatus === WashSaleStatus.WASH_SALE).length,
      },
    };

    const dataStr = JSON.stringify(taxReport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `tax-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const washSaleLots = taxLots.filter(lot => lot.washSaleStatus === WashSaleStatus.WASH_SALE);
  const totalUnrealized = taxLots.reduce((sum, lot) => {
    const currentPrice = currentPrices[lot.symbol] || 0;
    return sum + (currentPrice * lot.quantity - lot.totalCostBasis);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Calculator className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tax Management</h1>
              <p className="text-gray-600">
                Comprehensive tax planning and optimization for your options trading portfolio
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tax Lots</p>
                  <p className="text-xl font-bold text-gray-900">{taxLots.length}</p>
                </div>
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unrealized P&L</p>
                  <p
                    className={`text-xl font-bold ${totalUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${totalUnrealized >= 0 ? '+' : ''}
                    {totalUnrealized.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wash Sales</p>
                  <p className="text-xl font-bold text-orange-600">{washSaleLots.length}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Basis</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${taxLots.reduce((sum, lot) => sum + lot.totalCostBasis, 0).toLocaleString()}
                  </p>
                </div>
                <Calculator className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('lots')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'lots'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tax Lots
              </button>
              <button
                onClick={() => setActiveTab('wash_sales')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'wash_sales'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Wash Sales
                {washSaleLots.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                    {washSaleLots.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('optimization')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'optimization'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Optimization
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <TaxLotDashboard
            portfolioId="portfolio_1"
            taxLots={taxLots}
            currentPrices={currentPrices}
            onExportTaxData={handleExportTaxData}
          />
        )}

        {activeTab === 'lots' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">All Tax Lots</h3>
                <p className="text-sm text-gray-600">Detailed view of all tax lots</p>
              </div>
              <button
                onClick={handleExportTaxData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
            <TaxLotDashboard
              portfolioId="portfolio_1"
              taxLots={taxLots}
              currentPrices={currentPrices}
              onExportTaxData={handleExportTaxData}
            />
          </div>
        )}

        {activeTab === 'wash_sales' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Wash Sale Analysis</h3>
              <p className="text-sm text-gray-600">Review wash sale violations and adjustments</p>
            </div>
            <div className="p-6">
              {washSaleLots.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Wash Sales Detected</h4>
                  <p className="text-gray-600">
                    Your current positions don't have any wash sale violations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {washSaleLots.map(lot => (
                    <div
                      key={lot.id}
                      className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {lot.symbol} - Lot {lot.id}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Acquired: {new Date(lot.acquisitionDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Quantity: {lot.quantity} shares @ ${lot.costBasisPerShare.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Wash Sale
                          </span>
                          <p className="text-sm text-gray-600 mt-2">
                            Adjustment: ${lot.washSaleAdjustment.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'optimization' && (
          <TaxLotDashboard
            portfolioId="portfolio_1"
            taxLots={taxLots}
            currentPrices={currentPrices}
            onExportTaxData={handleExportTaxData}
          />
        )}
      </div>
    </div>
  );
}

export default TaxPage;
