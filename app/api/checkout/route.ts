import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
})

export async function POST(req: Request) {
  try {
    const { priceAmount, userId, credits } = await req.json()

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // CHANGED TO USD
            product_data: {
              name: `${credits} Invoice Credits`,
              description: `Points for AI Invoice generation`,
            },
            // Multiply 3.99 by 100 to get 399 cents for Stripe
            unit_amount: Math.round(parseFloat(priceAmount) * 100), 
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        userId: userId,
        credits: credits.toString(),
      },
      success_url: `${req.headers.get('origin')}/invoice/new?success=true`,
      cancel_url: `${req.headers.get('origin')}/refill?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
