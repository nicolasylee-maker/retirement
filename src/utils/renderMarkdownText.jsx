import React from 'react'

function parseBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return part.replace(/\*\*/g, '')
  })
}

export function renderMarkdownText(text) {
  const rawLines = text.split('\n')
  const merged = []
  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) { merged.push(''); continue }
    if (/^\d+[\.\)]/.test(trimmed) || /^[-•]/.test(trimmed) || /^Overall/.test(trimmed)) {
      merged.push(trimmed)
    } else if (merged.length > 0 && merged[merged.length - 1] !== '') {
      merged[merged.length - 1] += ' ' + trimmed
    } else {
      merged.push(trimmed)
    }
  }

  return merged.map((line, i) => {
    if (!line) return null
    const numMatch = line.match(/^(\d+[\.\)])\s*(.*)/)
    if (numMatch) {
      return (
        <p key={i} className="ml-1 mb-3 flex gap-2">
          <span className="text-purple-400 font-semibold flex-shrink-0">{numMatch[1]}</span>
          <span className="text-sm text-gray-700 leading-relaxed">{parseBold(numMatch[2])}</span>
        </p>
      )
    }
    if (/^[-•]/.test(line)) {
      return (
        <p key={i} className="ml-3 mb-1.5 flex gap-2">
          <span className="text-purple-400">{'•'}</span>
          <span className="text-sm text-gray-700">{parseBold(line.slice(1).trim())}</span>
        </p>
      )
    }
    return <p key={i} className="mb-2 text-sm text-gray-700 leading-relaxed">{parseBold(line)}</p>
  }).filter(Boolean)
}
