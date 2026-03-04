import React from 'react'

function parseBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return part.replace(/\*\*/g, '')
  })
}

/** Check if a line is a block boundary (should not be merged with neighbors) */
function isBlockStart(line) {
  if (/^#{1,3}\s/.test(line)) return true           // ## Header
  if (/^\d+[\.\)]/.test(line)) return true           // 1. or 1) list
  if (/^[-•]/.test(line)) return true                // bullet list
  if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) return true // **Bold Label:** on its own line
  if (/^---+$/.test(line)) return true               // horizontal rule
  return false
}

export function renderMarkdownText(text) {
  const rawLines = text.split('\n')

  // Merge wrapped continuation lines, but respect block boundaries and blank lines
  const merged = []
  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) { merged.push(''); continue }
    if (isBlockStart(trimmed)) {
      merged.push(trimmed)
    } else if (merged.length > 0 && merged[merged.length - 1] !== '' && !isBlockStart(merged[merged.length - 1])) {
      merged[merged.length - 1] += ' ' + trimmed
    } else {
      merged.push(trimmed)
    }
  }

  return merged.map((line, i) => {
    if (!line) return null

    // Horizontal rule
    if (/^---+$/.test(line)) {
      return <hr key={i} className="my-3 border-gray-200" />
    }

    // Markdown headers: ## or ###
    const headerMatch = line.match(/^(#{1,3})\s+(.*)/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const content = headerMatch[2].replace(/\*\*/g, '')
      const className = level === 1
        ? 'font-bold text-base text-gray-900 mt-3 mb-2'
        : level === 2
          ? 'font-semibold text-sm text-gray-900 mt-3 mb-1.5'
          : 'font-semibold text-sm text-gray-800 mt-2 mb-1'
      return <p key={i} className={className}>{content}</p>
    }

    // Bold-only line (standalone label like **Verdict:**)
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      const label = line.replace(/^\*\*/, '').replace(/\*\*:?\s*$/, '')
      return <p key={i} className="font-semibold text-sm text-gray-900 mt-3 mb-1.5">{label}</p>
    }

    // Numbered list
    const numMatch = line.match(/^(\d+[\.\)])\s*(.*)/)
    if (numMatch) {
      return (
        <p key={i} className="ml-1 mb-3 flex gap-2">
          <span className="text-purple-400 font-semibold flex-shrink-0">{numMatch[1]}</span>
          <span className="text-sm text-gray-700 leading-relaxed">{parseBold(numMatch[2])}</span>
        </p>
      )
    }

    // Bullet list
    if (/^[-•]/.test(line)) {
      return (
        <p key={i} className="ml-3 mb-1.5 flex gap-2">
          <span className="text-purple-400">{'•'}</span>
          <span className="text-sm text-gray-700">{parseBold(line.slice(1).trim())}</span>
        </p>
      )
    }

    // Regular paragraph
    return <p key={i} className="mb-2 text-sm text-gray-700 leading-relaxed">{parseBold(line)}</p>
  }).filter(Boolean)
}
