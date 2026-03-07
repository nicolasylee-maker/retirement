import React, { useEffect, useState } from 'react'
import matter from 'gray-matter'
import BlogIndex from './BlogIndex'
import BlogPost from './BlogPost'

// Load all .md files from content/blog at build time
const modules = import.meta.glob('../../content/blog/*.md', { query: '?raw', import: 'default', eager: true })

function loadPosts() {
  return Object.entries(modules)
    .map(([, raw]) => {
      const { data, content } = matter(raw)
      return { ...data, content }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

const ALL_POSTS = loadPosts()

export default function BlogApp() {
  const [slug, setSlug] = useState(() => {
    const parts = window.location.pathname.split('/').filter(Boolean)
    // /blog → null, /blog/some-slug → 'some-slug'
    return parts.length >= 2 ? parts[1] : null
  })

  // Keep URL in sync
  useEffect(() => {
    const url = slug ? `/blog/${slug}` : '/blog'
    if (window.location.pathname !== url) {
      window.history.pushState({}, '', url)
    }
    // Update page title for SEO
    if (slug) {
      const post = ALL_POSTS.find(p => p.slug === slug)
      if (post) {
        document.title = `${post.title} — RetirePlanner.ca`
        document.querySelector('meta[name="description"]')?.setAttribute('content', post.description)
      }
    } else {
      document.title = 'Blog — RetirePlanner.ca'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Retirement planning guides for Canadians — CPP, OAS, RRSP, TFSA, and more.')
    }
  }, [slug])

  const activePost = slug ? ALL_POSTS.find(p => p.slug === slug) : null

  if (activePost) {
    return <BlogPost post={activePost} onBack={() => setSlug(null)} />
  }

  return <BlogIndex posts={ALL_POSTS} onSelectPost={setSlug} />
}
