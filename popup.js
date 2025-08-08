const STORAGE_KEY = 'text-marker-highlights'
let currentPageUrl = ''

// Initialize popup
document.addEventListener('DOMContentLoaded', async function () {
  console.log('🚀 Text Marker Popup initializing...')

  try {
    // Initialize components step by step
    await initializePopup()
  } catch (error) {
    console.error('❌ Critical initialization error:', error)
    showError('Failed to initialize popup: ' + error.message)
  }
})

// Main initialization function
async function initializePopup () {
  console.log('📡 Loading current page URL...')
  await loadCurrentPageUrl()

  console.log('📚 Loading highlights...')
  await loadHighlights()

  console.log('🎯 Setting up event listeners...')
  setupEventListeners()

  console.log('👂 Setting up storage listener...')
  setupStorageListener()

  console.log('🧪 Testing storage access...')
  await testStorageAccess()

  console.log('✅ Popup initialized successfully')
}

// Get current page URL
async function loadCurrentPageUrl () {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab || !tab.url) {
      throw new Error('No active tab found or URL is empty')
    }

    currentPageUrl = tab.url
    console.log('🌐 Current page URL:', currentPageUrl)
  } catch (error) {
    console.error('❌ Error getting current page URL:', error)
    showError('Failed to get current page URL: ' + error.message)
    throw error
  }
}

// Load highlights from Chrome storage
async function loadHighlights () {
  showLoading(true)
  console.log('📖 Loading highlights for URL:', currentPageUrl)

  try {
    if (!currentPageUrl) {
      throw new Error('Current page URL is not set')
    }

    // Get highlights from storage
    const result = await chrome.storage.local.get([STORAGE_KEY])
    console.log('💾 Raw storage result:', result)

    const stored = result[STORAGE_KEY] || {}
    console.log('📊 Stored data structure:', stored)

    const currentPageHighlights = stored[currentPageUrl] || []
    console.log('📝 Current page highlights:', currentPageHighlights)

    // Calculate total highlights across all pages
    const allHighlights = Object.values(stored).flat()
    console.log('📈 Total highlights across all pages:', allHighlights.length)

    // Update UI
    updateStats(currentPageHighlights.length, allHighlights.length)
    renderHighlights(currentPageHighlights)

    // Debug: Log all storage keys
    const allStorageData = await new Promise(resolve => {
      chrome.storage.local.get(null, resolve)
    })
    console.log('🗄️ All storage keys:', Object.keys(allStorageData))
  } catch (error) {
    console.error('❌ Error loading highlights:', error)
    showError('Failed to load highlights: ' + error.message)
  } finally {
    showLoading(false)
  }
}

// Update statistics display
function updateStats (currentPage, allPages) {
  console.log('📊 Updating stats:', { currentPage, allPages })

  const totalCountEl = document.getElementById('totalCount')
  const allPagesCountEl = document.getElementById('allPagesCount')

  if (totalCountEl) {
    totalCountEl.textContent = currentPage
  } else {
    console.warn('⚠️ totalCount element not found')
  }

  if (allPagesCountEl) {
    allPagesCountEl.textContent = allPages
  } else {
    console.warn('⚠️ allPagesCount element not found')
  }
}

