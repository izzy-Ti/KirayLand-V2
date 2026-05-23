'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // The browser client automatically intercepts the OAuth URL code 
    // and establishes the session in local storage.
    const { data: authListener } = getSupabaseBrowserClient().auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          router.push('/')
        }
      }
    )

    // Fallback if the user is already signed in or event doesn't trigger
    getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push('/')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-white">
      <div className="animate-spin w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full" />
    </div>
  )
}
