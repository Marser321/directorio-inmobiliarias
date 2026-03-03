import { createFeaturedCheckout } from '../_featured'

export async function POST(request: Request) {
  return createFeaturedCheckout(request)
}
