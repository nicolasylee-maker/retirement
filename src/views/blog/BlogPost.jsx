import React, { useEffect, useState } from 'react'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

export default function BlogPost({ post, onBack }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    setHtml(marked.parse(post.content))
  }, [post.content])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Nav */}
        <div className="flex items-center gap-2 mb-10 text-sm text-gray-500">
          <a href="/" className="text-orange-500 font-bold">RetirePlanner.ca</a>
          <span>/</span>
          <a href="/blog" onClick={e => { e.preventDefault(); onBack() }} className="hover:text-gray-700">Blog</a>
        </div>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">{post.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{new Date(post.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
        </header>

        {/* Body */}
        <div
          className="prose prose-gray max-w-none
            prose-headings:font-bold prose-headings:text-gray-900
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-5
            prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900
            prose-table:text-sm prose-table:w-full
            prose-th:bg-gray-100 prose-th:text-gray-700 prose-th:px-4 prose-th:py-2 prose-th:text-left
            prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
            prose-li:text-gray-700 prose-li:mb-1
            prose-hr:border-gray-200 prose-hr:my-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* CTA */}
        <div className="mt-16 bg-orange-50 border border-orange-100 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">See how this applies to your retirement</h2>
          <p className="text-gray-600 mb-6">Free year-by-year projection with real Canadian tax brackets. Takes 5 minutes.</p>
          <a
            href="/"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Start Free at RetirePlanner.ca
          </a>
        </div>
      </div>
    </div>
  )
}