// Render highlights list
function renderHighlights (highlights) {
  console.log('🎨 Rendering highlights:', highlights?.length || 0)

  const container = document.getElementById('highlightsList')
  if (!container) {
    console.error('❌ Highlights list container not found')
    showError('UI error: highlights container not found')
    return
  }

  // Handle empty state
  if (!highlights || highlights.length === 0) {
    console.log('📝 No highlights to render - showing empty state')
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No highlights on this page</p>
        <small>Select text and mark it with a color</small>
      </div>
    `
    return
  }

  console.log('🔨 Creating HTML for', highlights.length, 'highlights')

  try {
    const highlightHTML = highlights
      .map((highlight, index) => {
        console.log(`🎯 Processing highlight ${index + 1}:`, {
          id: highlight.id,
          text: highlight.text?.substring(0, 30) + '...',
          color: highlight.color
        })

        return `
          <div class="highlight-item" data-highlight-id="${highlight.id || ''}">
            <div class="color-indicator color-${
              highlight.color || 'yellow'
            }"></div>
            <div class="highlight-text" title="${escapeHtml(
              highlight.text || ''
            )}">
              ${escapeHtml(truncateText(highlight.text || 'No text', 40))}
            </div>
            <button class="delete-btn" data-id="${
              highlight.id || ''
            }" title="Ջնջել">
              ✕
            </button>
          </div>
        `
      })
      .join('')

    console.log('📄 Generated HTML length:', highlightHTML.length)
    container.innerHTML = highlightHTML

    // Add delete event listeners
    const deleteButtons = container.querySelectorAll('.delete-btn')
    console.log('🗑️ Found delete buttons:', deleteButtons.length)

    deleteButtons.forEach((btn, index) => {
      btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()

        const highlightId = btn.dataset.id
        console.log(
          `🗑️ Delete button ${index + 1} clicked for ID:`,
          highlightId
        )

        if (highlightId) {
          deleteHighlight(highlightId)
        } else {
          console.error('❌ No highlight ID found on delete button')
        }
      })
    })

    console.log('✅ Highlights rendered successfully')
  } catch (error) {
    console.error('❌ Error rendering highlights:', error)
    showError('Failed to render highlights: ' + error.message)
  }
}

// Setup event listeners
function setupEventListeners () {
  console.log('🎯 Setting up event listeners...')

  const refreshBtn = document.getElementById('refreshBtn')
  const clearPageBtn = document.getElementById('clearPageBtn')
  const clearAllBtn = document.getElementById('clearAllBtn')

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 Refresh button clicked')
      await loadHighlights()
    })
    console.log('✅ Refresh button listener added')
  } else {
    console.warn('⚠️ Refresh button not found')
  }

  if (clearPageBtn) {
    clearPageBtn.addEventListener('click', clearPageHighlights)
    console.log('✅ Clear page button listener added')
  } else {
    console.warn('⚠️ Clear page button not found')
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllHighlights)
    console.log('✅ Clear all button listener added')
  } else {
    console.warn('⚠️ Clear all button not found')
  }

  // Add debug controls
  addDebugControls()
}

// Add debug controls (temporary for development)
function addDebugControls () {
  const controls = document.querySelector('.controls')
  if (!controls) {
    console.warn('⚠️ Controls container not found')
    return
  }

  // Debug storage button
  const debugBtn = document.createElement('button')
  debugBtn.textContent = '🔍 Debug Storage'
  debugBtn.className = 'btn btn-secondary'
  debugBtn.style.fontSize = '12px'
  debugBtn.style.padding = '8px'
  debugBtn.style.marginTop = '8px'
  debugBtn.addEventListener('click', debugStorage)
  controls.appendChild(debugBtn)

  // Test highlight button
  const testBtn = document.createElement('button')
  testBtn.textContent = '🧪 Add Test Highlight'
  testBtn.className = 'btn btn-secondary'
  testBtn.style.fontSize = '12px'
  testBtn.style.padding = '8px'
  testBtn.style.marginTop = '4px'
  testBtn.addEventListener('click', addTestHighlight)
  controls.appendChild(testBtn)

  console.log('🛠️ Debug controls added')
}

// Debug storage function
async function debugStorage () {
  console.log('🔍 === MANUAL STORAGE DEBUG ===')

  try {
    // Get all storage data
    const allData = await new Promise(resolve => {
      chrome.storage.local.get(null, resolve)
    })
    console.log('📦 All storage data:', allData)

    // Get specific key
    const specificData = await chrome.storage.local.get([STORAGE_KEY])
    console.log('🎯 Specific key data:', specificData)

    // Check current URL data
    const currentUrlData = specificData[STORAGE_KEY]?.[currentPageUrl] || []
    console.log('🌐 Current URL highlights:', currentUrlData)

    // Show summary
    const totalKeys = Object.keys(allData).length
    const totalUrls = Object.keys(specificData[STORAGE_KEY] || {}).length
    const totalHighlights = Object.values(
      specificData[STORAGE_KEY] || {}
    ).flat().length

    const summary = `Storage Debug Results:
