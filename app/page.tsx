import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { withBasePath } from '@/lib/base-path'

export default async function HomePage() {
  const user = await getCurrentUser()
  
  if (user) {
    redirect(withBasePath('/dashboard'))
  } else {
    redirect(withBasePath('/login'))
  }
}
