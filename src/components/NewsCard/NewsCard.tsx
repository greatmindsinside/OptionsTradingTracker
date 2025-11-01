/**
 * News Card Component
 *
 * Displays relevant market news and financial updates for trading context
 */

import { useState, useEffect } from 'react';
import { ExternalLink, Clock, TrendingUp, AlertCircle, Newspaper } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: 'market' | 'earnings' | 'analysis' | 'general';
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

interface NewsCardProps {
  symbol?: string; // Optional symbol to filter news for specific stocks
  maxItems?: number; // Maximum number of news items to display
  className?: string;
}

// Mock news data - in a real implementation, this would come from an API
const mockNewsData: NewsItem[] = [
  {
    id: '1',
    title: 'Market Volatility Creates Premium Opportunities',
    summary:
      'Rising VIX levels present attractive premium collection opportunities for options sellers, particularly in the tech sector.',
    source: 'MarketWatch',
    publishedAt: '2025-10-30T14:30:00Z',
    url: '#',
    category: 'market',
    sentiment: 'bullish',
  },
  {
    id: '2',
    title: 'Q3 Earnings Season Winds Down with Mixed Results',
    summary:
      'Companies reporting earnings this week show mixed results, with guidance revisions affecting options volatility.',
    source: 'Financial Times',
    publishedAt: '2025-10-30T12:15:00Z',
    url: '#',
    category: 'earnings',
    sentiment: 'neutral',
  },
  {
    id: '3',
    title: 'Federal Reserve Signals Potential Policy Changes',
    summary:
      'Recent Fed communications suggest possible shifts in monetary policy, impacting interest rate sensitive strategies.',
    source: 'Bloomberg',
    publishedAt: '2025-10-30T10:45:00Z',
    url: '#',
    category: 'market',
    sentiment: 'bearish',
  },
  {
    id: '4',
    title: 'Options Flow Analysis: Unusual Activity Detected',
    summary:
      'Large block trades in technology options suggest institutional positioning ahead of key earnings reports.',
    source: 'Options Insider',
    publishedAt: '2025-10-30T09:20:00Z',
    url: '#',
    category: 'analysis',
    sentiment: 'bullish',
  },
];

export function NewsCard({ symbol, maxItems = 4, className = '' }: NewsCardProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Simulate API call delay
    const loadNews = async () => {
      setLoading(true);

      // In a real implementation, you would fetch from a news API
      // For now, we'll use mock data with some filtering logic
      await new Promise(resolve => setTimeout(resolve, 500));

      const filteredNews = mockNewsData;

      // If a symbol is provided, you could filter news related to that symbol
      // For now, we'll just return all news items
      if (symbol) {
        // In a real implementation, filter by symbol relevance
        console.log(`Filtering news for symbol: ${symbol}`);
      }

      setNewsItems(filteredNews.slice(0, maxItems));
      setLoading(false);
    };

    loadNews();
  }, [symbol, maxItems]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'bearish':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      case 'neutral':
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'market':
        return 'bg-blue-100 text-blue-800';
      case 'earnings':
        return 'bg-purple-100 text-purple-800';
      case 'analysis':
        return 'bg-orange-100 text-orange-800';
      case 'general':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 shadow rounded-lg ${className}`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Newspaper className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Market News</h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayedItems = expanded ? newsItems : newsItems.slice(0, 2);

  return (
    <div className={`bg-gray-800 shadow rounded-lg ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Newspaper className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Market News
              {symbol && (
                <span className="ml-2 text-sm font-normal text-gray-400">for {symbol}</span>
              )}
            </h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        {/* News Items */}
        <div className="space-y-4">
          {displayedItems.map(item => (
            <div key={item.id} className="border-b border-gray-600 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-white leading-tight pr-2">{item.title}</h4>
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  {getSentimentIcon(item.sentiment)}
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(item.publishedAt)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-2 leading-relaxed">{item.summary}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-400">{item.source}</span>
                </div>
                <a
                  href={item.url}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read More
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {newsItems.length > 2 && !expanded && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-xs text-gray-400 text-center">
              {newsItems.length - 2} more news items available
            </p>
          </div>
        )}

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-xs text-gray-400 text-center">
              News updates every 15 minutes • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsCard;
