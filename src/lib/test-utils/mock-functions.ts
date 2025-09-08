/**
 * Mock Functions
 * Reusable mock functions for testing
 */

import { jest } from '@jest/globals'

// Create a mock function with better TypeScript support
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> => {
  const mockFn = jest.fn() as jest.MockedFunction<T>
  if (implementation) {
    mockFn.mockImplementation(implementation)
  }
  return mockFn
}

// Next.js Router Mocks
export const mockRouter = {
  push: createMockFunction((url: string) => Promise.resolve(true)),
  replace: createMockFunction((url: string) => Promise.resolve(true)),
  prefetch: createMockFunction(() => Promise.resolve()),
  back: createMockFunction(() => {}),
  forward: createMockFunction(() => {}),
  refresh: createMockFunction(() => {}),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
}

// NextAuth Mocks
export const mockSession = {
  useSession: createMockFunction(() => ({
    data: null,
    status: 'loading',
    update: createMockFunction(() => Promise.resolve(null)),
  })),
  
  signIn: createMockFunction(() => Promise.resolve({ ok: true, error: null })),
  signOut: createMockFunction(() => Promise.resolve({ url: 'http://localhost:3000' })),
  getSession: createMockFunction(() => Promise.resolve(null)),
  getCsrfToken: createMockFunction(() => Promise.resolve('mock-csrf-token')),
  getProviders: createMockFunction(() => Promise.resolve({})),
}

// Fetch Mock
export const mockFetch = createMockFunction(async (url: string, options?: RequestInit) => {
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: createMockFunction(() => Promise.resolve({ success: true })),
    text: createMockFunction(() => Promise.resolve('OK')),
    blob: createMockFunction(() => Promise.resolve(new Blob())),
    arrayBuffer: createMockFunction(() => Promise.resolve(new ArrayBuffer(0))),
    clone: createMockFunction(() => response),
  }
  return response as unknown as Response
})

// Local Storage Mock
export const mockLocalStorage = {
  getItem: createMockFunction((key: string) => null),
  setItem: createMockFunction((key: string, value: string) => {}),
  removeItem: createMockFunction((key: string) => {}),
  clear: createMockFunction(() => {}),
  length: 0,
  key: createMockFunction((index: number) => null),
}

// Session Storage Mock
export const mockSessionStorage = {
  getItem: createMockFunction((key: string) => null),
  setItem: createMockFunction((key: string, value: string) => {}),
  removeItem: createMockFunction((key: string) => {}),
  clear: createMockFunction(() => {}),
  length: 0,
  key: createMockFunction((index: number) => null),
}

// WebSocket Mock
export const mockWebSocket = createMockFunction(() => ({
  addEventListener: createMockFunction(),
  removeEventListener: createMockFunction(),
  send: createMockFunction(),
  close: createMockFunction(),
  readyState: 1, // OPEN
  url: 'ws://localhost:3000',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  binaryType: 'blob' as BinaryType,
  onopen: null,
  onerror: null,
  onclose: null,
  onmessage: null,
  dispatchEvent: createMockFunction(() => true),
}))

// Geolocation Mock
export const mockGeolocation = {
  getCurrentPosition: createMockFunction((success: PositionCallback, error?: PositionErrorCallback) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0059,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }
    setTimeout(() => success(position), 0)
  }),
  
  watchPosition: createMockFunction(() => 1),
  clearWatch: createMockFunction(),
}

// Notification Mock
export const mockNotification = createMockFunction((title: string, options?: NotificationOptions) => ({
  title,
  body: options?.body || '',
  icon: options?.icon || '',
  tag: options?.tag || '',
  data: options?.data || null,
  actions: options?.actions || [],
  badge: options?.badge || '',
  dir: options?.dir || 'auto',
  image: options?.image || '',
  lang: options?.lang || 'en',
  renotify: options?.renotify || false,
  requireInteraction: options?.requireInteraction || false,
  silent: options?.silent || false,
  timestamp: options?.timestamp || Date.now(),
  vibrate: options?.vibrate || [],
  onclick: null,
  onclose: null,
  onerror: null,
  onshow: null,
  close: createMockFunction(),
  addEventListener: createMockFunction(),
  removeEventListener: createMockFunction(),
  dispatchEvent: createMockFunction(() => true),
}))

// Media Query Mock
export const mockMatchMedia = createMockFunction((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: createMockFunction(), // deprecated
  removeListener: createMockFunction(), // deprecated
  addEventListener: createMockFunction(),
  removeEventListener: createMockFunction(),
  dispatchEvent: createMockFunction(() => true),
}))

