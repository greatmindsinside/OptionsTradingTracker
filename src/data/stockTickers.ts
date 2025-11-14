/**
 * Comprehensive list of US stock market ticker symbols
 * Includes major stocks, ETFs, and popular trading symbols
 *
 * This list is used for autocomplete suggestions in symbol input fields.
 * User's previously used symbols are prioritized over this list.
 */

export const STOCK_TICKERS = [
  // Major Tech Stocks
  'AAPL',
  'MSFT',
  'GOOGL',
  'GOOG',
  'AMZN',
  'META',
  'NVDA',
  'TSLA',
  'NFLX',
  'AMD',
  'INTC',
  'CRM',
  'ORCL',
  'ADBE',
  'CSCO',
  'AVGO',
  'QCOM',
  'TXN',
  'AMAT',
  'MU',

  // Financials
  'JPM',
  'BAC',
  'WFC',
  'C',
  'GS',
  'MS',
  'BLK',
  'SCHW',
  'AXP',
  'COF',
  'V',
  'MA',
  'PYPL',
  'SQ',
  'SOFI',
  'HOOD',

  // Healthcare & Biotech
  'JNJ',
  'UNH',
  'PFE',
  'ABBV',
  'TMO',
  'ABT',
  'DHR',
  'BMY',
  'AMGN',
  'GILD',
  'BIIB',
  'REGN',
  'VRTX',
  'ILMN',
  'MRNA',
  'BNTX',

  // Consumer & Retail
  'WMT',
  'TGT',
  'HD',
  'LOW',
  'NKE',
  'SBUX',
  'MCD',
  'YUM',
  'CMG',
  'DPZ',
  'COST',
  'TJX',
  'ROST',
  'ULTA',
  'LULU',

  // Industrial & Energy
  'BA',
  'CAT',
  'GE',
  'HON',
  'RTX',
  'LMT',
  'NOC',
  'GD',
  'XOM',
  'CVX',
  'COP',
  'SLB',
  'EOG',
  'MPC',
  'VLO',

  // Communication & Media
  'DIS',
  'CMCSA',
  'NFLX',
  'PARA',
  'WBD',
  'FOX',
  'FOXA',

  // Utilities & Real Estate
  'NEE',
  'DUK',
  'SO',
  'D',
  'AEP',
  'SRE',
  'EXC',
  'AMT',
  'PLD',
  'EQIX',
  'PSA',
  'WELL',
  'VICI',
  'SPG',

  // Materials & Chemicals
  'LIN',
  'APD',
  'SHW',
  'ECL',
  'DD',
  'DOW',
  'FCX',
  'NEM',
  'VALE',

  // Transportation
  'UPS',
  'FDX',
  'UAL',
  'DAL',
  'LUV',
  'AAL',
  'JBLU',

  // Popular ETFs
  'SPY',
  'QQQ',
  'IWM',
  'DIA',
  'VTI',
  'VOO',
  'VEA',
  'VWO',
  'AGG',
  'TLT',
  'GLD',
  'SLV',
  'USO',
  'TQQQ',
  'SQQQ',
  'UVXY',
  'VIX',

  // Meme Stocks & High Volume
  'GME',
  'AMC',
  'BB',
  'NOK',
  'SNDL',
  'PLTR',
  'RKT',
  'CLOV',
  'WISH',

  // WallStreetBets Favorites & 2025 Trending
  'ASTS', // AST SpaceMobile - satellite internet
  'BBAI', // BigBear.ai Holdings - AI/defense
  'BULL', // Bull Run Corp - trending on WSB
  'RKLB', // Rocket Lab - space tech
  'OKLO', // Oklo Inc - clean energy/nuclear
  'APP', // AppLovin - digital advertising
  'OPEN', // Opendoor Technologies - real estate tech
  'FUBO', // FuboTV - streaming
  'SPCE', // Virgin Galactic - space tourism
  'WKHS', // Workhorse Group - electric vehicles
  'EXPR', // Express Inc - retail
  'NAKD', // Naked Brand Group - retail
  'SOS', // SOS Limited - crypto/blockchain
  'MVST', // Microvast Holdings - battery tech

  // Other Popular Stocks
  'COIN',
  'RBLX',
  'U',
  'SNOW',
  'DDOG',
  'NET',
  'CRWD',
  'ZS',
  'PANW',
  'FTNT',
  'ZM',
  'DOCN',
  'ASAN',
  'ESTC',
  'MDB',
  'NOW',
  'TEAM',
  'WDAY',
  'VEEV',

  // Energy & Commodities
  'XLE',
  'XOP',
  'OXY',
  'DVN',
  'FANG',
  'MRO',
  'HAL',

  // Aerospace & Defense
  'LMT',
  'RTX',
  'NOC',
  'GD',
  'TDG',
  'HWM',
  'TXT',

  // Semiconductors
  'SMH',
  'SOXX',
  'SWKS',
  'MRVL',
  'ON',
  'MPWR',
  'WOLF',

  // Cloud & SaaS
  'CRWD',
  'ZS',
  'PANW',
  'FTNT',
  'OKTA',
  'S',
  'DOCN',
  'ESTC',

  // E-commerce & Digital
  'SHOP',
  'ETSY',
  'MELI',
  'SE',
  'GRAB',
  'DASH',
  'UBER',
  'LYFT',

  // Gaming & Entertainment
  'EA',
  'TTWO',
  'ATVI',
  'RBLX',
  'U',
  'DKNG',
  'PENN',

  // Electric Vehicles & Clean Energy
  'RIVN',
  'LCID',
  'F',
  'GM',
  'TSLA',
  'NIO',
  'XPEV',
  'LI',
  'CHPT',
  'BLNK',

  // Fintech
  'HOOD',
  'SOFI',
  'AFRM',
  'UPST',
  'LC',
  'OPRT',

  // Social Media & Communication
  'SNAP',
  'PINS',
  'RDDT',
  'BMBL',
  'MTCH',

  // Food & Beverage
  'PEP',
  'KO',
  'MDLZ',
  'GIS',
  'K',
  'CPB',
  'HSY',

  // Pharmaceuticals
  'LLY',
  'NVO',
  'TECH',
  'ZTS',
  'HZNP',

  // Insurance
  'BRK.B',
  'BRK.A',
  'AIG',
  'PRU',
  'MET',
  'AFL',

  // Airlines
  'LUV',
  'JBLU',
  'SAVE',
  'ALK',

  // Hotels & Travel
  'MAR',
  'HLT',
  'ABNB',
  'EXPE',
  'BKNG',
  'TCOM',

  // Real Estate Investment Trusts
  'O',
  'AMT',
  'PLD',
  'EQIX',
  'PSA',
  'WELL',
  'VICI',
  'SPG',
  'DLR',
  'EXR',

  // Oil & Gas
  'XOM',
  'CVX',
  'COP',
  'SLB',
  'EOG',
  'MPC',
  'VLO',
  'PSX',
  'HES',
  'DVN',

  // Mining
  'FCX',
  'NEM',
  'GOLD',
  'AEM',
  'WPM',
  'AG',

  // Agriculture
  'DE',
  'CAT',
  'AGCO',
  'ADM',
  'BG',

  // Telecommunications
  'T',
  'VZ',
  'TMUS',
  'LUMN',

  // Tobacco
  'MO',
  'PM',
  'BTI',
  'STZ',

  // Beverages
  'BUD',
  'TAP',
  'SAM',

  // Restaurants
  'CMG',
  'DPZ',
  'YUM',
  'MCD',
  'SBUX',
  'WEN',
  'JACK',

  // Retail
  'BBY',
  'BBWI',
  'ANF',
  'AEO',
  'GPS',
  'DKS',

  // Auto Parts
  'AAP',
  'AZO',
  'ORLY',
  'GPC',

  // Home Improvement
  'HD',
  'LOW',
  'SHW',
  'TREX',

  // Building Materials
  'VMC',
  'MLM',
  'EXP',
  'USG',

  // Industrial
  'EMR',
  'ETN',
  'ITW',
  'PH',
  'ROK',
  'AME',

  // Packaging
  'PKG',
  'WRK',
  'IP',
  'SEE',

  // Paper & Forest Products
  'WY',
  'IP',
  'UFS',
  'SLGN',

  // Containers & Packaging
  'BALL',
  'CCK',
  'OI',
  'SLGN',

  // Metals & Mining
  'STLD',
  'NUE',
  'CLF',
  'X',
  'CMC',

  // Chemicals
  'CE',
  'FMC',
  'MOS',
  'NTR',
  'CF',

  // Specialty Chemicals
  'PPG',
  'SHW',
  'RPM',
  'AXTA',

  // Diversified Chemicals
  'LIN',
  'APD',
  'ECL',
  'DD',
  'DOW',

  // Fertilizers & Agricultural Chemicals
  'CF',
  'MOS',
  'NTR',
  'FMC',

  // Industrial Gases
  'LIN',
  'APD',
  'WWD',

  // Specialty Industrial Machinery
  'IR',
  'GGG',
  'FLS',
  'FLR',

  // Construction & Farm Machinery
  'CAT',
  'DE',
  'AGCO',
  'CNH',

  // Electrical Components & Equipment
  'EMR',
  'ETN',
  'ROK',
  'AME',

  // Industrial Machinery
  'ITW',
  'PH',
  'DOV',
  'GGG',

  // Trading & Exchanges
  'ICE',
  'CME',
  'NDAQ',
  'MKTX',

  // Asset Management
  'BLK',
  'BX',
  'BEN',
  'TROW',
  'IVZ',

  // Banks - Regional
  'PNC',
  'TFC',
  'USB',
  'KEY',
  'CFG',
  'HBAN',
  'MTB',
  'ZION',
  'FITB',
  'RF',

  // Banks - Money Center
  'JPM',
  'BAC',
  'WFC',
  'C',
  'COF',

  // Capital Markets
  'GS',
  'MS',
  'SCHW',
  'ETFC',

  // Insurance - Life
  'PRU',
  'MET',
  'AFL',
  'LNC',
  'PFG',

  // Insurance - Property & Casualty
  'PGR',
  'ALL',
  'TRV',
  'CB',
  'AIG',

  // Insurance - Health
  'UNH',
  'CI',
  'HUM',
  'CNC',
  'MOH',

  // REITs - Diversified
  'AMT',
  'PLD',
  'EQIX',
  'PSA',
  'WELL',

  // REITs - Retail
  'SPG',
  'SKT',
  'MAC',
  'REG',
  'KIM',

  // REITs - Office
  'BXP',
  'VNO',
  'SLG',
  'PDM',
  'DEI',

  // REITs - Residential
  'EQR',
  'AVB',
  'MAA',
  'UDR',
  'ESS',

  // REITs - Healthcare
  'WELL',
  'VTR',
  'PEAK',
  'HTA',
  'OHI',

  // REITs - Industrial
  'PLD',
  'EXR',
  'LSI',
  'FR',
  'STAG',

  // REITs - Data Centers
  'EQIX',
  'DLR',
  'CONE',
  'QTS',
  'COR',

  // REITs - Cell Towers
  'AMT',
  'CCI',
  'SBAC',

  // REITs - Self Storage
  'EXR',
  'PSA',
  'LSI',
  'CUBE',
  'NSA',

  // REITs - Hotels
  'HST',
  'RHP',
  'APLE',
  'RLJ',
  'PK',

  // REITs - Diversified
  'WPC',
  'STOR',
  'GTY',
  'EPRT',
  'BRT',
] as const;

/**
 * Type for stock ticker symbols
 */
export type StockTicker = (typeof STOCK_TICKERS)[number];

/**
 * Get all stock tickers as a sorted array
 */
export function getAllStockTickers(): readonly string[] {
  return STOCK_TICKERS;
}

/**
 * Check if a symbol is a valid stock ticker
 */
export function isValidStockTicker(symbol: string): boolean {
  return STOCK_TICKERS.includes(symbol.toUpperCase() as StockTicker);
}