📦 Total storage keys: ${totalKeys}
🌐 URLs with highlights: ${totalUrls}  
📝 Total highlights: ${totalHighlights}
📍 Current URL highlights: ${currentUrlData.length}
🔗 Current URL: ${currentPageUrl}`

    console.log(summary)
    alert(summary)
  } catch (error) {
    console.error('❌ Debug failed:', error)
    alert('Debug failed: ' + error.message)
  }
}

// Add test highlight function
async function addTestHighlight () {
  console.log('🧪 Adding test highlight...')

  try {
    const testHighlight = {
      id: 'test-' + Date.now(),
      text: `Test highlight created at ${new Date().toLocaleTimeString()} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      color: ['yellow', 'green', 'blue', 'pink', 'orange'][
        Math.floor(Math.random() * 5)
      ],
      timestamp: Date.now(),
      url: currentPageUrl,
      selection: {
        startOffset: 0,
        endOffset: 20
      }
    }

    console.log('📝 Test highlight object:', testHighlight)

    // Get current storage
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const stored = result[STORAGE_KEY] || {}

    // Add test highlight to current page
    if (!stored[currentPageUrl]) {
      stored[currentPageUrl] = []
    }
    stored[currentPageUrl].push(testHighlight)

    console.log('💾 Updated storage structure:', stored)

    // Save to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: stored })
    console.log('✅ Test highlight saved to storage')

    // Refresh display
    await loadHighlights()

    showSuccess('Test highlight added successfully!')
  } catch (error) {
    console.error('❌ Failed to add test highlight:', error)
    showError('Failed to add test highlight: ' + error.message)
  }
}

// Delete single highlight
async function deleteHighlight (highlightId) {
  console.log('🗑️ Deleting highlight:', highlightId)

  if (!highlightId) {
    console.error('❌ No highlight ID provided')
    showError('Highlight ID not found to delete')
    return
  }

  try {
    // Get current stored data
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const stored = result[STORAGE_KEY] || {}
    const highlights = stored[currentPageUrl] || []

    console.log('📊 Before deletion - highlights count:', highlights.length)

    // Filter out the highlight to delete
    const filteredHighlights = highlights.filter(h => h.id !== highlightId)
    console.log(
      '📊 After deletion - highlights count:',
      filteredHighlights.length
    )

    if (filteredHighlights.length === highlights.length) {
      console.warn('⚠️ No highlight was deleted - ID not found')
      showError('Highlight not found to delete')
      return
    }

    stored[currentPageUrl] = filteredHighlights

    // Save back to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: stored })
    console.log('💾 Highlight deleted from storage')

    // Remove from page via content script
    await removeHighlightFromPage(highlightId)

    // Refresh display
    await loadHighlights()

    showSuccess('Highlight deleted successfully!')
  } catch (error) {
    console.error('❌ Error deleting highlight:', error)
    showError('Failed to delete highlight: ' + error.message)
  }
}

// Clear all highlights from current page
async function clearPageHighlights () {
  console.log('🗑️ Clearing page highlights...')

  if (!confirm('Are you sure you want to clear all highlights from this page?')) {
    console.log('❌ User cancelled page clear operation')
    return
  }

  try {
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const stored = result[STORAGE_KEY] || {}

    const highlightsCount = (stored[currentPageUrl] || []).length
    console.log('📊 Clearing', highlightsCount, 'highlights from current page')

    // Remove current page highlights
    delete stored[currentPageUrl]

    // Save back to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: stored })
    console.log('💾 Page highlights cleared from storage')

    // Clear from page via content script
    await clearHighlightsFromPage()

    // Refresh display
    await loadHighlights()

    showSuccess(`${highlightsCount} highlight deleted from this page!`)
  } catch (error) {
    console.error('❌ Error clearing page highlights:', error)
    showError('Failed to clear page highlights: ' + error.message)
  }
}