// IntersectionObserver Mock
export const mockIntersectionObserver = createMockFunction((callback: IntersectionObserverCallback) => ({
  root: null,
  rootMargin: '0px',
  thresholds: [0],
  observe: createMockFunction(),
  unobserve: createMockFunction(),
  disconnect: createMockFunction(),
  takeRecords: createMockFunction(() => []),
}))

// ResizeObserver Mock
export const mockResizeObserver = createMockFunction((callback: ResizeObserverCallback) => ({
  observe: createMockFunction(),
  unobserve: createMockFunction(),
  disconnect: createMockFunction(),
}))

// File API Mock
export const mockFile = (name: string, content: string, type = 'text/plain') => {
  const file = new File([content], name, { type })
  Object.defineProperty(file, 'size', { value: content.length })
  return file
}

// FileReader Mock
export const mockFileReader = () => {
  const reader = {
    readAsText: createMockFunction((file: File) => {
      setTimeout(() => {
        if (reader.onload) {
          reader.onload({ target: { result: 'mock file content' } } as any)
        }
      }, 0)
    }),
    readAsDataURL: createMockFunction((file: File) => {
      setTimeout(() => {
        if (reader.onload) {
          reader.onload({ target: { result: 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=' } } as any)
        }
      }, 0)
    }),
    readAsArrayBuffer: createMockFunction(),
    readAsBinaryString: createMockFunction(),
    abort: createMockFunction(),
    result: null,
    error: null,
    readyState: 0,
    onload: null,
    onerror: null,
    onabort: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null,
    addEventListener: createMockFunction(),
    removeEventListener: createMockFunction(),
    dispatchEvent: createMockFunction(() => true),
  }
  return reader
}

// Crypto Mock
export const mockCrypto = {
  getRandomValues: createMockFunction((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  
  randomUUID: createMockFunction(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }),
  
  subtle: {
    digest: createMockFunction(() => Promise.resolve(new ArrayBuffer(32))),
    encrypt: createMockFunction(() => Promise.resolve(new ArrayBuffer(16))),
    decrypt: createMockFunction(() => Promise.resolve(new ArrayBuffer(16))),
    sign: createMockFunction(() => Promise.resolve(new ArrayBuffer(64))),
    verify: createMockFunction(() => Promise.resolve(true)),
    generateKey: createMockFunction(() => Promise.resolve({} as CryptoKey)),
    deriveKey: createMockFunction(() => Promise.resolve({} as CryptoKey)),
    deriveBits: createMockFunction(() => Promise.resolve(new ArrayBuffer(32))),
    importKey: createMockFunction(() => Promise.resolve({} as CryptoKey)),
    exportKey: createMockFunction(() => Promise.resolve(new ArrayBuffer(32))),
    wrapKey: createMockFunction(() => Promise.resolve(new ArrayBuffer(32))),
    unwrapKey: createMockFunction(() => Promise.resolve({} as CryptoKey)),
  },
}

// Console Mock (for suppressing logs during tests)
export const mockConsole = {
  log: createMockFunction(),
  error: createMockFunction(),
  warn: createMockFunction(),
  info: createMockFunction(),
  debug: createMockFunction(),
  trace: createMockFunction(),
  group: createMockFunction(),
  groupCollapsed: createMockFunction(),
  groupEnd: createMockFunction(),
  time: createMockFunction(),
  timeEnd: createMockFunction(),
  count: createMockFunction(),
  clear: createMockFunction(),
  dir: createMockFunction(),
  dirxml: createMockFunction(),
  table: createMockFunction(),
  assert: createMockFunction(),
}

// Performance Mock
export const mockPerformance = {
  now: createMockFunction(() => Date.now()),
  mark: createMockFunction(),
  measure: createMockFunction(),
  clearMarks: createMockFunction(),
  clearMeasures: createMockFunction(),
  getEntries: createMockFunction(() => []),
  getEntriesByName: createMockFunction(() => []),
  getEntriesByType: createMockFunction(() => []),
  navigation: {
    type: 0,
    redirectCount: 0,
  },
  timing: {
    navigationStart: Date.now(),
    loadEventEnd: Date.now() + 1000,
  },
}

// Export all mocks
export const mocks = {
  createMockFunction,
  router: mockRouter,
  session: mockSession,
  fetch: mockFetch,
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
  webSocket: mockWebSocket,
  geolocation: mockGeolocation,
  notification: mockNotification,
  matchMedia: mockMatchMedia,
  intersectionObserver: mockIntersectionObserver,
  resizeObserver: mockResizeObserver,
  file: mockFile,
  fileReader: mockFileReader,
  crypto: mockCrypto,
  console: mockConsole,
  performance: mockPerformance,
}

export default mocks