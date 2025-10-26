import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { readContract } from 'thirdweb'
import { contract } from '@/constants/contract'

// GET handler - Fetches market details by market_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get('market_id')

    if (!marketId) {
      return NextResponse.json({ error: 'market_id is required' }, { status: 400 })
    }

    // Fetch market details from Supabase
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('market_id', parseInt(marketId))
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Return empty object if market not found, or the market data
    return NextResponse.json(data || {})
  } catch (error) {
    console.error('GET /api/markets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST handler - Saves new market details with on-chain verification
export async function POST(request: NextRequest) {
  try {
    const { market_id, description, image_url, proposer_address } = await request.json()

    // Validate required fields
    if (!market_id || !description || !image_url || !proposer_address) {
      return NextResponse.json(
        { error: 'market_id, description, image_url, and proposer_address are required' },
        { status: 400 }
      )
    }

    // On-chain verification: Check if proposer_address matches contract's marketProposers
    try {
      const contractProposer = await readContract({
        contract,
        method: "function marketProposers(uint256) view returns (address)",
        params: [BigInt(market_id)],
      })

      // Compare addresses (case-insensitive)
      if (contractProposer.toLowerCase() !== proposer_address.toLowerCase()) {
        return NextResponse.json(
          { error: 'Proposer address verification failed' },
          { status: 403 }
        )
      }
    } catch (contractError) {
      console.error('Contract read error:', contractError)
      return NextResponse.json(
        { error: 'Failed to verify proposer on-chain' },
        { status: 500 }
      )
    }

    // Insert data into Supabase markets table
    const { data, error } = await supabase
      .from('markets')
      .insert({
        market_id: parseInt(market_id),
        description,
        image_url,
        proposer_address,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save market data' }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('POST /api/markets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