// Clear all highlights from all pages
async function clearAllHighlights () {
  console.log('🗑️ Clearing all highlights...')

  if (
    !confirm(
      'Are you sure you want to clear all highlights from all pages? This action is irreversible:'
    )
  ) {
    console.log('❌ User cancelled clear all operation')
    return
  }

  try {
    // Get current count for confirmation
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const stored = result[STORAGE_KEY] || {}
    const totalHighlights = Object.values(stored).flat().length

    console.log('📊 Clearing', totalHighlights, 'highlights from all pages')

    // Remove all stored highlights
    await chrome.storage.local.remove([STORAGE_KEY])
    console.log('💾 All highlights cleared from storage')

    // Clear from current page via content script
    await clearHighlightsFromPage()

    // Refresh display
    await loadHighlights()

    showSuccess(`${totalHighlights} highlight deleted from all pages!`)
  } catch (error) {
    console.error('❌ Error clearing all highlights:', error)
    showError('Failed to clear all highlights: ' + error.message)
  }
}

// Setup storage change listener
function setupStorageListener () {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      console.log('💾 Storage changed:', { changes, namespace })

      if (namespace === 'local' && changes[STORAGE_KEY]) {
        console.log('📝 Highlights storage changed - reloading display...')
        loadHighlights()
      }
    })
    console.log('👂 Storage change listener set up')
  } else {
    console.warn('⚠️ Storage change listener not available')
  }
}

// Test storage access
async function testStorageAccess () {
  try {
    console.log('🧪 Testing storage access...')

    // Test write
    const testKey = 'test-key-' + Date.now()
    const testValue = 'test-value-' + Date.now()
    await chrome.storage.local.set({ [testKey]: testValue })
    console.log('✅ Storage write test passed')

    // Test read
    const result = await chrome.storage.local.get([testKey])
    if (result[testKey] === testValue) {
      console.log('✅ Storage read test passed')
    } else {
      console.error('❌ Storage read test failed - value mismatch')
    }

    // Clean up
    await chrome.storage.local.remove([testKey])
    console.log('🧹 Storage test cleanup complete')

    // Check permissions
    const permissions = await chrome.permissions.getAll()
    console.log('🔐 Available permissions:', permissions)
  } catch (error) {
    console.error('❌ Storage access test failed:', error)
    showError('Storage access error: ' + error.message)
  }
}

// Communication with content script
async function removeHighlightFromPage (highlightId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.tabs.sendMessage(tab.id, {
      action: 'removeHighlight',
      highlightId: highlightId
    })
    console.log('📤 Remove highlight message sent to content script')
  } catch (error) {
    console.warn('⚠️ Could not communicate with content script:', error)
    // Don't show error to user as this is not critical for popup functionality
  }
}

async function clearHighlightsFromPage () {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await chrome.tabs.sendMessage(tab.id, {
      action: 'clearHighlights'
    })
    console.log('📤 Clear highlights message sent to content script')
  } catch (error) {
    console.warn('⚠️ Could not communicate with content script:', error)
    // Don't show error to user as this is not critical for popup functionality
  }
}

// Utility functions
function truncateText (text, maxLength) {
  if (!text) return 'No text'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function escapeHtml (text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showLoading (show) {
  const loadingEl = document.getElementById('loading')
  if (loadingEl) {
    loadingEl.style.display = show ? 'block' : 'none'
    console.log('⏳ Loading indicator:', show ? 'shown' : 'hidden')
  }
}

function showError (message) {
  const errorEl = document.getElementById('error')
  if (errorEl) {
    errorEl.textContent = message
    errorEl.style.display = 'block'
    errorEl.style.backgroundColor = '#f8d7da'
    errorEl.style.color = '#721c24'

    setTimeout(() => {
      errorEl.style.display = 'none'
    }, 5000)
  }
  console.error('❌ Error shown to user:', message)
}

function showSuccess (message) {
  const errorEl = document.getElementById('error')
  if (errorEl) {
    errorEl.textContent = message
    errorEl.style.display = 'block'
    errorEl.style.backgroundColor = '#d4edda'
    errorEl.style.color = '#155724'

    setTimeout(() => {
      errorEl.style.display = 'none'
    }, 3000)
  }
  console.log('✅ Success shown to user:', message)
}
