import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOptionsChain } from '@/lib/polygon/client'

const querySchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  contract_type: z.enum(['call', 'put']).optional(),
  expiration_date: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { ticker, contract_type, expiration_date } = parsed.data

  try {
    const contracts = await getOptionsChain(ticker, expiration_date, contract_type)
    return NextResponse.json({ contracts })
  } catch (err) {
    console.error('[options] ticker=%s error=%s', ticker, err)
    return NextResponse.json({ error: 'Options data unavailable' }, { status: 502 })
  }
}
