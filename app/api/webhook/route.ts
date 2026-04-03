{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ NextResponse \} from 'next/server'\
import Stripe from 'stripe'\
import \{ createClient \} from '@supabase/supabase-js'\
\
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, \{ apiVersion: '2023-10-16' as any \})\
\
// Initialize Supabase with the ADMIN key\
const supabaseAdmin = createClient(\
  process.env.NEXT_PUBLIC_SUPABASE_URL!,\
  process.env.SUPABASE_SERVICE_ROLE_KEY!\
)\
\
export async function POST(req: Request) \{\
  const body = await req.text()\
  const sig = req.headers.get('stripe-signature')!\
\
  let event: Stripe.Event\
\
  try \{\
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)\
  \} catch (err: any) \{\
    return NextResponse.json(\{ error: `Webhook Error: $\{err.message\}` \}, \{ status: 400 \})\
  \}\
\
  if (event.type === 'checkout.session.completed') \{\
    const session = event.data.object as Stripe.Checkout.Session\
    const userId = session.metadata?.userId\
    const creditsToAdd = parseInt(session.metadata?.credits || '0')\
\
    if (userId && creditsToAdd > 0) \{\
      // 1. Get current points\
      const \{ data: profile \} = await supabaseAdmin\
        .from('user_settings')\
        .select('credits')\
        .eq('user_id', userId)\
        .single()\
\
      const newTotal = (profile?.credits || 0) + creditsToAdd\
\
      // 2. Update database\
      await supabaseAdmin\
        .from('user_settings')\
        .update(\{ credits: newTotal \})\
        .eq('user_id', userId)\
        \
      console.log(`\uc0\u9989  Success: Added $\{creditsToAdd\} credits to user $\{userId\}`)\
    \}\
  \}\
\
  return NextResponse.json(\{ received: true \})\
\}}