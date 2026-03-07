import React from 'react'

export default function BlogIndex({ posts, onSelectPost }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <a href="/" className="text-orange-500 font-bold text-lg tracking-tight">RetirePlanner.ca</a>
        <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-2">Retirement Planning for Canadians</h1>
        <p className="text-gray-500 mb-12">CPP, OAS, RRSP, TFSA — plain answers to the questions banks don't explain.</p>
        <div className="space-y-8">
          {posts.map(post => (
            <article key={post.slug} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <a
                href={`/blog/${post.slug}`}
                onClick={e => { e.preventDefault(); onSelectPost(post.slug) }}
                className="block"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-500 text-sm mb-3">{post.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(post.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>·</span>
                  <span>{post.readingTime}</span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
