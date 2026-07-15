export function youtubeVideoId(url: string): string | null {
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/)
  if (shorts) return shorts[1]
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (short) return short[1]
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (watch) return watch[1]
  return null
}

export function youtubeEmbedUrl(url: string): string | null {
  // youtube.com/shorts/VIDEO_ID
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/)
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`

  // youtu.be/VIDEO_ID
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (short) return `https://www.youtube.com/embed/${short[1]}`

  // youtube.com/watch?v=VIDEO_ID
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`

  return null
}
