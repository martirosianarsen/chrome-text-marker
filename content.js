;(function () {
  'use strict'

  const STORAGE_KEY = 'text-marker-highlights'
  const pageUrl = window.location.href
  let popup = null
  let currentSelection = null

  console.log('🚀 Text Marker Content Script initializing...')
  console.log('🌐 Current page URL:', pageUrl)

  function init () {
    console.log('🎯 Starting initialization...')
    createPopup()
    setupEventListeners()
    loadHighlights()
    console.log('✅ Text Marker Content Script initialized successfully')
  }

  function createPopup () {
    console.log('🎨 Creating color selection popup...')

    popup = document.createElement('div')
    popup.className = 'text-marker-popup'
    popup.innerHTML = `
        <h3>Choose Color</h3>
        <div class="text-marker-colors">
          <div class="text-marker-color-btn yellow" data-color="yellow" title="Yellow"></div>
          <div class="text-marker-color-btn green" data-color="green" title="Green"></div>
          <div class="text-marker-color-btn blue" data-color="blue" title="Blue"></div>
          <div class="text-marker-color-btn pink" data-color="pink" title="Pink"></div>
          <div class="text-marker-color-btn orange" data-color="orange" title="Orange"></div>
        </div>
        <div class="text-marker-actions">
          <button class="text-marker-btn remove">Remove</button>
          <button class="text-marker-btn cancel">Cancel</button>
        </div>
      `

    // Add CSS styles
    addStyles()

    document.body.appendChild(popup)
    console.log('✅ Popup created and added to DOM')

    // Setup color button listeners
    popup.querySelectorAll('.text-marker-color-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        const color = e.target.dataset.color
        console.log('🎨 Color selected:', color)
        highlightSelection(color)
        hidePopup()
      })
    })

    // Setup remove button listener
    popup
      .querySelector('.text-marker-btn.remove')
      .addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        console.log('🗑️ Remove button clicked')
        removeHighlight()
        hidePopup()
      })

    // Setup cancel button listener
    popup
      .querySelector('.text-marker-btn.cancel')
      .addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        console.log('❌ Cancel button clicked')
        hidePopup()
      })

    console.log('🎯 Popup event listeners set up')
  }

  function addStyles () {
    const styleId = 'text-marker-styles'
    if (document.getElementById(styleId)) return

    const styles = `
      .text-marker-popup {
        position: absolute;
        z-index: 10000;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: none;
        min-width: 200px;
      }
      
      .text-marker-popup h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
      
      .text-marker-colors {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .text-marker-color-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        transition: transform 0.2s;
      }
      
      .text-marker-color-btn:hover {
        transform: scale(1.1);
      }
      
      .text-marker-color-btn.yellow { background-color: #ffeb3b; }
      .text-marker-color-btn.green { background-color: #4caf50; }
      .text-marker-color-btn.blue { background-color: #2196f3; }
      .text-marker-color-btn.pink { background-color: #e91e63; }
      .text-marker-color-btn.orange { background-color: #ff9800; }
      
      .text-marker-actions {
        display: flex;
        gap: 8px;
      }
      
      .text-marker-btn {
        flex: 1;
        padding: 6px 12px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }
      
      .text-marker-btn:hover {
        background-color: #f5f5f5;
      }
      
      .text-marker-btn.remove {
        background-color: #dc3545;
        color: white;
        border-color: #dc3545;
      }
      
      .text-marker-btn.remove:hover {
        background-color: #c82333;
      }
      
      .text-marker-highlight-yellow {
        background-color: rgba(255, 235, 59, 0.3);
        border-radius: 2px;
      }
      
      .text-marker-highlight-green {
        background-color: rgba(76, 175, 80, 0.3);
        border-radius: 2px;
      }
      
      .text-marker-highlight-blue {
        background-color: rgba(33, 150, 243, 0.3);
        border-radius: 2px;
      }
      
      .text-marker-highlight-pink {
        background-color: rgba(233, 30, 99, 0.3);
        border-radius: 2px;
      }
      
      .text-marker-highlight-orange {
        background-color: rgba(255, 152, 0, 0.3);
        border-radius: 2px;
      }
      
      [data-marker-id] {
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      [data-marker-id]:hover {
        filter: brightness(0.9);
      }
    `

    const styleElement = document.createElement('style')
    styleElement.id = styleId
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
    console.log('🎨 Styles added to page')
  }

  function setupEventListeners () {
    console.log('👂 Setting up event listeners...')
    let isPopupVisible = false

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Message received:', request)

      if (request.action === 'removeHighlight') {
        console.log('🗑️ Remove highlight request:', request.highlightId)
        removeHighlightById(request.highlightId)
        sendResponse({ success: true })
      } else if (request.action === 'clearHighlights') {
        console.log('🧹 Clear all highlights request')
        clearAllHighlightsFromPage()
        sendResponse({ success: true })
      }
      return true
    })

    // Handle text selection
    document.addEventListener('mouseup', e => {
      if (!popup || popup.contains(e.target)) return
      if (e.target.closest('[class^="text-marker-highlight"]')) return

      setTimeout(() => {
        const selection = window.getSelection()
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
          const selectedText = selection.toString().trim()
          if (selectedText.length > 0) {
            console.log(
              '📝 Text selected:',
              selectedText.substring(0, 50) + '...'
            )

            const range = selection.getRangeAt(0)
            currentSelection = {
              range: range.cloneRange(),
              text: selectedText
            }
            isPopupVisible = true
            showPopup(e.pageX, e.pageY)
          }
        }
      }, 50)
    })

    // Handle clicks outside popup
    document.addEventListener('click', e => {
      if (
        isPopupVisible &&
        !popup.contains(e.target) &&
        !e.target.closest('[class^="text-marker-highlight"]')
      ) {
        console.log('👆 Click outside popup - hiding')
        isPopupVisible = false
        hidePopup()
      }
    })

    // Prevent popup from closing when interacting with it
    popup.addEventListener('mousedown', e => e.stopPropagation())
    popup.addEventListener('mouseup', e => e.stopPropagation())
    popup.addEventListener('click', e => e.stopPropagation())

    console.log('✅ Event listeners set up')
  }

  async function removeHighlightById (highlightId) {
    console.log('🗑️ Removing highlight by ID:', highlightId)

    const element = document.querySelector(`[data-marker-id="${highlightId}"]`)
    if (element) {
      console.log('📍 Found highlight element to remove')
      await removeHighlightFromStorage(highlightId)

      const parent = element.parentNode
      parent.replaceChild(document.createTextNode(element.textContent), element)
      parent.normalize()

      console.log('✅ Highlight removed from page')
    } else {
      console.warn('⚠️ Highlight element not found:', highlightId)
    }
  }

  async function clearAllHighlightsFromPage () {
    console.log('🧹 Clearing all highlights from page...')

    const highlights = document.querySelectorAll('[data-marker-id]')
    console.log('📊 Found highlights to clear:', highlights.length)

    highlights.forEach(el => {
      const parent = el.parentNode
      parent.replaceChild(document.createTextNode(el.textContent), el)
      parent.normalize()
    })

    // Clear from storage
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY])
      const stored = result[STORAGE_KEY] || {}
      delete stored[pageUrl]
      await chrome.storage.local.set({ [STORAGE_KEY]: stored })
      console.log('✅ All highlights cleared from storage')
    } catch (error) {
      console.error('❌ Error clearing highlights from storage:', error)
    }
  }

  function showPopup (x, y) {
    if (!popup) return

    console.log('👁️ Showing popup at:', { x, y })

    popup.style.display = 'block'
    popup.style.left = x + 'px'
    popup.style.top = y + 10 + 'px'

    // Adjust position if popup goes off screen
    const rect = popup.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      popup.style.left = window.innerWidth - rect.width - 10 + 'px'
    }
    if (rect.bottom > window.innerHeight) {
      popup.style.top = y - rect.height - 10 + 'px'
    }

    console.log('✅ Popup positioned and shown')
  }

  function hidePopup () {
    if (!popup || popup.style.display !== 'block') return

    console.log('👁️‍🗨️ Hiding popup...')
    popup.style.display = 'none'
    setTimeout(() => window.getSelection().removeAllRanges(), 50)
    currentSelection = null
    console.log('✅ Popup hidden')
  }

  async function highlightSelection (color) {
    if (!currentSelection) {
      console.warn('⚠️ No current selection to highlight')
      return
    }

    console.log('🖍️ Creating highlight with color:', color)

    try {
      const range = currentSelection.range
      const highlight = document.createElement('span')
      highlight.className = `text-marker-highlight-${color}`
      highlight.setAttribute('data-marker-color', color)
      const markerId = generateId()
      highlight.setAttribute('data-marker-id', markerId)

      range.surroundContents(highlight)
      console.log('📍 Highlight element created with ID:', markerId)

      await saveHighlight(highlight, currentSelection.text, color)
      console.log('✅ Highlight saved successfully')
    } catch (error) {
      console.error('❌ Could not highlight selection:', error)
    }

    currentSelection = null
  }

  async function removeHighlight () {
    if (!currentSelection) {
      console.warn('⚠️ No current selection to remove highlight from')
      return
    }

    console.log('🗑️ Removing highlight from current selection...')

    const range = currentSelection.range
    const container = range.commonAncestorContainer
    let highlightElement =
      container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container

    if (highlightElement?.hasAttribute('data-marker-id')) {
      const markerId = highlightElement.getAttribute('data-marker-id')
      console.log('📍 Found highlight to remove:', markerId)

      await removeHighlightFromStorage(markerId)
      const parent = highlightElement.parentNode
      parent.replaceChild(
        document.createTextNode(highlightElement.textContent),
        highlightElement
      )
      parent.normalize()

      console.log('✅ Highlight removed')
    } else {
      console.warn('⚠️ No highlight found in current selection')
    }

    currentSelection = null
  }

  function generateId () {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2)
    console.log('🔑 Generated ID:', id)
    return id
  }

  async function saveHighlight (element, text, color) {
    const markerId = element.getAttribute('data-marker-id')
    console.log('💾 Saving highlight:', {
      markerId,
      text: text.substring(0, 30) + '...',
      color
    })

    try {
      const result = await chrome.storage.local.get([STORAGE_KEY])
      const stored = result[STORAGE_KEY] || {}
      const highlights = stored[pageUrl] || []

      const highlightData = {
        id: markerId,
        text,
        color,
        xpath: getXPath(element),
        timestamp: Date.now(),
        pageUrl
      }

      highlights.push(highlightData)
      stored[pageUrl] = highlights

      await chrome.storage.local.set({ [STORAGE_KEY]: stored })
      console.log(
        '✅ Highlight saved to storage. Total highlights for this page:',
        highlights.length
      )
    } catch (error) {
      console.error('❌ Error saving highlight:', error)
    }
  }

  async function removeHighlightFromStorage (markerId) {
    console.log('💾 Removing highlight from storage:', markerId)

    try {
      const result = await chrome.storage.local.get([STORAGE_KEY])
      const stored = result[STORAGE_KEY] || {}
      const highlights = stored[pageUrl] || []

      const filteredHighlights = highlights.filter(h => h.id !== markerId)
      stored[pageUrl] = filteredHighlights

      await chrome.storage.local.set({ [STORAGE_KEY]: stored })
      console.log(
        '✅ Highlight removed from storage. Remaining highlights:',
        filteredHighlights.length
      )
    } catch (error) {
      console.error('❌ Error removing highlight from storage:', error)
    }
  }

  async function loadHighlights () {
    console.log('📚 Loading existing highlights for page...')

    try {
      const result = await chrome.storage.local.get([STORAGE_KEY])
      const stored = result[STORAGE_KEY] || {}
      const highlights = stored[pageUrl] || []

      console.log('📊 Found highlights to restore:', highlights.length)

      if (!highlights.length) {
        console.log('📝 No highlights found for this page')
        return
      }

      let retry = 0
      const maxRetries = 3

      function attempt () {
        console.log(`🔄 Restoration attempt ${retry + 1}/${maxRetries + 1}...`)
        let restored = 0

        for (const highlight of highlights) {
          if (restoreHighlight(highlight)) {
            restored++
          }
        }

        console.log(`📈 Restored ${restored}/${highlights.length} highlights`)

        if (restored < highlights.length && retry < maxRetries) {
          retry++
          console.log(
            `⏳ Some highlights failed to restore. Retrying in 1 second...`
          )
          setTimeout(attempt, 1000)
        } else {
          console.log('✅ Highlight restoration completed')
        }
      }

      // Wait a bit for page to fully load
      setTimeout(attempt, 500)
    } catch (error) {
      console.error('❌ Error loading highlights:', error)
    }
  }

  function restoreHighlight (highlight) {
    console.log('🔄 Attempting to restore highlight:', {
      id: highlight.id,
      text: highlight.text?.substring(0, 30) + '...',
      color: highlight.color
    })

    let element = getElementByXPath(highlight.xpath) || document.body
    const nodes = getAllTextNodes(element)

    for (let textNode of nodes) {
      const start = textNode.textContent.indexOf(highlight.text)
      if (start !== -1) {
        console.log('📍 Found matching text node for highlight')

        try {
          const range = document.createRange()
          range.setStart(textNode, start)
          range.setEnd(textNode, start + highlight.text.length)

          const span = document.createElement('span')
          span.className = `text-marker-highlight-${highlight.color}`
          span.setAttribute('data-marker-color', highlight.color)
          span.setAttribute('data-marker-id', highlight.id)

          span.appendChild(range.extractContents())
          range.insertNode(span)

          console.log('✅ Highlight restored successfully')
          return true
        } catch (error) {
          console.warn('⚠️ Failed to restore highlight:', error)
        }
      }
    }

    console.warn('⚠️ Could not find matching text for highlight:', highlight.id)
    return false
  }

  function getAllTextNodes (element) {
    const nodes = []
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (
          node.parentNode?.hasAttribute?.('data-marker-id') ||
          !node.textContent.trim()
        ) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })

    let node
    while ((node = walker.nextNode())) {
      nodes.push(node)
    }
    return nodes
  }

  function getXPath (el) {
    if (el.id) return `//*[@id="${el.id}"]`
    if (el === document.body) return '/html/body'

    const ix =
      Array.from(el.parentNode.childNodes)
        .filter(n => n.tagName === el.tagName)
        .indexOf(el) + 1

    return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + `[${ix}]`
  }

  function getElementByXPath (xpath) {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOM loaded, initializing in 500ms...')
      setTimeout(init, 500)
    })
  } else {
    console.log('📄 DOM already loaded, initializing in 100ms...')
    setTimeout(init, 100)
  }
})()
