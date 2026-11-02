import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { ApiError, api } from '../lib/api'
import type { Post } from '../lib/types'
import { PostCard } from '../components/Posts'

// One post or article on its own page, with comments open.
export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get<Post>(`/posts/${id}`).then(setPost).catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'This post is not available.' : 'Could not load this post.'))
  }, [id])
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep">
        <FiArrowLeft className="h-4 w-4" /> Home
      </Link>
      {error && <p className="text-sm text-ink">{error}</p>}
      {post && <PostCard post={post} full onRemoved={() => navigate('/')} />}
    </div>
  )
}
